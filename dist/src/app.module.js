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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const bull_1 = require("@nestjs/bull");
const throttler_1 = require("@nestjs/throttler");
const Joi = __importStar(require("joi"));
const http_logger_middleware_1 = require("./common/middleware/http-logger.middleware");
const request_id_middleware_1 = require("./common/middleware/request-id.middleware");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const members_module_1 = require("./members/members.module");
const tickets_module_1 = require("./tickets/tickets.module");
const news_module_1 = require("./news/news.module");
const events_module_1 = require("./events/events.module");
const notifications_module_1 = require("./notifications/notifications.module");
const health_module_1 = require("./health/health.module");
const push_tokens_module_1 = require("./push-tokens/push-tokens.module");
const jwt_auth_guard_1 = require("./common/guards/jwt-auth.guard");
const roles_guard_1 = require("./common/guards/roles.guard");
const all_exceptions_filter_1 = require("./common/filters/all-exceptions.filter");
const envValidationSchema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
    PORT: Joi.number().default(3000),
    DATABASE_URL: Joi.string().required(),
    JWT_SECRET: Joi.string().min(32).required(),
    REDIS_HOST: Joi.string().default('localhost'),
    REDIS_PORT: Joi.number().default(6379),
    REDIS_PASSWORD: Joi.string().optional().allow(''),
    CORS_ORIGINS: Joi.string().optional().allow(''),
    FCM_PROJECT_ID: Joi.string().optional().allow(''),
    FCM_CLIENT_EMAIL: Joi.string().optional().allow(''),
    FCM_PRIVATE_KEY: Joi.string().optional().allow(''),
    TELEGRAM_BOT_TOKEN: Joi.string().optional().allow(''),
    TELEGRAM_WEBHOOK_SECRET: Joi.string().optional().allow(''),
    AWS_REGION: Joi.string().optional().allow(''),
    AWS_ACCESS_KEY_ID: Joi.string().optional().allow(''),
    AWS_SECRET_ACCESS_KEY: Joi.string().optional().allow(''),
});
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(request_id_middleware_1.RequestIdMiddleware, http_logger_middleware_1.HttpLoggerMiddleware).forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                validationSchema: envValidationSchema,
                validationOptions: { abortEarly: false },
            }),
            throttler_1.ThrottlerModule.forRoot([
                { name: 'global', ttl: 60_000, limit: 60 },
            ]),
            bull_1.BullModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (config) => ({
                    redis: {
                        host: config.get('REDIS_HOST') ?? 'localhost',
                        port: config.get('REDIS_PORT') ?? 6379,
                        password: config.get('REDIS_PASSWORD') || undefined,
                        enableReadyCheck: false,
                        maxRetriesPerRequest: null,
                        lazyConnect: true,
                    },
                }),
                inject: [config_1.ConfigService],
            }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            members_module_1.MembersModule,
            tickets_module_1.TicketsModule,
            news_module_1.NewsModule,
            events_module_1.EventsModule,
            notifications_module_1.NotificationsModule,
            push_tokens_module_1.PushTokensModule,
            health_module_1.HealthModule,
        ],
        providers: [
            { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
            { provide: core_1.APP_GUARD, useClass: jwt_auth_guard_1.JwtAuthGuard },
            { provide: core_1.APP_GUARD, useClass: roles_guard_1.RolesGuard },
            { provide: core_1.APP_FILTER, useClass: all_exceptions_filter_1.AllExceptionsFilter },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map