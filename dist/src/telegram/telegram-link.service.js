"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TelegramLinkService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramLinkService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const telegram_service_1 = require("./telegram.service");
const crypto = __importStar(require("crypto"));
let TelegramLinkService = TelegramLinkService_1 = class TelegramLinkService {
    prisma;
    telegram;
    logger = new common_1.Logger(TelegramLinkService_1.name);
    constructor(prisma, telegram) {
        this.prisma = prisma;
        this.telegram = telegram;
    }
    async generateLinkToken(userId) {
        await this.prisma.telegramLinkToken.updateMany({
            where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
            data: { expiresAt: new Date() },
        });
        const token = this.randomToken();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await this.prisma.telegramLinkToken.create({
            data: { userId, token, expiresAt },
        });
        const botUsername = await this.getBotUsername();
        const instructions = `Open Telegram and message @${botUsername}:\n\n` +
            `/link ${token}\n\n` +
            `This token expires in 10 minutes and can only be used once.`;
        return { token, instructions };
    }
    async handleLinkCommand(chatId, token) {
        const record = await this.prisma.telegramLinkToken.findUnique({
            where: { token },
            include: { user: { select: { id: true, telegramChatId: true } } },
        });
        if (!record || record.usedAt || record.expiresAt < new Date()) {
            await this.telegram.sendMessage(chatId, '❌ Invalid or expired token. Please generate a new one from the TEE Union app.');
            return;
        }
        if (record.user.telegramChatId && record.user.telegramChatId !== chatId) {
            await this.telegram.sendMessage(chatId, '⚠️ This account is already linked to a different Telegram account. Please contact your union admin.');
            return;
        }
        await this.prisma.$transaction([
            this.prisma.telegramLinkToken.update({
                where: { token },
                data: { usedAt: new Date() },
            }),
            this.prisma.user.update({
                where: { id: record.userId },
                data: {
                    telegramChatId: chatId,
                    telegramLinkedAt: new Date(),
                },
            }),
        ]);
        this.logger.log(`Telegram linked for user ${record.userId} → chatId ${chatId}`);
        await this.telegram.sendMessage(chatId, '✅ Your Telegram account is now linked to TEE 1104 Union!\n\n' +
            'You will receive notifications here when the app cannot reach you.\n\n' +
            'To unlink, go to Settings in the TEE Union app.');
    }
    async unlinkTelegram(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { telegramChatId: true },
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        await this.prisma.user.update({
            where: { id: userId },
            data: { telegramChatId: null, telegramLinkedAt: null },
        });
        if (user.telegramChatId) {
            await this.telegram.sendMessage(user.telegramChatId, '🔓 Your Telegram account has been unlinked from TEE 1104 Union.\n\n' +
                'You will no longer receive notifications here.');
        }
    }
    registerCommandHandlers() {
        if (!this.telegram.isEnabled())
            return;
        const bot = this.telegram.getBot();
        bot.onText(/^\/link\s+(\S+)$/, async (msg, match) => {
            const chatId = BigInt(msg.chat.id);
            const token = match?.[1] ?? '';
            this.logger.log(`/link command received from chatId ${chatId}`);
            await this.handleLinkCommand(chatId, token);
        });
        bot.onText(/^\/start$/, async (msg) => {
            await this.telegram.sendMessage(msg.chat.id, 'Welcome to TEE 1104 Union Bot! 👷\n\n' +
                'To link your account, open the TEE Union app and go to:\n' +
                'Settings → Telegram Notifications → Link Account\n\n' +
                'You will receive a one-time token to enter here.');
        });
        this.logger.log('Telegram command handlers registered ✅');
    }
    randomToken() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        return Array.from(crypto.randomBytes(8))
            .map((b) => chars[b % chars.length])
            .join('');
    }
    async getBotUsername() {
        try {
            const me = await this.telegram.getBot().getMe();
            return me.username ?? 'tee1104unionbot';
        }
        catch {
            return 'tee1104unionbot';
        }
    }
};
exports.TelegramLinkService = TelegramLinkService;
exports.TelegramLinkService = TelegramLinkService = TelegramLinkService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        telegram_service_1.TelegramService])
], TelegramLinkService);
//# sourceMappingURL=telegram-link.service.js.map