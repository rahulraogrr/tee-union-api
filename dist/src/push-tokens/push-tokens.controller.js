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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushTokensController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const push_tokens_service_1 = require("./push-tokens.service");
const register_token_dto_1 = require("./dto/register-token.dto");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const responses_1 = require("../common/swagger/responses");
let PushTokensController = class PushTokensController {
    pushTokensService;
    constructor(pushTokensService) {
        this.pushTokensService = pushTokensService;
    }
    register(userId, dto) {
        return this.pushTokensService.register(userId, dto.token, dto.platform);
    }
    unregister(userId, dto) {
        return this.pushTokensService.unregister(userId, dto.token);
    }
    unregisterAll(userId) {
        return this.pushTokensService.unregisterAll(userId);
    }
};
exports.PushTokensController = PushTokensController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({
        summary: 'Register a device push token',
        description: 'Call this immediately after the Firebase SDK delivers a new registration token. ' +
            'Safe to call multiple times with the same token (idempotent upsert).',
    }),
    (0, swagger_1.ApiCreatedResponse)({ type: responses_1.OkResponseDto, description: 'Token registered' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, register_token_dto_1.RegisterTokenDto]),
    __metadata("design:returntype", void 0)
], PushTokensController.prototype, "register", null);
__decorate([
    (0, common_1.Delete)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Unregister a specific device push token',
        description: 'Call on single-device logout or when the app detects its token has been revoked.',
    }),
    (0, swagger_1.ApiOkResponse)({ type: responses_1.OkResponseDto, description: 'Token removed (or was not found)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PushTokensController.prototype, "unregister", null);
__decorate([
    (0, common_1.Delete)('all'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Unregister all push tokens for the current user',
        description: 'Clears every device token. Push notifications will stop for all devices.',
    }),
    (0, swagger_1.ApiOkResponse)({ description: '{ ok: true, removed: <count> }' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PushTokensController.prototype, "unregisterAll", null);
exports.PushTokensController = PushTokensController = __decorate([
    (0, swagger_1.ApiTags)('Push Tokens'),
    (0, swagger_1.ApiBearerAuth)('bearer'),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Missing or invalid JWT token' }),
    (0, common_1.Controller)('push-tokens'),
    __metadata("design:paramtypes", [push_tokens_service_1.PushTokensService])
], PushTokensController);
//# sourceMappingURL=push-tokens.controller.js.map