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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var NotificationDispatcherService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationDispatcherService = exports.JOB_SMS_FALLBACK = exports.JOB_TELEGRAM_FALLBACK = exports.NOTIFICATION_QUEUE = void 0;
const common_1 = require("@nestjs/common");
const bull_1 = require("@nestjs/bull");
const prisma_service_1 = require("../prisma/prisma.service");
const fcm_service_1 = require("../fcm/fcm.service");
const telegram_service_1 = require("../telegram/telegram.service");
const sms_service_1 = require("../sms/sms.service");
const client_1 = require("@prisma/client");
exports.NOTIFICATION_QUEUE = 'notifications';
exports.JOB_TELEGRAM_FALLBACK = 'telegram-fallback';
exports.JOB_SMS_FALLBACK = 'sms-fallback';
let NotificationDispatcherService = NotificationDispatcherService_1 = class NotificationDispatcherService {
    prisma;
    fcm;
    telegram;
    sms;
    queue;
    logger = new common_1.Logger(NotificationDispatcherService_1.name);
    TELEGRAM_DELAY_MS = 5 * 60 * 1000;
    SMS_DELAY_MS = 15 * 60 * 1000;
    constructor(prisma, fcm, telegram, sms, queue) {
        this.prisma = prisma;
        this.fcm = fcm;
        this.telegram = telegram;
        this.sms = sms;
        this.queue = queue;
    }
    async dispatch(payload) {
        const { notificationId, userId, title, body, isUrgent, isCritical, data } = payload;
        this.logger.log(`Dispatching notification ${notificationId} → user ${userId}` +
            (isUrgent ? ' [URGENT]' : '') +
            (isCritical ? ' [CRITICAL]' : ''));
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
            await this.queue.add(exports.JOB_TELEGRAM_FALLBACK, { notificationId, userId, title, body, chatId: user.telegramChatId.toString() }, { delay, attempts: 3, backoff: { type: 'exponential', delay: 30_000 } });
        }
        if (isCritical && this.sms.isEnabled() && user.mobileNo) {
            await this.queue.add(exports.JOB_SMS_FALLBACK, { notificationId, userId, title, body, phone: user.mobileNo }, { delay: this.SMS_DELAY_MS, attempts: 2, backoff: { type: 'fixed', delay: 60_000 } });
        }
    }
    async broadcast(userIds, title, body, options) {
        const { type, referenceId, isUrgent, isCritical, data } = options ?? {};
        this.logger.log(`Broadcasting "${title}" to ${userIds.length} users`);
        const notifications = await this.prisma.notification.createManyAndReturn({
            data: userIds.map((uid) => ({
                userId: uid,
                type: type ?? client_1.NotificationType.system,
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
            await Promise.all(batch.map((n) => this.dispatch({
                notificationId: n.id,
                userId: n.userId,
                title,
                body,
                isUrgent,
                isCritical,
                data,
            })));
        }
    }
    async markRead(notificationId) {
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
};
exports.NotificationDispatcherService = NotificationDispatcherService;
exports.NotificationDispatcherService = NotificationDispatcherService = NotificationDispatcherService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(4, (0, bull_1.InjectQueue)(exports.NOTIFICATION_QUEUE)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        fcm_service_1.FcmService,
        telegram_service_1.TelegramService,
        sms_service_1.SmsService, Object])
], NotificationDispatcherService);
//# sourceMappingURL=notification-dispatcher.service.js.map