import { NotificationsService } from './notifications.service';
import { NotificationDispatcherService } from './notification-dispatcher.service';
export declare class NotificationsController {
    private readonly notificationsService;
    private readonly dispatcher;
    constructor(notificationsService: NotificationsService, dispatcher: NotificationDispatcherService);
    getMyNotifications(user: {
        id: string;
    }, page: number, limit: number, unreadOnly?: string): Promise<{
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
    getUnreadCount(user: {
        id: string;
    }): Promise<{
        count: number;
    }>;
    markRead(user: {
        id: string;
    }, id: string): Promise<{
        ok: boolean;
    }>;
    markAllRead(user: {
        id: string;
    }): Promise<{
        ok: boolean;
    }>;
}
