import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { SmsService } from '../sms/sms.service';
import {
  NOTIFICATION_QUEUE,
  JOB_TELEGRAM_FALLBACK,
  JOB_SMS_FALLBACK,
} from './notification-dispatcher.service';

interface TelegramFallbackJob {
  notificationId: string;
  userId: string;
  title: string;
  body: string;
  chatId: string;
}

interface SmsFallbackJob {
  notificationId: string;
  userId: string;
  title: string;
  body: string;
  phone: string;
}

@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessorService {
  private readonly logger = new Logger(NotificationProcessorService.name);

  constructor(
    private prisma: PrismaService,
    private telegram: TelegramService,
    private sms: SmsService,
  ) {}

  @Process(JOB_TELEGRAM_FALLBACK)
  async processTelegramFallback(job: Job<TelegramFallbackJob>): Promise<void> {
    const { notificationId, title, body, chatId } = job.data;

    this.logger.log(`Processing Telegram fallback for notification ${notificationId}`);

    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      select: { isRead: true, telegramSent: true },
    });

    if (!notification || notification.isRead || notification.telegramSent) {
      this.logger.debug(`Skipping Telegram fallback for ${notificationId} (read or already sent)`);
      return;
    }

    const sent = await this.telegram.sendNotification(BigInt(chatId), title, body);

    if (sent) {
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { telegramSent: true, deliveredVia: 'telegram' },
      });
      this.logger.log(`Telegram fallback sent for notification ${notificationId}`);
    }
  }

  @Process(JOB_SMS_FALLBACK)
  async processSmsFallback(job: Job<SmsFallbackJob>): Promise<void> {
    const { notificationId, title, body, phone } = job.data;

    this.logger.log(`Processing SMS fallback for notification ${notificationId}`);

    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      select: { isRead: true, smsSent: true },
    });

    if (!notification || notification.isRead || notification.smsSent) {
      this.logger.debug(`Skipping SMS fallback for ${notificationId} (read or already sent)`);
      return;
    }

    const message = this.sms.formatNotification(title, body);
    const sent = await this.sms.sendSms(phone, message);

    if (sent) {
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { smsSent: true, deliveredVia: 'sms' },
      });
      this.logger.log(`SMS fallback sent for notification ${notificationId}`);
    }
  }
}
