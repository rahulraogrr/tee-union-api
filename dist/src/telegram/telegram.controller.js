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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var TelegramController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const config_1 = require("@nestjs/config");
const crypto = __importStar(require("crypto"));
const public_decorator_1 = require("../common/decorators/public.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const telegram_link_service_1 = require("./telegram-link.service");
const responses_1 = require("../common/swagger/responses");
let TelegramController = TelegramController_1 = class TelegramController {
    linkService;
    config;
    logger = new common_1.Logger(TelegramController_1.name);
    constructor(linkService, config) {
        this.linkService = linkService;
        this.config = config;
    }
    async handleWebhook(body, secret) {
        const expectedSecret = this.config.get('TELEGRAM_WEBHOOK_SECRET');
        if (expectedSecret) {
            const expected = crypto
                .createHmac('sha256', expectedSecret)
                .update(JSON.stringify(body))
                .digest('hex');
            if (secret !== expected) {
                this.logger.warn('Telegram webhook received with invalid secret');
                throw new common_1.UnauthorizedException('Invalid webhook secret');
            }
        }
        this.logger.debug('Telegram webhook update received');
        return { ok: true };
    }
    async generateLinkToken(user) {
        return this.linkService.generateLinkToken(user.id);
    }
    async unlinkTelegram(user) {
        await this.linkService.unlinkTelegram(user.id);
        return { ok: true };
    }
    async getLinkStatus(user) {
        return { linked: !!user.telegramChatId };
    }
};
exports.TelegramController = TelegramController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('webhook'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Telegram webhook (called by Telegram servers only)',
        description: 'Receives bot updates from Telegram. ' +
            'The `x-telegram-bot-api-secret-token` header is verified against `TELEGRAM_WEBHOOK_SECRET`. ' +
            'This endpoint should be whitelisted from JWT guard but protected by the HMAC secret.',
    }),
    (0, swagger_1.ApiOkResponse)({ type: responses_1.OkResponseDto, description: 'Update acknowledged' }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Invalid or missing webhook secret' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-telegram-bot-api-secret-token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TelegramController.prototype, "handleWebhook", null);
__decorate([
    (0, common_1.Post)('link-token'),
    (0, swagger_1.ApiBearerAuth)('bearer'),
    (0, swagger_1.ApiOperation)({
        summary: 'Generate a one-time Telegram link token',
        description: 'Returns a short-lived token and instructions. ' +
            'The user sends `/link <token>` to the bot in Telegram to link their account.',
    }),
    (0, swagger_1.ApiCreatedResponse)({ type: responses_1.TelegramLinkTokenDto, description: 'Link token generated' }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Missing or invalid JWT token' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TelegramController.prototype, "generateLinkToken", null);
__decorate([
    (0, common_1.Post)('unlink'),
    (0, swagger_1.ApiBearerAuth)('bearer'),
    (0, swagger_1.ApiOperation)({
        summary: 'Unlink Telegram from your account',
        description: 'Clears the stored Telegram chat ID. Fallback notifications via Telegram will stop.',
    }),
    (0, swagger_1.ApiOkResponse)({ type: responses_1.OkResponseDto, description: 'Telegram unlinked' }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Missing or invalid JWT token' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TelegramController.prototype, "unlinkTelegram", null);
__decorate([
    (0, common_1.Get)('status'),
    (0, swagger_1.ApiBearerAuth)('bearer'),
    (0, swagger_1.ApiOperation)({
        summary: 'Check if Telegram is linked for the current user',
    }),
    (0, swagger_1.ApiOkResponse)({ type: responses_1.TelegramStatusDto, description: 'Telegram link status' }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Missing or invalid JWT token' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TelegramController.prototype, "getLinkStatus", null);
exports.TelegramController = TelegramController = TelegramController_1 = __decorate([
    (0, swagger_1.ApiTags)('Telegram'),
    (0, common_1.Controller)('telegram'),
    __metadata("design:paramtypes", [telegram_link_service_1.TelegramLinkService,
        config_1.ConfigService])
], TelegramController);
//# sourceMappingURL=telegram.controller.js.map