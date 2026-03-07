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
var PushTokensService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushTokensService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let PushTokensService = PushTokensService_1 = class PushTokensService {
    prisma;
    logger = new common_1.Logger(PushTokensService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async register(userId, token, platform) {
        const existing = await this.prisma.pushToken.findFirst({ where: { token } });
        if (existing) {
            await this.prisma.pushToken.update({
                where: { id: existing.id },
                data: { userId, platform, lastUsedAt: new Date() },
            });
        }
        else {
            await this.prisma.pushToken.create({
                data: { userId, token, platform },
            });
        }
        this.logger.log(`Push token registered — userId: ${userId}, platform: ${platform}`);
        return { ok: true };
    }
    async unregister(userId, token) {
        const deleted = await this.prisma.pushToken.deleteMany({
            where: { userId, token },
        });
        if (deleted.count > 0) {
            this.logger.log(`Push token unregistered — userId: ${userId}`);
        }
        else {
            this.logger.warn(`Push token not found for removal — userId: ${userId}`);
        }
        return { ok: true };
    }
    async unregisterAll(userId) {
        const result = await this.prisma.pushToken.deleteMany({ where: { userId } });
        this.logger.log(`All push tokens cleared — userId: ${userId}, count: ${result.count}`);
        return { ok: true, removed: result.count };
    }
};
exports.PushTokensService = PushTokensService;
exports.PushTokensService = PushTokensService = PushTokensService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PushTokensService);
//# sourceMappingURL=push-tokens.service.js.map