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
exports.UpdateProfileDto = exports.MaritalStatus = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var MaritalStatus;
(function (MaritalStatus) {
    MaritalStatus["single"] = "single";
    MaritalStatus["married"] = "married";
    MaritalStatus["divorced"] = "divorced";
    MaritalStatus["widowed"] = "widowed";
})(MaritalStatus || (exports.MaritalStatus = MaritalStatus = {}));
class UpdateProfileDto {
    address;
    mobileNo;
    maritalStatus;
}
exports.UpdateProfileDto = UpdateProfileDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: '12-3, MG Road, Hyderabad, Telangana 500001',
        description: 'Residential address (max 500 chars)',
        maxLength: 500,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: '+919876543210',
        description: 'Mobile number in E.164 format',
        pattern: '^\\+91\\d{10}$',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\+91\d{10}$/, { message: 'mobileNo must be a valid Indian number in +91XXXXXXXXXX format' }),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "mobileNo", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: MaritalStatus,
        example: MaritalStatus.married,
        description: 'Marital status',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(MaritalStatus),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "maritalStatus", void 0);
//# sourceMappingURL=update-profile.dto.js.map