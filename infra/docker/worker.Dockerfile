# © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
# TCRN TMS Worker Application Dockerfile

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY turbo.json ./

# Copy package.json files for all workspaces
COPY apps/worker/package.json ./apps/worker/
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY packages/eslint-config/package.json ./packages/eslint-config/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy Prisma schema for generation
COPY packages/database/prisma ./packages/database/prisma

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/database ./packages/database
COPY packages/eslint-config ./packages/eslint-config
COPY apps/worker ./apps/worker

# Build packages
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

RUN pnpm --filter @tcrn/shared build && \
    pnpm --filter @tcrn/database build && \
    pnpm --filter @tcrn/worker build

# Create production deployment using pnpm deploy
RUN pnpm --filter @tcrn/worker deploy --prod /app/deploy

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 worker

# Copy deployed application (includes all dependencies)
COPY --from=builder --chown=worker:nodejs /app/deploy ./

USER worker

CMD ["node", "dist/main.js"]
