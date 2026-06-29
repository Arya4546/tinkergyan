# Stage 1: Build the frontend (React/Vite)
FROM node:20-alpine AS frontend-builder
RUN corepack enable && corepack prepare pnpm@10.6.3 --activate
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared-types ./packages/shared-types
COPY packages/eslint-config ./packages/eslint-config
COPY apps/web/package.json ./apps/web/package.json

RUN pnpm install --filter @tinkergyan/web... --frozen-lockfile

COPY apps/web ./apps/web
RUN pnpm --filter @tinkergyan/web build

# Stage 2: Build the backend (Node/Express/Prisma)
FROM node:20-alpine AS backend-builder
RUN corepack enable && corepack prepare pnpm@10.6.3 --activate
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared-types ./packages/shared-types
COPY packages/eslint-config ./packages/eslint-config
COPY apps/api/package.json ./apps/api/package.json

RUN pnpm install --filter @tinkergyan/api... --frozen-lockfile

COPY apps/api ./apps/api
RUN pnpm --filter @tinkergyan/api build

# Stage 3: Production image
FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@10.6.3 --activate
RUN apk add --no-cache openssl
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared-types ./packages/shared-types
COPY apps/api/package.json ./apps/api/package.json

RUN pnpm install --filter @tinkergyan/api... --frozen-lockfile --prod

# Backend build output + prisma
COPY --from=backend-builder /app/apps/api/dist ./apps/api/dist
COPY --from=backend-builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=backend-builder /app/apps/api/node_modules/.prisma ./apps/api/node_modules/.prisma

# Frontend build output (served by Express as static files)
COPY --from=frontend-builder /app/apps/web/dist ./apps/web/dist

WORKDIR /app/apps/api
EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]