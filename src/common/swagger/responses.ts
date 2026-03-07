/**
 * Shared Swagger response schema classes used across controllers.
 * These are documentation-only; they don't need to match the exact Prisma shape.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── Generic ────────────────────────────────────────────────────────────────

export class OkResponseDto {
  @ApiProperty({ example: true })
  ok: boolean;
}

export class MessageResponseDto {
  @ApiProperty({ example: 'Ticket status updated to resolved' })
  message: string;
}

export class PaginationMetaDto {
  @ApiProperty({ example: 120 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 6 })
  totalPages: number;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export class LoginResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT Bearer token — include in Authorization header for all subsequent requests',
  })
  accessToken: string;

  @ApiProperty({ example: true, description: 'True when the user has never changed their PIN' })
  mustChangePin: boolean;
}

// ─── Members ─────────────────────────────────────────────────────────────────

export class MemberSummaryDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'PILOT-0001' })
  employeeId: string;

  @ApiProperty({ example: 'Ravi Kumar' })
  fullName: string;

  @ApiProperty({ example: 'Hyderabad' })
  district: string;
}

export class PaginatedMembersDto {
  @ApiProperty({ type: [MemberSummaryDto] })
  data: MemberSummaryDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

// ─── Tickets ─────────────────────────────────────────────────────────────────

export class TicketSummaryDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Salary not credited for October' })
  title: string;

  @ApiProperty({ example: 'open', enum: ['open', 'in_progress', 'escalated', 'resolved', 'closed'] })
  status: string;

  @ApiProperty({ example: 'standard', enum: ['standard', 'urgent', 'critical'] })
  priority: string;

  @ApiProperty({ example: '2026-02-01T10:00:00.000Z', format: 'date-time' })
  createdAt: string;
}

export class PaginatedTicketsDto {
  @ApiProperty({ type: [TicketSummaryDto] })
  data: TicketSummaryDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

// ─── News ────────────────────────────────────────────────────────────────────

export class NewsSummaryDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Annual General Body Meeting – January 2026' })
  titleEn: string;

  @ApiPropertyOptional({ example: 'వార్షిక సాధారణ సభ – జనవరి 2026' })
  titleTe?: string;

  @ApiProperty({ example: '2026-01-10T08:00:00.000Z', format: 'date-time' })
  publishedAt: string;
}

export class PaginatedNewsDto {
  @ApiProperty({ type: [NewsSummaryDto] })
  data: NewsSummaryDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

// ─── Events ──────────────────────────────────────────────────────────────────

export class EventSummaryDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'District Workers Rally – Hyderabad' })
  titleEn: string;

  @ApiProperty({ example: '2026-04-15T10:00:00.000Z', format: 'date-time' })
  eventDate: string;

  @ApiPropertyOptional({ example: 'NTR Stadium, Hyderabad' })
  location?: string;

  @ApiProperty({ example: false })
  isVirtual: boolean;

  @ApiPropertyOptional({ example: 500, description: 'null = unlimited' })
  maxCapacity?: number;
}

export class PaginatedEventsDto {
  @ApiProperty({ type: [EventSummaryDto] })
  data: EventSummaryDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

// ─── Notifications ───────────────────────────────────────────────────────────

export class NotificationDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'ticket_update', enum: ['ticket_update', 'news', 'event', 'system'] })
  type: string;

  @ApiProperty({ example: 'Ticket Status Updated' })
  title: string;

  @ApiProperty({ example: 'Your ticket "Salary dispute" is now Resolved.' })
  body: string;

  @ApiProperty({ example: false })
  isRead: boolean;

  @ApiPropertyOptional({ example: null, format: 'date-time' })
  readAt?: string | null;

  @ApiProperty({ example: false })
  isUrgent: boolean;

  @ApiProperty({ example: false })
  isCritical: boolean;

  @ApiProperty({ example: '2026-02-15T09:30:00.000Z', format: 'date-time' })
  sentAt: string;
}

export class PaginatedNotificationsDto {
  @ApiProperty({ type: [NotificationDto] })
  data: NotificationDto[];

  @ApiProperty()
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export class UnreadCountDto {
  @ApiProperty({ example: 3, description: 'Number of unread notifications' })
  count: number;
}

// ─── Telegram ────────────────────────────────────────────────────────────────

export class TelegramLinkTokenDto {
  @ApiProperty({ example: 'A1B2C3D4', description: '8-character one-time link token (expires in 10 min)' })
  token: string;

  @ApiProperty({
    example: 'Send /link A1B2C3D4 to @TEE1104Bot in Telegram to connect your account.',
    description: 'Human-readable instructions shown to the user',
  })
  instructions: string;
}

export class TelegramStatusDto {
  @ApiProperty({ example: true, description: 'Whether a Telegram account is currently linked' })
  linked: boolean;
}
