# TEE 1104 Union API — Developer Skills Reference

> A living technical reference for engineers working on this codebase.
> It answers "how does X work?" and "where do I add Y?"

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Project Layout](#2-project-layout)
3. [Database Schema Conventions](#3-database-schema-conventions)
4. [Authentication & Authorisation](#4-authentication--authorisation)
5. [Module Anatomy](#5-module-anatomy)
6. [Notification System](#6-notification-system)
7. [Push Token Registration](#7-push-token-registration)
8. [Rate Limiting](#8-rate-limiting)
9. [Health Checks](#9-health-checks)
10. [Security Hardening](#10-security-hardening)
11. [Logging Conventions](#11-logging-conventions)
12. [Swagger / OpenAPI](#12-swagger--openapi)
13. [DTOs & Validation](#13-dtos--validation)
14. [Pagination](#14-pagination)
15. [Testing Strategy](#15-testing-strategy)
16. [Environment Variables](#16-environment-variables)
17. [Docker / Local Dev Setup](#17-docker--local-dev-setup)
18. [Adding a New Feature Module](#18-adding-a-new-feature-module)
19. [Common Gotchas](#19-common-gotchas)

---

## 1. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | ≥ 20 |
| Framework | NestJS | ^11 |
| ORM | Prisma | ^7 (driver-adapters preview) |
| Database | PostgreSQL | 16 |
| Queue / Jobs | BullMQ via `@nestjs/bull` | ^11 |
| Cache / Broker | Redis | 7 |
| Push notifications | Firebase Admin SDK (FCM) | ^13 |
| Telegram bot | `node-telegram-bot-api` | ^0.67 |
| SMS | AWS SNS (`@aws-sdk/client-sns`) | ^3 |
| Auth | JWT (`@nestjs/jwt` + `passport-jwt`) | — |
| Validation | `class-validator` + `class-transformer` | ^0.14 |
| Docs | `@nestjs/swagger` | ^11 |
| Testing | Jest | ^29 |
| Linting | ESLint (flat config) | — |

---

## 2. Project Layout

```
tee-union-api/
├── src/
│   ├── main.ts                        # Bootstrap: global prefix, CORS, pipes, Swagger
│   ├── app.module.ts                  # Root module — wires BullMQ, all feature modules, middleware
│   │
│   ├── auth/                          # JWT login, PIN change
│   │   ├── dto/                       # LoginDto, ChangePinDto
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   └── jwt.strategy.ts            # Passport strategy; attaches full user to request
│   │
│   ├── members/                       # Member profile reads & self-service updates
│   │   ├── dto/                       # UpdateProfileDto
│   │   ├── members.controller.ts
│   │   ├── members.service.ts
│   │   └── members.module.ts
│   │
│   ├── tickets/                       # Grievance ticketing (create, comment, status)
│   │   ├── dto/                       # CreateTicketDto, AddCommentDto, UpdateStatusDto
│   │   ├── tickets.controller.ts
│   │   ├── tickets.service.ts
│   │   └── tickets.module.ts
│   │
│   ├── news/                          # Union news articles
│   │   ├── dto/                       # CreateNewsDto
│   │   ├── news.controller.ts
│   │   ├── news.service.ts
│   │   └── news.module.ts
│   │
│   ├── events/                        # Union events & registrations
│   │   ├── dto/                       # CreateEventDto
│   │   ├── events.controller.ts
│   │   ├── events.service.ts
│   │   └── events.module.ts
│   │
│   ├── notifications/                 # Notification inbox + multi-channel dispatch
│   │   ├── notification-dispatcher.service.ts   # Orchestrates FCM → Telegram → SMS
│   │   ├── notification-processor.service.ts    # BullMQ job processor (fallback channels)
│   │   ├── notifications.controller.ts
│   │   ├── notifications.service.ts
│   │   └── notifications.module.ts
│   │
│   ├── fcm/                           # Firebase Cloud Messaging wrapper
│   │   ├── fcm.service.ts
│   │   └── fcm.module.ts
│   │
│   ├── telegram/                      # Telegram bot account linking + webhook
│   │   ├── telegram-link.service.ts   # Token generation & /link command handler
│   │   ├── telegram.service.ts        # Core bot message sender
│   │   ├── telegram.controller.ts     # Webhook + link-token + unlink endpoints
│   │   └── telegram.module.ts
│   │
│   ├── sms/                           # AWS SNS SMS sender
│   │   ├── sms.service.ts
│   │   └── sms.module.ts
│   │
│   ├── prisma/                        # Prisma client wrapper (singleton)
│   │   ├── prisma.service.ts
│   │   └── prisma.module.ts
│   │
│   └── common/                        # Shared cross-cutting concerns
│       ├── decorators/
│       │   ├── current-user.decorator.ts   # @CurrentUser() — extracts from JWT payload
│       │   ├── public.decorator.ts         # @Public() — bypasses JWT guard
│       │   └── roles.decorator.ts          # @Roles(...) — restricts by UserRole
│       ├── filters/
│       │   └── all-exceptions.filter.ts    # Global error handler; WARN for 4xx, ERROR for 5xx
│       ├── guards/
│       │   ├── jwt-auth.guard.ts           # Applied globally; skips @Public() routes
│       │   └── roles.guard.ts              # Applied globally; enforces @Roles()
│       ├── middleware/
│       │   └── http-logger.middleware.ts   # Logs method + path + status + duration
│       └── swagger/
│           └── responses.ts               # Shared Swagger response schema classes
│
├── docker-compose.yml                 # PostgreSQL 16 + Redis 7 for local dev
├── SKILLS.md                          # This file
└── README.md                          # Quick-start guide
```

---

## 3. Database Schema Conventions

- All primary keys are **UUID** (`@id @default(uuid())`).
- Enum values are **lowercase_snake_case** (e.g., `ticket_update`, `in_progress`).
  Always import from `@prisma/client` — never hardcode strings.
- Timestamps: `createdAt` / `updatedAt` on most tables; `sentAt` on `Notification`.
- Notification relation: `User` has a `pushTokens` relation (`PushToken[]`), **not** `deviceTokens`.
- Mobile number field on `User` is **`mobileNo`**, not `mobileNumber`.
- The two SQL migration files (`tee_1104_union_schema_v6.sql` and `tee_1104_union_notification_migration.sql`) must both be applied for a working DB.

---

## 4. Authentication & Authorisation

### Flow

```
POST /api/v1/auth/login
  → validates employeeId + PIN (bcrypt, 12 rounds)
  → if oneTimePinHash present → checks that instead
  → updates lastLoginAt
  → returns JWT (7-day), requiresPinChange flag, role, employeeId
```

The JWT payload contains:

```json
{ "sub": "<userId>", "employeeId": "PILOT-0001", "role": "member" }
```

`jwt.strategy.ts` fetches the full user row from DB on every request and attaches it to `req.user`. This means `@CurrentUser()` always has fresh data.

### Guards (both applied globally in AppModule)

| Guard | Behaviour |
|---|---|
| `JwtAuthGuard` | Verifies Bearer token; skip with `@Public()` |
| `RolesGuard` | Checks `req.user.role` against `@Roles(...)` metadata; no decorator = all authenticated roles pass |

### Roles (Prisma `UserRole` enum)

`member` · `rep` · `zonal_officer` · `admin` · `super_admin`

### Adding a public endpoint

```typescript
@Public()
@Get('health')
health() { return { status: 'ok' }; }
```

### Adding an admin-only endpoint

```typescript
@Roles(UserRole.super_admin, UserRole.admin)
@Delete(':id')
remove(@Param('id') id: string) { … }
```

---

## 5. Module Anatomy

Every feature module follows the same pattern:

```
feature/
├── dto/              ← Input validation (class-validator + @ApiProperty)
├── feature.controller.ts   ← Route handlers, Swagger decorators, @CurrentUser
├── feature.service.ts      ← Business logic, Prisma queries, Logger
└── feature.module.ts       ← Wires providers + imports
```

**Services** never throw HTTP exceptions from notification helpers — all `notifyUser()` / `broadcastToAll()` calls are wrapped in try/catch and only warn-logged on failure, so a notification outage never breaks the primary flow.

---

## 6. Notification System

### Architecture

```
Feature service (e.g. TicketsService)
  └─► NotificationDispatcherService.dispatch(payload)
        ├─► prisma.notification.create()         — DB record first
        ├─► FcmService.sendToTokens()             — immediate push (if tokens exist)
        ├─► Bull queue: telegram-fallback (5 min delay)
        └─► Bull queue: sms-fallback     (15 min delay)

NotificationProcessorService (BullMQ @Processor)
  ├─► processTelegramFallback(job)
  │     └─► skips if notification.isRead OR telegramChatId missing
  └─► processSmsFallback(job)
        └─► skips if notification.isRead OR mobileNo missing
```

### Dispatch helpers

```typescript
// Single user
await this.dispatcher.dispatch({
  notificationId: notification.id,
  userId,
  title: 'Hello',
  body: 'World',
  isUrgent: false,
  isCritical: false,
});

// Bulk (batched in groups of 50)
await this.dispatcher.broadcast(userIds, title, body, {
  type: NotificationType.news,
  referenceId: newsId,
});

// Mark read + cancel pending Bull jobs
await this.dispatcher.markRead(notificationId);
```

### NotificationType enum values

```typescript
NotificationType.ticket_update   // Ticket created / status changed / new reply
NotificationType.news            // News article published
NotificationType.event           // Event broadcast or registration confirmation
NotificationType.system          // System-level messages
```

### Channel graceful degradation

All three channels gracefully disable themselves when credentials are absent:

| Channel | Check |
|---|---|
| FCM | `FCM_PROJECT_ID` env var present |
| Telegram | `TELEGRAM_BOT_TOKEN` env var present |
| SMS | `AWS_REGION` + `AWS_ACCESS_KEY_ID` env vars present |

The app starts and functions normally without any of them.

### Redis / BullMQ optional start

`app.module.ts` configures `lazyConnect: true` and `enableReadyCheck: false` so the API boots and handles requests even if Redis is unavailable. Telegram/SMS fallbacks simply won't queue.

---

## 7. Push Token Registration

FCM push notifications require the mobile app to store its device token in the API.
Without this the `pushTokens` relation is always empty and FCM silently sends nothing.

### Endpoints (`/api/v1/push-tokens`)

| Method | Path | Description |
|---|---|---|
| `POST` | `/push-tokens` | Register a new FCM token (idempotent) |
| `DELETE` | `/push-tokens` | Remove a specific token (logout from one device) |
| `DELETE` | `/push-tokens/all` | Remove all tokens (logout from all devices) |

### Mobile app integration

```typescript
// Call this after Firebase.messaging().getToken() resolves
await api.post('/push-tokens', {
  token: fcmToken,   // string from Firebase SDK
  platform: 'android' | 'ios',
});

// Call this on logout
await api.delete('/push-tokens', { data: { token: fcmToken } });
```

Re-registering the same token is safe — it's an idempotent `findFirst + update/create`.

---

## 8. Rate Limiting

Rate limiting is applied globally via `@nestjs/throttler` (registered in `AppModule`).

### Defaults

| Scope | Limit | Window |
|---|---|---|
| Global (all endpoints) | 60 requests | 60 seconds per IP |
| `POST /auth/login` | **5 requests** | **15 minutes per IP** |

The login endpoint uses a much tighter limit to prevent brute-force PIN attacks.

### Overriding limits on a specific endpoint

```typescript
import { Throttle, SkipThrottle } from '@nestjs/throttler';

// Tighter — 10 req / 60s
@Throttle({ default: { ttl: 60_000, limit: 10 } })
@Post('sensitive')
sensitiveAction() { … }

// Exempt — health checks, webhooks
@SkipThrottle()
@Get('health')
health() { … }
```

Clients that exceed the limit receive **HTTP 429 Too Many Requests**.

---

## 9. Health Checks

Two probes are exposed at `/api/v1/health` — both are **public** (no JWT) and **exempt from rate limiting**.

| Endpoint | Purpose | Checks |
|---|---|---|
| `GET /health/live` | Kubernetes liveness | Process alive + heap < 512 MB |
| `GET /health/ready` | Kubernetes readiness / load balancer | Database reachable (SELECT 1) |

### Example response (healthy)

```json
{
  "status": "ok",
  "info": { "database": { "status": "up" } },
  "error": {},
  "details": { "database": { "status": "up" } }
}
```

### Example response (unhealthy — 503)

```json
{
  "status": "error",
  "info": {},
  "error": { "database": { "status": "down", "message": "Connection refused" } },
  "details": { "database": { "status": "down", "message": "Connection refused" } }
}
```

### Dockerfile HEALTHCHECK

The production `Dockerfile` wires the readiness probe into Docker's built-in health check:

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1/health/ready || exit 1
```

---

## 10. Security Hardening

### Helmet (HTTP security headers)

Applied via `app.use(helmet({ … }))` in `main.ts`. Sets:

- `X-Frame-Options: SAMEORIGIN` — prevents clickjacking
- `X-Content-Type-Options: nosniff` — prevents MIME sniffing
- `Strict-Transport-Security` — enforces HTTPS
- `X-DNS-Prefetch-Control: off`
- Content-Security-Policy (enabled in production, disabled in development so Swagger UI works)

### Response compression

`compression` middleware is applied early in the pipeline. Compresses responses > 1 KB using gzip/deflate based on the `Accept-Encoding` request header.

### Graceful shutdown

`app.enableShutdownHooks()` in `main.ts` ensures that when the process receives `SIGTERM` (e.g. from Kubernetes), NestJS runs all `OnModuleDestroy` hooks before exiting:

- Prisma disconnects cleanly (`$disconnect()`)
- Bull queues drain in-progress jobs
- No in-flight requests are dropped

### Environment variable validation

`ConfigModule` in `AppModule` uses a **Joi schema** to validate every required environment variable at startup. If `JWT_SECRET` is missing or too short (< 32 chars), the process exits immediately with a clear error — no silent auth failures at runtime.

### CORS in production

Set `CORS_ORIGINS` to a comma-separated list of allowed origins:

```bash
CORS_ORIGINS=https://app.tee1104.org,exp://192.168.1.10:8081
```

The API also exposes and accepts the `X-Request-Id` header via CORS so mobile clients can send their own correlation IDs.

### Request correlation IDs

Every request is assigned a unique `X-Request-Id` (UUID v4) by `RequestIdMiddleware`.

- If the client sends `X-Request-Id: <value>`, that value is used (e.g. from an API gateway).
- Otherwise a new UUID is generated.
- The ID appears in every log line: `[a1b2c3d4] GET /api/v1/tickets 200 — 14ms`
- The ID is echoed back in the `X-Request-Id` response header.
- On errors, the ID is included in the JSON error body as `requestId`.

---

## 11. Logging Conventions

All services use NestJS `Logger` — never `console.log/error/warn`.

```typescript
private readonly logger = new Logger(MyService.name);
```

### Log levels used

| Level | Use case |
|---|---|
| `debug` | Read queries, count fetches — high-frequency, off in production |
| `log` | State-changing success events (login, ticket created, status changed) |
| `warn` | Expected failures (wrong PIN, not found, notification dispatch failure) |
| `error` | Unexpected infrastructure failures (only in `AllExceptionsFilter` for 5xx) |

### What is NEVER logged

- PINs, password hashes, JWT tokens, OTP tokens
- Full phone numbers (SMS service masks to `+91****XXXX`)
- Full Telegram chat IDs in error paths
- Request bodies

### HTTP request logging

`HttpLoggerMiddleware` (applied to all routes in `AppModule.configure()`) logs:

```
GET /api/v1/tickets 200 — 14ms
POST /api/v1/auth/login 401 — 6ms
```

Uses `log` for 2xx/3xx, `warn` for 4xx, `error` for 5xx.

---

## 8. Swagger / OpenAPI

**URL:** `http://localhost:3000/api/docs`

All controllers follow this decoration pattern:

```typescript
@ApiTags('Tickets')                              // Groups endpoint in Swagger UI
@ApiBearerAuth('bearer')                         // Shows 🔒 lock icon
@ApiUnauthorizedResponse({ … })                  // Shared on controller class
@Controller('tickets')
export class TicketsController {

  @Post()
  @ApiOperation({ summary: '…', description: '…' })
  @ApiCreatedResponse({ type: TicketDto, description: '…' })
  @ApiBadRequestResponse({ description: '…' })
  create(@Body() dto: CreateTicketDto) { … }

  @Get(':id')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ … })
  findOne(@Param('id', ParseUUIDPipe) id: string) { … }
}
```

Response schema classes live in `src/common/swagger/responses.ts`. These are **documentation-only** — they don't have to match Prisma shapes exactly but should be representative.

Adding a new tag requires two steps:
1. `@ApiTags('MyTag')` on the controller
2. `.addTag('MyTag', 'description')` in `main.ts` `DocumentBuilder`

---

## 9. DTOs & Validation

All request bodies use typed DTO classes with `class-validator` + `@ApiProperty` from `@nestjs/swagger`.

```typescript
// src/widgets/dto/create-widget.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateWidgetDto {
  @ApiProperty({ example: 'My Widget', description: 'Widget name', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'blue', description: 'Optional colour' })
  @IsOptional()
  @IsString()
  colour?: string;
}
```

The global `ValidationPipe` in `main.ts` is configured with:

```typescript
{ whitelist: true, forbidNonWhitelisted: true, transform: true }
```

This means:
- Unknown properties are stripped (`whitelist`)
- Requests with extra properties are rejected (`forbidNonWhitelisted`)
- Types are auto-transformed (`transform`) — e.g., query param `"1"` → `1` for `@Type(() => Number)`

---

## 10. Testing Strategy

### Unit tests (`*.service.spec.ts`)

- **Prisma** is mocked as a plain object of `jest.fn()` — no DB connection needed.
- **bcrypt** is mocked at the module level: `jest.mock('bcrypt', () => ({ compare: jest.fn(), hash: jest.fn() }))` — avoids native binary issues.
- **firebase-admin** is mocked: `jest.mock('firebase-admin', () => ({ … }))`.
- **AWS SNS** is mocked: `jest.mock('@aws-sdk/client-sns', () => ({ … }))`.
- **BullMQ Queue** is mocked as `{ add: jest.fn(), getJob: jest.fn() }`.

### Running tests

```bash
# All tests
npm test

# With coverage report
npm run test:cov

# Single file
npx jest src/tickets/tickets.service.spec.ts --verbose
```

### Coverage thresholds (enforced in CI)

| Metric | Threshold |
|---|---|
| Statements | 80% |
| Branches | 70% |
| Functions | 80% |
| Lines | 80% |

Current coverage: ~91% statements, ~81% branches, ~86% functions, ~91% lines.

---

## 11. Environment Variables

Copy `.env.example` to `.env` and fill in values before running locally.

```bash
# ── Database ────────────────────────────────────────────────────────────────
DATABASE_URL="postgresql://teeuser:teepass@localhost:5432/tee_union"

# ── JWT ─────────────────────────────────────────────────────────────────────
JWT_SECRET="change-me-to-a-long-random-secret"

# ── Redis / BullMQ ───────────────────────────────────────────────────────────
REDIS_HOST="localhost"
REDIS_PORT=6379
# REDIS_PASSWORD=               # Optional — leave blank for local dev

# ── Firebase Cloud Messaging (FCM) ───────────────────────────────────────────
# All three required together. Leave all blank to disable FCM gracefully.
# FCM_PROJECT_ID=
# FCM_CLIENT_EMAIL=
# FCM_PRIVATE_KEY=              # Paste the full PEM key (with \n newlines)

# ── Telegram Bot ─────────────────────────────────────────────────────────────
# TELEGRAM_BOT_TOKEN=           # From @BotFather. Leave blank to disable.
# TELEGRAM_WEBHOOK_SECRET=      # HMAC secret for webhook endpoint verification

# ── AWS SNS (SMS) ────────────────────────────────────────────────────────────
# All three required together. Leave all blank to disable SMS gracefully.
# AWS_REGION=ap-south-1
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=

# ── Server ───────────────────────────────────────────────────────────────────
PORT=3000
```

---

## 12. Docker / Local Dev Setup

### First-time setup

```bash
# From the repo root (one level above tee-union-api/)
docker compose up -d
```

This starts:
- **PostgreSQL 16** on `localhost:5432` — auto-runs all 5 SQL init scripts on first start
- **Redis 7** on `localhost:6379`

The SQL init scripts (mounted as read-only) run in order:
1. `01_schema.sql` — full DB schema (v6)
2. `02_notification_migration.sql` — notification tables
3. `03_seed.sql` — reference data (districts, designations, employers)
4. `04_seed_admin.sql` — admin user account
5. `05_seed_pilot.sql` — pilot member accounts for testing

### Starting the API

```bash
cd tee-union-api
npm install
npm run start:dev          # watch mode — auto-restarts on file changes
```

### Resetting the database

```bash
docker compose down -v     # -v removes the postgres data volume
docker compose up -d       # re-runs all init scripts on first start
```

---

## 13. Adding a New Feature Module

1. **Generate the module skeleton**

   ```bash
   npx nest g module widgets
   npx nest g controller widgets
   npx nest g service widgets
   ```

2. **Create DTOs** in `src/widgets/dto/` with `@ApiProperty` + `class-validator`.

3. **Write the service** — inject `PrismaService` and `NotificationDispatcherService` as needed. Add `private readonly logger = new Logger(WidgetsService.name)`.

4. **Write the controller** — add `@ApiTags('Widgets')`, `@ApiBearerAuth('bearer')`, `@ApiOperation`, and `@ApiXxxResponse` on every endpoint.

5. **Register the tag** in `main.ts`:
   ```typescript
   .addTag('Widgets', 'Widget management')
   ```

6. **Wire notifications** (optional) — import `NotificationsModule` in `WidgetsModule`.

7. **Write unit tests** in `src/widgets/widgets.service.spec.ts` — mock Prisma and any external services.

8. **Check coverage** — `npm run test:cov` must stay above the thresholds.

---

## 14. Common Gotchas

### Prisma enum values are lowercase

```typescript
// ✅ Correct
NotificationType.ticket_update
TicketStatus.in_progress

// ❌ Wrong — will cause TS errors and runtime failures
NotificationType.TICKET_UPDATE
TicketStatus.IN_REVIEW   // This value doesn't exist
```

### `User` → `pushTokens` not `deviceTokens`

```typescript
// ✅
await prisma.user.findUnique({
  where: { id },
  select: { pushTokens: { select: { token: true } } },
});

// ❌ — relation doesn't exist
select: { member: { select: { deviceTokens: true } } }
```

### Mobile number field is `mobileNo`

The `User` model has `mobileNo`, **not** `mobileNumber` or `mobile`.

### `Notification` uses `sentAt`, not `createdAt`

```typescript
orderBy: { sentAt: 'desc' }   // ✅
orderBy: { createdAt: 'desc' } // ❌ — field doesn't exist on Notification
```

### `import type` for BullMQ `Queue` and `Job`

When using `Queue` or `Job` from BullMQ as constructor parameter types in decorated NestJS classes, use `import type` to avoid the `isolatedModules` TS1272 error:

```typescript
import type { Queue } from 'bull';
import type { Job } from 'bull';
```

### BCrypt native binary in Jest

BCrypt uses a native `.node` binary that may not run in the VM's Jest environment. Always mock it at module level in spec files:

```typescript
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));
```

### Firebase Admin — `admin.apps` is a getter

Don't assign to `admin.apps` in tests — it's read-only. Instead, mock `firebase-admin` at the module level and check whether `initializeApp` was called.

### `coverageThreshold` (singular) not `coverageThresholds`

Jest's config key is `coverageThreshold` (no trailing `s`). Using `coverageThresholds` silently does nothing.

### `collectCoverageFrom` paths are relative to `rootDir: src`

```json
"collectCoverageFrom": ["**/*.service.ts"]   // ✅ relative to src/
"collectCoverageFrom": ["src/**/*.service.ts"] // ❌ resolves to src/src/
```
