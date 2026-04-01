import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationDispatcherService } from '../notifications/notification-dispatcher.service';
import { TicketPriority, TicketStatus, UserRole, NotificationType } from '@prisma/client';
import { clampLimit } from '../common/utils/pagination';

const SLA_DAYS: Record<TicketPriority, number> = {
  standard: 30,
  urgent: 10,
  critical: 1,
};

const STATUS_LABEL: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  escalated: 'Escalated',
  resolved: 'Resolved',
  closed: 'Closed',
};

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private prisma: PrismaService,
    private dispatcher: NotificationDispatcherService,
  ) {}

  // ---------------------------------------------------------------------------
  // CREATE TICKET (member)
  // ---------------------------------------------------------------------------
  /**
   * Raises a new grievance ticket on behalf of a member.
   * Calculates the SLA deadline from the priority, auto-assigns a rep using
   * load-balanced selection (fewest active tickets in the same work unit),
   * and dispatches acknowledgement notifications.
   *
   * @param userId - Authenticated member's user ID
   * @param dto    - Ticket data (title, description, categoryId, priority)
   * @throws NotFoundException when the user has no linked member profile
   */
  async create(userId: string, dto: {
    title: string;
    description?: string;
    categoryId?: string;
    priority?: TicketPriority;
  }) {
    this.logger.debug(`Creating ticket for userId: ${userId}, priority: ${dto.priority ?? 'standard'}`);

    const member = await this.prisma.member.findUnique({
      where: { userId },
      select: { id: true, districtId: true, workUnitId: true },
    });
    if (!member) {
      this.logger.warn(`Ticket creation failed — member not found for userId: ${userId}`);
      throw new NotFoundException('Member profile not found');
    }

    const priority = dto.priority ?? TicketPriority.standard;
    const slaDeadline = new Date();
    slaDeadline.setDate(slaDeadline.getDate() + SLA_DAYS[priority]);

    // Auto-assign the least-loaded rep in the same work unit (or district fallback)
    const assignedRepId = await this.autoAssignRep(member.workUnitId, member.districtId);
    if (assignedRepId) {
      this.logger.log(`Auto-assigned rep — repId: ${assignedRepId}, workUnitId: ${member.workUnitId}, districtId: ${member.districtId}`);
    } else {
      this.logger.warn(`No rep available for workUnitId: ${member.workUnitId}, districtId: ${member.districtId} — ticket will be unassigned`);
    }

    const ticket = await this.prisma.ticket.create({
      data: {
        memberId: member.id,
        title: dto.title,
        description: dto.description,
        categoryId: dto.categoryId,
        priority,
        status: TicketStatus.open,
        districtId: member.districtId,
        workUnitId: member.workUnitId,
        slaDeadline,
        assignedRepId: assignedRepId ?? undefined,
      },
      include: {
        category: { select: { name: true } },
        assignedRep: { select: { id: true, employeeId: true } },
      },
    });

    this.logger.log(`Ticket created — id: ${ticket.id}, priority: ${priority}, memberId: ${member.id}, assignedRepId: ${assignedRepId ?? 'unassigned'}`);

    // Notify the member: acknowledgement
    await this.notifyUser(userId, {
      notificationType: NotificationType.ticket_update,
      referenceId: ticket.id,
      title: 'Ticket Submitted',
      body: `Your ticket "${ticket.title}" (#${ticket.id.slice(-6).toUpperCase()}) has been received and will be reviewed shortly.`,
    });

    // Notify the assigned rep
    if (assignedRepId) {
      await this.notifyUser(assignedRepId, {
        notificationType: NotificationType.ticket_update,
        referenceId: ticket.id,
        title: 'New Ticket Assigned',
        body: `A new ${priority} priority ticket "${ticket.title}" has been assigned to you.`,
        isUrgent: priority === TicketPriority.urgent,
        isCritical: priority === TicketPriority.critical,
      });
    }

    return ticket;
  }

  // ---------------------------------------------------------------------------
  // AUTO-ASSIGN REP (private)
  // ---------------------------------------------------------------------------
  /**
   * Finds the least-loaded rep whose own member profile is in the same work unit
   * as the ticket, falling back to district-level reps if none match the work unit.
   *
   * No manual rep-assignment table needed — a rep's coverage area is simply their
   * own work unit / district from their member profile. When a user is promoted to
   * the rep role their existing member location automatically makes them eligible
   * for tickets from that area.
   *
   * Load = number of tickets in open / in_progress / escalated status.
   * Tiebreaker: rep whose member record was created earliest (most senior).
   *
   * @param workUnitId  - The work unit the ticket belongs to (may be null)
   * @param districtId  - The district the ticket belongs to (fallback scope)
   * @returns userId of the chosen rep, or null if no rep is available
   */
  private async autoAssignRep(
    workUnitId: string | null,
    districtId: string | null,
  ): Promise<string | null> {
    // Build scopes to try in order: work-unit first, then district fallback
    const scopes: { workUnitId?: string; districtId?: string }[] = [];
    if (workUnitId) scopes.push({ workUnitId });
    if (districtId) scopes.push({ districtId });

    for (const scope of scopes) {
      // Find active reps whose member profile is in this work unit / district
      const reps = await this.prisma.member.findMany({
        where: {
          isActive: true,
          ...(scope.workUnitId
            ? { workUnitId: scope.workUnitId }
            : { districtId: scope.districtId }),
          user: { roles: { has: UserRole.rep } },
        },
        select: {
          userId: true,
          memberSince: true, // seniority tiebreaker
        },
        orderBy: { memberSince: 'asc' },
      });

      if (reps.length === 0) continue;

      const repIds = reps.map((r) => r.userId);

      // Count active (non-terminal) tickets per rep
      const activeCounts = await this.prisma.ticket.groupBy({
        by: ['assignedRepId'],
        where: {
          assignedRepId: { in: repIds },
          status: { in: [TicketStatus.open, TicketStatus.in_progress, TicketStatus.escalated] },
        },
        _count: { assignedRepId: true },
      });

      // Build load map — default 0 for reps with no active tickets yet
      const loadMap = new Map<string, number>(repIds.map((id) => [id, 0]));
      for (const row of activeCounts) {
        if (row.assignedRepId) loadMap.set(row.assignedRepId, row._count.assignedRepId);
      }

      // Pick rep with lowest load (tiebreak: first in reps array = most senior member)
      let bestRepId = repIds[0];
      let bestLoad  = loadMap.get(repIds[0]) ?? 0;
      for (const repId of repIds) {
        const load = loadMap.get(repId) ?? 0;
        if (load < bestLoad) {
          bestLoad  = load;
          bestRepId = repId;
        }
      }

      this.logger.debug(
        `autoAssignRep — scope: ${JSON.stringify(scope)}, candidates: ${repIds.length}, chosen: ${bestRepId} (load: ${bestLoad})`,
      );

      return bestRepId;
    }

    return null; // no active reps found in work unit or district
  }

  // ---------------------------------------------------------------------------
  // LIST TICKETS (scoped by role)
  // ---------------------------------------------------------------------------
  /**
   * Returns a paginated list of tickets scoped to the caller's role.
   * Members see only their own; reps see assigned tickets; admins see all.
   *
   * @param userId  - Authenticated user's ID
   * @param role    - Caller's role (determines scope filter)
   * @param filters - Optional status filter + pagination (page, limit)
   */
  async findAll(
    userId: string,
    roles: UserRole[],
    filters: { status?: TicketStatus; page?: number; limit?: number },
  ) {
    const { status, page = 1 } = filters;
    const limit = clampLimit(filters.limit);
    const skip = (page - 1) * limit;

    this.logger.debug(
      `Listing tickets — userId: ${userId}, roles: [${roles.join(', ')}], status: ${status ?? 'all'}, page: ${page}, limit: ${limit}`,
    );

    let memberWhere = {};
    if (roles.includes(UserRole.member) && !roles.some(r => [UserRole.admin, UserRole.super_admin, UserRole.zonal_officer].includes(r))) {
      const member = await this.prisma.member.findUnique({
        where: { userId },
        select: { id: true },
      });
      memberWhere = { memberId: member?.id };
    }

    const repWhere = roles.includes(UserRole.rep) && !roles.some(r => [UserRole.admin, UserRole.super_admin].includes(r))
      ? { assignedRepId: userId }
      : {};

    const where = {
      ...memberWhere,
      ...repWhere,
      ...(status && { status }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        include: {
          member: { select: { firstName: true, middleName: true, lastName: true, user: { select: { employeeId: true } } } },
          category: { select: { name: true } },
          assignedRep: { select: { id: true, employeeId: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    this.logger.debug(`Tickets listed — total: ${total}, returned: ${data.length}`);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ---------------------------------------------------------------------------
  // GET TICKET COUNTS BY STATUS (scoped by role)
  // ---------------------------------------------------------------------------
  /**
   * Returns the count of tickets per status, scoped to the caller's role.
   * Members see only their own; reps see assigned; admins see all.
   * Used by the TicketsHomeScreen to avoid 5 separate API calls.
   *
   * @param userId - Authenticated user's ID
   * @param role   - Caller's role (determines scope)
   */
  async getCounts(userId: string, roles: UserRole[]): Promise<Record<string, number>> {
    this.logger.debug(`getCounts — userId: ${userId}, roles: [${roles.join(', ')}]`);

    const isAdmin = roles.some(r => [UserRole.admin, UserRole.super_admin, UserRole.zonal_officer].includes(r));
    let where: Record<string, any> = {};
    if (!isAdmin && roles.includes(UserRole.member)) {
      const member = await this.prisma.member.findUnique({
        where: { userId },
        select: { id: true },
      });
      where = { memberId: member?.id };
    } else if (!isAdmin && roles.includes(UserRole.rep)) {
      where = { assignedRepId: userId };
    }

    const rows = await this.prisma.ticket.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    });

    const counts: Record<string, number> = {
      open: 0, in_progress: 0, escalated: 0, resolved: 0, closed: 0,
    };
    for (const row of rows) {
      counts[row.status] = row._count.status;
    }

    this.logger.debug(`getCounts result — ${JSON.stringify(counts)}`);
    return counts;
  }

  // ---------------------------------------------------------------------------
  // GET ONE TICKET
  // ---------------------------------------------------------------------------
  /**
   * Returns a single ticket with comments (internal comments hidden from members)
   * and full status history.
   *
   * @param id     - Ticket UUID
   * @param userId - Authenticated user's ID (used for ownership check)
   * @param role   - Caller's role
   * @throws NotFoundException  when the ticket does not exist
   * @throws ForbiddenException when a member attempts to view another member's ticket
   */
  async findOne(id: string, userId: string, roles: UserRole[]) {
    this.logger.debug(`Fetching ticket — id: ${id}, userId: ${userId}, roles: [${roles.join(', ')}]`);

    const isMemberOnly = roles.includes(UserRole.member) &&
      !roles.some(r => [UserRole.admin, UserRole.super_admin, UserRole.zonal_officer, UserRole.rep].includes(r));

    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        member: { select: { firstName: true, middleName: true, lastName: true, userId: true, user: { select: { employeeId: true } } } },
        category: { select: { name: true } },
        assignedRep: { select: { id: true, employeeId: true } },
        comments: {
          where: isMemberOnly ? { isInternal: false } : {},
          include: { user: { select: { employeeId: true, roles: true } } },
          orderBy: { createdAt: 'asc' },
        },
        statusHistory: { orderBy: { changedAt: 'desc' } },
      },
    });

    if (!ticket) {
      this.logger.warn(`Ticket not found — id: ${id}`);
      throw new NotFoundException(`Ticket ${id} not found`);
    }

    if (isMemberOnly && ticket.member.userId !== userId) {
      this.logger.warn(
        `Ticket access denied — userId: ${userId} attempted to access ticket: ${id} owned by userId: ${ticket.member.userId}`,
      );
      throw new ForbiddenException('Access denied');
    }

    return ticket;
  }

  // ---------------------------------------------------------------------------
  // ADD COMMENT
  // ---------------------------------------------------------------------------
  /**
   * Appends a comment to an existing ticket.
   * Internal comments are visible only to reps and admins.
   * The ticket owner is notified via push/Telegram/SMS when a rep adds a public comment.
   *
   * @param ticketId   - Ticket UUID
   * @param userId     - Commenter's user ID
   * @param roles      - Commenter's roles array
   * @param comment    - Comment text
   * @param isInternal - If true, hidden from the ticket owner (default: false)
   * @throws ForbiddenException when a member attempts to post an internal comment
   */
  async addComment(
    ticketId: string,
    userId: string,
    roles: UserRole[],
    comment: string,
    isInternal = false,
  ) {
    const isMemberOnly = roles.includes(UserRole.member) &&
      !roles.some(r => [UserRole.admin, UserRole.super_admin, UserRole.zonal_officer, UserRole.rep].includes(r));

    if (isInternal && isMemberOnly) {
      throw new ForbiddenException('Members cannot post internal comments');
    }

    const result = await this.prisma.ticketComment.create({
      data: { ticketId, userId, comment, isInternal },
      include: {
        ticket: {
          include: { member: { select: { userId: true } } },
        },
      },
    });

    this.logger.log(
      `Comment added — ticketId: ${ticketId}, roles: [${roles.join(', ')}], internal: ${isInternal}`,
    );

    // Notify the ticket owner when a rep/admin adds a public comment
    if (!isInternal && !isMemberOnly) {
      const ownerId = result.ticket.member.userId;
      if (ownerId && ownerId !== userId) {
        await this.notifyUser(ownerId, {
          notificationType: NotificationType.ticket_update,
          referenceId: ticketId,
          title: 'New Reply on Your Ticket',
          body: `A union rep replied to your ticket "${result.ticket.title}".`,
        });
      }
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // UPDATE STATUS (rep / admin)
  // ---------------------------------------------------------------------------
  /**
   * Transitions a ticket to a new status and records a history entry.
   * Notifies the ticket owner; marks the notification as critical for resolved/escalated.
   *
   * @param ticketId    - Ticket UUID
   * @param changedById - User ID of the rep/admin making the change
   * @param newStatus   - Target status
   * @param notes       - Optional note recorded in status history
   */
  async updateStatus(
    ticketId: string,
    changedById: string,
    newStatus: TicketStatus,
    notes?: string,
  ) {
    const ticket = await this.prisma.ticket.findUniqueOrThrow({
      where: { id: ticketId },
      include: { member: { select: { userId: true } } },
    });

    await this.prisma.$transaction([
      this.prisma.ticketStatusHistory.create({
        data: {
          ticketId,
          changedById,
          oldStatus: ticket.status,
          newStatus,
          notes,
        },
      }),
      this.prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: newStatus,
          resolvedAt: newStatus === TicketStatus.resolved ? new Date() : undefined,
          updatedAt: new Date(),
        },
      }),
    ]);

    this.logger.log(
      `Ticket status updated — id: ${ticketId}, ${ticket.status} → ${newStatus}, changedBy: ${changedById}`,
    );

    // Notify the ticket owner of the status change
    const ownerId = ticket.member.userId;
    if (ownerId && ownerId !== changedById) {
      const isCritical =
        newStatus === TicketStatus.resolved || newStatus === TicketStatus.escalated;
      await this.notifyUser(ownerId, {
        notificationType: NotificationType.ticket_update,
        referenceId: ticketId,
        title: 'Ticket Status Updated',
        body:
          `Your ticket "${ticket.title}" is now ${STATUS_LABEL[newStatus]}.` +
          (notes ? ` Note: ${notes}` : ''),
        isCritical,
      });
    }

    return { message: `Ticket status updated to ${newStatus}` };
  }

  // ---------------------------------------------------------------------------
  // Private: create notification record and dispatch
  // ---------------------------------------------------------------------------
  /**
   * Creates a Notification DB record and dispatches it via the NotificationDispatcherService.
   * Failures are caught and logged as warnings — never propagated to the caller.
   *
   * @param userId - Recipient user ID
   * @param opts   - Notification payload options
   */
  private async notifyUser(
    userId: string,
    opts: {
      notificationType: NotificationType;
      referenceId?: string;
      title: string;
      body: string;
      isUrgent?: boolean;
      isCritical?: boolean;
    },
  ): Promise<void> {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          userId,
          type: opts.notificationType,
          title: opts.title,
          body: opts.body,
          referenceId: opts.referenceId,
          isUrgent: opts.isUrgent ?? false,
          isCritical: opts.isCritical ?? false,
        },
      });

      await this.dispatcher.dispatch({
        notificationId: notification.id,
        userId,
        title: opts.title,
        body: opts.body,
        isUrgent: opts.isUrgent,
        isCritical: opts.isCritical,
      });
    } catch (err) {
      this.logger.warn(
        `Notification dispatch failed — userId: ${userId}, title: "${opts.title}"`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}
