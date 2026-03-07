import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationDispatcherService } from '../notifications/notification-dispatcher.service';
import { NotificationType } from '@prisma/client';
import { clampLimit } from '../common/utils/pagination';

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);

  constructor(
    private prisma: PrismaService,
    private dispatcher: NotificationDispatcherService,
  ) {}

  /**
   * Returns a paginated list of published news articles, ordered by publication date descending.
   *
   * @param page  - Page number (default: 1)
   * @param requestedLimit - Results per page (default: 20)
   */
  async findAll(page = 1, requestedLimit = 20) {
    const limit = clampLimit(requestedLimit);
    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.news.findMany({
        where: { isPublished: true },
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        select: {
          id: true, titleEn: true, titleTe: true,
          publishedAt: true, publishedBy: { select: { employeeId: true } },
        },
      }),
      this.prisma.news.count({ where: { isPublished: true } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Returns a single published news article by ID.
   *
   * @param id - News article UUID
   * @throws NotFoundException when the article does not exist or is not yet published
   */
  async findOne(id: string) {
    const news = await this.prisma.news.findFirst({
      where: { id, isPublished: true },
    });
    if (!news) throw new NotFoundException('News article not found');
    return news;
  }

  /**
   * Creates a news article. When `dto.publish` is true, immediately publishes it
   * and broadcasts a notification to all active members.
   *
   * @param publishedById - User ID of the admin creating the article
   * @param dto           - Article content and optional publish flag
   */
  async create(publishedById: string, dto: {
    titleEn: string; titleTe?: string;
    bodyEn: string; bodyTe?: string;
    publish?: boolean;
  }) {
    const news = await this.prisma.news.create({
      data: {
        titleEn: dto.titleEn,
        titleTe: dto.titleTe,
        bodyEn: dto.bodyEn,
        bodyTe: dto.bodyTe,
        publishedById,
        isPublished: dto.publish ?? false,
        publishedAt: dto.publish ? new Date() : null,
      },
    });

    this.logger.log(
      `News article created — id: ${news.id}, published: ${dto.publish ?? false}, by: ${publishedById}`,
    );

    if (dto.publish) {
      await this.broadcastToAllMembers(
        news.id,
        `📰 ${dto.titleEn}`,
        'A new news article has been published. Open the app to read it.',
      );
    }

    return news;
  }

  /**
   * Marks a draft article as published and broadcasts to all active members.
   *
   * @param id - News article UUID
   */
  async publish(id: string): Promise<void> {
    const news = await this.prisma.news.update({
      where: { id },
      data: { isPublished: true, publishedAt: new Date() },
    });

    this.logger.log(`News article published — id: ${news.id}`);

    await this.broadcastToAllMembers(
      news.id,
      `📰 ${news.titleEn}`,
      'A new news article has been published. Open the app to read it.',
    );
  }

  /**
   * Sends a notification to every active user via the dispatcher.
   * Failures are caught and logged — they do not abort the publish flow.
   *
   * @param newsId - Reference ID attached to each notification record
   * @param title  - Push notification title
   * @param body   - Push notification body
   */
  private async broadcastToAllMembers(
    newsId: string,
    title: string,
    body: string,
  ): Promise<void> {
    try {
      const users = await this.prisma.user.findMany({
        where: { isActive: true },
        select: { id: true },
      });

      const userIds = users.map((u) => u.id);
      if (userIds.length === 0) return;

      await this.dispatcher.broadcast(userIds, title, body, {
        type: NotificationType.news,
        referenceId: newsId,
      });
    } catch (err) {
      this.logger.warn(
        `News broadcast failed — newsId: ${newsId}`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}
