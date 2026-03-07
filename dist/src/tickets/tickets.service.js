"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TicketsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const notification_dispatcher_service_1 = require("../notifications/notification-dispatcher.service");
const client_1 = require("@prisma/client");
const pagination_1 = require("../common/utils/pagination");
const SLA_DAYS = {
    standard: 30,
    urgent: 10,
    critical: 1,
};
const STATUS_LABEL = {
    open: 'Open',
    in_progress: 'In Progress',
    escalated: 'Escalated',
    resolved: 'Resolved',
    closed: 'Closed',
};
let TicketsService = TicketsService_1 = class TicketsService {
    prisma;
    dispatcher;
    logger = new common_1.Logger(TicketsService_1.name);
    constructor(prisma, dispatcher) {
        this.prisma = prisma;
        this.dispatcher = dispatcher;
    }
    async create(userId, dto) {
        this.logger.debug(`Creating ticket for userId: ${userId}, priority: ${dto.priority ?? 'standard'}`);
        const member = await this.prisma.member.findUnique({
            where: { userId },
            select: { id: true, districtId: true, workUnitId: true },
        });
        if (!member) {
            this.logger.warn(`Ticket creation failed — member not found for userId: ${userId}`);
            throw new common_1.NotFoundException('Member profile not found');
        }
        const priority = dto.priority ?? client_1.TicketPriority.standard;
        const slaDeadline = new Date();
        slaDeadline.setDate(slaDeadline.getDate() + SLA_DAYS[priority]);
        const ticket = await this.prisma.ticket.create({
            data: {
                memberId: member.id,
                title: dto.title,
                description: dto.description,
                categoryId: dto.categoryId,
                priority,
                status: client_1.TicketStatus.open,
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
            notificationType: client_1.NotificationType.ticket_update,
            referenceId: ticket.id,
            title: 'Ticket Submitted',
            body: `Your ticket "${ticket.title}" (#${ticket.id.slice(-6).toUpperCase()}) has been received and will be reviewed shortly.`,
        });
        return ticket;
    }
    async findAll(userId, role, filters) {
        const { status, page = 1 } = filters;
        const limit = (0, pagination_1.clampLimit)(filters.limit);
        const skip = (page - 1) * limit;
        let memberWhere = {};
        if (role === client_1.UserRole.member) {
            const member = await this.prisma.member.findUnique({
                where: { userId },
                select: { id: true },
            });
            memberWhere = { memberId: member?.id };
        }
        const repWhere = role === client_1.UserRole.rep ? { assignedRepId: userId } : {};
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
    async findOne(id, userId, role) {
        const ticket = await this.prisma.ticket.findUnique({
            where: { id },
            include: {
                member: { select: { fullName: true, employeeId: true, userId: true } },
                category: { select: { name: true } },
                comments: {
                    where: role === client_1.UserRole.member ? { isInternal: false } : {},
                    include: { user: { select: { employeeId: true, role: true } } },
                    orderBy: { createdAt: 'asc' },
                },
                statusHistory: { orderBy: { changedAt: 'desc' } },
            },
        });
        if (!ticket)
            throw new common_1.NotFoundException(`Ticket ${id} not found`);
        if (role === client_1.UserRole.member && ticket.member.userId !== userId) {
            throw new common_1.ForbiddenException('Access denied');
        }
        return ticket;
    }
    async addComment(ticketId, userId, role, comment, isInternal = false) {
        if (isInternal && role === client_1.UserRole.member) {
            throw new common_1.ForbiddenException('Members cannot post internal comments');
        }
        const result = await this.prisma.ticketComment.create({
            data: { ticketId, userId, comment, isInternal },
            include: {
                ticket: {
                    include: { member: { select: { userId: true } } },
                },
            },
        });
        this.logger.log(`Comment added — ticketId: ${ticketId}, role: ${role}, internal: ${isInternal}`);
        if (!isInternal && role !== client_1.UserRole.member) {
            const ownerId = result.ticket.member.userId;
            if (ownerId && ownerId !== userId) {
                await this.notifyUser(ownerId, {
                    notificationType: client_1.NotificationType.ticket_update,
                    referenceId: ticketId,
                    title: 'New Reply on Your Ticket',
                    body: `A union rep replied to your ticket "${result.ticket.title}".`,
                });
            }
        }
        return result;
    }
    async updateStatus(ticketId, changedById, newStatus, notes) {
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
                    resolvedAt: newStatus === client_1.TicketStatus.resolved ? new Date() : undefined,
                    updatedAt: new Date(),
                },
            }),
        ]);
        this.logger.log(`Ticket status updated — id: ${ticketId}, ${ticket.status} → ${newStatus}, changedBy: ${changedById}`);
        const ownerId = ticket.member.userId;
        if (ownerId && ownerId !== changedById) {
            const isCritical = newStatus === client_1.TicketStatus.resolved || newStatus === client_1.TicketStatus.escalated;
            await this.notifyUser(ownerId, {
                notificationType: client_1.NotificationType.ticket_update,
                referenceId: ticketId,
                title: 'Ticket Status Updated',
                body: `Your ticket "${ticket.title}" is now ${STATUS_LABEL[newStatus]}.` +
                    (notes ? ` Note: ${notes}` : ''),
                isCritical,
            });
        }
        return { message: `Ticket status updated to ${newStatus}` };
    }
    async notifyUser(userId, opts) {
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
        }
        catch (err) {
            this.logger.warn(`Notification dispatch failed — userId: ${userId}, title: "${opts.title}"`, err instanceof Error ? err.message : String(err));
        }
    }
};
exports.TicketsService = TicketsService;
exports.TicketsService = TicketsService = TicketsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_dispatcher_service_1.NotificationDispatcherService])
], TicketsService);
//# sourceMappingURL=tickets.service.js.map