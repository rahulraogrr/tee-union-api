import type { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { SmsService } from '../sms/sms.service';
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
export declare class NotificationProcessorService {
    private prisma;
    private telegram;
    private sms;
    private readonly logger;
    constructor(prisma: PrismaService, telegram: TelegramService, sms: SmsService);
    processTelegramFallback(job: Job<TelegramFallbackJob>): Promise<void>;
    processSmsFallback(job: Job<SmsFallbackJob>): Promise<void>;
}
export {};
