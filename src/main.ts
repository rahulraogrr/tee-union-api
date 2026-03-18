import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import compression = require('compression');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Suppress NestJS bootstrap noise; our HttpLoggerMiddleware handles request logging
    bufferLogs: true,
  });

  const logger = new Logger('Bootstrap');
  const isProduction = process.env.NODE_ENV === 'production';

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  // Allows OnModuleDestroy hooks (e.g. Prisma.$disconnect) to run cleanly
  app.enableShutdownHooks();

  // ── Security headers (Helmet) ─────────────────────────────────────────────
  // CSP is enabled in production; disabled in dev so Swagger UI loads correctly
  app.use(
    helmet({
      contentSecurityPolicy: isProduction,
    }),
  );

  // ── Response compression ──────────────────────────────────────────────────
  app.use(compression());

  // ── Global prefix ──────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── CORS ──────────────────────────────────────────────────────────────────
  // SECURITY (OWASP A05): Never fall back to wildcard '*' in production.
  // CORS_ORIGINS must be explicitly set to a comma-separated list of allowed origins.
  if (isProduction && !process.env.CORS_ORIGINS) {
    // Warn but don't crash — add CORS_ORIGINS to Railway env vars to lock this down.
    // TODO: Set CORS_ORIGINS in Railway (e.g. "https://your-app-domain.com")
    new Logger('Bootstrap').warn(
      '[SECURITY] CORS_ORIGINS is not set in production. ' +
      'All origins are currently allowed. Add CORS_ORIGINS to Railway env vars immediately.',
    );
  }

  const allowedOrigins: string | string[] = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : '*'; // temporary fallback until CORS_ORIGINS is set in Railway

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
    credentials: true,
  });

  // ── Validation pipe (class-validator) ─────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,             // Strip unknown properties
      forbidNonWhitelisted: true,  // Reject requests with extra properties
      transform: true,             // Auto-transform types (string → number, etc.)
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Swagger / OpenAPI ──────────────────────────────────────────────────────
  // SECURITY (OWASP A05): Swagger is disabled in production to avoid exposing
  // the full API surface to attackers. Set ENABLE_SWAGGER=true to force-enable.
  const swaggerEnabled = !isProduction || process.env.ENABLE_SWAGGER === 'true';

  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('TEE 1104 Union API')
      .setDescription(
        'NestJS + Prisma + PostgreSQL backend for the TEE 1104 Union mobile app.\n\n' +
        '**Authentication:** Employee ID + 4-digit PIN → JWT Bearer token.\n\n' +
        'All endpoints (except `POST /auth/login` and `POST /telegram/webhook`) require ' +
        'a valid `Authorization: Bearer <token>` header.',
      )
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
        'bearer',
      )
      .addTag('Auth',          'Login and PIN management')
      .addTag('Members',       'Member profiles and directory')
      .addTag('Tickets',       'Grievance ticketing system')
      .addTag('News',          'Union news and announcements')
      .addTag('Events',        'Union events and registrations')
      .addTag('Notifications', 'In-app notification inbox')
      .addTag('Telegram',      'Telegram bot account linking')
      .addTag('Push Tokens',   'FCM device token registration')
      .addTag('Health',        'Liveness and readiness probes')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  // ── Security warnings ─────────────────────────────────────────────────────
  if (process.env.TELEGRAM_BOT_TOKEN && !process.env.TELEGRAM_WEBHOOK_SECRET) {
    logger.warn(
      '[SECURITY] TELEGRAM_BOT_TOKEN is set but TELEGRAM_WEBHOOK_SECRET is missing. ' +
      'Add TELEGRAM_WEBHOOK_SECRET (min 16 chars) in Railway env vars to secure the webhook.',
    );
  }

  // ── Start server ───────────────────────────────────────────────────────────
  const port = process.env.PORT ?? 3000;
  const env  = process.env.NODE_ENV ?? 'development';
  await app.listen(port);

  logger.log(`TEE 1104 Union API  →  http://localhost:${port}/api/v1`);
  logger.log(`Swagger docs        →  ${swaggerEnabled ? `http://localhost:${port}/api/docs` : 'DISABLED (production)'}`);
  logger.log(`Environment         →  ${env}`);
  logger.log(`CORS origins        →  ${allowedOrigins.join(', ')}`);
  logger.log(
    `Integrations        →  ` +
    `FCM: ${process.env.FCM_PROJECT_ID ? '✅' : '⚠️ disabled'}  ` +
    `Telegram: ${process.env.TELEGRAM_BOT_TOKEN ? '✅' : '⚠️ disabled'}  ` +
    `SMS: ${process.env.AWS_ACCESS_KEY_ID ? '✅' : '⚠️ disabled'}`,
  );
}

bootstrap();
