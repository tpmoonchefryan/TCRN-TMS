# © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
# TCRN TMS API Application Dockerfile

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY turbo.json ./

# Copy package.json files for all workspaces
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY packages/eslint-config/package.json ./packages/eslint-config/

# Copy config files needed for build
COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/shared/tsup.config.ts ./packages/shared/
COPY packages/database/tsconfig.json ./packages/database/

# Install all dependencies (skip husky)
ENV HUSKY=0
RUN pnpm install --frozen-lockfile

# Copy Prisma schema for generation
COPY packages/database/prisma ./packages/database/prisma

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/database ./packages/database
COPY packages/eslint-config ./packages/eslint-config
COPY apps/api ./apps/api

# Build packages
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

RUN pnpm --filter @tcrn/shared build && \
    pnpm --filter @tcrn/database build && \
    pnpm --filter @tcrn/api build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy entire monorepo structure (preserves pnpm symlinks)
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/packages ./packages
COPY --from=builder --chown=nestjs:nodejs /app/apps/api ./apps/api
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

# Recreate workspace symlinks
RUN ln -sf ../../packages/database node_modules/@tcrn/database && \
    ln -sf ../../packages/shared node_modules/@tcrn/shared

WORKDIR /app/apps/api

USER nestjs

EXPOSE 4000

CMD ["node", "dist/main.js"]
