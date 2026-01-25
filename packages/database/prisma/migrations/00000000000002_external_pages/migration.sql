-- © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
-- Migration: External Pages (Homepage & Marshmallow)

-- =============================================================================
-- Homepage Module
-- =============================================================================

-- Talent Homepage
CREATE TABLE IF NOT EXISTS tenant_template.talent_homepage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    talent_id UUID NOT NULL UNIQUE REFERENCES tenant_template.talent(id),
    is_published BOOLEAN NOT NULL DEFAULT false,
    theme VARCHAR(32) NOT NULL DEFAULT 'default',
    custom_css TEXT,
    meta_title VARCHAR(255),
    meta_description VARCHAR(512),
    meta_keywords VARCHAR(512),
    og_image_url VARCHAR(512),
    canonical_url VARCHAR(512),
    settings JSONB NOT NULL DEFAULT '{}',
    published_at TIMESTAMPTZ,
    published_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL,
    version INTEGER NOT NULL DEFAULT 1
);

-- Homepage Version
CREATE TABLE IF NOT EXISTS tenant_template.homepage_version (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    homepage_id UUID NOT NULL REFERENCES tenant_template.talent_homepage(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    is_draft BOOLEAN NOT NULL DEFAULT true,
    is_published BOOLEAN NOT NULL DEFAULT false,
    snapshot JSONB NOT NULL,
    change_log TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID NOT NULL,
    published_at TIMESTAMPTZ,
    published_by UUID,
    UNIQUE(homepage_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_homepage_version_homepage_id ON tenant_template.homepage_version(homepage_id);
CREATE INDEX IF NOT EXISTS idx_homepage_version_is_published ON tenant_template.homepage_version(is_published);

-- Homepage Component
CREATE TABLE IF NOT EXISTS tenant_template.homepage_component (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    homepage_id UUID NOT NULL REFERENCES tenant_template.talent_homepage(id) ON DELETE CASCADE,
    component_type VARCHAR(32) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_homepage_component_homepage_id ON tenant_template.homepage_component(homepage_id);
CREATE INDEX IF NOT EXISTS idx_homepage_component_sort_order ON tenant_template.homepage_component(sort_order);

-- =============================================================================
-- Marshmallow Module
-- =============================================================================

-- Marshmallow Config
CREATE TABLE IF NOT EXISTS tenant_template.marshmallow_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    talent_id UUID NOT NULL UNIQUE REFERENCES tenant_template.talent(id),
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    anonymous_only BOOLEAN NOT NULL DEFAULT true,
    require_captcha BOOLEAN NOT NULL DEFAULT true,
    auto_moderation BOOLEAN NOT NULL DEFAULT true,
    min_length INTEGER NOT NULL DEFAULT 10,
    max_length INTEGER NOT NULL DEFAULT 1000,
    rate_limit_per_ip INTEGER NOT NULL DEFAULT 5,
    rate_limit_window_minutes INTEGER NOT NULL DEFAULT 60,
    greeting_message TEXT,
    placeholder_text VARCHAR(255),
    submit_button_text VARCHAR(64),
    success_message VARCHAR(512),
    closed_message VARCHAR(512),
    custom_css TEXT,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL,
    version INTEGER NOT NULL DEFAULT 1
);

-- Marshmallow Message
CREATE TABLE IF NOT EXISTS tenant_template.marshmallow_message (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES tenant_template.marshmallow_config(id) ON DELETE CASCADE,
    talent_id UUID NOT NULL REFERENCES tenant_template.talent(id),
    content TEXT NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    is_anonymous BOOLEAN NOT NULL DEFAULT true,
    sender_nickname VARCHAR(64),
    sender_ip_hash VARCHAR(64),
    sender_ua_hash VARCHAR(64),
    turnstile_token VARCHAR(64),
    moderation_status VARCHAR(16) NOT NULL DEFAULT 'pending',
    moderation_reason TEXT,
    moderation_flags VARCHAR(32)[] NOT NULL DEFAULT '{}',
    moderated_at TIMESTAMPTZ,
    moderated_by UUID,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    is_favorited BOOLEAN NOT NULL DEFAULT false,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    replied_at TIMESTAMPTZ,
    reply_content TEXT,
    reply_is_public BOOLEAN NOT NULL DEFAULT false,
    reactions JSONB NOT NULL DEFAULT '{}',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marshmallow_message_config_id ON tenant_template.marshmallow_message(config_id);
CREATE INDEX IF NOT EXISTS idx_marshmallow_message_talent_id ON tenant_template.marshmallow_message(talent_id);
CREATE INDEX IF NOT EXISTS idx_marshmallow_message_status ON tenant_template.marshmallow_message(moderation_status);
CREATE INDEX IF NOT EXISTS idx_marshmallow_message_submitted_at ON tenant_template.marshmallow_message(submitted_at);
CREATE INDEX IF NOT EXISTS idx_marshmallow_message_content_hash ON tenant_template.marshmallow_message(content_hash);
CREATE INDEX IF NOT EXISTS idx_marshmallow_message_is_read ON tenant_template.marshmallow_message(is_read);
CREATE INDEX IF NOT EXISTS idx_marshmallow_message_is_favorited ON tenant_template.marshmallow_message(is_favorited);

-- Marshmallow Reaction
CREATE TABLE IF NOT EXISTS tenant_template.marshmallow_reaction (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES tenant_template.marshmallow_message(id) ON DELETE CASCADE,
    reaction_type VARCHAR(32) NOT NULL,
    ip_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(message_id, reaction_type, ip_hash)
);

CREATE INDEX IF NOT EXISTS idx_marshmallow_reaction_message_id ON tenant_template.marshmallow_reaction(message_id);
