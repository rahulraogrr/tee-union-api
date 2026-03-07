"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
const helmet_1 = __importDefault(require("helmet"));
const compression = require("compression");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        bufferLogs: true,
    });
    const logger = new common_1.Logger('Bootstrap');
    app.enableShutdownHooks();
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: process.env.NODE_ENV === 'production',
    }));
    app.use(compression());
    app.setGlobalPrefix('api/v1');
    const allowedOrigins = process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',')
        : '*';
    app.enableCors({
        origin: allowedOrigins,
        methods: ['GET', 'POST', 'PATCH', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
        exposedHeaders: ['X-Request-Id'],
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    const swaggerConfig = new swagger_1.DocumentBuilder()
        .setTitle('TEE 1104 Union API')
        .setDescription('NestJS + Prisma + PostgreSQL backend for the TEE 1104 Union mobile app.\n\n' +
        '**Authentication:** Employee ID + 4-digit PIN → JWT Bearer token.\n\n' +
        'All endpoints (except `POST /auth/login` and `POST /telegram/webhook`) require ' +
        'a valid `Authorization: Bearer <token>` header.')
        .setVersion('1.0')
        .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' }, 'bearer')
        .addTag('Auth', 'Login and PIN management')
        .addTag('Members', 'Member profiles and directory')
        .addTag('Tickets', 'Grievance ticketing system')
        .addTag('News', 'Union news and announcements')
        .addTag('Events', 'Union events and registrations')
        .addTag('Notifications', 'In-app notification inbox')
        .addTag('Telegram', 'Telegram bot account linking')
        .addTag('Push Tokens', 'FCM device token registration')
        .addTag('Health', 'Liveness and readiness probes')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
    swagger_1.SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: { persistAuthorization: true },
    });
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    logger.log(`TEE 1104 Union API  →  http://localhost:${port}/api/v1`);
    logger.log(`Swagger docs        →  http://localhost:${port}/api/docs`);
}
bootstrap();
//# sourceMappingURL=main.js.map