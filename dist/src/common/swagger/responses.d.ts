export declare class OkResponseDto {
    ok: boolean;
}
export declare class MessageResponseDto {
    message: string;
}
export declare class PaginationMetaDto {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export declare class LoginResponseDto {
    accessToken: string;
    mustChangePin: boolean;
}
export declare class MemberSummaryDto {
    id: string;
    employeeId: string;
    fullName: string;
    district: string;
}
export declare class PaginatedMembersDto {
    data: MemberSummaryDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export declare class TicketSummaryDto {
    id: string;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
}
export declare class PaginatedTicketsDto {
    data: TicketSummaryDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export declare class NewsSummaryDto {
    id: string;
    titleEn: string;
    titleTe?: string;
    publishedAt: string;
}
export declare class PaginatedNewsDto {
    data: NewsSummaryDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export declare class EventSummaryDto {
    id: string;
    titleEn: string;
    eventDate: string;
    location?: string;
    isVirtual: boolean;
    maxCapacity?: number;
}
export declare class PaginatedEventsDto {
    data: EventSummaryDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export declare class NotificationDto {
    id: string;
    type: string;
    title: string;
    body: string;
    isRead: boolean;
    readAt?: string | null;
    isUrgent: boolean;
    isCritical: boolean;
    sentAt: string;
}
export declare class PaginatedNotificationsDto {
    data: NotificationDto[];
    meta: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}
export declare class UnreadCountDto {
    count: number;
}
export declare class TelegramLinkTokenDto {
    token: string;
    instructions: string;
}
export declare class TelegramStatusDto {
    linked: boolean;
}
