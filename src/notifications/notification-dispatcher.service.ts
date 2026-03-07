import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { FcmService } from '../fcm/fcm.service';
import { TelegramService } from '../telegram/telegram.service';
import { SmsService } from '../sms/sms.service';
import { NotificationType } from '@prisma/client';

export const NOTIFICATION_QUEUE = 'notifications';
export const JOB_TELEGRAM_FALLBACK = 'telegram-fallback';
export const JOB_SMS_FALLBACK = 'sms-fallback';

export interface DispatchPayload {
  notificationId: string;
  userId: string;
  title: string;
  body: string;
  isUrgent?: boolean;
  isCritical?: boolean;
  data?: Record<string, string>;
}

@Injectable()
export class NotificationDispatcherService {
  private readonly logger = new Logger(NotificationDispatcherService.name);

  private readonly TELEGRAM_DELAY_MS = 5 * 60 * 1000;
  private readonly SMS_DELAY_MS = 15 * 60 * 1000;

  constructor(
    private prisma: PrismaService,
    private fcm: FcmService,
    private telegram: TelegramService,
    private sms: SmsService,
    @InjectQueue(NOTIFICATION_QUEUE) private queue: Queue,
  ) {}

  async dispatch(payload: DispatchPayload): Promise<void> {
    const { notificationId, userId, title, body, isUrgent, isCritical, data } = payload;

    this.logger.log(
      `Dispatching notification ${notificationId} → user ${userId}` +
        (isUrgent ? ' [URGENT]' : '') +
        (isCritical ? ' [CRITICAL]' : ''),
    );

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        telegramChatId: true,
        mobileNo: true,
        pushTokens: {
          
          select: { token: true },
        },
      },
    });

    if (!user) {
      this.logger.warn(`User ${userId} not found — skipping notification`);
      return;
    }

    const fcmTokens = user.pushTokens.map((pt) => pt.token);

    let fcmSent = false;
    if (fcmTokens.length > 0) {
      fcmSent = await this.fcm.sendToTokens(fcmTokens, {
        title,
        body,
        data: { notificationId, ...(data ?? {}) },
      });
    }

    let telegramSent = false;
    if (isUrgent && user.telegramChatId && this.telegram.isEnabled()) {
      telegramSent = await this.telegram.sendNotification(user.telegramChatId, title, body);
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        fcmSent,
        telegramSent,
        deliveredVia: fcmSent ? 'fcm' : null,
      },
    });

    if (!telegramSent && user.telegramChatId && this.telegram.isEnabled()) {
      const delay = isUrgent ? 0 : this.TELEGRAM_DELAY_MS;
      await this.queue.add(
        JOB_TELEGRAM_FALLBACK,
        { notificationId, userId, title, body, chatId: user.telegramChatId.toString() },
        { delay, attempts: 3, backoff: { type: 'exponential', delay: 30_000 } },
      );
    }

    if (isCritical && this.sms.isEnabled() && user.mobileNo) {
      await this.queue.add(
        JOB_SMS_FALLBACK,
        { notificationId, userId, title, body, phone: user.mobileNo },
        { delay: this.SMS_DELAY_MS, attempts: 2, backoff: { type: 'fixed', delay: 60_000 } },
      );
    }
  }

  async broadcast(
    userIds: string[],
    title: string,
    body: string,
    options?: {
      type?: NotificationType;
      referenceId?: string;
      isUrgent?: boolean;
      isCritical?: boolean;
      data?: Record<string, string>;
    },
  ): Promise<void> {
    const { type, referenceId, isUrgent, isCritical, data } = options ?? {};

    this.logger.log(`Broadcasting "${title}" to ${userIds.length} users`);

    const notifications = await this.prisma.notification.createManyAndReturn({
      data: userIds.map((uid) => ({
        userId: uid,
        type: type ?? NotificationType.system,
        title,
        body,
        referenceId: referenceId ?? null,
        isUrgent: isUrgent ?? false,
        isCritical: isCritical ?? false,
      })),
    });

    const BATCH = 50;
    for (let i = 0; i < notifications.length; i += BATCH) {
      const batch = notifications.slice(i, i + BATCH);
      await Promise.all(
        batch.map((n) =>
          this.dispatch({
            notificationId: n.id,
            userId: n.userId,
            title,
            body,
            isUrgent,
            isCritical,
            data,
          }),
        ),
      );
    }
  }

  async markRead(notificationId: string): Promise<void> {
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });

    const jobs = await this.queue.getJobs(['delayed', 'waiting']);
    for (const job of jobs) {
      if (job.data?.notificationId === notificationId) {
        await job.remove();
      }
    }
  }
}
