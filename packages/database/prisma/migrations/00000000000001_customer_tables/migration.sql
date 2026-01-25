-- © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
-- Migration: Customer Management Tables

-- =============================================================================
-- Configuration Entities
-- =============================================================================

-- Business Segment
CREATE TABLE IF NOT EXISTS tenant_template.business_segment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_type VARCHAR(16) NOT NULL,
    owner_id UUID,
    code VARCHAR(32) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_zh VARCHAR(255),
    name_ja VARCHAR(255),
    description_en TEXT,
    description_zh TEXT,
    description_ja TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    UNIQUE(owner_type, owner_id, code)
);

-- Customer Status
CREATE TABLE IF NOT EXISTS tenant_template.customer_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_type VARCHAR(16) NOT NULL,
    owner_id UUID,
    code VARCHAR(32) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_zh VARCHAR(255),
    name_ja VARCHAR(255),
    color VARCHAR(7) NOT NULL DEFAULT '#808080',
    description_en TEXT,
    description_zh TEXT,
    description_ja TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    UNIQUE(owner_type, owner_id, code)
);

-- Reason Category
CREATE TABLE IF NOT EXISTS tenant_template.reason_category (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_type VARCHAR(16) NOT NULL,
    owner_id UUID,
    code VARCHAR(32) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_zh VARCHAR(255),
    name_ja VARCHAR(255),
    description_en TEXT,
    description_zh TEXT,
    description_ja TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    UNIQUE(owner_type, owner_id, code)
);

-- Inactivation Reason
CREATE TABLE IF NOT EXISTS tenant_template.inactivation_reason (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_type VARCHAR(16) NOT NULL,
    owner_id UUID,
    reason_category_id UUID NOT NULL REFERENCES tenant_template.reason_category(id),
    code VARCHAR(32) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_zh VARCHAR(255),
    name_ja VARCHAR(255),
    description_en TEXT,
    description_zh TEXT,
    description_ja TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    UNIQUE(owner_type, owner_id, code)
);

-- =============================================================================
-- Customer Profile
-- =============================================================================

CREATE TABLE IF NOT EXISTS tenant_template.customer_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    talent_id UUID NOT NULL REFERENCES tenant_template.talent(id),
    profile_store_id UUID NOT NULL REFERENCES tenant_template.profile_store(id),
    origin_talent_id UUID NOT NULL REFERENCES tenant_template.talent(id),
    last_modified_talent_id UUID REFERENCES tenant_template.talent(id),
    rm_profile_id UUID NOT NULL UNIQUE,
    profile_type VARCHAR(16) NOT NULL,
    nickname VARCHAR(128) NOT NULL,
    primary_language VARCHAR(5),
    status_id UUID REFERENCES tenant_template.customer_status(id),
    inactivation_reason_id UUID REFERENCES tenant_template.inactivation_reason(id),
    inactivated_at TIMESTAMPTZ,
    notes TEXT,
    tags VARCHAR(64)[] NOT NULL DEFAULT '{}',
    source VARCHAR(64),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_customer_profile_talent_id ON tenant_template.customer_profile(talent_id);
CREATE INDEX IF NOT EXISTS idx_customer_profile_profile_store_id ON tenant_template.customer_profile(profile_store_id);
CREATE INDEX IF NOT EXISTS idx_customer_profile_origin_talent_id ON tenant_template.customer_profile(origin_talent_id);
CREATE INDEX IF NOT EXISTS idx_customer_profile_status_id ON tenant_template.customer_profile(status_id);
CREATE INDEX IF NOT EXISTS idx_customer_profile_profile_type ON tenant_template.customer_profile(profile_type);
CREATE INDEX IF NOT EXISTS idx_customer_profile_tags ON tenant_template.customer_profile USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_customer_profile_profile_store_is_active ON tenant_template.customer_profile(profile_store_id, is_active);

-- Customer Company Info
CREATE TABLE IF NOT EXISTS tenant_template.customer_company_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL UNIQUE REFERENCES tenant_template.customer_profile(id) ON DELETE CASCADE,
    company_legal_name VARCHAR(255) NOT NULL,
    company_short_name VARCHAR(128),
    registration_number VARCHAR(64),
    vat_id VARCHAR(64),
    establishment_date DATE,
    business_segment_id UUID REFERENCES tenant_template.business_segment(id),
    website VARCHAR(512),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- Platform Identity
-- =============================================================================

CREATE TABLE IF NOT EXISTS tenant_template.platform_identity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES tenant_template.customer_profile(id) ON DELETE CASCADE,
    platform_id UUID NOT NULL REFERENCES tenant_template.social_platform(id),
    platform_uid VARCHAR(128) NOT NULL,
    platform_nickname VARCHAR(128),
    platform_avatar_url VARCHAR(512),
    profile_url VARCHAR(512),
    is_verified BOOLEAN NOT NULL DEFAULT false,
    is_current BOOLEAN NOT NULL DEFAULT true,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(customer_id, platform_id, platform_uid)
);

CREATE INDEX IF NOT EXISTS idx_platform_identity_customer_id ON tenant_template.platform_identity(customer_id);
CREATE INDEX IF NOT EXISTS idx_platform_identity_platform_uid ON tenant_template.platform_identity(platform_id, platform_uid);
CREATE INDEX IF NOT EXISTS idx_platform_identity_customer_current ON tenant_template.platform_identity(customer_id, is_current);

-- Platform Identity History
CREATE TABLE IF NOT EXISTS tenant_template.platform_identity_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id UUID NOT NULL REFERENCES tenant_template.platform_identity(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES tenant_template.customer_profile(id),
    change_type VARCHAR(32) NOT NULL,
    old_value VARCHAR(255),
    new_value VARCHAR(255),
    captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    captured_by UUID
);

CREATE INDEX IF NOT EXISTS idx_platform_identity_history_customer_id ON tenant_template.platform_identity_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_platform_identity_history_identity_id ON tenant_template.platform_identity_history(identity_id);
CREATE INDEX IF NOT EXISTS idx_platform_identity_history_captured_at ON tenant_template.platform_identity_history(captured_at);

-- =============================================================================
-- Membership
-- =============================================================================

-- Membership Class
CREATE TABLE IF NOT EXISTS tenant_template.membership_class (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_type VARCHAR(16) NOT NULL,
    owner_id UUID,
    code VARCHAR(32) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_zh VARCHAR(255),
    name_ja VARCHAR(255),
    description_en TEXT,
    description_zh TEXT,
    description_ja TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    UNIQUE(owner_type, owner_id, code)
);

-- Membership Type
CREATE TABLE IF NOT EXISTS tenant_template.membership_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_class_id UUID NOT NULL REFERENCES tenant_template.membership_class(id),
    code VARCHAR(32) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_zh VARCHAR(255),
    name_ja VARCHAR(255),
    description_en TEXT,
    description_zh TEXT,
    description_ja TEXT,
    external_control BOOLEAN NOT NULL DEFAULT false,
    default_renewal_days INTEGER NOT NULL DEFAULT 30,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    UNIQUE(membership_class_id, code)
);

-- Membership Level
CREATE TABLE IF NOT EXISTS tenant_template.membership_level (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_type_id UUID NOT NULL REFERENCES tenant_template.membership_type(id),
    code VARCHAR(32) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_zh VARCHAR(255),
    name_ja VARCHAR(255),
    description_en TEXT,
    description_zh TEXT,
    description_ja TEXT,
    rank INTEGER NOT NULL DEFAULT 0,
    color VARCHAR(7),
    badge_url VARCHAR(512),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    UNIQUE(membership_type_id, code)
);

-- Membership Record
CREATE TABLE IF NOT EXISTS tenant_template.membership_record (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES tenant_template.customer_profile(id) ON DELETE CASCADE,
    platform_id UUID NOT NULL REFERENCES tenant_template.social_platform(id),
    membership_class_id UUID NOT NULL REFERENCES tenant_template.membership_class(id),
    membership_type_id UUID NOT NULL REFERENCES tenant_template.membership_type(id),
    membership_level_id UUID NOT NULL REFERENCES tenant_template.membership_level(id),
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ,
    auto_renew BOOLEAN NOT NULL DEFAULT false,
    is_expired BOOLEAN NOT NULL DEFAULT false,
    expired_at TIMESTAMPTZ,
    note TEXT,
    external_synced_at TIMESTAMPTZ,
    external_reference VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    updated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_membership_record_customer_id ON tenant_template.membership_record(customer_id);
CREATE INDEX IF NOT EXISTS idx_membership_record_platform_id ON tenant_template.membership_record(platform_id);
CREATE INDEX IF NOT EXISTS idx_membership_record_valid_from_to ON tenant_template.membership_record(valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_membership_record_valid_to ON tenant_template.membership_record(valid_to);
CREATE INDEX IF NOT EXISTS idx_membership_record_auto_renew ON tenant_template.membership_record(auto_renew);
