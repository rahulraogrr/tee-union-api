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
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const terminus_1 = require("@nestjs/terminus");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("../common/decorators/public.decorator");
const throttler_1 = require("@nestjs/throttler");
const prisma_health_1 = require("./prisma.health");
let HealthController = class HealthController {
    health;
    prismaIndicator;
    memory;
    constructor(health, prismaIndicator, memory) {
        this.health = health;
        this.prismaIndicator = prismaIndicator;
        this.memory = memory;
    }
    live() {
        return this.health.check([
            () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
        ]);
    }
    ready() {
        return this.health.check([
            () => this.prismaIndicator.isHealthy('database'),
        ]);
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)('live'),
    (0, swagger_1.ApiOperation)({
        summary: 'Liveness probe',
        description: 'Returns 200 while the process is running. Used by Kubernetes liveness checks.',
    }),
    (0, terminus_1.HealthCheck)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "live", null);
__decorate([
    (0, common_1.Get)('ready'),
    (0, swagger_1.ApiOperation)({
        summary: 'Readiness probe',
        description: 'Returns 200 when the database is reachable. ' +
            'Used by Kubernetes readiness checks and load balancer health checks.',
    }),
    (0, terminus_1.HealthCheck)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "ready", null);
exports.HealthController = HealthController = __decorate([
    (0, swagger_1.ApiTags)('Health'),
    (0, public_decorator_1.Public)(),
    (0, throttler_1.SkipThrottle)(),
    (0, common_1.Controller)('health'),
    __metadata("design:paramtypes", [terminus_1.HealthCheckService,
        prisma_health_1.PrismaHealthIndicator,
        terminus_1.MemoryHealthIndicator])
], HealthController);
//# sourceMappingURL=health.controller.js.map