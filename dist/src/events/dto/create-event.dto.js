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
exports.CreateEventDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class CreateEventDto {
    titleEn;
    titleTe;
    descriptionEn;
    descriptionTe;
    eventDate;
    location;
    maxCapacity;
    isVirtual;
    districtId;
    publish;
}
exports.CreateEventDto = CreateEventDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'District Workers Rally – Hyderabad',
        description: 'Event title in English (5–255 chars)',
        minLength: 5,
        maxLength: 255,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(5),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateEventDto.prototype, "titleEn", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'జిల్లా కార్మికుల ర్యాలీ – హైదరాబాద్',
        description: 'Event title in Telugu (optional)',
        maxLength: 255,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateEventDto.prototype, "titleTe", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'All union members from the Hyderabad district are requested to attend.',
        description: 'Event description in English (optional)',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEventDto.prototype, "descriptionEn", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'హైదరాబాద్ జిల్లా నుండి అన్ని యూనియన్ సభ్యులను హాజరవ్వమని కోరుతున్నారు.',
        description: 'Event description in Telugu (optional)',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEventDto.prototype, "descriptionTe", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '2026-04-15T10:00:00.000Z',
        description: 'Event date and time (ISO 8601)',
        format: 'date-time',
    }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateEventDto.prototype, "eventDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'NTR Stadium, Hyderabad',
        description: 'Venue name / address (omit for virtual events)',
        maxLength: 255,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateEventDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 500,
        description: 'Maximum number of registrations allowed (null = unlimited)',
        minimum: 1,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], CreateEventDto.prototype, "maxCapacity", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        default: false,
        description: 'Whether the event takes place online',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateEventDto.prototype, "isVirtual", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        description: 'Restrict event to a specific district (null = union-wide)',
        format: 'uuid',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateEventDto.prototype, "districtId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        default: false,
        description: 'Publish immediately and broadcast to eligible active members via FCM / Telegram / SMS.',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateEventDto.prototype, "publish", void 0);
//# sourceMappingURL=create-event.dto.js.map