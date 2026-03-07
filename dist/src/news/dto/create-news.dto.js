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
exports.CreateNewsDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateNewsDto {
    titleEn;
    titleTe;
    bodyEn;
    bodyTe;
    publish;
}
exports.CreateNewsDto = CreateNewsDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'Annual General Body Meeting – January 2026',
        description: 'Article headline in English (5–255 chars)',
        minLength: 5,
        maxLength: 255,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(5),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateNewsDto.prototype, "titleEn", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'వార్షిక సాధారణ సభ – జనవరి 2026',
        description: 'Article headline in Telugu (optional)',
        maxLength: 255,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateNewsDto.prototype, "titleTe", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'The Annual General Body Meeting will be held on 15 January 2026 at 10:00 AM at the Union Hall.',
        description: 'Full article body in English (min 20 chars)',
        minLength: 20,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(20),
    __metadata("design:type", String)
], CreateNewsDto.prototype, "bodyEn", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'వార్షిక సాధారణ సభ 15 జనవరి 2026న ఉదయం 10:00 గంటలకు యూనియన్ హాల్‌లో జరుగుతుంది.',
        description: 'Full article body in Telugu (optional)',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateNewsDto.prototype, "bodyTe", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        default: false,
        description: 'Publish immediately and broadcast to all active members via FCM / Telegram / SMS.',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateNewsDto.prototype, "publish", void 0);
//# sourceMappingURL=create-news.dto.js.map