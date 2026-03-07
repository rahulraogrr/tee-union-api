import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { clampLimit } from '../common/utils/pagination';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Returns a paginated list of notifications for a user, ordered by sentAt descending.
   *
   * @param userId  - Recipient user ID
   * @param options - Pagination options and optional unreadOnly filter
   */
  async findForUser(
    userId: string,
    options: { page: number; limit: number; unreadOnly?: boolean },
  ) {
    const { page, unreadOnly } = options;
    const limit = clampLimit(options.limit);
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          isRead: true,
          readAt: true,
          isUrgent: true,
          isCritical: true,
          referenceId: true,
          sentAt: true,
        },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Returns the count of unread notifications for the user.
   * Used for badge / indicator counts in the mobile app.
   *
   * @param userId - Recipient user ID
   */
  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    this.logger.debug(`Unread count fetched — userId: ${userId}, count: ${count}`);
    return { count };
  }

  /**
   * Bulk-marks every unread notification for the user as read in a single DB call.
   *
   * @param userId - Recipient user ID
   */
  async markAllReadForUser(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    this.logger.log(`All notifications marked read — userId: ${userId}`);
  }
}
