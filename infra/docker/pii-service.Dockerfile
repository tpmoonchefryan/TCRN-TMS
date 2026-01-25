# © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
# TCRN TMS PII Transit Service Dockerfile
# PRD §4.4: PII 数据分离架构 - mTLS 双向认证

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY turbo.json ./

# Copy package.json files for all workspaces
COPY apps/pii-service/package.json ./apps/pii-service/
COPY packages/shared/package.json ./packages/shared/
COPY packages/eslint-config/package.json ./packages/eslint-config/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy Prisma schema for PII service
COPY apps/pii-service/prisma ./apps/pii-service/prisma

# Generate Prisma client for PII database
RUN cd apps/pii-service && pnpm prisma generate

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/eslint-config ./packages/eslint-config
COPY apps/pii-service ./apps/pii-service

# Build packages
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

RUN pnpm --filter @tcrn/shared build && \
    pnpm --filter @tcrn-tms/pii-service build

# Prune dev dependencies and prepare production deployment
RUN pnpm deploy --filter @tcrn-tms/pii-service --prod /app/deploy

# Copy Prisma client to deploy folder
RUN cp -r /app/apps/pii-service/node_modules/.prisma /app/deploy/node_modules/.prisma

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 pii-service

# Create directory for mTLS certificates
RUN mkdir -p /app/certs && chown pii-service:nodejs /app/certs

# Copy deployed production files (pnpm deploy creates standalone deployment)
COPY --from=builder --chown=pii-service:nodejs /app/deploy ./

USER pii-service

# Expose port (default: 5000, configurable via PII_SERVICE_PORT)
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost:${PII_SERVICE_PORT:-5000}/health || exit 1

CMD ["node", "dist/main.js"]
