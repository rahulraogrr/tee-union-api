import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
export declare class EventsController {
    private eventsService;
    constructor(eventsService: EventsService);
    findAll(districtId?: string, page?: string, limit?: string): Promise<{
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
    create(userId: string, body: CreateEventDto): Promise<{
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
}
