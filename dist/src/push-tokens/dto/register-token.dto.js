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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegisterTokenDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
class RegisterTokenDto {
    token;
    platform;
}
exports.RegisterTokenDto = RegisterTokenDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'fDa9kX3z:APA91bH...',
        description: 'FCM registration token from Firebase SDK',
        maxLength: 4096,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(4096),
    __metadata("design:type", String)
], RegisterTokenDto.prototype, "token", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: client_1.PlatformType,
        example: client_1.PlatformType.android,
        description: 'Device platform — used for platform-specific FCM options',
    }),
    (0, class_validator_1.IsEnum)(client_1.PlatformType),
    __metadata("design:type", String)
], RegisterTokenDto.prototype, "platform", void 0);
//# sourceMappingURL=register-token.dto.js.map