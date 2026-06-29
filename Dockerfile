# ════════════════════════════════════════════════════════════
# Stage 0: Build shared-types package (used by both web and api)
# ════════════════════════════════════════════════════════════
FROM node:20-alpine AS shared-builder
RUN corepack enable && corepack prepare pnpm@10.6.3 --activate
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json tsconfig.json ./
COPY packages/shared-types ./packages/shared-types
COPY packages/eslint-config ./packages/eslint-config

RUN pnpm install --filter @tinkergyan/shared-types... --frozen-lockfile --ignore-scripts
RUN pnpm --filter @tinkergyan/shared-types build

# Fail loudly here instead of silently later if shared-types didn't build
RUN test -f /app/packages/shared-types/dist/index.d.ts \
    || (echo "❌ shared-types build failed - dist/index.d.ts missing" && exit 1)

# ════════════════════════════════════════════════════════════
# Stage 1: Build the frontend (React/Vite)
# ════════════════════════════════════════════════════════════
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

RUN test -f /app/apps/web/dist/index.html \
    || (echo "❌ web build failed - dist/index.html missing" && exit 1)

# ════════════════════════════════════════════════════════════
# Stage 2: Build the backend (Node/Express/Prisma)
# ════════════════════════════════════════════════════════════
FROM node:20-alpine AS backend-builder
RUN corepack enable && corepack prepare pnpm@10.6.3 --activate
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json tsconfig.json ./
COPY packages/eslint-config ./packages/eslint-config
COPY --from=shared-builder /app/packages/shared-types ./packages/shared-types
COPY apps/api/package.json ./apps/api/package.json

# --ignore-scripts skips the ROOT "prepare" (husky) script.
# The api's own "build" script (prisma generate && tsup) is run explicitly below,
# so nothing important is lost by skipping lifecycle scripts here.
RUN pnpm install --filter @tinkergyan/api... --frozen-lockfile --ignore-scripts

COPY apps/api ./apps/api

# This runs "prisma generate && tsup" using the PINNED prisma version
# from devDependencies (^6.16.0) — NOT npx, so no risk of fetching latest v7.
RUN pnpm --filter @tinkergyan/api build

RUN test -f /app/apps/api/dist/server.js \
    || (echo "❌ api build failed - dist/server.js missing" && exit 1)

# ════════════════════════════════════════════════════════════
# Stage 3: Production image
# ════════════════════════════════════════════════════════════
FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@10.6.3 --activate
RUN apk add --no-cache openssl
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json tsconfig.json ./
COPY --from=shared-builder /app/packages/shared-types ./packages/shared-types
COPY apps/api/package.json ./apps/api/package.json

# Production install: only prod deps, including pinned prisma client (@prisma/client)
# and the pinned prisma CLI itself stays available via package.json's devDependencies
# being skipped — but @prisma/client (a dependency, not devDependency) IS installed.
RUN pnpm install --filter @tinkergyan/api... --frozen-lockfile --prod --ignore-scripts

# Backend build output + prisma schema (the already-generated @prisma/client
# from backend-builder's node_modules is NOT copied — we regenerate it fresh
# here using the pinned version below, which is fast and avoids monorepo
# node_modules/.pnpm path issues entirely).
COPY --from=backend-builder /app/apps/api/dist ./apps/api/dist
COPY --from=backend-builder /app/apps/api/prisma ./apps/api/prisma

# CRITICAL: pin the exact prisma version to match package.json devDependencies.
# Using bare "npx prisma generate" would fetch the LATEST prisma (v7+) which
# has breaking schema changes (datasource.url removed) — this avoids that.
RUN cd apps/api && npx --yes prisma@6.16.0 generate

RUN test -d /app/apps/api/node_modules/.prisma \
    || (echo "❌ prisma client generation failed in production stage" && exit 1)

# Frontend build output (served by Express as static files)
COPY --from=frontend-builder /app/apps/web/dist ./apps/web/dist

WORKDIR /app/apps/api
EXPOSE 3001

# Use the SAME pinned prisma version for migrate deploy at runtime
CMD ["sh", "-c", "npx --yes prisma@6.16.0 migrate deploy && node dist/server.js"]