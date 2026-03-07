import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import * as Joi from 'joi';

import { HttpLoggerMiddleware } from './common/middleware/http-logger.middleware';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MembersModule } from './members/members.module';
import { TicketsModule } from './tickets/tickets.module';
import { NewsModule } from './news/news.module';
import { EventsModule } from './events/events.module';
import { NotificationsModule } from './notifications/notifications.module';
import { HealthModule } from './health/health.module';
import { PushTokensModule } from './push-tokens/push-tokens.module';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

/** Joi schema — validates required env vars at startup; fails fast if anything is missing. */
const envValidationSchema = Joi.object({
  NODE_ENV:     Joi.string().valid('development', 'production', 'test').default('development'),
  PORT:         Joi.number().default(3000),

  // Database — required
  DATABASE_URL: Joi.string().required(),

  // JWT — required
  JWT_SECRET:   Joi.string().min(32).required(),

  // Redis — optional (app degrades gracefully without it)
  REDIS_HOST:   Joi.string().default('localhost'),
  REDIS_PORT:   Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional().allow(''),

  // CORS — optional
  CORS_ORIGINS: Joi.string().optional().allow(''),

  // FCM — all three must be present together, or all absent
  FCM_PROJECT_ID:    Joi.string().optional().allow(''),
  FCM_CLIENT_EMAIL:  Joi.string().optional().allow(''),
  FCM_PRIVATE_KEY:   Joi.string().optional().allow(''),

  // Telegram — optional
  TELEGRAM_BOT_TOKEN:      Joi.string().optional().allow(''),
  TELEGRAM_WEBHOOK_SECRET: Joi.string().optional().allow(''),

  // AWS SNS — optional
  AWS_REGION:            Joi.string().optional().allow(''),
  AWS_ACCESS_KEY_ID:     Joi.string().optional().allow(''),
  AWS_SECRET_ACCESS_KEY: Joi.string().optional().allow(''),
});

@Module({
  imports: [
    // Config with Joi schema validation — throws on startup if required vars are missing
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),

    // Rate limiting — global defaults; tightened on /auth/login via @Throttle()
    // 60 requests per 60 seconds per IP (1 req/s burst budget)
    ThrottlerModule.forRoot([
      { name: 'global', ttl: 60_000, limit: 60 },
    ]),

    // Bull / Redis — used by notification queue
    // enableReadyCheck: false + lazyConnect: true mean the app starts
    // even if Redis is not yet available; queue jobs simply won't process.
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>('REDIS_HOST') ?? 'localhost',
          port: config.get<number>('REDIS_PORT') ?? 6379,
          password: config.get<string>('REDIS_PASSWORD') || undefined,
          enableReadyCheck: false,
          maxRetriesPerRequest: null,
          lazyConnect: true,
        },
      }),
      inject: [ConfigService],
    }),

    // Database
    PrismaModule,

    // Feature modules
    AuthModule,
    MembersModule,
    TicketsModule,
    NewsModule,
    EventsModule,

    // Notification system (FCM + Telegram + SMS + BullMQ)
    NotificationsModule,

    // Push token registration (FCM device tokens from mobile app)
    PushTokensModule,

    // Liveness + readiness health probes
    HealthModule,
  ],
  providers: [
    // Rate limiter guard applied globally — use @SkipThrottle() to opt out
    { provide: APP_GUARD, useClass: ThrottlerGuard },

    // JWT guard applied globally — use @Public() to opt out
    { provide: APP_GUARD, useClass: JwtAuthGuard },

    // Role guard applied globally — use @Roles(...) to restrict
    { provide: APP_GUARD, useClass: RolesGuard },

    // Global exception filter — consistent error response shape
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Assign a unique X-Request-Id to every request before logging
    consumer.apply(RequestIdMiddleware, HttpLoggerMiddleware).forRoutes('*');
  }
}
