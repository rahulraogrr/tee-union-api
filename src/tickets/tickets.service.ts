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
   * Calculates the SLA deadline from the priority and dispatches an acknowledgement notification.
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
      },
      include: {
        category: { select: { name: true } },
      },
    });

    this.logger.log(`Ticket created — id: ${ticket.id}, priority: ${priority}, memberId: ${member.id}`);

    await this.notifyUser(userId, {
      notificationType: NotificationType.ticket_update,
      referenceId: ticket.id,
      title: 'Ticket Submitted',
      body: `Your ticket "${ticket.title}" (#${ticket.id.slice(-6).toUpperCase()}) has been received and will be reviewed shortly.`,
    });

    return ticket;
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
    role: UserRole,
    filters: { status?: TicketStatus; page?: number; limit?: number },
  ) {
    const { status, page = 1 } = filters;
    const limit = clampLimit(filters.limit);
    const skip = (page - 1) * limit;

    let memberWhere = {};
    if (role === UserRole.member) {
      const member = await this.prisma.member.findUnique({
        where: { userId },
        select: { id: true },
      });
      memberWhere = { memberId: member?.id };
    }

    const repWhere = role === UserRole.rep ? { assignedRepId: userId } : {};

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
          member: { select: { fullName: true, employeeId: true } },
          category: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
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
  async findOne(id: string, userId: string, role: UserRole) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        member: { select: { fullName: true, employeeId: true, userId: true } },
        category: { select: { name: true } },
        comments: {
          where: role === UserRole.member ? { isInternal: false } : {},
          include: { user: { select: { employeeId: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
        statusHistory: { orderBy: { changedAt: 'desc' } },
      },
    });

    if (!ticket) throw new NotFoundException(`Ticket ${id} not found`);

    if (role === UserRole.member && ticket.member.userId !== userId) {
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
   * @param role       - Commenter's role
   * @param comment    - Comment text
   * @param isInternal - If true, hidden from the ticket owner (default: false)
   * @throws ForbiddenException when a member attempts to post an internal comment
   */
  async addComment(
    ticketId: string,
    userId: string,
    role: UserRole,
    comment: string,
    isInternal = false,
  ) {
    if (isInternal && role === UserRole.member) {
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
      `Comment added — ticketId: ${ticketId}, role: ${role}, internal: ${isInternal}`,
    );

    // Notify the ticket owner when a rep/admin adds a public comment
    if (!isInternal && role !== UserRole.member) {
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
