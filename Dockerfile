# ──────────────────────────────────────────────────────────────────────────────
# Multi-stage Dockerfile for TEE 1104 Union API
# Stage 1 (builder): installs all deps + compiles TypeScript
# Stage 2 (runner):  copies only the compiled output + production deps
# ──────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests first for better layer caching
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDeps needed for tsc)
RUN npm ci

# Copy source and compile
COPY . .
RUN npm run build

# Prune devDependencies so the runner stage gets a lean node_modules
RUN npm prune --production


# ── Stage 2: Runner ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy compiled output and production node_modules from builder
COPY --from=builder --chown=appuser:appgroup /app/dist          ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules  ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/package.json  ./package.json
COPY --from=builder --chown=appuser:appgroup /app/prisma        ./prisma

USER appuser

EXPOSE 3000

# Health check — readiness probe via the /api/v1/health/ready endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1/health/ready || exit 1

CMD ["node", "dist/main"]
