import { PrismaService } from '../prisma/prisma.service';
import { NotificationDispatcherService } from '../notifications/notification-dispatcher.service';
export declare class NewsService {
    private prisma;
    private dispatcher;
    private readonly logger;
    constructor(prisma: PrismaService, dispatcher: NotificationDispatcherService);
    findAll(page?: number, requestedLimit?: number): Promise<{
        data: {
            id: string;
            titleEn: string;
            titleTe: string | null;
            publishedAt: Date | null;
            publishedBy: {
                employeeId: string;
            } | null;
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findOne(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        titleEn: string;
        titleTe: string | null;
        publishedAt: Date | null;
        bodyEn: string;
        bodyTe: string | null;
        publishedById: string | null;
        isPublished: boolean;
    }>;
    create(publishedById: string, dto: {
        titleEn: string;
        titleTe?: string;
        bodyEn: string;
        bodyTe?: string;
        publish?: boolean;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        titleEn: string;
        titleTe: string | null;
        publishedAt: Date | null;
        bodyEn: string;
        bodyTe: string | null;
        publishedById: string | null;
        isPublished: boolean;
    }>;
    publish(id: string): Promise<void>;
    private broadcastToAllMembers;
}
