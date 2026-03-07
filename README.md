# TEE 1104 Union API

NestJS + Prisma + PostgreSQL backend for the **TEE 1104 Telangana State Government Employees Union** mobile app.

> For a full technical deep-dive — architecture, patterns, gotchas, and how-to guides — see [SKILLS.md](./SKILLS.md).

---

## Features

- **JWT authentication** — Employee ID + 4-digit PIN, one-time PIN on first login
- **Member management** — Profiles, self-service address/mobile/marital status updates
- **Grievance ticketing** — Create tickets, add comments (internal/public), track status with history
- **News & Events** — Admin publish, bilingual content (English + Telugu), district-scoped events
- **Multi-channel notifications** — FCM (push) → Telegram (5 min fallback) → SMS/AWS SNS (15 min fallback)
- **Swagger / OpenAPI** — Full interactive docs at `/api/docs`
- **91%+ test coverage** — 115 unit tests across all services

---

## Quick Start

### Prerequisites

- Node.js ≥ 20
- Docker & Docker Compose

### 1. Start the database and cache

```bash
# From the repo root (one level above tee-union-api/)
docker compose up -d
```

This starts PostgreSQL 16 (port 5432) and Redis 7 (port 6379).
All SQL init scripts run automatically on first container start.

### 2. Configure environment

```bash
cd tee-union-api
cp .env.example .env   # fill in JWT_SECRET at minimum
```

See [SKILLS.md — Environment Variables](./SKILLS.md#11-environment-variables) for all options.
FCM, Telegram, and SMS are all optional — the API starts without them.

### 3. Install & run

```bash
npm install
npm run start:dev      # watch mode — auto-restarts on changes
```

### 4. Explore the API

| URL | Description |
|---|---|
| `http://localhost:3000/api/v1` | API base URL |
| `http://localhost:3000/api/docs` | Swagger UI |

**Login with a pilot account:**

```http
POST /api/v1/auth/login
Content-Type: application/json

{ "employeeId": "PILOT-0001", "pin": "1104" }
```

Copy the `accessToken` from the response, click **Authorize** in Swagger UI, and paste it as `Bearer <token>`.

---

## Scripts

```bash
npm run start:dev      # Development (watch mode)
npm run start:prod     # Production (compiled dist/)
npm run build          # Compile TypeScript

npm test               # Run all unit tests
npm run test:cov       # Run tests + generate coverage report
npx tsc --noEmit       # Type-check without building
```

---

## API Modules

| Module | Base path | Description |
|---|---|---|
| Auth | `/api/v1/auth` | Login, change PIN |
| Members | `/api/v1/members` | Profile read/update, admin member list |
| Tickets | `/api/v1/tickets` | Grievance lifecycle — create, comment, status |
| News | `/api/v1/news` | Union news articles |
| Events | `/api/v1/events` | Events, registrations |
| Notifications | `/api/v1/notifications` | Inbox, mark read, unread count |
| Telegram | `/api/v1/telegram` | Bot account linking, webhook |

---

## Project Structure

```
src/
├── auth/           notifications/
├── members/        fcm/
├── tickets/        telegram/
├── news/           sms/
├── events/         prisma/
└── common/         (guards, filters, middleware, decorators, swagger)
```

Full layout and architectural decisions are documented in [SKILLS.md](./SKILLS.md).

---

## Tech Stack

NestJS 11 · Prisma 7 · PostgreSQL 16 · Redis 7 · BullMQ · Firebase Admin · AWS SNS · JWT · Swagger
