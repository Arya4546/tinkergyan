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

RUN pnpm install --filter @tinkergyan/api... --frozen-lockfile --ignore-scripts

COPY apps/api ./apps/api

RUN pnpm --filter @tinkergyan/api build

RUN test -f /app/apps/api/dist/server.js \
    || (echo "❌ api build failed - dist/server.js missing" && exit 1)

# ════════════════════════════════════════════════════════════
# Stage 3: Production image
# ════════════════════════════════════════════════════════════
FROM node:20-slim
RUN corepack enable && corepack prepare pnpm@10.6.3 --activate
RUN apt-get update && apt-get install -y --no-install-recommends openssl curl python3 ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install just the arduino-cli binary (~30MB)
RUN curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json tsconfig.json ./
COPY --from=shared-builder /app/packages/shared-types ./packages/shared-types
COPY apps/api/package.json ./apps/api/package.json

RUN pnpm install --filter @tinkergyan/api... --frozen-lockfile --prod --ignore-scripts

# Backend build output + prisma schema
COPY --from=backend-builder /app/apps/api/dist ./apps/api/dist
COPY --from=backend-builder /app/apps/api/prisma ./apps/api/prisma

# CRITICAL: pin the exact prisma version to match package.json devDependencies (^6.16.0).
RUN cd apps/api && npx --yes prisma@6.16.0 generate

# Verify generation succeeded. In this pnpm monorepo, the generated client
# lives inside the root .pnpm store, NOT apps/api/node_modules/.prisma.
RUN find /app/node_modules/.pnpm -maxdepth 1 -iname "*prisma*client*" | grep -q . \
    || (echo "❌ prisma client generation failed in production stage" && exit 1)

# Frontend build output (served by Express as static files)
COPY --from=frontend-builder /app/apps/web/dist ./apps/web/dist

COPY apps/api/start.sh ./start.sh
RUN chmod +x ./start.sh

WORKDIR /app/apps/api
EXPOSE 3001

# Use the startup script to handle migrations and arduino-cli initialization safely
CMD ["/app/start.sh"]