import {
  Controller, Get, Patch, Param, Query,
  ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam,
  ApiOkResponse, ApiNotFoundResponse, ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { NotificationsService } from './notifications.service';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  PaginatedNotificationsDto,
  UnreadCountDto,
  OkResponseDto,
} from '../common/swagger/responses';

@ApiTags('Notifications')
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly dispatcher: NotificationDispatcherService,
  ) {}

  /**
   * Returns a paginated list of the authenticated user's notifications, newest first.
   * Use `unreadOnly=true` to fetch only unread items.
   */
  @Get()
  @ApiOperation({
    summary: 'List notifications for the current user',
    description: 'Ordered by `sentAt` descending. Use `unreadOnly=true` to filter unread items.',
  })
  @ApiOkResponse({ type: PaginatedNotificationsDto, description: 'Paginated notification list' })
  @ApiQuery({ name: 'page',       required: false, type: Number,  description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit',      required: false, type: Number,  description: 'Results per page (default: 20)' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean, description: 'Return only unread notifications' })
  async getMyNotifications(
    @CurrentUser() user: { id: string },
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.findForUser(user.id, {
      page,
      limit,
      unreadOnly: unreadOnly === 'true',
    });
  }

  /**
   * Returns the count of unread notifications for the current user.
   * Useful for badge counts in the mobile app.
   */
  @Get('unread-count')
  @ApiOperation({
    summary: 'Get unread notification count',
    description: 'Intended for badge / indicator counts in the mobile app.',
  })
  @ApiOkResponse({ type: UnreadCountDto, description: 'Unread notification count' })
  async getUnreadCount(@CurrentUser() user: { id: string }) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  /**
   * Marks a specific notification as read and cancels any pending
   * Telegram / SMS fallback jobs for it.
   */
  @Patch(':id/read')
  @ApiOperation({
    summary: 'Mark a notification as read',
    description:
      'Marks the notification as read and cancels any pending Telegram/SMS fallback jobs.',
  })
  @ApiParam({ name: 'id', description: 'Notification UUID', format: 'uuid' })
  @ApiOkResponse({ type: OkResponseDto, description: 'Marked as read' })
  @ApiNotFoundResponse({ description: 'Notification not found' })
  async markRead(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    await this.dispatcher.markRead(id);
    return { ok: true };
  }

  /**
   * Marks all of the current user's unread notifications as read in one operation.
   */
  @Patch('read-all')
  @ApiOperation({
    summary: 'Mark all notifications as read',
    description: 'Bulk-marks every unread notification for the current user as read.',
  })
  @ApiOkResponse({ type: OkResponseDto, description: 'All notifications marked as read' })
  async markAllRead(@CurrentUser() user: { id: string }) {
    await this.notificationsService.markAllReadForUser(user.id);
    return { ok: true };
  }
}
