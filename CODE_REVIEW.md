# tee-union-api — Code Review

**Date:** March 2026
**Scope:** Full codebase review — auth, events, members, notifications, push tokens, news, dispatcher, main bootstrap

---

## Overall Assessment

The codebase is genuinely well-structured. NestJS modules are clean, Swagger docs are thorough, Joi env validation fails fast, bcrypt hashing uses a sensible salt round (12), JWT is short-lived enough, the global exception filter gives consistent error shapes, and graceful shutdown is wired up. The notification fallback chain (FCM → Telegram → SMS via Bull) is a smart design for a union app where not everyone has smartphones.

That said, there are a few security and correctness issues that need to be fixed before this handles real member data in production.

---

## Critical

### 1. `PATCH /notifications/:id/read` — missing ownership check

**File:** `src/notifications/notifications.controller.ts:82-88`

```typescript
async markRead(
  @CurrentUser() user: { id: string },
  @Param('id') id: string,
) {
  await this.dispatcher.markRead(id);  // ← user.id is never used
  return { ok: true };
}
```

`dispatcher.markRead(id)` calls `prisma.notification.update({ where: { id: notificationId } })` with only the notification UUID. Any authenticated user can mark any other user's notification as read by guessing the UUID. Since notification UUIDs are v4, they are hard to guess but this is still a broken access control vulnerability (OWASP A01).

**Fix:** Pass `userId` into `markRead` and add `userId` to the Prisma `where` clause so the update is a no-op if the notification does not belong to the caller.

---

### 2. Race condition in event registration (capacity check)

**File:** `src/events/events.service.ts:90-100`

```typescript
if (event.maxCapacity) {
  const count = await this.prisma.eventRegistration.count({ where: { eventId } });
  if (count >= event.maxCapacity) throw new ConflictException('Event is at full capacity');
}

const registration = await this.prisma.eventRegistration.create({
  data: { eventId, memberId: member.id },
});
```

The count check and the insert are separate queries. Two concurrent requests can both read the same count (e.g., 499 out of 500), both pass the guard, and both insert — leaving the event at 501 registrations. This is a classic TOCTOU (time-of-check time-of-use) race.

**Fix:** Wrap the count check and create in a `$transaction` with `IsolationLevel.Serializable`, or use a DB-level check constraint, or enforce capacity at the DB with a trigger. The cheapest fix in Prisma is to do the count inside a serializable transaction so concurrent transactions will serialise correctly.

---

### 3. Race condition in push token registration

**File:** `src/push-tokens/push-tokens.service.ts:27-43`

```typescript
// The token column has no unique DB constraint...
const existing = await this.prisma.pushToken.findFirst({ where: { token } });

if (existing) {
  await this.prisma.pushToken.update({ ... });
} else {
  await this.prisma.pushToken.create({ ... });
}
```

The comment explicitly acknowledges there is no unique constraint, and the code uses a non-atomic find-then-create. Two concurrent requests (e.g., app restarts both hitting this endpoint) can both read `null` from `findFirst` and then both call `create`, resulting in duplicate rows. Duplicate rows send duplicate push notifications for every subsequent broadcast.

**Fix:** Add a `@@unique([token])` constraint to the `PushToken` model in `schema.prisma` and switch to an `upsert` so Prisma handles the unique conflict atomically.

---

### 4. `bufferLogs: true` causes silent crashes

**File:** `src/main.ts:10-13`

```typescript
const app = await NestFactory.create(AppModule, {
  bufferLogs: true,
});
```

With `bufferLogs: true`, NestJS holds all log messages in memory until a custom logger is flushed. If the app crashes during module init — which happened repeatedly during the Railway deployment (Prisma connect errors, env validation failures) — the buffered logs are dropped and nothing appears in the deploy log. This makes startup failures completely invisible.

**Fix:** Remove `bufferLogs: true`. The `HttpLoggerMiddleware` handles request-level logging; bootstrap noise is minimal and useful during crashes.

---

## High

### 5. No rate limiting on `POST /auth/change-pin`

**File:** `src/auth/auth.controller.ts`

`POST /auth/login` correctly has `@Throttle({ default: { ttl: 900_000, limit: 5 } })` (5 attempts / 15 minutes). `POST /auth/change-pin` has no throttle at all.

A stolen JWT + unthrottled endpoint = brute-forceable PIN space of 10,000 combinations. At the default global rate of 60 req/min, the full 4-digit space can be exhausted in under 3 hours.

**Fix:** Apply the same `@Throttle` decorator to `changePin`, or add a per-user attempt counter with lockout (more robust since global IP throttle is bypassed behind proxies/VPNs).

---

### 6. `descriptionEn` and `descriptionTe` have no `@MaxLength`

**File:** `src/events/dto/create-event.dto.ts:47-56`

`titleEn` has `@MaxLength(255)` but both description fields do not. A single request with a 10 MB description would be accepted, stored in Postgres, and returned in every event listing. This can cause memory pressure in the API and slow queries.

**Fix:** Add `@MaxLength(5000)` (or whatever your product limit is) to both description fields. Same pattern applies to `bodyEn` / `bodyTe` in `CreateNewsDto`.

---

### 7. `if (event.maxCapacity)` treats `maxCapacity = 0` as unlimited

**File:** `src/events/events.service.ts:90`

```typescript
if (event.maxCapacity) {
  // only runs if maxCapacity is truthy (non-zero, non-null)
}
```

If `maxCapacity` is `0` (e.g., set via direct DB manipulation or a future admin UI), the falsy check skips all capacity enforcement and the event becomes effectively unlimited. The DTO uses `@IsPositive()` which blocks `0` from the API, but defensive DB-level checks don't exist.

**Fix:** Change the guard to `if (event.maxCapacity !== null && event.maxCapacity !== undefined)` to be explicit, and/or add a DB check constraint `maxCapacity > 0`.

---

### 8. Broadcast runs 50 concurrent `dispatch()` calls without DB pool awareness

**File:** `src/notifications/notification-dispatcher.service.ts:136-152`

```typescript
const BATCH = 50;
for (let i = 0; i < notifications.length; i += BATCH) {
  const batch = notifications.slice(i, i + BATCH);
  await Promise.all(
    batch.map((n) => this.dispatch({ ... })),
  );
}
```

Each `dispatch()` call makes at minimum 2 DB queries + 1 FCM HTTP call + 1 DB update + potentially 2 Bull queue insertions. `Promise.all(50 × dispatch)` runs 50 of these truly concurrently. The default `pg` pool size is 10 connections, so 50 concurrent dispatches will saturate the pool and queue up. For a broadcast to 5,000 users this means 100 rounds of 50 concurrent operations, each stalling on DB pool acquisition.

**Fix:** Reduce `BATCH` size to match your pg pool size (10–20), or configure the pg pool size to match your intended concurrency. Also consider using `p-limit` to cap concurrency explicitly rather than batch-by-batch.

---

## Medium

### 9. No `@IsUUID()` on filter query parameters

**File:** `src/members/members.controller.ts:73` (and events.controller.ts)

```typescript
findAll(@Query() query: any) {
  return this.membersService.findAll({
    districtId: query.districtId,
    ...
  });
}
```

`districtId`, `employerId`, and `designationId` pass through to Prisma's `where` clause without UUID validation. Sending `?districtId=not-a-uuid` causes Prisma to throw a P2023 "Inconsistent column data" error which surfaces as an unhandled 500 to the client and a full stack trace in logs.

**Fix:** Create a proper query DTO class with `@IsOptional() @IsUUID()` fields, and use `@Query() query: MembersQueryDto` instead of `@Query() query: any`.

---

### 10. Designation history is not paginated

**File:** `src/members/members.service.ts:117-123`

```typescript
memberDesignationHistories: {
  include: { ... },
  orderBy: { validFrom: 'desc' },
  // no take / skip
},
```

For a long-serving member with 20+ transfers, this returns an unbounded array inline with the member object on every `GET /members/:id` call.

**Fix:** Paginate designation history separately or add a `take` limit (e.g., the 10 most recent).

---

### 11. `isActive` query param uses loose string comparison

**File:** `src/members/members.controller.ts:73`

```typescript
isActive: query.isActive !== undefined ? query.isActive === 'true' : undefined,
```

Only the exact string `'true'` is treated as `true`. Anything else (`'1'`, `'yes'`, `'True'`) becomes `false`, silently filtering to inactive members. This is surprising to API consumers.

**Fix:** Either use `@Transform(() => bool)` in a DTO, or document that only `'true'` / `'false'` are accepted and validate accordingly.

---

### 12. `currentAddress` and `permanentAddress` accept arbitrary JSON

**File:** `src/members/members.service.ts:149-153`, `src/members/dto/update-profile.dto.ts`

Both address fields are typed as `object` with no structure validation. Any JSON — including deeply nested or very large objects — can be stored. This makes it impossible to reliably display, search, or export address data later.

**Fix:** Define an `AddressDto` class with `@IsString()` fields for line1, city, state, pin, and use `@ValidateNested() @Type(() => AddressDto)` in `UpdateProfileDto`.

---

### 13. No future-date validation on event creation

**File:** `src/events/dto/create-event.dto.ts:62-64`

```typescript
@IsDateString()
eventDate: string;
```

There is no check that `eventDate` is in the future. An admin can create an event dated 2020-01-01. It won't appear in `findAll` (which filters `eventDate >= now`) but it will be created in the DB and can cause confusion in admin tooling.

**Fix:** Add a custom `@MinDate(new Date())` constraint or a service-level guard that throws `BadRequestException` if `eventDate < now`.

---

## Low

### 14. Swagger is always served — even in production

**File:** `src/main.ts:84-87`

Swagger UI is mounted unconditionally at `/api/docs`. In production this exposes your full API schema, all response shapes, and example payloads. It also slightly increases startup time.

**Fix:** Gate it behind `process.env.NODE_ENV !== 'production'` or a separate `SWAGGER_ENABLED` env var.

---

### 15. No explicit DB connection pool configuration

**File:** `src/prisma/prisma.service.ts`

`PrismaPg` is initialised without pool options. The `pg` library defaults to a pool max of 10. With concurrent broadcasts (see issue #8) this becomes a bottleneck, and under heavy load you may see `Error: timeout exceeded when trying to connect`.

**Fix:** Pass pool options to `PrismaPg`: `new PrismaPg({ connectionString, pool: { max: 20, idleTimeoutMillis: 30000 } })` and tune to your Railway plan's connection limits.

---

### 16. `ParseUUIDPipe` missing on `PATCH /notifications/:id/read`

**File:** `src/notifications/notifications.controller.ts:84`

```typescript
@Param('id') id: string,  // no ParseUUIDPipe
```

All other controllers that accept UUID path params use `ParseUUIDPipe`. This endpoint doesn't, so non-UUID strings pass through to Prisma and produce a 500 instead of a clean 400.

**Fix:** Change to `@Param('id', ParseUUIDPipe) id: string`.

---

### 17. No correlation ID on Bull queue jobs

**File:** `src/notifications/notification-dispatcher.service.ts:92-96`

Bull jobs store `notificationId` and `userId` in their data, but there is no `requestId` (from the `X-Request-Id` header) attached. When a Telegram fallback fails and you search logs, you can find the notification but can't trace back to the original HTTP request that triggered the dispatch.

**Fix:** Thread `requestId` through `DispatchPayload` and store it in the Bull job data for end-to-end traceability.

---

### 18. `telegramChatId` is queried but never type-guarded in select

**File:** `src/notifications/notification-dispatcher.service.ts:50-58`

```typescript
select: {
  telegramChatId: true,
  mobileNo: true,
  pushTokens: { select: { token: true } },
},
```

`telegramChatId` is a `BigInt` in Prisma. Calling `.toString()` on it at line 94 is correct, but `JSON.stringify` will silently drop `BigInt` values. If any debug logging ever serialises the `user` object directly it will throw `TypeError: Do not know how to serialize a BigInt`.

**Fix:** Keep the `.toString()` call in place and add a note, or convert `telegramChatId` to `String` in the select via a Prisma computed field.

---

## What's Done Well (don't change these)

- **Env validation at startup** — Joi schema with `abortEarly: false` means you get all config errors at once, not one-by-one.
- **Global `JwtAuthGuard` + `@Public()` decorator** — secure by default, explicit opt-out. Hard to forget to protect an endpoint.
- **`AllExceptionsFilter`** — consistent error envelope (`statusCode`, `timestamp`, `path`, `requestId`, `message`) across all errors.
- **`request-id` middleware** — every request gets a UUID logged end-to-end; invaluable for production debugging.
- **Graceful shutdown** — `enableShutdownHooks()` + Prisma `onModuleDestroy` means in-flight DB queries can complete before the process exits.
- **Notification fallback chain** — FCM → delayed Telegram → delayed SMS with Bull deduplication is well-designed. The skip logic in the processor (don't send if already read) prevents spamming.
- **`clampLimit` utility** — prevents clients from requesting 10,000 rows per page.
- **Bilingual support** — Telugu (`Te`) fields throughout the schema shows real product thinking.
- **Rate limiting on login** — 5 attempts / 15 minutes is appropriate for a 4-digit PIN.

---

## Priority Order for Fixes

1. **Notification mark-read ownership** (Critical #1) — 5-min fix, security impact
2. **`bufferLogs: true` removal** (Critical #4) — 1-line fix, makes future deployments debuggable
3. **Push token race condition** (Critical #3) — add DB unique constraint + upsert
4. **Event registration race condition** (Critical #2) — wrap in serializable transaction
5. **`change-pin` rate limiting** (High #5) — copy the `@Throttle` decorator from login
6. **`ParseUUIDPipe` on notifications/:id** (Low #16) — 1-line fix
7. **DTO `@MaxLength` on description fields** (High #6) — add decorators
8. **Query param DTO for members list** (Medium #9) — replace `query: any`
9. **Swagger in production** (Low #14) — env gate
10. **DB pool config** (Low #15) — configure `PrismaPg` pool options
