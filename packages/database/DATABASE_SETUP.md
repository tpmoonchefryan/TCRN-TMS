# TCRN TMS Database Setup Guide

## Prerequisites

- PostgreSQL 16+
- Redis 7+
- Node.js 20+
- pnpm 8+

## Quick Start

### 1. Configure Environment Variables

Copy the sample environment file and configure:

```bash
cp .env.sample .env.local
```

Update `DATABASE_URL` in `.env.local`:

```
DATABASE_URL="postgresql://user:password@localhost:5432/tcrn_tms?schema=public"
```

### 2. Initialize Database

Run the full initialization (applies migrations, generates Prisma client, seeds data):

```bash
pnpm db:init
```

This command will:
1. Apply SQL migrations to create all schemas and tables
2. Generate Prisma client
3. Seed the database with initial data

### 3. Verify Setup

Open Prisma Studio to verify:

```bash
pnpm db:studio
```

## Available Commands

| Command | Description |
|---------|-------------|
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:push` | Push schema changes to database (dev only) |
| `pnpm db:migrate` | Create and apply Prisma migrations |
| `pnpm db:migrate:deploy` | Apply pending migrations (production) |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:seed` | Seed the database |
| `pnpm db:reset` | Reset database and re-seed |
| `pnpm db:apply-migrations` | Apply raw SQL migrations |
| `pnpm db:create-tenant` | Create a new tenant schema |
| `pnpm db:init` | Full initialization |

## Multi-Tenant Architecture

TCRN TMS uses PostgreSQL schema-based multi-tenancy:

```
public              → Global metadata (tenants, global_config)
tenant_template     → Template schema (copied for new tenants)
tenant_test         → Test tenant schema
tenant_<code>       → Production tenant schemas
```

### Creating a New Tenant

1. Add tenant record:

```typescript
await prisma.tenant.create({
  data: {
    code: 'NEW_TENANT',
    name: 'New Tenant',
    schemaName: 'tenant_new_tenant',
    tier: 'standard',
  },
});
```

2. Create schema:

```bash
pnpm db:create-tenant NEW_TENANT
```

## Seed Data Contents

The seed data includes:

### Global Configuration (`01-global-config.ts`)
- System version
- Security policies (password, session, rate limiting)
- Feature flags
- Dictionaries (profile types, genders, languages, timezones, countries)

### Social Platforms (`02-social-platforms.ts`)
- 15 platforms: Bilibili, YouTube, Twitch, Twitter/X, TikTok, Douyin, Instagram, Weibo, Xiaohongshu, FANBOX, Patreon, Discord, Afdian, Niconico, BOOTH

### Roles & Resources (`03-roles-resources.ts`)
- 24 resource definitions
- 96 permission policies
- 8 system roles (SUPER_ADMIN, TENANT_ADMIN, SUBSIDIARY_ADMIN, TALENT_ADMIN, CUSTOMER_MANAGER, CUSTOMER_VIEWER, REPORT_MANAGER, CONTENT_MANAGER)

### Customer Configurations (`04-customer-configs.ts`)
- Customer statuses (Active, Inactive, VIP, Blocked, Pending)
- Reason categories and inactivation reasons
- Business segments

### Membership Configurations (`05-membership-configs.ts`)
- 3 membership classes (Subscription, Fan Club, Supporter)
- 6 membership types (YouTube, Bilibili大航海, FANBOX, Patreon, Afdian, Manual)
- 15 membership levels

### Blocklist (`06-blocklist.ts`)
- Default profanity filters (Chinese, Japanese)
- Spam patterns (URLs, contact solicitation)
- Harassment keywords
- Privacy patterns (phone, email)
- Illegal content keywords

### Test Data (`07-10`)
- Test tenant
- 7 test users with various roles
- 3-level organization structure
- 5 sample talents
- PII service configuration

## Test Credentials

| Username | Password | Role |
|----------|----------|------|
| superadmin | TestPassword123! | Super Administrator |
| admin | TestPassword123! | Tenant Administrator |
| manager | TestPassword123! | Customer Manager |
| viewer | TestPassword123! | Customer Viewer |
| content | TestPassword123! | Content Manager |
| totp_user | TestPassword123! | TOTP enabled user |
| perf_test_user | TestPassword123! | Performance testing |

TOTP Secret for `totp_user`: `JBSWY3DPEHPK3PXP`

## Troubleshooting

### Migration Errors

If you encounter migration errors, try:

```bash
# Reset everything
pnpm db:reset

# Or manually apply migrations
pnpm db:apply-migrations
```

### Schema Already Exists

If schema already exists when creating tenant:

```sql
DROP SCHEMA tenant_<code> CASCADE;
```

Then re-run `pnpm db:create-tenant <CODE>`

### Prisma Client Out of Sync

Regenerate Prisma client:

```bash
pnpm db:generate
```

## Production Deployment

For production:

1. Use `pnpm db:migrate:deploy` instead of `pnpm db:migrate`
2. Run seeds only once during initial setup
3. Use proper credentials and secure DATABASE_URL
4. Enable SSL for database connections
