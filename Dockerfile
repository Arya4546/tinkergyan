# ============================================================
# Stage 0: Build shared-types package (used by both web and api)
# ============================================================
FROM node:20-alpine AS shared-builder
RUN corepack enable && corepack prepare pnpm@10.6.3 --activate
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json tsconfig.json ./
COPY packages/shared-types ./packages/shared-types
COPY packages/eslint-config ./packages/eslint-config

RUN pnpm install --filter @tinkergyan/shared-types... --frozen-lockfile --ignore-scripts
RUN pnpm --filter @tinkergyan/shared-types build

# Verify the build actually produced output (fails loudly if not)
RUN test -f /app/packages/shared-types/dist/index.d.ts || (echo "❌ shared-types build failed - dist/index.d.ts missing" && exit 1)

# ============================================================
# Stage 1: Build the frontend (React/Vite)
# ============================================================
FROM node:20-alpine AS frontend-builder
RUN corepack enable && corepack prepare pnpm@10.6.3 --activate
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json tsconfig.json ./
COPY packages/eslint-config ./packages/eslint-config
COPY --from=shared-builder /app/packages/shared-types ./packages/shared-types
COPY apps/web/package.json ./apps/web/package.json

RUN pnpm install --filter @tinkergyan/web... --frozen-lockfile --ignore-scripts

COPY apps/web ./apps/web
RUN pnpm --filter @tinkergyan/web build

# ============================================================
# Stage 2: Build the backend (Node/Express/Prisma)
# ============================================================
FROM node:20-alpine AS backend-builder
RUN corepack enable && corepack prepare pnpm@10.6.3 --activate
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json tsconfig.json ./
COPY packages/eslint-config ./packages/eslint-config
COPY --from=shared-builder /app/packages/shared-types ./packages/shared-types
COPY apps/api/package.json ./apps/api/package.json

RUN pnpm install --filter @tinkergyan/api... --frozen-lockfile --ignore-scripts

COPY apps/api ./apps/api
RUN pnpm --filter @tinkergyan/api build

# ============================================================
# Stage 3: Production image
# ============================================================
FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@10.6.3 --activate
RUN apk add --no-cache openssl
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json tsconfig.json ./
COPY --from=shared-builder /app/packages/shared-types ./packages/shared-types
COPY apps/api/package.json ./apps/api/package.json

RUN pnpm install --filter @tinkergyan/api... --frozen-lockfile --prod --ignore-scripts

# Backend build output + prisma schema
COPY --from=backend-builder /app/apps/api/dist ./apps/api/dist
COPY --from=backend-builder /app/apps/api/prisma ./apps/api/prisma

RUN cd apps/api && npx prisma generate

# Frontend build output (served by Express as static files)
COPY --from=frontend-builder /app/apps/web/dist ./apps/web/dist

WORKDIR /app/apps/api
EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]