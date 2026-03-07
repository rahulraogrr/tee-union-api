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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var TelegramService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
let TelegramService = TelegramService_1 = class TelegramService {
    config;
    logger = new common_1.Logger(TelegramService_1.name);
    bot;
    enabled = false;
    constructor(config) {
        this.config = config;
    }
    onModuleInit() {
        const token = this.config.get('TELEGRAM_BOT_TOKEN');
        if (!token) {
            this.logger.warn('TELEGRAM_BOT_TOKEN not configured — Telegram notifications disabled.');
            return;
        }
        const isDev = this.config.get('NODE_ENV') !== 'production';
        this.bot = new node_telegram_bot_api_1.default(token, { polling: isDev });
        this.enabled = true;
        this.logger.log(`Telegram bot initialised (${isDev ? 'polling' : 'webhook'}) ✅`);
    }
    isEnabled() {
        return this.enabled;
    }
    getBot() {
        return this.bot;
    }
    async sendNotification(chatId, title, body) {
        if (!this.enabled)
            return false;
        try {
            const text = `📢 *${this.escape(title)}*\n\n` +
                `${this.escape(body)}\n\n` +
                `_Open the TEE 1104 Union app for details\\._`;
            await this.bot.sendMessage(chatId.toString(), text, {
                parse_mode: 'MarkdownV2',
            });
            return true;
        }
        catch (err) {
            this.logger.error(`Telegram send failed for chatId ${chatId}`, err);
            return false;
        }
    }
    async sendMessage(chatId, text) {
        if (!this.enabled)
            return;
        try {
            await this.bot.sendMessage(chatId.toString(), text);
        }
        catch (err) {
            this.logger.error(`Telegram sendMessage failed`, err);
        }
    }
    escape(text) {
        return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
    }
};
exports.TelegramService = TelegramService;
exports.TelegramService = TelegramService = TelegramService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], TelegramService);
//# sourceMappingURL=telegram.service.js.map