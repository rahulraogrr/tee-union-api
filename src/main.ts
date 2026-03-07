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

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  // Allows OnModuleDestroy hooks (e.g. Prisma.$disconnect) to run cleanly
  app.enableShutdownHooks();

  // ── Security headers (Helmet) ─────────────────────────────────────────────
  // Sets X-Frame-Options, X-Content-Type-Options, CSP, etc.
  // Note: Disable contentSecurityPolicy for Swagger UI in development
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production',
    }),
  );

  // ── Response compression ──────────────────────────────────────────────────
  app.use(compression());

  // ── Global prefix ──────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── CORS ──────────────────────────────────────────────────────────────────
  // In production, replace '*' with your app's domain / bundle ID origin
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : '*';

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
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

  // ── Start server ───────────────────────────────────────────────────────────
  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`TEE 1104 Union API  →  http://localhost:${port}/api/v1`);
  logger.log(`Swagger docs        →  http://localhost:${port}/api/docs`);
}

bootstrap();
