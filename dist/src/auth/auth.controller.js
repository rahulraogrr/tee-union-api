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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const auth_service_1 = require("./auth.service");
const login_dto_1 = require("./dto/login.dto");
const change_pin_dto_1 = require("./dto/change-pin.dto");
const public_decorator_1 = require("../common/decorators/public.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const responses_1 = require("../common/swagger/responses");
let AuthController = class AuthController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    login(dto) {
        return this.authService.login(dto);
    }
    changePin(userId, dto) {
        return this.authService.changePin(userId, dto);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, throttler_1.Throttle)({ default: { ttl: 900_000, limit: 5 } }),
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiTooManyRequestsResponse)({ description: 'Too many login attempts — try again in 15 minutes' }),
    (0, swagger_1.ApiOperation)({
        summary: 'Login with employee ID and 4-digit PIN',
        description: 'Validates the employee ID + PIN and returns a signed JWT.\n\n' +
            'If `mustChangePin` is `true` the user **must** call `POST /auth/change-pin` before ' +
            'using any other endpoint.',
    }),
    (0, swagger_1.ApiOkResponse)({ type: responses_1.LoginResponseDto, description: 'Login successful' }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Invalid employee ID or PIN' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Validation error — PIN must be exactly 4 digits' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('change-pin'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiBearerAuth)('bearer'),
    (0, swagger_1.ApiOperation)({
        summary: 'Change your 4-digit PIN',
        description: 'Requires the current PIN and a new PIN. ' +
            'Must be called after first login when `mustChangePin` is `true`.',
    }),
    (0, swagger_1.ApiOkResponse)({ type: responses_1.OkResponseDto, description: 'PIN changed successfully' }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Current PIN is incorrect' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'New PIN must be exactly 4 numeric digits' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, change_pin_dto_1.ChangePinDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "changePin", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('Auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map