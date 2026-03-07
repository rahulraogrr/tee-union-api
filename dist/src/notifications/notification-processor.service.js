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
var NotificationProcessorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationProcessorService = void 0;
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const telegram_service_1 = require("../telegram/telegram.service");
const sms_service_1 = require("../sms/sms.service");
const notification_dispatcher_service_1 = require("./notification-dispatcher.service");
let NotificationProcessorService = NotificationProcessorService_1 = class NotificationProcessorService {
    prisma;
    telegram;
    sms;
    logger = new common_1.Logger(NotificationProcessorService_1.name);
    constructor(prisma, telegram, sms) {
        this.prisma = prisma;
        this.telegram = telegram;
        this.sms = sms;
    }
    async processTelegramFallback(job) {
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
    async processSmsFallback(job) {
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
};
exports.NotificationProcessorService = NotificationProcessorService;
__decorate([
    (0, bull_1.Process)(notification_dispatcher_service_1.JOB_TELEGRAM_FALLBACK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationProcessorService.prototype, "processTelegramFallback", null);
__decorate([
    (0, bull_1.Process)(notification_dispatcher_service_1.JOB_SMS_FALLBACK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationProcessorService.prototype, "processSmsFallback", null);
exports.NotificationProcessorService = NotificationProcessorService = NotificationProcessorService_1 = __decorate([
    (0, bull_1.Processor)(notification_dispatcher_service_1.NOTIFICATION_QUEUE),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        telegram_service_1.TelegramService,
        sms_service_1.SmsService])
], NotificationProcessorService);
//# sourceMappingURL=notification-processor.service.js.map