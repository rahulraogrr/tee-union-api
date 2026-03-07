import { PrismaService } from '../prisma/prisma.service';
export declare class NotificationsService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    findForUser(userId: string, options: {
        page: number;
        limit: number;
        unreadOnly?: boolean;
    }): Promise<{
        data: {
            type: import("@prisma/client").$Enums.NotificationType;
            title: string;
            id: string;
            body: string;
            isRead: boolean;
            readAt: Date | null;
            isUrgent: boolean;
            isCritical: boolean;
            sentAt: Date;
            referenceId: string | null;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    getUnreadCount(userId: string): Promise<{
        count: number;
    }>;
    markAllReadForUser(userId: string): Promise<void>;
}
