import { PrismaService } from '../prisma/prisma.service';
import { NotificationDispatcherService } from '../notifications/notification-dispatcher.service';
import { TicketPriority, TicketStatus, UserRole } from '@prisma/client';
export declare class TicketsService {
    private prisma;
    private dispatcher;
    private readonly logger;
    constructor(prisma: PrismaService, dispatcher: NotificationDispatcherService);
    create(userId: string, dto: {
        title: string;
        description?: string;
        categoryId?: string;
        priority?: TicketPriority;
    }): Promise<{
        category: {
            name: string;
        } | null;
    } & {
        description: string | null;
        title: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.TicketStatus;
        priority: import("@prisma/client").$Enums.TicketPriority;
        districtId: string | null;
        workUnitId: string | null;
        memberId: string;
        slaDeadline: Date;
        resolvedAt: Date | null;
        assignedRepId: string | null;
        assignedZonalOfficerId: string | null;
        categoryId: string | null;
    }>;
    findAll(userId: string, role: UserRole, filters: {
        status?: TicketStatus;
        page?: number;
        limit?: number;
    }): Promise<{
        data: ({
            member: {
                employeeId: string;
                fullName: string;
            };
            category: {
                name: string;
            } | null;
        } & {
            description: string | null;
            title: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.TicketStatus;
            priority: import("@prisma/client").$Enums.TicketPriority;
            districtId: string | null;
            workUnitId: string | null;
            memberId: string;
            slaDeadline: Date;
            resolvedAt: Date | null;
            assignedRepId: string | null;
            assignedZonalOfficerId: string | null;
            categoryId: string | null;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findOne(id: string, userId: string, role: UserRole): Promise<{
        comments: ({
            user: {
                employeeId: string;
                role: import("@prisma/client").$Enums.UserRole;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string;
            isInternal: boolean;
            comment: string;
            ticketId: string;
        })[];
        member: {
            employeeId: string;
            fullName: string;
            userId: string;
        };
        category: {
            name: string;
        } | null;
        statusHistory: {
            id: string;
            changedById: string;
            notes: string | null;
            changedAt: Date;
            ticketId: string;
            oldStatus: import("@prisma/client").$Enums.TicketStatus;
            newStatus: import("@prisma/client").$Enums.TicketStatus;
        }[];
    } & {
        description: string | null;
        title: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.TicketStatus;
        priority: import("@prisma/client").$Enums.TicketPriority;
        districtId: string | null;
        workUnitId: string | null;
        memberId: string;
        slaDeadline: Date;
        resolvedAt: Date | null;
        assignedRepId: string | null;
        assignedZonalOfficerId: string | null;
        categoryId: string | null;
    }>;
    addComment(ticketId: string, userId: string, role: UserRole, comment: string, isInternal?: boolean): Promise<{
        ticket: {
            member: {
                userId: string;
            };
        } & {
            description: string | null;
            title: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.TicketStatus;
            priority: import("@prisma/client").$Enums.TicketPriority;
            districtId: string | null;
            workUnitId: string | null;
            memberId: string;
            slaDeadline: Date;
            resolvedAt: Date | null;
            assignedRepId: string | null;
            assignedZonalOfficerId: string | null;
            categoryId: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        isInternal: boolean;
        comment: string;
        ticketId: string;
    }>;
    updateStatus(ticketId: string, changedById: string, newStatus: TicketStatus, notes?: string): Promise<{
        message: string;
    }>;
    private notifyUser;
}
