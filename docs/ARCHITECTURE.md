<p align="center">
  <strong>English</strong> |
  <a href="./ARCHITECTURE.zh-CN.md">简体中文</a> |
  <a href="./ARCHITECTURE.ja.md">日本語</a>
</p>

# TCRN TMS - Architecture Documentation

## System Overview

TCRN TMS is a multi-tenant Talent Management System built with a microservices-oriented architecture.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            Load Balancer / CDN                          │
│                        (Cloudflare / AWS CloudFront)                    │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          ▼                           ▼                           ▼
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Web Frontend  │         │   API Gateway   │         │  Public Pages   │
│   (Next.js)     │         │   (NestJS)      │         │  (Next.js SSR)  │
│   :3000         │         │   :4000         │         │  /p/* /m/*      │
└─────────────────┘         └─────────────────┘         └─────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
          ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
          │  PostgreSQL 16  │ │    Redis 7      │ │  PII Service    │
          │  (Multi-tenant) │ │  (Cache/Queue)  │ │  (mTLS)         │
          └─────────────────┘ └─────────────────┘ └─────────────────┘
                    │                 │                 │
                    │                 ▼                 │
                    │         ┌─────────────────┐       │
                    │         │  BullMQ Workers │       │
                    │         │  (Background)   │       │
                    │         └─────────────────┘       │
                    │                                   │
                    ▼                                   ▼
          ┌─────────────────┐                 ┌─────────────────┐
          │     MinIO       │                 │  PII PostgreSQL │
          │  (Object Store) │                 │  (Encrypted)    │
          └─────────────────┘                 └─────────────────┘
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 15, React 19, TypeScript | Admin UI, Public Pages |
| API | NestJS 10, TypeScript | REST API, Authentication |
| Database | PostgreSQL 16 | Multi-tenant data storage |
| Cache/Queue | Redis 7 | Session cache, BullMQ queues |
| Object Storage | MinIO | Reports, exports, uploads |
| PII Service | Standalone NestJS | Isolated PII data handling |
| Worker | Node.js, BullMQ | Background job processing |
| Observability | OpenTelemetry, Tempo, Prometheus | Tracing, metrics |

## Multi-Tenancy Architecture

### Schema-Based Isolation

Each tenant has its own PostgreSQL schema:

```
public/              # Global metadata
  - tenant           # Tenant registry
  - global_config    # System-wide settings
  - email_template   # Email templates (shared)

tenant_template/     # Template schema (copied for new tenants)
  - system_user
  - customer_profile
  - marshmallow_message
  - talent_homepage
  - ...

tenant_<code>/       # Per-tenant schemas
  - tenant_ac        # Platform admin tenant
  - tenant_demo
  - ...
```

### Tenant Identification

```typescript
// Request context includes tenant info
interface RequestContext {
  tenantId: string;
  tenantSchemaName: string;
  userId: string;
  permissions: string[];
}

// Database queries use schema-qualified names
const result = await prisma.$queryRawUnsafe(`
  SELECT * FROM "${tenantSchema}".customer_profile
  WHERE id = $1
`, customerId);
```

## Security Architecture

### Authentication Flow

```
┌──────────┐    POST /auth/login     ┌──────────┐
│  Client  │ ─────────────────────▶  │   API    │
└──────────┘                         └──────────┘
     │                                     │
     │         Access Token (JWT)          │
     │  ◀─────────────────────────────────  │
     │         Refresh Token (Cookie)      │
     │                                     │
     │    Subsequent requests with         │
     │    Authorization: Bearer <token>    │
     │  ─────────────────────────────────▶ │
     │                                     │
```

### PII Data Separation

```
┌─────────────────┐                 ┌─────────────────┐
│   Main API      │    mTLS/JWT    │   PII Service   │
│                 │ ──────────────▶│                 │
│  customer_id    │                │  PII Database   │
│  rm_profile_id  │ ◀──────────────│  (Encrypted)    │
│  (token)        │    PII Data    │                 │
└─────────────────┘                 └─────────────────┘
```

### Technical Fingerprinting

```typescript
// Fingerprint generation for watermarking
interface FingerprintPayload {
  userId: string;
  tenantId: string;
  timestamp: number;
  env: string;
  sessionId: string;
}

// Response headers include fingerprint
X-TCRN-FP: <encrypted_fingerprint>
X-TCRN-FP-Version: 1
```

### Content Security

```
┌─────────────────────────────────────────────────────┐
│                  Security Layers                     │
├─────────────────────────────────────────────────────┤
│  1. Rate Limiting (Redis-based, per IP/endpoint)    │
│  2. CAPTCHA Verification (Cloudflare Turnstile)     │
│  3. UA Detection (Bot/crawler blocking)             │
│  4. Profanity Filter (Multi-language, risk scoring) │
│  5. IP Blocklist (Whitelist/Blacklist rules)        │
│  6. Content Blocklist (Keyword/regex patterns)      │
└─────────────────────────────────────────────────────┘
```

## Permission System (RBAC)

### Three-State Permission Model

```
┌───────────────────────────────────────────────────┐
│              Permission States                     │
├───────────────────────────────────────────────────┤
│  GRANT  │  Explicitly allowed                     │
│  DENY   │  Explicitly denied (highest priority)   │
│  UNSET  │  Not set, inherit from parent           │
├───────────────────────────────────────────────────┤
│  Priority: DENY > GRANT > UNSET                   │
└───────────────────────────────────────────────────┘
```

### Hierarchy

```
Tenant
  └── Subsidiary (can have children)
        └── Talent

User Role Assignment:
  User ─── Role ─── Scope (tenant/subsidiary/talent)
```

### Functional Roles

| Role | Description |
|------|-------------|
| ADMIN | Full administrative access |
| TALENT_MANAGER | Manage talents and customers |
| VIEWER | Read-only access |
| TALENT_SELF | Talent self-management |
| MODERATOR | Content moderation |
| SUPPORT | Customer support access |
| ANALYST | Analytics and reports |

### Permission Snapshot (Redis)

```
Key: perm:{tenant_id}:{user_id}:{scope_type}:{scope_id}
Value: {
  "customer.profile": ["read", "write"],
  "customer.pii": ["read"],
  "homepage.publish": ["execute"],
  ...
}
```

## Background Jobs

### Queue Architecture (BullMQ)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Redis                                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────┐  │
│  │ import  │ │ report  │ │ export  │ │ email   │ │ marsh-  │ │ log   │  │
│  │ queue   │ │ queue   │ │ queue   │ │ queue   │ │ mallow  │ │ queue │  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └───────┘  │
└─────────────────────────────────────────────────────────────────────────┘
           │          │          │          │          │          │
           ▼          ▼          ▼          ▼          ▼          ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                        Worker Process                           │
     │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
     │  │ Import  │ │ Report  │ │ Export  │ │ Email   │ │Marshmallow│  │
     │  │ Worker  │ │ Worker  │ │ Worker  │ │ Worker  │ │ Export   │   │
     │  │ (c:1)   │ │ (c:1)   │ │ (c:1)   │ │ (c:1)   │ │ Worker   │   │
     │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
     └─────────────────────────────────────────────────────────────────┘
```

### Job Types

| Queue | Job Type | Description |
|-------|----------|-------------|
| import | CUSTOMER_IMPORT | Bulk customer import from CSV/JSON |
| report | MFR_REPORT | Member Fans Report generation |
| export | CUSTOMER_EXPORT | Customer data export |
| export | MARSHMALLOW_EXPORT | Marshmallow messages export |
| email | SEND_EMAIL | Async email delivery |
| log | TECH_EVENT | Async event logging |
| log | INTEGRATION_LOG | Async integration logging |

### Email Service Integration

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   API Server    │ ──────▶ │  Email Queue    │ ──────▶ │  Email Worker   │
│  sendEmail()    │         │  (BullMQ)       │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
                                                                 │
                     ┌───────────────────────────────────────────┤
                     │                                           │
                     ▼                                           ▼
           ┌─────────────────┐                         ┌─────────────────┐
           │  PII Service    │                         │  Tencent SES    │
           │  (get email)    │                         │  (send email)   │
           └─────────────────┘                         └─────────────────┘
```

## Observability

### OpenTelemetry Setup

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  API Server  │───▶│  OTel Agent  │───▶│  Grafana     │
│              │    │  Collector   │    │  Tempo       │
└──────────────┘    └──────────────┘    └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Prometheus  │───▶ Grafana
                    └──────────────┘
```

### Sampling Strategy

| Path Pattern | Sample Rate | Rationale |
|--------------|-------------|-----------|
| Auth/PII | 10% | Security-sensitive |
| Reports | 50% | Important for debugging |
| External Pages | 0.5% | High volume |
| Other API | 1% | Balance coverage/cost |
| Errors (any) | 100% | Always capture |
| Slow requests (>2s) | 100% | Performance issues |

## External Pages Architecture

### Homepage Builder

```
TalentHomepage
  ├── theme: 'default' | 'dark' | 'soft' | 'cute' | 'minimal'
  ├── components: [
  │     { type: 'ProfileCard', props: {...} },
  │     { type: 'SocialLinks', props: {...} },
  │     { type: 'ImageGallery', props: {...} },
  │     { type: 'VideoEmbed', props: {...} },
  │     { type: 'RichText', props: {...} },
  │     { type: 'LinkButton', props: {...} },
  │     { type: 'MarshmallowWidget', props: {...} },
  │     { type: 'Divider', props: {...} },
  │     { type: 'Spacer', props: {...} }
  │   ]
  └── versions: [
        { version: 1, status: 'archived', snapshot: {...} },
        { version: 2, status: 'published', snapshot: {...} },
        { version: 3, status: 'draft', snapshot: {...} }
      ]
```

### Homepage Publishing Flow

```
┌──────────┐    PUT /draft     ┌──────────┐    POST /publish   ┌──────────┐
│  Editor  │ ────────────────▶ │  Draft   │ ─────────────────▶ │Published │
│  (React) │                   │ Version  │                    │ Version  │
└──────────┘                   └──────────┘                    └──────────┘
     │                              │                               │
     │  Auto-save (5s debounce)     │                               │
     │  LocalStorage (instant)      │                               │
     │                              │                               │
     └──────────────────────────────┘                               │
                                                                    │
                    ┌───────────────────────────────────────────────┤
                    │                                               │
                    ▼                                               ▼
           ┌─────────────────┐                            ┌─────────────────┐
           │  CDN Purge      │                            │  Public Page    │
           │  (Cloudflare)   │                            │  /p/{path}      │
           └─────────────────┘                            └─────────────────┘
```

### Marshmallow (Anonymous Q&A)

```
Submit Flow:
  1. Client → Rate Limit Check (IP + Talent, 60 req/min)
  2. Client → Honeypot Field Validation
  3. Client → CAPTCHA Verification (Cloudflare Turnstile)
     └── Auto mode: Trust score based decision
  4. Client → Profanity Filter (Multi-language, risk scoring)
  5. Client → Blocklist Matching
  6. Create Message (pending moderation)
  7. Notify Talent via Email (if configured)

Moderation Flow:
  1. Talent views pending messages
  2. Approve / Reject / Flag
  3. Optional: Reply (public/private)
  4. Approved messages visible to public
```

### Trust Score System

```
┌─────────────────────────────────────────────────────┐
│                 Trust Score Factors                  │
├─────────────────────────────────────────────────────┤
│  + Successful CAPTCHA completions                   │
│  + Consistent device fingerprint                    │
│  + Message history (approved)                       │
│  - Failed CAPTCHA attempts                          │
│  - Multiple fingerprints from same IP               │
│  - UA changes                                       │
│  - Blocked messages                                 │
├─────────────────────────────────────────────────────┤
│  trusted (80+)    → No CAPTCHA required             │
│  neutral (50-79)  → CAPTCHA sometimes               │
│  suspicious (20-49) → Always CAPTCHA                │
│  blocked (<20)    → Reject all submissions          │
└─────────────────────────────────────────────────────┘
```

## Deployment Architecture

### Kubernetes Deployment

```yaml
Deployments:
  - tcrn-api (2+ replicas, HPA)
  - tcrn-web (2+ replicas)
  - tcrn-worker (1-2 replicas)
  - tcrn-pii-service (2+ replicas, isolated)

Services:
  - ClusterIP for internal communication
  - LoadBalancer for external access

ConfigMaps & Secrets:
  - Environment configuration
  - TLS certificates
  - API keys
```

### Docker Services (Development)

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 5432 | Main database |
| Redis | 6379 | Cache & queues |
| MinIO | 9000/9001 | Object storage |
| NATS | 4222/8222 | Event streaming |
| Loki | 3100 | Log aggregation |
| Tempo | 3200/4317/4318 | Distributed tracing |
| PII PostgreSQL | (internal) | PII database |
| PII Service | 5100 | PII API |

### Zero-Downtime Deployment

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 0
    maxSurge: 1
```

## Data Flow Examples

### Customer Creation

```
1. API receives POST /customers
2. Validate input (Valibot)
3. Check permissions
4. Create customer_profile (without PII)
5. Call PII Service to store PII → get rm_profile_id
6. Update customer with rm_profile_id
7. Log change (ChangeLog)
8. Return response
```

### Report Generation

```
1. API receives POST /reports (MFR)
2. Validate permissions
3. Create ReportJob (status: pending)
4. Add to BullMQ 'report' queue
5. Worker picks up job
6. Query customers with filters
7. For PII fields → batch call PII Service
8. Stream write to Excel (ExcelJS)
9. Upload to MinIO
10. Update ReportJob (status: completed, fileUrl)
11. Return presigned download URL
```

### Email Sending

```
1. API calls emailService.send()
2. Job added to BullMQ 'email' queue
3. Worker picks up job
4. Load email template from database
5. If business email → fetch recipient from PII Service
6. Render template with variables
7. Send via Tencent SES
8. Log result (success/failure)
9. Retry on failure (3 attempts, exponential backoff)
```

### Homepage Publishing

```
1. User clicks "Publish" in editor
2. POST /talents/:id/homepage/publish
3. Validate draft exists
4. Update version status to 'published'
5. Update homepage published_version_id pointer
6. Trigger CDN cache purge (async)
7. Create new empty draft version
8. Return success with homepage URL
```
