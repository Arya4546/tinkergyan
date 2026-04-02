# Stage 1: Base image
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.6.3 --activate

# Stage 2: Build the application
FROM base AS builder
WORKDIR /app

# Install build dependencies for native modules (bcrypt, etc)
RUN apk add --no-cache python3 make g++

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json setup-husky.mjs ./

# Copy package manifests (to take advantage of caching)
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/

# Install all dependencies (including devDependencies)
RUN pnpm install --no-frozen-lockfile --ignore-scripts

# Copy the actual source code
COPY . .

# Run build tasks (prisma generate + tsc)
RUN pnpm --filter @tinkergyan/api build

# Stage 3: Isolate production dependencies and package
FROM base AS deployer
WORKDIR /app

# Copy EVERYTHING from builder to the pruner stage (needed for pnpm deploy to work)
COPY --from=builder /app /app

# Use pnpm deploy to create a standalone directory for the api package
# This converts all symlinks into hard copies/symlinks that point within the directory
RUN pnpm --filter @tinkergyan/api --prod deploy --legacy pruned

# Stage 4: Final slim runtime image
FROM node:20-alpine AS runner
WORKDIR /app

# Copy the isolated/pruned directory into the final image
COPY --from=deployer /app/pruned ./

# Set standard environment variables
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Start the server directly using node (dist/server.js)
CMD ["node", "dist/server.js"]
