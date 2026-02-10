# © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
# TCRN TMS Worker Application Dockerfile

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm (using npm for reliability, corepack can fail with HTTP 503)
RUN npm install -g pnpm@9.15.4

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY turbo.json ./

# Copy package.json files for all workspaces
COPY apps/worker/package.json ./apps/worker/
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

# Copy source code (copy only src/ to avoid overwriting pnpm node_modules symlinks)
COPY packages/shared/src ./packages/shared/src
COPY packages/shared/.eslintrc.js ./packages/shared/.eslintrc.js
COPY packages/database/src ./packages/database/src
COPY packages/database/scripts ./packages/database/scripts
COPY packages/database/tsup.config.ts ./packages/database/tsup.config.ts
COPY packages/database/.eslintrc.js ./packages/database/.eslintrc.js
COPY packages/eslint-config ./packages/eslint-config
COPY apps/worker/src ./apps/worker/src
COPY apps/worker/tsconfig.json ./apps/worker/tsconfig.json
COPY apps/worker/tsup.config.ts ./apps/worker/tsup.config.ts
COPY apps/worker/.eslintrc.js ./apps/worker/.eslintrc.js

# Build packages
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

RUN pnpm --filter @tcrn/shared build && \
    pnpm --filter @tcrn/database build && \
    pnpm --filter @tcrn/worker build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 worker

# Copy entire monorepo structure (preserves pnpm symlinks)
COPY --from=builder --chown=worker:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=worker:nodejs /app/packages ./packages
COPY --from=builder --chown=worker:nodejs /app/apps/worker ./apps/worker
COPY --from=builder --chown=worker:nodejs /app/package.json ./package.json

# Recreate workspace symlinks
RUN ln -sf ../../packages/database node_modules/@tcrn/database && \
    ln -sf ../../packages/shared node_modules/@tcrn/shared

WORKDIR /app/apps/worker

USER worker

CMD ["node", "dist/main.js"]
