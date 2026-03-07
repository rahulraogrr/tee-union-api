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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramStatusDto = exports.TelegramLinkTokenDto = exports.UnreadCountDto = exports.PaginatedNotificationsDto = exports.NotificationDto = exports.PaginatedEventsDto = exports.EventSummaryDto = exports.PaginatedNewsDto = exports.NewsSummaryDto = exports.PaginatedTicketsDto = exports.TicketSummaryDto = exports.PaginatedMembersDto = exports.MemberSummaryDto = exports.LoginResponseDto = exports.PaginationMetaDto = exports.MessageResponseDto = exports.OkResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class OkResponseDto {
    ok;
}
exports.OkResponseDto = OkResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    __metadata("design:type", Boolean)
], OkResponseDto.prototype, "ok", void 0);
class MessageResponseDto {
    message;
}
exports.MessageResponseDto = MessageResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Ticket status updated to resolved' }),
    __metadata("design:type", String)
], MessageResponseDto.prototype, "message", void 0);
class PaginationMetaDto {
    total;
    page;
    limit;
    totalPages;
}
exports.PaginationMetaDto = PaginationMetaDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 120 }),
    __metadata("design:type", Number)
], PaginationMetaDto.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1 }),
    __metadata("design:type", Number)
], PaginationMetaDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 20 }),
    __metadata("design:type", Number)
], PaginationMetaDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 6 }),
    __metadata("design:type", Number)
], PaginationMetaDto.prototype, "totalPages", void 0);
class LoginResponseDto {
    accessToken;
    mustChangePin;
}
exports.LoginResponseDto = LoginResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        description: 'JWT Bearer token — include in Authorization header for all subsequent requests',
    }),
    __metadata("design:type", String)
], LoginResponseDto.prototype, "accessToken", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, description: 'True when the user has never changed their PIN' }),
    __metadata("design:type", Boolean)
], LoginResponseDto.prototype, "mustChangePin", void 0);
class MemberSummaryDto {
    id;
    employeeId;
    fullName;
    district;
}
exports.MemberSummaryDto = MemberSummaryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6', format: 'uuid' }),
    __metadata("design:type", String)
], MemberSummaryDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'PILOT-0001' }),
    __metadata("design:type", String)
], MemberSummaryDto.prototype, "employeeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Ravi Kumar' }),
    __metadata("design:type", String)
], MemberSummaryDto.prototype, "fullName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Hyderabad' }),
    __metadata("design:type", String)
], MemberSummaryDto.prototype, "district", void 0);
class PaginatedMembersDto {
    data;
    total;
    page;
    limit;
    totalPages;
}
exports.PaginatedMembersDto = PaginatedMembersDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [MemberSummaryDto] }),
    __metadata("design:type", Array)
], PaginatedMembersDto.prototype, "data", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], PaginatedMembersDto.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], PaginatedMembersDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], PaginatedMembersDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], PaginatedMembersDto.prototype, "totalPages", void 0);
class TicketSummaryDto {
    id;
    title;
    status;
    priority;
    createdAt;
}
exports.TicketSummaryDto = TicketSummaryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6', format: 'uuid' }),
    __metadata("design:type", String)
], TicketSummaryDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Salary not credited for October' }),
    __metadata("design:type", String)
], TicketSummaryDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'open', enum: ['open', 'in_progress', 'escalated', 'resolved', 'closed'] }),
    __metadata("design:type", String)
], TicketSummaryDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'standard', enum: ['standard', 'urgent', 'critical'] }),
    __metadata("design:type", String)
], TicketSummaryDto.prototype, "priority", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-02-01T10:00:00.000Z', format: 'date-time' }),
    __metadata("design:type", String)
], TicketSummaryDto.prototype, "createdAt", void 0);
class PaginatedTicketsDto {
    data;
    total;
    page;
    limit;
    totalPages;
}
exports.PaginatedTicketsDto = PaginatedTicketsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [TicketSummaryDto] }),
    __metadata("design:type", Array)
], PaginatedTicketsDto.prototype, "data", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], PaginatedTicketsDto.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], PaginatedTicketsDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], PaginatedTicketsDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], PaginatedTicketsDto.prototype, "totalPages", void 0);
class NewsSummaryDto {
    id;
    titleEn;
    titleTe;
    publishedAt;
}
exports.NewsSummaryDto = NewsSummaryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6', format: 'uuid' }),
    __metadata("design:type", String)
], NewsSummaryDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Annual General Body Meeting – January 2026' }),
    __metadata("design:type", String)
], NewsSummaryDto.prototype, "titleEn", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'వార్షిక సాధారణ సభ – జనవరి 2026' }),
    __metadata("design:type", String)
], NewsSummaryDto.prototype, "titleTe", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-01-10T08:00:00.000Z', format: 'date-time' }),
    __metadata("design:type", String)
], NewsSummaryDto.prototype, "publishedAt", void 0);
class PaginatedNewsDto {
    data;
    total;
    page;
    limit;
    totalPages;
}
exports.PaginatedNewsDto = PaginatedNewsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [NewsSummaryDto] }),
    __metadata("design:type", Array)
], PaginatedNewsDto.prototype, "data", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], PaginatedNewsDto.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], PaginatedNewsDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], PaginatedNewsDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], PaginatedNewsDto.prototype, "totalPages", void 0);
class EventSummaryDto {
    id;
    titleEn;
    eventDate;
    location;
    isVirtual;
    maxCapacity;
}
exports.EventSummaryDto = EventSummaryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6', format: 'uuid' }),
    __metadata("design:type", String)
], EventSummaryDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'District Workers Rally – Hyderabad' }),
    __metadata("design:type", String)
], EventSummaryDto.prototype, "titleEn", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-04-15T10:00:00.000Z', format: 'date-time' }),
    __metadata("design:type", String)
], EventSummaryDto.prototype, "eventDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'NTR Stadium, Hyderabad' }),
    __metadata("design:type", String)
], EventSummaryDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: false }),
    __metadata("design:type", Boolean)
], EventSummaryDto.prototype, "isVirtual", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 500, description: 'null = unlimited' }),
    __metadata("design:type", Number)
], EventSummaryDto.prototype, "maxCapacity", void 0);
class PaginatedEventsDto {
    data;
    total;
    page;
    limit;
    totalPages;
}
exports.PaginatedEventsDto = PaginatedEventsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [EventSummaryDto] }),
    __metadata("design:type", Array)
], PaginatedEventsDto.prototype, "data", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], PaginatedEventsDto.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], PaginatedEventsDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], PaginatedEventsDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], PaginatedEventsDto.prototype, "totalPages", void 0);
class NotificationDto {
    id;
    type;
    title;
    body;
    isRead;
    readAt;
    isUrgent;
    isCritical;
    sentAt;
}
exports.NotificationDto = NotificationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6', format: 'uuid' }),
    __metadata("design:type", String)
], NotificationDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'ticket_update', enum: ['ticket_update', 'news', 'event', 'system'] }),
    __metadata("design:type", String)
], NotificationDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Ticket Status Updated' }),
    __metadata("design:type", String)
], NotificationDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Your ticket "Salary dispute" is now Resolved.' }),
    __metadata("design:type", String)
], NotificationDto.prototype, "body", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: false }),
    __metadata("design:type", Boolean)
], NotificationDto.prototype, "isRead", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: null, format: 'date-time' }),
    __metadata("design:type", Object)
], NotificationDto.prototype, "readAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: false }),
    __metadata("design:type", Boolean)
], NotificationDto.prototype, "isUrgent", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: false }),
    __metadata("design:type", Boolean)
], NotificationDto.prototype, "isCritical", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-02-15T09:30:00.000Z', format: 'date-time' }),
    __metadata("design:type", String)
], NotificationDto.prototype, "sentAt", void 0);
class PaginatedNotificationsDto {
    data;
    meta;
}
exports.PaginatedNotificationsDto = PaginatedNotificationsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [NotificationDto] }),
    __metadata("design:type", Array)
], PaginatedNotificationsDto.prototype, "data", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Object)
], PaginatedNotificationsDto.prototype, "meta", void 0);
class UnreadCountDto {
    count;
}
exports.UnreadCountDto = UnreadCountDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 3, description: 'Number of unread notifications' }),
    __metadata("design:type", Number)
], UnreadCountDto.prototype, "count", void 0);
class TelegramLinkTokenDto {
    token;
    instructions;
}
exports.TelegramLinkTokenDto = TelegramLinkTokenDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'A1B2C3D4', description: '8-character one-time link token (expires in 10 min)' }),
    __metadata("design:type", String)
], TelegramLinkTokenDto.prototype, "token", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'Send /link A1B2C3D4 to @TEE1104Bot in Telegram to connect your account.',
        description: 'Human-readable instructions shown to the user',
    }),
    __metadata("design:type", String)
], TelegramLinkTokenDto.prototype, "instructions", void 0);
class TelegramStatusDto {
    linked;
}
exports.TelegramStatusDto = TelegramStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, description: 'Whether a Telegram account is currently linked' }),
    __metadata("design:type", Boolean)
], TelegramStatusDto.prototype, "linked", void 0);
//# sourceMappingURL=responses.js.map