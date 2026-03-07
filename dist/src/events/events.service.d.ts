import { PrismaService } from '../prisma/prisma.service';
import { NotificationDispatcherService } from '../notifications/notification-dispatcher.service';
export declare class EventsService {
    private prisma;
    private dispatcher;
    private readonly logger;
    constructor(prisma: PrismaService, dispatcher: NotificationDispatcherService);
    findAll(districtId?: string, page?: number, requestedLimit?: number): Promise<{
        data: {
            district: {
                name: string;
            } | null;
            id: string;
            titleEn: string;
            titleTe: string | null;
            eventDate: Date;
            location: string | null;
            isVirtual: boolean;
            maxCapacity: number | null;
            _count: {
                registrations: number;
            };
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findOne(id: string): Promise<{
        district: {
            name: string;
        } | null;
        _count: {
            registrations: number;
        };
    } & {
        id: string;
        createdById: string | null;
        createdAt: Date;
        updatedAt: Date;
        titleEn: string;
        titleTe: string | null;
        eventDate: Date;
        location: string | null;
        isVirtual: boolean;
        maxCapacity: number | null;
        districtId: string | null;
        isPublished: boolean;
        descriptionEn: string | null;
        descriptionTe: string | null;
    }>;
    register(eventId: string, userId: string): Promise<{
        id: string;
        memberId: string;
        eventId: string;
        registeredAt: Date;
    }>;
    create(createdById: string, dto: {
        titleEn: string;
        titleTe?: string;
        descriptionEn?: string;
        descriptionTe?: string;
        eventDate: Date;
        location?: string;
        maxCapacity?: number;
        isVirtual?: boolean;
        districtId?: string;
        publish?: boolean;
    }): Promise<{
        id: string;
        createdById: string | null;
        createdAt: Date;
        updatedAt: Date;
        titleEn: string;
        titleTe: string | null;
        eventDate: Date;
        location: string | null;
        isVirtual: boolean;
        maxCapacity: number | null;
        districtId: string | null;
        isPublished: boolean;
        descriptionEn: string | null;
        descriptionTe: string | null;
    }>;
    private notifyUser;
}
