-- © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
-- Initial migration: Create schemas and base tables

-- =============================================================================
-- Create Schemas
-- =============================================================================

-- Create tenant_template schema (used as template for new tenants)
CREATE SCHEMA IF NOT EXISTS tenant_template;

-- =============================================================================
-- PUBLIC SCHEMA: Tenant Metadata
-- =============================================================================

-- Tenant table
CREATE TABLE IF NOT EXISTS public.tenant (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    schema_name VARCHAR(64) NOT NULL UNIQUE,
    tier VARCHAR(16) NOT NULL DEFAULT 'standard',
    is_active BOOLEAN NOT NULL DEFAULT true,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_code ON public.tenant(code);

-- Global Config table
CREATE TABLE IF NOT EXISTS public.global_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(128) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID
);

-- =============================================================================
-- TENANT TEMPLATE SCHEMA: All tenant-specific tables
-- =============================================================================

-- Organization: Subsidiary
CREATE TABLE IF NOT EXISTS tenant_template.subsidiary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES tenant_template.subsidiary(id),
    code VARCHAR(32) NOT NULL UNIQUE,
    path VARCHAR(1024) NOT NULL,
    depth SMALLINT NOT NULL DEFAULT 0,
    name_en VARCHAR(255) NOT NULL,
    name_zh VARCHAR(255),
    name_ja VARCHAR(255),
    description_en TEXT,
    description_zh TEXT,
    description_ja TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL,
    version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_subsidiary_parent_id ON tenant_template.subsidiary(parent_id);
CREATE INDEX IF NOT EXISTS idx_subsidiary_path ON tenant_template.subsidiary(path);
CREATE INDEX IF NOT EXISTS idx_subsidiary_is_active ON tenant_template.subsidiary(is_active);

-- User: System User
CREATE TABLE IF NOT EXISTS tenant_template.system_user (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(64) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(32),
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(128),
    avatar_url VARCHAR(512),
    preferred_language VARCHAR(5) NOT NULL DEFAULT 'en',
    totp_secret VARCHAR(64),
    totp_enabled_at TIMESTAMPTZ,
    is_totp_enabled BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    force_reset BOOLEAN NOT NULL DEFAULT false,
    password_changed_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,
    failed_login_count SMALLINT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_system_user_email ON tenant_template.system_user(email);
CREATE INDEX IF NOT EXISTS idx_system_user_is_active ON tenant_template.system_user(is_active);

-- User: Recovery Code
CREATE TABLE IF NOT EXISTS tenant_template.recovery_code (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES tenant_template.system_user(id) ON DELETE CASCADE,
    code_hash VARCHAR(64) NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT false,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recovery_code_user_id ON tenant_template.recovery_code(user_id);
CREATE INDEX IF NOT EXISTS idx_recovery_code_user_id_is_used ON tenant_template.recovery_code(user_id, is_used);

-- RBAC: Resource
CREATE TABLE IF NOT EXISTS tenant_template.resource (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) NOT NULL UNIQUE,
    name_en VARCHAR(128) NOT NULL,
    name_zh VARCHAR(128),
    name_ja VARCHAR(128),
    description TEXT,
    module VARCHAR(32) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RBAC: Role
CREATE TABLE IF NOT EXISTS tenant_template.role (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) NOT NULL UNIQUE,
    name_en VARCHAR(128) NOT NULL,
    name_zh VARCHAR(128),
    name_ja VARCHAR(128),
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1
);

-- RBAC: Policy
CREATE TABLE IF NOT EXISTS tenant_template.policy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES tenant_template.resource(id),
    action VARCHAR(32) NOT NULL,
    effect VARCHAR(16) NOT NULL DEFAULT 'allow',
    conditions JSONB NOT NULL DEFAULT '{}',
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(resource_id, action, effect)
);

-- RBAC: Role-Policy
CREATE TABLE IF NOT EXISTS tenant_template.role_policy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES tenant_template.role(id) ON DELETE CASCADE,
    policy_id UUID NOT NULL REFERENCES tenant_template.policy(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(role_id, policy_id)
);

-- RBAC: User-Role
CREATE TABLE IF NOT EXISTS tenant_template.user_role (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES tenant_template.system_user(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES tenant_template.role(id) ON DELETE CASCADE,
    scope_type VARCHAR(32) NOT NULL,
    scope_id UUID,
    inherit BOOLEAN NOT NULL DEFAULT false,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    granted_by UUID,
    expires_at TIMESTAMPTZ,
    UNIQUE(user_id, role_id, scope_type, scope_id)
);

CREATE INDEX IF NOT EXISTS idx_user_role_user_id ON tenant_template.user_role(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_scope ON tenant_template.user_role(scope_type, scope_id);

-- RBAC: Delegated Admin
CREATE TABLE IF NOT EXISTS tenant_template.delegated_admin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope_type VARCHAR(32) NOT NULL,
    scope_id UUID NOT NULL,
    admin_user_id UUID REFERENCES tenant_template.system_user(id),
    admin_role_id UUID REFERENCES tenant_template.role(id),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    granted_by UUID NOT NULL REFERENCES tenant_template.system_user(id)
);

-- Auth: Refresh Token
CREATE TABLE IF NOT EXISTS tenant_template.refresh_token (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES tenant_template.system_user(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    user_agent TEXT,
    ip_address INET,
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_refresh_token_user_id ON tenant_template.refresh_token(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_token_token_hash ON tenant_template.refresh_token(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_token_expires_at ON tenant_template.refresh_token(expires_at);

-- Social Platform
CREATE TABLE IF NOT EXISTS tenant_template.social_platform (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) NOT NULL UNIQUE,
    name_en VARCHAR(255) NOT NULL,
    name_zh VARCHAR(255),
    name_ja VARCHAR(255),
    display_name VARCHAR(64) NOT NULL,
    icon_url VARCHAR(512),
    base_url VARCHAR(512),
    profile_url_template VARCHAR(512),
    color VARCHAR(7),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version INTEGER NOT NULL DEFAULT 1
);

-- PII Service Config
CREATE TABLE IF NOT EXISTS tenant_template.pii_service_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) NOT NULL UNIQUE,
    name_en VARCHAR(255) NOT NULL,
    name_zh VARCHAR(255),
    name_ja VARCHAR(255),
    description_en TEXT,
    description_zh TEXT,
    description_ja TEXT,
    api_url VARCHAR(512) NOT NULL,
    auth_type VARCHAR(16) NOT NULL DEFAULT 'mtls',
    mtls_client_cert BYTEA,
    mtls_client_key BYTEA,
    mtls_ca_cert BYTEA,
    api_key_hash VARCHAR(64),
    health_check_url VARCHAR(512),
    health_check_interval_sec INTEGER NOT NULL DEFAULT 60,
    last_health_check_at TIMESTAMPTZ,
    is_healthy BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_pii_service_config_is_active ON tenant_template.pii_service_config(is_active);
CREATE INDEX IF NOT EXISTS idx_pii_service_config_is_healthy ON tenant_template.pii_service_config(is_healthy);

-- Profile Store
CREATE TABLE IF NOT EXISTS tenant_template.profile_store (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) NOT NULL UNIQUE,
    name_en VARCHAR(255) NOT NULL,
    name_zh VARCHAR(255),
    name_ja VARCHAR(255),
    description_en TEXT,
    description_zh TEXT,
    description_ja TEXT,
    pii_service_config_id UUID NOT NULL REFERENCES tenant_template.pii_service_config(id),
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_profile_store_pii_service_config_id ON tenant_template.profile_store(pii_service_config_id);
CREATE INDEX IF NOT EXISTS idx_profile_store_is_active ON tenant_template.profile_store(is_active);

-- Talent
CREATE TABLE IF NOT EXISTS tenant_template.talent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subsidiary_id UUID REFERENCES tenant_template.subsidiary(id),
    profile_store_id UUID REFERENCES tenant_template.profile_store(id),
    code VARCHAR(32) NOT NULL UNIQUE,
    path VARCHAR(1024) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_zh VARCHAR(255),
    name_ja VARCHAR(255),
    display_name VARCHAR(255) NOT NULL,
    description_en TEXT,
    description_zh TEXT,
    description_ja TEXT,
    avatar_url VARCHAR(512),
    homepage_path VARCHAR(128) UNIQUE,
    timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
    is_active BOOLEAN NOT NULL DEFAULT true,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL,
    version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_talent_subsidiary_id ON tenant_template.talent(subsidiary_id);
CREATE INDEX IF NOT EXISTS idx_talent_profile_store_id ON tenant_template.talent(profile_store_id);
CREATE INDEX IF NOT EXISTS idx_talent_path ON tenant_template.talent(path);
CREATE INDEX IF NOT EXISTS idx_talent_homepage_path ON tenant_template.talent(homepage_path);

-- This is the initial migration. Additional tables will be created in subsequent migrations.
-- For a complete list of tables, see the Prisma schema file.
