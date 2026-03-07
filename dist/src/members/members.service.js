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
var MembersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MembersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const pagination_1 = require("../common/utils/pagination");
let MembersService = MembersService_1 = class MembersService {
    prisma;
    logger = new common_1.Logger(MembersService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getMyProfile(userId) {
        this.logger.debug(`Fetching profile for userId: ${userId}`);
        const member = await this.prisma.member.findUnique({
            where: { userId },
            include: {
                employer: { select: { id: true, name: true, shortName: true } },
                designation: { select: { id: true, name: true } },
                district: { select: { id: true, name: true } },
                workUnit: { select: { id: true, name: true, unitType: true } },
                user: { select: { employeeId: true, email: true, role: true, lastLoginAt: true } },
            },
        });
        if (!member) {
            this.logger.warn(`Member profile not found for userId: ${userId}`);
            throw new common_1.NotFoundException('Member profile not found');
        }
        return member;
    }
    async findAll(filters) {
        const { districtId, employerId, designationId, isActive, page = 1 } = filters;
        const limit = (0, pagination_1.clampLimit)(filters.limit);
        const skip = (page - 1) * limit;
        this.logger.debug(`Listing members — page: ${page}, limit: ${limit}` +
            (districtId ? `, districtId: ${districtId}` : '') +
            (employerId ? `, employerId: ${employerId}` : ''));
        const where = {
            ...(districtId && { districtId }),
            ...(employerId && { employerId }),
            ...(designationId && { designationId }),
            ...(isActive !== undefined && { isActive }),
        };
        const [data, total] = await this.prisma.$transaction([
            this.prisma.member.findMany({
                where,
                skip,
                take: limit,
                include: {
                    employer: { select: { shortName: true } },
                    designation: { select: { name: true } },
                    district: { select: { name: true } },
                    workUnit: { select: { name: true } },
                },
                orderBy: { fullName: 'asc' },
            }),
            this.prisma.member.count({ where }),
        ]);
        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    async findOne(id) {
        this.logger.debug(`Fetching member by id: ${id}`);
        const member = await this.prisma.member.findUnique({
            where: { id },
            include: {
                employer: true,
                designation: true,
                district: true,
                workUnit: true,
                user: { select: { employeeId: true, email: true, mobileNo: true, role: true, isActive: true } },
                memberDesignationHistories: {
                    include: {
                        designation: { select: { name: true } },
                        employer: { select: { shortName: true } },
                    },
                    orderBy: { validFrom: 'desc' },
                },
            },
        });
        if (!member) {
            this.logger.warn(`Member not found — id: ${id}`);
            throw new common_1.NotFoundException(`Member ${id} not found`);
        }
        return member;
    }
    async updateMyProfile(userId, data) {
        const member = await this.prisma.member.findUnique({ where: { userId } });
        if (!member) {
            this.logger.warn(`Profile update failed — member not found for userId: ${userId}`);
            throw new common_1.NotFoundException('Member profile not found');
        }
        const fields = Object.keys(data).filter((k) => data[k] !== undefined);
        this.logger.log(`Profile updated for userId: ${userId} — fields: ${fields.join(', ')}`);
        return this.prisma.member.update({
            where: { userId },
            data: { ...data, profileComplete: true, updatedAt: new Date() },
        });
    }
};
exports.MembersService = MembersService;
exports.MembersService = MembersService = MembersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MembersService);
//# sourceMappingURL=members.service.js.map