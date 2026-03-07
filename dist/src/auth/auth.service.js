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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../prisma/prisma.service");
let AuthService = AuthService_1 = class AuthService {
    prisma;
    jwt;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(prisma, jwt) {
        this.prisma = prisma;
        this.jwt = jwt;
    }
    async login(dto) {
        const user = await this.prisma.user.findUnique({
            where: { employeeId: dto.employeeId },
        });
        if (!user || !user.isActive) {
            this.logger.warn(`Login failed — unknown or inactive employeeId: ${dto.employeeId}`);
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const hashToCheck = user.oneTimePinHash ?? user.pinHash;
        const isValid = await bcrypt.compare(dto.pin, hashToCheck);
        if (!isValid) {
            this.logger.warn(`Login failed — wrong PIN for employeeId: ${dto.employeeId}`);
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        const isFirstLogin = !!user.oneTimePinHash;
        this.logger.log(`Login success — employeeId: ${user.employeeId}, role: ${user.role}` +
            (isFirstLogin ? ' [first login]' : ''));
        const token = this.signToken(user.id, user.employeeId, user.role);
        return {
            accessToken: token,
            requiresPinChange: !user.isPinChanged,
            role: user.role,
            employeeId: user.employeeId,
        };
    }
    async changePin(userId, dto) {
        const user = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
        });
        const hashToCheck = user.oneTimePinHash ?? user.pinHash;
        const isValid = await bcrypt.compare(dto.currentPin, hashToCheck);
        if (!isValid) {
            this.logger.warn(`PIN change failed — wrong current PIN for userId: ${userId}`);
            throw new common_1.BadRequestException('Current PIN is incorrect');
        }
        if (dto.currentPin === dto.newPin) {
            throw new common_1.BadRequestException('New PIN must be different from current PIN');
        }
        const newHash = await bcrypt.hash(dto.newPin, 12);
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                pinHash: newHash,
                oneTimePinHash: null,
                isPinChanged: true,
            },
        });
        this.logger.log(`PIN changed successfully for userId: ${userId}`);
        return { message: 'PIN changed successfully' };
    }
    signToken(userId, employeeId, role) {
        return this.jwt.sign({ sub: userId, employeeId, role }, { expiresIn: '7d' });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map