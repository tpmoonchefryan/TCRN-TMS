<p align="center">
  <strong>English</strong> |
  <a href="./README.zh-CN.md">简体中文</a> |
  <a href="./README.ja.md">日本語</a>
</p>

<h1 align="center">TCRN TMS - Talent Management System</h1>

<p align="center">
  <strong>A comprehensive CRM platform designed for VTuber/VUP agencies</strong>
</p>

<p align="center">
  <img alt="License" src="https://img.shields.io/badge/license-PolyForm%20NC-blue">
  <img alt="Node" src="https://img.shields.io/badge/node-20%2B-green">
  <img alt="TypeScript" src="https://img.shields.io/badge/typescript-5.9-blue">
  <img alt="PRs Welcome" src="https://img.shields.io/badge/PRs-welcome-brightgreen">
</p>

---

## 📋 To Do

- **Adapter & Webhook Development**
  - Integrate with Bilibili Live Open Platform for enhanced integration features (auto-update viewer info, track membership validity, consumption records, etc.)
  - Integrate with China domestic logistics company open platforms for future membership reward features

---

## 📖 Table of Contents

- [To Do](#-to-do)
- [Introduction](#-introduction)
- [Feature Highlights](#-feature-highlights)
- [Core Modules](#-core-modules)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Production Deployment](#-production-deployment)
- [Custom Domain Setup](#-custom-domain-setup)
- [External PII Platform Integration](#-external-pii-platform-integration)
- [API Reference](#-api-reference)
- [Security](#-security)
- [License](#-license)

---

## 🎯 Introduction

**TCRN TMS (Talent Management System)** is a comprehensive CRM platform specifically designed for VTuber (Virtual YouTuber) and VUP (Virtual UP) agencies. It provides an all-in-one solution from customer profile management to external interactive pages.

### Who is this for?

- **VTuber/VUP Agencies**: Manage talents, customers, and fan interactions at scale
- **Independent Creators**: Build professional presence with customizable homepages
- **Talent Managers**: Track memberships, handle anonymous Q&A (Marshmallow), generate reports
- **Enterprise Teams**: Multi-tenant architecture with fine-grained RBAC permissions

### Key Differentiators

- **Privacy-First Architecture**: PII flows are delegated to an external TCRN PII Platform instead of a repo-owned runtime
- **Multi-Tenant Isolation**: Each tenant has its own PostgreSQL schema for complete data isolation
- **Three-Language Support**: Full UI localization for English, Chinese, and Japanese
- **VTuber-Specific Features**: Marshmallow (anonymous Q&A), customizable talent homepages, membership tracking

---

## ✨ Feature Highlights

### 🔐 Privacy-First PII Boundary

Sensitive customer fields are handled through an external `TCRN_PII_PLATFORM` integration:

- **Adapter-Gated Capability**: effective `integration_adapter` resolution is the only enablement truth
- **Write-Through Only**: create/edit flows can send PII server-to-server, but TMS does not read it back
- **Portal Retrieval**: users view PII in the external platform after SSO and permission checks
- **Archive Isolation Boundary**: `profileStoreId` remains the talent-level customer archive isolation/sharing boundary

### 🏢 Multi-Tenant Organization Structure

```
Platform (AC Tenant)
└── Regular Tenant (Company/Agency)
    └── Subsidiary (Division/Team)
        └── Talent (Individual Creator)
```

- **Schema-Based Isolation**: Each tenant has dedicated PostgreSQL schema (`tenant_xxx`)
- **Hierarchical Permissions**: Settings and rules cascade from tenant → subsidiary → talent
- **Cross-Tenant Management**: Platform administrators can manage all tenants

### 🛡️ Three-State RBAC Permission System

Unlike traditional Grant/Deny systems, TCRN TMS implements a three-state model:

| State     | Description          | Priority |
| --------- | -------------------- | -------- |
| **Deny**  | Explicitly forbidden | Highest  |
| **Grant** | Explicitly allowed   | Medium   |
| **Unset** | Not configured       | Lowest   |

**Functional Roles**: `ADMIN`, `TALENT_MANAGER`, `VIEWER`, `TALENT_SELF`, `MODERATOR`, `SUPPORT`, `ANALYST`

### 🍡 Marshmallow Anonymous Q&A System

A complete anonymous question box system inspired by Japanese "Marshmallow" service:

- **Smart CAPTCHA**: Three modes (Always/Never/Auto) with trust scoring
- **Content Moderation**: Multi-language profanity filter with risk scoring
- **External Blocklist**: Block URLs, domains, and keyword patterns
- **Emoji Reactions**: Fans can react to approved messages
- **Export Capability**: Export messages to CSV/JSON/XLSX

<p align="center">
  <img src=".github/readme-assets/marshmallow/marshmallow_preview_externalpage.png" alt="Marshmallow Preview" width="600">
  <img src=".github/readme-assets/marshmallow/marshmallow_preview_streamermode.png" alt="Marshmallow Preview2" width="600">
  <img src=".github/readme-assets/marshmallow/marshmallow_preview_audit.png" alt="Marshmallow Preview3" width="1200">
</p>

### 📊 MFR Report Generation

Generate comprehensive **Membership Feedback Reports** with:

- Platform-side PII report handoff using `customerId[] + request metadata`
- Platform identities (YouTube, Bilibili, etc.)
- Membership status and expiration tracking
- Async generation with progress tracking
- Direct MinIO download via presigned URLs

### 🔍 Comprehensive Audit Logging

Three types of logs with automatic PII masking:

| Log Type                | Purpose                         | Retention      |
| ----------------------- | ------------------------------- | -------------- |
| **Change Log**          | UI-triggered business changes   | 60 days (prod) |
| **Technical Event Log** | System events and errors        | 60 days (prod) |
| **Integration Log**     | External API calls and webhooks | 60 days (prod) |

Loki integration enables full-text search across all logs.

---

## 📦 Core Modules

### Customer Management

| Feature                 | Description                                                   |
| ----------------------- | ------------------------------------------------------------- |
| **Individual Profiles** | Real name, nickname, contact info, birth date                 |
| **Company Profiles**    | Legal name, registration number, VAT ID                       |
| **Platform Identities** | YouTube, Bilibili, Twitch, Twitter UIDs with history tracking |
| **Membership Records**  | Class, type, level with auto-renewal support                  |
| **External IDs**        | Map customers to external systems (CRM, ticketing)            |
| **Bulk Import**         | CSV import with validation and error reporting                |
| **Batch Operations**    | Bulk tag/status/membership updates                            |

### Homepage Management

Drag-and-drop homepage builder for talents:

- **Component Library**: Hero, About, Social Links, Gallery, Timeline, Marshmallow Widget
- **Theme System**: 5 presets (Default, Dark, Cute, Professional, Minimal) + custom colors
- **Version History**: Rollback to any previous published version
- **Live Status Integration**: Real-time Bilibili/YouTube stream status with cover image support
- **Profile Card**: Enhanced personalization with local avatar upload and customizable layout
- **Custom Domains**: Support for talent-owned domains with DNS verification and flexible SSL options:
  - **Auto (Let's Encrypt)**: Automatic certificate provisioning and renewal
  - **Self-Hosted Proxy**: Use your own SSL certificate with Nginx/Caddy ([Setup Guide](#self-hosted-proxy-setup))
  - **Cloudflare for SaaS**: Edge SSL with global CDN ([Setup Guide](#cloudflare-for-saas-setup))
- **SEO Optimization**: Automatic meta tags and Open Graph support
- **Example Page**: [https://web.prod.tcrn-tms.com/p/joi_channel](https://web.prod.tcrn-tms.com/p/joi_channel)

### Security Management

| Feature                   | Description                                      |
| ------------------------- | ------------------------------------------------ |
| **Blocklist**             | Keyword and regex patterns for content filtering |
| **IP Rules**              | Whitelist/blacklist with CIDR support            |
| **Rate Limiting**         | Redis-backed per-endpoint rate limits            |
| **UA Detection**          | Block known bot/scraper user agents              |
| **Technical Fingerprint** | Hidden watermarks for data leak tracking         |

### Email Service

Integrated with Tencent Cloud SES:

- **Template System**: Multi-language templates (en/zh/ja) with variable substitution
- **Queue Processing**: BullMQ worker with retry and rate limiting
- **Preset Templates**: Password reset, login verification, membership alerts
- **Current Support Boundary**: This is the only fully wired outbound integration in the default runtime. `NATS JetStream` exists as internal async infrastructure today, not as the official external integration contract.

### Runtime Performance

Current runtime performance levers:

| Feature                | Implementation                                       |
| ---------------------- | ---------------------------------------------------- |
| **Async Workloads**    | BullMQ workers for email, import/export, and reports |
| **Permission Caching** | Redis-backed permission snapshots and rate limits    |
| **Tenant Isolation**   | Tenant-specific PostgreSQL schemas                   |
| **File Delivery**      | MinIO presigned URL downloads                        |

### Browser Runtime Boundary

As of 2026-04-16, this repository no longer ships a browser runtime:

- **No repo-owned UI**: `historical browser runtime` has been removed from this monorepo
- **External Browser App**: any login/admin/public UI must live outside this repository
- **URL Contract**: `FRONTEND_URL`, `APP_URL`, and `CORS_ORIGIN` point to that external browser runtime or public origin

### Error Handling

Current error surfaces are runtime-centric:

- **API**: Nest exception handling, request validation, and structured HTTP responses
- **Worker**: queue retries, dead-letter/error logging, and job-level failure visibility
- **Database/Infra**: deployment and rollout checks remain separate from browser smoke assumptions

### Contract Validation

End-to-end type-safe validation with Zod remains active in the shared/backend layers:

- **145+ Zod Schemas**: Covering Auth, Customer, Marshmallow, Homepage modules
- **Backend**: `ZodValidationPipe` for automatic request validation
- **Shared Contracts**: API-facing schemas stay reusable for external callers
- **Swagger Integration**: Auto-generated API docs from Zod schemas

---

## 🏗️ Architecture

```
                                    ┌─────────────────────────────────────────┐
                                    │             Cloud Provider              │
                                    │  ┌─────────────────────────────────┐   │
                                    │  │         Load Balancer           │   │
                                    │  └─────────────┬───────────────────┘   │
                                    │                │                        │
               ┌─────────────────────┼────────────────┼────────────────────┐  │
               │                     │                │                    │  │
               ▼                     ▼                ▼                    ▼  │
        ┌─────────────┐       ┌─────────────┐  ┌─────────────┐     ┌─────────┐│
        │  External   │       │   NestJS    │  │   Worker    │     │  MinIO  ││
        │  Browser UI │──────▶│   (API)     │  │  (BullMQ)   │     │  (S3)   ││
        │ (out-of-repo)│      │   :4000     │  │             │     │  :9000  ││
        └─────────────┘       └──────┬──────┘  └──────┬──────┘     └─────────┘│
                                     │                │                       │
                              ┌──────┴──────┬─────────┴────┐                  │
                              │             │              │                  │
                              ▼             ▼              ▼                  │
                       ┌───────────┐ ┌───────────┐  ┌───────────┐             │
                       │PostgreSQL │ │   Redis   │  │   NATS    │             │
                       │   :5432   │ │   :6379   │  │   :4222   │             │
                       └───────────┘ └───────────┘  └───────────┘             │
                              │                                               │
                              │ mTLS                                          │
                              ▼                                               │
               ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                 │
              │      External TCRN PII Platform           │                  │
              │  ┌─────────────────┐  ┌─────────────────┐  │                  │
              │  │  Portal + API   │  │  PII Storage    │  │                  │
              │  │  (separate      │──│  + Reporting    │  │                  │
              │  │   project)      │  │  (separate)     │  │                  │
              │  └─────────────────┘  └─────────────────┘  │                  │
               ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                 │
                                    └─────────────────────────────────────────┘
```

### Data Flow

1. **External Browser Runtime** → **API Gateway** (NestJS) for all business operations
2. **API** validates JWT and checks Redis permission snapshots
3. Non-PII data stored in tenant-specific PostgreSQL schema
4. When effective `TCRN_PII_PLATFORM` is active, customer create/edit sends PII write-through payloads with `customerId`
5. PII viewing happens by portal redirect and SSO on the external platform; TMS does not read PII back
6. Background jobs processed by BullMQ Workers
7. Files stored in MinIO with presigned URL downloads

---

## 🛠️ Tech Stack

| Layer                  | Technology     | Version |
| ---------------------- | -------------- | ------- |
| **API Runtime**        | NestJS         | 11.1.6  |
|                        | TypeScript     | 5.9.3   |
| **Worker Runtime**     | BullMQ         | 5.66.5  |
| **Contracts / Schema** | Zod            | 4.x     |
|                        | Prisma ORM     | 6.14.0  |
| **Database**           | PostgreSQL     | 16      |
|                        | Redis          | 7       |
| **Storage**            | MinIO          | Latest  |
| **Messaging**          | NATS JetStream | 2       |
| **Observability**      | OpenTelemetry  | -       |
|                        | Prometheus     | -       |
|                        | Grafana Loki   | 2.9.0   |
|                        | Grafana Tempo  | -       |
| **Deployment**         | Docker         | -       |
|                        | Kubernetes     | -       |

Current runtime status for the infrastructure above:

- `NATS JetStream` is an active dependency in the current local and production Compose stack.
- `NATS JetStream` currently serves internal async plumbing. Do not describe it as a production-ready external integration surface unless the business flow is actually wired to it.
- `Grafana Loki` has an optional Compose profile service and real query/push helpers, but the default source of truth is still the tenant PostgreSQL log tables. `/api/v1/logs/search*` reads Loki and returns empty results when `LOKI_ENABLED=false`; the API/worker-side Loki push helpers are not the default producer path today.
- `Grafana Tempo` and the API-side OpenTelemetry bootstrap are provisioned behind the optional `observability` Compose profile for future rollout; distributed tracing is not enabled by default in the current runtime. To opt in locally, start `docker compose --profile observability up -d loki tempo`, set `OTEL_ENABLED=true`, and point `OTEL_EXPORTER_OTLP_ENDPOINT` at a trace backend such as Tempo. Metrics stay disabled unless `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` is explicitly set to a separate OTLP metrics collector; do not point that metrics endpoint at Tempo.
- `Prometheus` is a reserved roadmap item and is not part of the current default Compose deployment.
- The repo-owned `pii-health-check` worker probe has been retired with the standalone PII runtime.
- If you need dependency telemetry for the external `TCRN_PII_PLATFORM`, implement it in that platform or its adapter/operator monitoring, not as a hidden local worker assumption in this repo.

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ (LTS recommended)
- pnpm 9.15.4+
- Docker & Docker Compose
- PostgreSQL 16+ (or use Docker)
- Redis 7+ (or use Docker)

### Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/tpmoonchefryan/tcrn-tms.git
cd tcrn-tms

# 2. Install dependencies
pnpm install

# 3. Start infrastructure services
# Core runtime dependencies
docker compose up -d postgres redis minio nats

# Optional: start local observability services only when working on Loki/Tempo/OTEL paths
docker compose --profile observability up -d loki tempo

# 4. Configure environment
cp .env.sample .env.local
# Edit .env.local with your settings

# 5. Initialize database
cd packages/database
pnpm db:apply-migrations
pnpm db:sync-schemas
pnpm db:seed
cd ../..

# 5b. Optional: configure an external `TCRN_PII_PLATFORM` adapter in TMS
# This repository no longer starts or migrates a local standalone PII service.

# 6. Start development servers
pnpm dev
```

### Access Points

| Service       | URL                            |
| ------------- | ------------------------------ |
| API           | http://localhost:4000          |
| API Docs      | http://localhost:4000/api/docs |
| MinIO Console | http://localhost:9001          |
| NATS Monitor  | http://localhost:8222          |

There is no repo-owned browser UI in local development anymore. If you run an external browser app against this API, point it at the API URL above and configure `FRONTEND_URL` / `APP_URL` / `CORS_ORIGIN` accordingly.

### Default Credentials

**AC (Platform Admin) Tenant:**
| Field | Value |
|-------|-------|
| Tenant Code | AC |
| Username | ac_admin |
| Password | (set during seed, see `00-ac-tenant.ts`) |

### Testing And Verification Boundary

- The repo-owned historical browser test suite/browser suite has been removed together with `historical browser runtime`; there is no root `historical browser E2E validation` entry anymore.
- `pnpm test:integration` at the repo root is an alias for `pnpm --filter @tcrn/api test:integration` and runs the API integration suite with `vitest.integration.config.ts`.
- `pnpm test:isolation` at the repo root is an alias for `pnpm --filter @tcrn/api test:isolation` and runs the API isolation suite with the same Vitest integration config.
- For schema-changing releases, run `db:verify-schema-rollout` together with the normal runtime health check; do not treat browser smoke checks as a substitute for direct schema rollout verification.

---

## 🌐 Production Deployment

This section covers deploying the main TCRN TMS application to a cloud server.

### Infrastructure Requirements

| Component              | Minimum                    | Recommended                |
| ---------------------- | -------------------------- | -------------------------- |
| **Application Server** | 2 vCPU, 4GB RAM            | 4 vCPU, 8GB RAM            |
| **PostgreSQL**         | 2 vCPU, 4GB RAM, 50GB SSD  | 4 vCPU, 8GB RAM, 100GB SSD |
| **Redis**              | 1 vCPU, 1GB RAM            | 2 vCPU, 2GB RAM            |
| **MinIO**              | 2 vCPU, 2GB RAM, 100GB SSD | 4 vCPU, 4GB RAM, 500GB SSD |

### Deployment Options

#### Option 1: Docker Compose (Single Server)

Best for: Small deployments, staging environments

```bash
# 1. Prepare the server
ssh your-server
sudo apt update && sudo apt install -y docker.io docker-compose-plugin

# 2. Clone and configure
git clone https://github.com/tpmoonchefryan/tcrn-tms.git
cd tcrn-tms
cp .env.sample .env

# 3. Configure production environment variables
cat > .env << 'EOF'
# Database
POSTGRES_USER=tcrn_prod
POSTGRES_PASSWORD=$(openssl rand -hex 32)
POSTGRES_DB=tcrn_tms
DATABASE_URL=postgresql://tcrn_prod:${POSTGRES_PASSWORD}@postgres:5432/tcrn_tms

# Redis
REDIS_URL=redis://redis:6379

# Security
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
FINGERPRINT_SECRET_KEY=$(openssl rand -hex 32)
FINGERPRINT_KEY_VERSION=v1

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=$(openssl rand -hex 32)
MINIO_ENDPOINT=http://minio:9000

# External PII Platform
# Configure `TCRN_PII_PLATFORM` through tenant/subsidiary/talent integration adapters.
# No repo-owned PII runtime env is required in this repository.

# Application
NODE_ENV=production
FRONTEND_URL=https://app.your-domain.com
APP_URL=https://app.your-domain.com
CORS_ORIGIN=https://app.your-domain.com

# Email (Tencent Cloud SES)
TENCENT_SES_SECRET_ID=your-secret-id
TENCENT_SES_SECRET_KEY=your-secret-key
TENCENT_SES_REGION=ap-hongkong
TENCENT_SES_FROM_ADDRESS=noreply@your-domain.com
EOF

# 4. Build and deploy
docker-compose -f docker-compose.yml build
docker-compose -f docker-compose.yml up -d

# 5. Initialize database
docker-compose exec api pnpm db:apply-migrations
docker-compose exec api pnpm db:sync-schemas
docker-compose exec api pnpm db:seed

# 6. Verify schema rollout for schema-changing releases
pnpm --filter @tcrn/database db:verify-schema-rollout -- \
  --migration 20260324000001_add_export_job \
  --require-table export_job \
  --require-column export_job.updated_at \
  --require-index export_job_status_idx \
  --json
```

`db:verify-schema-rollout` is read-only. If `--schema` is omitted, it verifies `tenant_template` plus all active tenant schemas from `public.tenant`.

Use it together with your normal runtime health check whenever a release adds or repairs schema artifacts.
For destructive releases, also pass `--require-absent-table`, `--require-absent-column`, and `--require-absent-index` as needed. When `--infer-artifacts-from-migrations` is enabled, supported `DROP TABLE`, `DROP COLUMN`, and `DROP INDEX` tenant artifacts are inferred automatically too.

Release artifact template:

```bash
pnpm --filter @tcrn/database db:verify-schema-rollout -- \
  --migration <migration_folder_name> \
  --require-table <table_name> \
  --require-column <table_name.column_name> \
  --require-index <index_name> \
  [--require-absent-table <table_name>] \
  [--require-absent-column <table_name.column_name>] \
  [--require-absent-index <index_name>] \
  [--schema <tenant_schema>] \
  --json
```

- Repeat `--require-table`, `--require-column`, `--require-index`, `--require-absent-table`, `--require-absent-column`, and `--require-absent-index` for every artifact that the release must prove.
- Omit `--schema` for a tenant-wide sweep across `tenant_template` plus every active tenant schema. Add `--schema` only when you need a targeted follow-up proof for one tenant.
- Keep this command separate from historical browser test suite/browser checks. It is the direct verification step for database rollout state, not a UI smoke replacement.
- When investigating tenant migration replay drift, you can opt into a stricter apply step with `pnpm --filter @tcrn/database db:apply-migrations -- --fail-on-drift-watch-skips`. This keeps the default replay behavior unchanged, but turns drift-watch skip families into a failing exit code.

Example using inferred artifacts directly from migration SQL:

```bash
pnpm --filter @tcrn/database db:verify-schema-rollout -- \
  --migration 20260330000001_add_marshmallow_export_job \
  --infer-artifacts-from-migrations \
  --json
```

#### Option 2: Kubernetes (Recommended for Production)

Current status:

- the old generic Kubernetes instructions in this section are no longer the production cutover source of truth
- the active production-first path is now a conservative first cut:
  - single-node `K3s`
  - same-host external PostgreSQL
  - single replica `api/worker`
  - local development still stays on Docker Compose plus local app processes

Do not follow the older in-cluster PostgreSQL / HPA / multi-replica assumptions that previously appeared here for this first-cut production rollout.

Use these files instead:

- `infra/k8s/README.md`
- `.context/plans/2026-04-11-single-node-k3s-fresh-redeploy-cutover-checklist.md`

Current operator entrypoints for the first cut:

```bash
# 1. Read-only cluster preflight
scripts/k8s-preflight-cluster.sh

# 2. Create runtime secret from the preserved production env file
scripts/k8s-create-runtime-secret.sh /path/to/production.env

# 3. If GHCR images remain private, create the pull secret
GHCR_USERNAME=... GHCR_TOKEN=... scripts/k8s-create-registry-secret.sh

# 4. Apply the first-cut baseline
IMAGE_TAG=... \
APP_HOST=api.your-domain.com \
TLS_SECRET_NAME=... \
INGRESS_CLASS_NAME=traefik \
REGISTRY_SECRET_NAME=ghcr-pull-secret \
scripts/k8s-deploy-production.sh

# 5. Run first-install bootstrap
IMAGE_TAG=... REGISTRY_SECRET_NAME=ghcr-pull-secret scripts/k8s-run-db-bootstrap.sh

# 6. Optional rollout verification for schema-changing releases
IMAGE_TAG=... \
ROLLOUT_MIGRATIONS=20260330000001_add_marshmallow_export_job \
REGISTRY_SECRET_NAME=ghcr-pull-secret \
scripts/k8s-run-db-verify-schema-rollout.sh

# 7. Post-cutover smoke checks
APP_HOST=api.your-domain.com scripts/k8s-smoke-production.sh
```

This path is intentionally conservative. It does not yet claim:

- multi-node HA
- HPA
- any repo-owned browser runtime
- in-cluster PostgreSQL for the first cut

### SSL/TLS Configuration

```nginx
# Example Nginx configuration for API reverse proxy
server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

    location / {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Any browser UI reverse proxy now belongs to the external browser runtime, not to this repository.

### Environment Checklist

- [ ] PostgreSQL with TLS enabled
- [ ] Redis with authentication
- [ ] MinIO with HTTPS
- [ ] JWT secrets generated (min 32 characters)
- [ ] Fingerprint key configured
- [ ] External `TCRN_PII_PLATFORM` adapter activated at the intended scope
- [ ] External portal and SSO reachability verified
- [ ] Email service credentials configured
- [ ] Backup strategy implemented
- [ ] Monitoring and alerting configured

---

## 🌍 Custom Domain Setup

TCRN TMS supports two custom-domain modes for public pages.

<a id="self-hosted-proxy-setup"></a>

### Self-Hosted Proxy Setup

Use this mode when the customer manages their own SSL certificate and reverse proxy.

Requirements:

- A public server with Nginx or Caddy
- A valid SSL certificate and private key
- DNS access for the custom domain
- The target public page path, such as `/p/joi_channel`

Example Nginx configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;

    location / {
        proxy_pass https://YOUR_TCRN_DOMAIN/p/YOUR_TALENT_PATH;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_ssl_verify off;
    }

    location /ask {
        proxy_pass https://YOUR_TCRN_DOMAIN/m/YOUR_TALENT_PATH;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_ssl_verify off;
    }
}
```

Example Caddy configuration:

```caddyfile
your-domain.com {
    tls /etc/ssl/certs/your-domain.crt /etc/ssl/private/your-domain.key

    handle {
        reverse_proxy https://YOUR_TCRN_DOMAIN {
            header_up Host {upstream_hostport}
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            rewrite /p/YOUR_TALENT_PATH{uri}
        }
    }

    handle /ask* {
        reverse_proxy https://YOUR_TCRN_DOMAIN {
            header_up Host {upstream_hostport}
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            rewrite /m/YOUR_TALENT_PATH{uri}
        }
    }
}
```

Replace:

- `your-domain.com` with the customer-owned domain
- `YOUR_TCRN_DOMAIN` with the platform public domain
- `YOUR_TALENT_PATH` with the talent slug

<a id="cloudflare-for-saas-setup"></a>

### Cloudflare for SaaS Setup

Use this mode when the platform manages certificates at the Cloudflare edge.

Platform-side steps:

1. Enable `SSL/TLS -> Custom Hostnames` in Cloudflare.
2. Configure the fallback origin for the TCRN TMS public entry.
3. Create the custom hostname after domain verification.

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/custom_hostnames" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{
    "hostname": "talent.customer.com",
    "ssl": {
      "method": "txt",
      "type": "dv"
    }
  }'
```

Customer-side steps:

1. Add the CNAME record provided by the platform.
2. Add the TXT verification record shown in TCRN TMS.
3. Wait for DNS propagation and certificate issuance.
4. Verify that `https://your-domain.com` resolves to the expected public page.

---

## 🔒 External PII Platform Integration

TCRN TMS no longer ships a repo-owned standalone PII runtime. Sensitive fields are handled by an externally deployed `TCRN_PII_PLATFORM`, operated as a separate project and integrated back into TMS.

### Canonical Rules

- Effective `integration_adapter` resolution with code `TCRN_PII_PLATFORM` is the only enablement truth.
- `profileStoreId` stays in TMS as the customer archive isolation/sharing boundary between talents.
- TMS owns non-PII customer core data and cross-system `customerId`.
- The external platform owns sensitive-field storage, portal viewing, and PII report generation.

### Runtime Flow

1. Deploy and operate the external PII platform outside this repository.
2. Configure SSO, permissions, and adapter credentials in that platform and in TMS integration settings.
3. Activate the `TCRN_PII_PLATFORM` adapter at the tenant, subsidiary, or talent scope that should expose PII entry.
4. Customer create/edit in TMS shows the PII section only when the adapter is effective, then sends overwrite-style write-through payloads keyed by `customerId`.
5. Customer viewing uses the `Retrieve PII Data` portal redirect flow; TMS does not read PII back into its own UI.
6. PII report requests hand off `customerId[] + request metadata` to the external platform; report binaries remain on the platform side.

### Operator Checklist

- [ ] External PII platform is deployed and reachable from end users
- [ ] SSO login and permission checks work on the platform portal
- [ ] The intended TMS scope has an active `TCRN_PII_PLATFORM` adapter
- [ ] Customer create/edit write-through succeeds with overwrite semantics
- [ ] `Retrieve PII Data` redirects correctly into the external portal
- [ ] PII report generation works through platform-side handoff

### Local Development Note

This repository no longer contains:

- `apps/pii-service`
- `docker-compose.pii.prod.yml`
- `pii-migrate`
- repo-owned PII Dockerfiles or local PII bootstrap scripts

Local development only needs the main TMS runtime. To exercise PII-enabled flows, connect TMS to a real external platform environment and activate the adapter at the correct scope.

---

## 📚 API Reference

### Base URL

```
{baseUrl}/api/v1
```

### Authentication

All authenticated endpoints require a JWT token:

```bash
curl -X POST /api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"tenantCode": "AC", "username": "admin", "password": "..."}'

# Response includes accessToken and sets refreshToken cookie
```

### Key Endpoints

| Category         | Endpoint                                  | Description                    |
| ---------------- | ----------------------------------------- | ------------------------------ |
| **Auth**         | `POST /auth/login`                        | Login with credentials         |
|                  | `POST /auth/refresh`                      | Refresh access token           |
|                  | `POST /auth/logout`                       | Logout and invalidate tokens   |
| **Customers**    | `GET /customers`                          | List customers with pagination |
|                  | `POST /customers`                         | Create customer profile        |
|                  | `POST /customers/{id}/pii-portal-session` | Create PII portal session      |
| **Organization** | `GET /organization/tree`                  | Get organization structure     |
|                  | `POST /subsidiaries`                      | Create subsidiary              |
|                  | `POST /talents`                           | Create talent                  |
| **Marshmallow**  | `GET /public/marshmallow/{path}/messages` | Get public messages            |
|                  | `POST /public/marshmallow/{path}/submit`  | Submit anonymous question      |
|                  | `POST /marshmallow/messages/{id}/approve` | Approve message                |
| **Reports**      | `POST /reports/mfr/jobs`                  | Start MFR generation           |
|                  | `GET /reports/mfr/jobs/{id}`              | Get job status                 |
|                  | `GET /reports/mfr/jobs/{id}/download`     | Get download URL               |
| **Logs**         | `GET /logs/changes`                       | Query change logs              |
|                  | `GET /logs/events`                        | Query system events            |
|                  | `GET /logs/search`                        | Loki full-text search          |
| **Compliance**   | `GET /compliance/data-map`                | Data mapping report            |
|                  | `GET /compliance/privacy-impact`          | Privacy impact assessment      |

### Response Format

**Success:**

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 100
  }
}
```

**Error:**

```json
{
  "success": false,
  "code": "AUTH_INVALID_CREDENTIALS",
  "message": "Invalid username or password",
  "statusCode": 401
}
```

---

## 🔐 Security

### Password Policy

- Minimum 12 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character
- 90-day expiration reminder

### Two-Factor Authentication

TOTP-based 2FA with recovery codes:

- 10 one-time recovery codes generated on setup
- Recovery codes stored as SHA256 hashes
- Tenant admins can enforce 2FA for all users

### Data Protection

| Data Type          | Protection Method            |
| ------------------ | ---------------------------- |
| Passwords          | bcrypt hash (cost factor 12) |
| PII                | AES-256-GCM encryption       |
| Sessions           | JWT with short expiry        |
| API Communication  | TLS 1.2+ required            |
| Service-to-Service | mTLS authentication          |

### Security Headers

All responses include:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`
- `Content-Security-Policy: ...`

---

## 📄 License

This project is licensed under the **PolyForm Noncommercial License 1.0.0**.

Commercial use requires a separate license agreement. For enterprise licensing or SaaS service purchase, please contact ryan.lan_home@outlook.com.

---

## 📞 Support

- **Documentation**: Public visitor docs are in this README and [SECURITY.md](./SECURITY.md)
- **Issues**: [GitHub Issues](https://github.com/tpmoonchefryan/tcrn-tms/issues)
- **Discussions**: [GitHub Discussions](https://github.com/tpmoonchefryan/tcrn-tms/discussions)
