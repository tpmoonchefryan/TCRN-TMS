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
  <img alt="TypeScript" src="https://img.shields.io/badge/typescript-5.8-blue">
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
- [PII Proxy Service Deployment](#-pii-proxy-service-deployment)
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

- **Privacy-First Architecture**: PII (Personally Identifiable Information) is stored in a separate encrypted microservice
- **Multi-Tenant Isolation**: Each tenant has its own PostgreSQL schema for complete data isolation
- **Three-Language Support**: Full UI localization for English, Chinese, and Japanese
- **VTuber-Specific Features**: Marshmallow (anonymous Q&A), customizable talent homepages, membership tracking

---

## ✨ Feature Highlights

### 🔐 Privacy-First PII Architecture

All sensitive customer data (real names, phone numbers, addresses, emails) is stored in an independent PII Proxy Service:

- **Token-Based Access**: Local database only stores `rm_profile_id` tokens
- **AES-256-GCM Encryption**: Data at rest is encrypted with per-tenant DEKs
- **mTLS Authentication**: Service-to-service communication secured with mutual TLS
- **Short-Lived JWTs**: 5-minute access tokens for PII retrieval

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

| State | Description | Priority |
|-------|-------------|----------|
| **Deny** | Explicitly forbidden | Highest |
| **Grant** | Explicitly allowed | Medium |
| **Unset** | Not configured | Lowest |

**Functional Roles**: `ADMIN`, `TALENT_MANAGER`, `VIEWER`, `TALENT_SELF`, `MODERATOR`, `SUPPORT`, `ANALYST`

### 🍡 Marshmallow Anonymous Q&A System

A complete anonymous question box system inspired by Japanese "Marshmallow" service:

- **Smart CAPTCHA**: Three modes (Always/Never/Auto) with trust scoring
- **Content Moderation**: Multi-language profanity filter with risk scoring
- **External Blocklist**: Block URLs, domains, and keyword patterns
- **Emoji Reactions**: Fans can react to approved messages
- **Export Capability**: Export messages to CSV/JSON/XLSX

<p align="center">
  <img src="docs/images/marshmallow_preview_externalpage.png" alt="Marshmallow Preview" width="600">
  <img src="docs/images/marshmallow_preview_streamermode.png" alt="Marshmallow Preview2" width="600">
  <img src="docs/images/marshmallow_preview_audit.png" alt="Marshmallow Preview3" width="1200">
</p>

### 📊 MFR Report Generation

Generate comprehensive **Membership Feedback Reports** with:

- Member profiles with PII (via secure retrieval)
- Platform identities (YouTube, Bilibili, etc.)
- Membership status and expiration tracking
- Async generation with progress tracking
- Direct MinIO download via presigned URLs

### 🔍 Comprehensive Audit Logging

Three types of logs with automatic PII masking:

| Log Type | Purpose | Retention |
|----------|---------|-----------|
| **Change Log** | UI-triggered business changes | 60 days (prod) |
| **Technical Event Log** | System events and errors | 60 days (prod) |
| **Integration Log** | External API calls and webhooks | 60 days (prod) |

Loki integration enables full-text search across all logs.

---

## 📦 Core Modules

### Customer Management

| Feature | Description |
|---------|-------------|
| **Individual Profiles** | Real name, nickname, contact info, birth date |
| **Company Profiles** | Legal name, registration number, VAT ID |
| **Platform Identities** | YouTube, Bilibili, Twitch, Twitter UIDs with history tracking |
| **Membership Records** | Class, type, level with auto-renewal support |
| **External IDs** | Map customers to external systems (CRM, ticketing) |
| **Bulk Import** | CSV import with validation and error reporting |
| **Batch Operations** | Bulk tag/status/membership updates |

### Homepage Management

Drag-and-drop homepage builder for talents:

- **Component Library**: Hero, About, Social Links, Gallery, Timeline, Marshmallow Widget
- **Theme System**: 5 presets (Default, Dark, Cute, Professional, Minimal) + custom colors
- **Version History**: Rollback to any previous published version
- **Live Status Integration**: Real-time Bilibili/YouTube stream status with cover image support
- **Profile Card**: Enhanced personalization with local avatar upload and customizable layout
- **Custom Domains**: Support for talent-owned domains with DNS verification and flexible SSL options:
  - **Auto (Let's Encrypt)**: Automatic certificate provisioning and renewal
  - **Self-Hosted Proxy**: Use your own SSL certificate with Nginx/Caddy ([Setup Guide](docs/custom-domain/self-hosted-proxy.md))
  - **Cloudflare for SaaS**: Edge SSL with global CDN ([Setup Guide](docs/custom-domain/cloudflare-saas.md))
- **SEO Optimization**: Automatic meta tags and Open Graph support
- **Example Page**: [https://web.prod.tcrn-tms.com/p/joi_channel](https://web.prod.tcrn-tms.com/p/joi_channel)

### Security Management

| Feature | Description |
|---------|-------------|
| **Blocklist** | Keyword and regex patterns for content filtering |
| **IP Rules** | Whitelist/blacklist with CIDR support |
| **Rate Limiting** | Redis-backed per-endpoint rate limits |
| **UA Detection** | Block known bot/scraper user agents |
| **Technical Fingerprint** | Hidden watermarks for data leak tracking |

### Email Service

Integrated with Tencent Cloud SES:

- **Template System**: Multi-language templates (en/zh/ja) with variable substitution
- **Queue Processing**: BullMQ worker with retry and rate limiting
- **Preset Templates**: Password reset, login verification, membership alerts

### Performance Optimization

Production-grade performance features:

| Feature | Implementation |
|---------|----------------|
| **Dynamic Imports** | 7+ large components lazy-loaded via `dynamic.tsx` |
| **List Virtualization** | `@tanstack/react-virtual` for long lists |
| **Image Optimization** | `next/image` with remote patterns configured |
| **Memoization** | `React.memo` on high-frequency components |

### Accessibility

WCAG 2.1 AA compliant:

- **Reduced Motion**: Respects `prefers-reduced-motion` system preference
- **Keyboard Navigation**: Full keyboard support for all interactive elements
- **Screen Readers**: Semantic HTML and ARIA labels throughout

### Error Handling

Three-tier error boundary architecture:

```
app/error.tsx              → Global fallback
app/(business)/error.tsx   → Business section fallback
app/(admin)/admin/error.tsx → Admin section fallback
```

### Form Validation

End-to-end type-safe validation with Zod:

- **145+ Zod Schemas**: Covering Auth, Customer, Marshmallow, Homepage modules
- **Backend**: `ZodValidationPipe` for automatic request validation
- **Frontend**: `useZodForm` hook for form state management
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
        │   Next.js   │       │   NestJS    │  │   Worker    │     │  MinIO  ││
        │   (Web UI)  │──────▶│   (API)     │  │  (BullMQ)   │     │  (S3)   ││
        │   :3000     │       │   :4000     │  │             │     │  :9000  ││
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
              │         Isolated PII Environment           │                  │
              │  ┌─────────────────┐  ┌─────────────────┐  │                  │
              │  │  PII Proxy      │  │  PII Database   │  │                  │
              │  │  Service :5100  │──│  PostgreSQL     │  │                  │
              │  │  (AES-256-GCM)  │  │  (Encrypted)    │  │                  │
              │  └─────────────────┘  └─────────────────┘  │                  │
               ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                 │
                                    └─────────────────────────────────────────┘
```

### Data Flow

1. **Web UI** → **API Gateway** (NestJS) for all business operations
2. **API** validates JWT and checks Redis permission snapshots
3. Non-PII data stored in tenant-specific PostgreSQL schema
4. PII retrieval: API issues short-lived JWT → PII Proxy → Encrypted storage
5. Background jobs processed by BullMQ Workers
6. Files stored in MinIO with presigned URL downloads

---

## 🛠️ Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Frontend** | Next.js | 16.1.1 |
| | React | 19.1.1 |
| | TypeScript | 5.8.3 |
| | Tailwind CSS | 3.4.17 |
| | Zustand | 5.0.5 |
| | TanStack React Virtual | 3.13.18 |
| **Backend** | NestJS | 11.1.6 |
| | Prisma ORM | 6.14.0 |
| | BullMQ | 5.66.5 |
| **Database** | PostgreSQL | 16 |
| | Redis | 7 |
| **Storage** | MinIO | Latest |
| **Messaging** | NATS JetStream | 2 |
| **Observability** | OpenTelemetry | - |
| | Prometheus | - |
| | Grafana Loki | 2.9.0 |
| | Grafana Tempo | - |
| **Deployment** | Docker | - |
| | Kubernetes | - |

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
docker-compose up -d postgres redis minio nats loki tempo pii-postgres pii-service

# 4. Configure environment
cp .env.sample .env.local
# Edit .env.local with your settings

# 5. Initialize database
cd packages/database
pnpm db:apply-migrations
pnpm db:sync-schemas
pnpm db:seed
cd ../..

# 6. Start development servers
pnpm dev
```

### Access Points

| Service | URL |
|---------|-----|
| Web UI | http://localhost:3000 |
| API | http://localhost:4000 |
| API Docs | http://localhost:4000/api/docs |
| MinIO Console | http://localhost:9001 |
| NATS Monitor | http://localhost:8222 |

### Default Credentials

**AC (Platform Admin) Tenant:**
| Field | Value |
|-------|-------|
| Tenant Code | AC |
| Username | ac_admin |
| Password | (set during seed, see `00-ac-tenant.ts`) |

---

## 🌐 Production Deployment

This section covers deploying the main TCRN TMS application to a cloud server.

### Infrastructure Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **Application Server** | 2 vCPU, 4GB RAM | 4 vCPU, 8GB RAM |
| **PostgreSQL** | 2 vCPU, 4GB RAM, 50GB SSD | 4 vCPU, 8GB RAM, 100GB SSD |
| **Redis** | 1 vCPU, 1GB RAM | 2 vCPU, 2GB RAM |
| **MinIO** | 2 vCPU, 2GB RAM, 100GB SSD | 4 vCPU, 4GB RAM, 500GB SSD |

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

# PII Service (separate server recommended for production)
PII_SERVICE_URL=https://pii.your-domain.com:5100
PII_SERVICE_MTLS_ENABLED=true

# Application
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_APP_URL=https://app.your-domain.com

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
```

#### Option 2: Kubernetes (Recommended for Production)

Best for: High availability, auto-scaling, enterprise deployments

```bash
# 1. Apply namespace and secrets
kubectl create namespace tcrn-tms
kubectl apply -f infra/k8s/secrets/

# 2. Deploy infrastructure
kubectl apply -f infra/k8s/postgres/
kubectl apply -f infra/k8s/redis/
kubectl apply -f infra/k8s/minio/
kubectl apply -f infra/k8s/nats/

# 3. Wait for infrastructure to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n tcrn-tms --timeout=300s

# 4. Deploy applications
kubectl apply -f infra/k8s/deployments/

# 5. Configure ingress
kubectl apply -f infra/k8s/ingress/

# 6. Run database migrations (one-time job)
kubectl apply -f infra/k8s/jobs/db-migrate.yaml
```

**Kubernetes Features:**

- **Rolling Updates**: Zero-downtime deployments with `maxUnavailable: 0`
- **Horizontal Pod Autoscaler (HPA)**: Auto-scale based on CPU/memory
- **Pod Disruption Budget (PDB)**: Maintain minimum replicas during updates
- **Health Checks**: Readiness and liveness probes on all services

### SSL/TLS Configuration

```nginx
# Example Nginx configuration for reverse proxy
server {
    listen 443 ssl http2;
    server_name app.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Environment Checklist

- [ ] PostgreSQL with TLS enabled
- [ ] Redis with authentication
- [ ] MinIO with HTTPS
- [ ] JWT secrets generated (min 32 characters)
- [ ] Fingerprint key configured
- [ ] PII Service URL configured (see next section)
- [ ] Email service credentials configured
- [ ] Backup strategy implemented
- [ ] Monitoring and alerting configured

---

## 🔒 PII Proxy Service Deployment

The PII Proxy Service must be deployed on a **separate server** from the main application for security compliance.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MAIN APPLICATION SERVER                          │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐               │
│  │   Web UI    │   │   API       │   │   Worker    │               │
│  └─────────────┘   └──────┬──────┘   └──────┬──────┘               │
│                           │                  │                      │
│                           │   JWT + mTLS     │                      │
└───────────────────────────┼──────────────────┼──────────────────────┘
                            │                  │
                            ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PII PROXY SERVER (Isolated)                      │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    PII Proxy Service                         │   │
│  │   - JWT Verification                                         │   │
│  │   - AES-256-GCM Encryption/Decryption                       │   │
│  │   - Per-Tenant DEK Management                               │   │
│  │   - Audit Logging                                            │   │
│  └───────────────────────────┬─────────────────────────────────┘   │
│                              │                                      │
│  ┌───────────────────────────▼─────────────────────────────────┐   │
│  │                    PII Database                              │   │
│  │   - Encrypted at rest                                        │   │
│  │   - Network isolated                                         │   │
│  │   - No direct external access                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Server Requirements

| Component | Specification |
|-----------|---------------|
| **OS** | Ubuntu 22.04 LTS or later |
| **CPU** | 2+ vCPU |
| **RAM** | 4GB+ |
| **Storage** | 50GB+ SSD (encrypted) |
| **Network** | Private network or VPN to main server |

### Step 1: Prepare the PII Server

```bash
# SSH into your PII server
ssh pii-server

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# Install required tools
sudo apt install -y openssl ufw
```

### Step 2: Configure Firewall

```bash
# Allow SSH
sudo ufw allow ssh

# Allow PII service port (only from main application server)
sudo ufw allow from MAIN_SERVER_IP to any port 5100

# Enable firewall
sudo ufw enable
```

### Step 3: Generate mTLS Certificates

```bash
# Create certificates directory
mkdir -p ~/pii-certs && cd ~/pii-certs

# Generate CA certificate
openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 3650 -key ca.key -out ca.crt \
    -subj "/C=US/ST=State/L=City/O=YourOrg/CN=TCRN-TMS-CA"

# Generate server certificate for PII service
openssl genrsa -out server.key 4096
openssl req -new -key server.key -out server.csr \
    -subj "/C=US/ST=State/L=City/O=YourOrg/CN=pii.your-domain.com"
openssl x509 -req -days 365 -in server.csr -CA ca.crt -CAkey ca.key \
    -CAcreateserial -out server.crt

# Generate client certificate for main application
openssl genrsa -out client.key 4096
openssl req -new -key client.key -out client.csr \
    -subj "/C=US/ST=State/L=City/O=YourOrg/CN=main-app"
openssl x509 -req -days 365 -in client.csr -CA ca.crt -CAkey ca.key \
    -CAcreateserial -out client.crt

# Copy client certificates to main application server
scp ca.crt client.crt client.key main-server:/path/to/certs/
```

### Step 4: Deploy PII Service

```bash
# Create deployment directory
mkdir -p ~/pii-service && cd ~/pii-service

# Create environment file
cat > .env << 'EOF'
# PII Database
PII_POSTGRES_USER=pii_admin
PII_POSTGRES_PASSWORD=GENERATE_STRONG_PASSWORD_HERE
PII_POSTGRES_DB=pii_vault
PII_DATABASE_URL=postgresql://pii_admin:${PII_POSTGRES_PASSWORD}@pii-postgres:5432/pii_vault

# Encryption
PII_MASTER_KEY=GENERATE_64_CHAR_HEX_KEY_HERE
PII_KEY_VERSION=v1

# JWT Verification (must match main application)
JWT_SECRET=SAME_AS_MAIN_APP_JWT_SECRET

# mTLS
MTLS_ENABLED=true
MTLS_CA_CERT=/certs/ca.crt
MTLS_SERVER_CERT=/certs/server.crt
MTLS_SERVER_KEY=/certs/server.key

# Server
PORT=5100
NODE_ENV=production
EOF

# Create docker-compose file
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  pii-postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${PII_POSTGRES_USER}
      POSTGRES_PASSWORD: ${PII_POSTGRES_PASSWORD}
      POSTGRES_DB: ${PII_POSTGRES_DB}
    volumes:
      - pii_data:/var/lib/postgresql/data
    networks:
      - pii-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${PII_POSTGRES_USER} -d ${PII_POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  pii-service:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "5100:5100"
    environment:
      - DATABASE_URL=${PII_DATABASE_URL}
      - PII_MASTER_KEY=${PII_MASTER_KEY}
      - PII_KEY_VERSION=${PII_KEY_VERSION}
      - JWT_SECRET=${JWT_SECRET}
      - MTLS_ENABLED=${MTLS_ENABLED}
      - MTLS_CA_CERT=${MTLS_CA_CERT}
      - MTLS_SERVER_CERT=${MTLS_SERVER_CERT}
      - MTLS_SERVER_KEY=${MTLS_SERVER_KEY}
      - PORT=${PORT}
      - NODE_ENV=${NODE_ENV}
    volumes:
      - ~/pii-certs:/certs:ro
    depends_on:
      pii-postgres:
        condition: service_healthy
    networks:
      - pii-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5100/health"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  pii-network:
    driver: bridge

volumes:
  pii_data:
EOF

# Copy PII service source code or pull from registry.
# Option A: Build from source
git clone https://github.com/tpmoonchefryan/tcrn-tms.git
cp -r tcrn-tms/apps/pii-service/* .

# Option B: Pull pre-built image
# Modify docker-compose.yml to use image: your-registry/pii-service:latest

# Deploy
docker-compose up -d

# Initialize PII database
docker-compose exec pii-service pnpm db:push
```

### Step 5: Configure Main Application

On your main application server, update the environment:

```bash
# Add to .env or .env.local
PII_SERVICE_URL=https://pii.your-domain.com:5100
PII_SERVICE_MTLS_ENABLED=true
PII_SERVICE_CA_CERT=/path/to/certs/ca.crt
PII_SERVICE_CLIENT_CERT=/path/to/certs/client.crt
PII_SERVICE_CLIENT_KEY=/path/to/certs/client.key
```

### Step 6: Verify Deployment

```bash
# On PII server - check service health
curl -k https://localhost:5100/health

# On main server - test PII connection (with mTLS)
curl --cacert /path/to/ca.crt \
     --cert /path/to/client.crt \
     --key /path/to/client.key \
     https://pii.your-domain.com:5100/health
```

### Security Checklist

- [ ] PII server is on a separate physical/virtual machine
- [ ] Firewall allows only specific IP addresses
- [ ] mTLS certificates generated and configured
- [ ] Master encryption key stored securely (consider HashiCorp Vault)
- [ ] Database encrypted at rest (disk encryption)
- [ ] No direct internet access to PII database
- [ ] Audit logging enabled for all PII access
- [ ] Regular backup of encrypted data
- [ ] Certificate rotation plan (yearly recommended)

### DEK (Data Encryption Key) Rotation

```bash
# Generate new DEK for a tenant
curl -X POST https://pii.your-domain.com:5100/admin/rotate-dek \
  --cacert /path/to/ca.crt \
  --cert /path/to/client.crt \
  --key /path/to/client.key \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "tenant-uuid"}'
```

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

| Category | Endpoint | Description |
|----------|----------|-------------|
| **Auth** | `POST /auth/login` | Login with credentials |
| | `POST /auth/refresh` | Refresh access token |
| | `POST /auth/logout` | Logout and invalidate tokens |
| **Customers** | `GET /customers` | List customers with pagination |
| | `POST /customers` | Create customer profile |
| | `POST /customers/{id}/request-pii-access` | Get PII access token |
| **Organization** | `GET /organization/tree` | Get organization structure |
| | `POST /subsidiaries` | Create subsidiary |
| | `POST /talents` | Create talent |
| **Marshmallow** | `GET /public/marshmallow/{path}/messages` | Get public messages |
| | `POST /public/marshmallow/{path}/submit` | Submit anonymous question |
| | `POST /marshmallow/messages/{id}/approve` | Approve message |
| **Reports** | `POST /reports/mfr/jobs` | Start MFR generation |
| | `GET /reports/mfr/jobs/{id}` | Get job status |
| | `GET /reports/mfr/jobs/{id}/download` | Get download URL |
| **Logs** | `GET /logs/changes` | Query change logs |
| | `GET /logs/events` | Query system events |
| | `GET /logs/search` | Loki full-text search |
| **Compliance** | `GET /compliance/data-map` | Data mapping report |
| | `GET /compliance/privacy-impact` | Privacy impact assessment |

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

| Data Type | Protection Method |
|-----------|-------------------|
| Passwords | bcrypt hash (cost factor 12) |
| PII | AES-256-GCM encryption |
| Sessions | JWT with short expiry |
| API Communication | TLS 1.2+ required |
| Service-to-Service | mTLS authentication |

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

- **Documentation**: [docs/](./docs/)
- **Issues**: [GitHub Issues](https://github.com/tpmoonchefryan/tcrn-tms/issues)
- **Discussions**: [GitHub Discussions](https://github.com/tpmoonchefryan/tcrn-tms/discussions)
