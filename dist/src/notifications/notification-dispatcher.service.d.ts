import type { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { FcmService } from '../fcm/fcm.service';
import { TelegramService } from '../telegram/telegram.service';
import { SmsService } from '../sms/sms.service';
import { NotificationType } from '@prisma/client';
export declare const NOTIFICATION_QUEUE = "notifications";
export declare const JOB_TELEGRAM_FALLBACK = "telegram-fallback";
export declare const JOB_SMS_FALLBACK = "sms-fallback";
export interface DispatchPayload {
    notificationId: string;
    userId: string;
    title: string;
    body: string;
    isUrgent?: boolean;
    isCritical?: boolean;
    data?: Record<string, string>;
}
export declare class NotificationDispatcherService {
    private prisma;
    private fcm;
    private telegram;
    private sms;
    private queue;
    private readonly logger;
    private readonly TELEGRAM_DELAY_MS;
    private readonly SMS_DELAY_MS;
    constructor(prisma: PrismaService, fcm: FcmService, telegram: TelegramService, sms: SmsService, queue: Queue);
    dispatch(payload: DispatchPayload): Promise<void>;
    broadcast(userIds: string[], title: string, body: string, options?: {
        type?: NotificationType;
        referenceId?: string;
        isUrgent?: boolean;
        isCritical?: boolean;
        data?: Record<string, string>;
    }): Promise<void>;
    markRead(notificationId: string): Promise<void>;
}
