-- © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
-- Migration: Logs, Integration, Security Tables

-- =============================================================================
-- Logs
-- =============================================================================

-- Change Log
CREATE TABLE IF NOT EXISTS tenant_template.change_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(64) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(16) NOT NULL,
    changes JSONB NOT NULL DEFAULT '{}',
    operator_id UUID REFERENCES tenant_template.system_user(id),
    operator_name VARCHAR(128),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_change_log_entity ON tenant_template.change_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_change_log_occurred_at ON tenant_template.change_log(occurred_at);
CREATE INDEX IF NOT EXISTS idx_change_log_operator_id ON tenant_template.change_log(operator_id);

-- Technical Event Log
CREATE TABLE IF NOT EXISTS tenant_template.technical_event_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(64) NOT NULL,
    severity VARCHAR(16) NOT NULL DEFAULT 'info',
    message TEXT NOT NULL,
    context JSONB NOT NULL DEFAULT '{}',
    stack_trace TEXT,
    service_name VARCHAR(64),
    service_version VARCHAR(32),
    host_name VARCHAR(128),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    request_id VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_technical_event_log_event_type ON tenant_template.technical_event_log(event_type);
CREATE INDEX IF NOT EXISTS idx_technical_event_log_severity ON tenant_template.technical_event_log(severity);
CREATE INDEX IF NOT EXISTS idx_technical_event_log_occurred_at ON tenant_template.technical_event_log(occurred_at);

-- Integration Log
CREATE TABLE IF NOT EXISTS tenant_template.integration_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    direction VARCHAR(16) NOT NULL,
    consumer_id UUID,
    adapter_id UUID,
    webhook_id UUID,
    endpoint VARCHAR(512),
    method VARCHAR(16),
    request_headers JSONB,
    request_body JSONB,
    response_status INTEGER,
    response_headers JSONB,
    response_body JSONB,
    duration_ms INTEGER,
    error_message TEXT,
    error_code VARCHAR(64),
    retry_count INTEGER NOT NULL DEFAULT 0,
    correlation_id VARCHAR(64),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_log_direction ON tenant_template.integration_log(direction);
CREATE INDEX IF NOT EXISTS idx_integration_log_consumer_id ON tenant_template.integration_log(consumer_id);
CREATE INDEX IF NOT EXISTS idx_integration_log_adapter_id ON tenant_template.integration_log(adapter_id);
CREATE INDEX IF NOT EXISTS idx_integration_log_occurred_at ON tenant_template.integration_log(occurred_at);
CREATE INDEX IF NOT EXISTS idx_integration_log_response_status ON tenant_template.integration_log(response_status);

-- Customer Access Log
CREATE TABLE IF NOT EXISTS tenant_template.customer_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES tenant_template.customer_profile(id),
    profile_store_id UUID NOT NULL REFERENCES tenant_template.profile_store(id),
    talent_id UUID NOT NULL REFERENCES tenant_template.talent(id),
    action VARCHAR(32) NOT NULL,
    field_changes JSONB,
    operator_id UUID REFERENCES tenant_template.system_user(id),
    operator_name VARCHAR(128),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_customer_access_log_customer_id ON tenant_template.customer_access_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_access_log_talent_id ON tenant_template.customer_access_log(talent_id);
CREATE INDEX IF NOT EXISTS idx_customer_access_log_profile_store_id ON tenant_template.customer_access_log(profile_store_id);
CREATE INDEX IF NOT EXISTS idx_customer_access_log_occurred_at ON tenant_template.customer_access_log(occurred_at);
CREATE INDEX IF NOT EXISTS idx_customer_access_log_action ON tenant_template.customer_access_log(action);

-- =============================================================================
-- Integration
-- =============================================================================

-- Integration Adapter
CREATE TABLE IF NOT EXISTS tenant_template.integration_adapter (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES tenant_template.integration_adapter(id),
    platform_id UUID REFERENCES tenant_template.social_platform(id),
    code VARCHAR(32) NOT NULL UNIQUE,
    name_en VARCHAR(255) NOT NULL,
    name_zh VARCHAR(255),
    name_ja VARCHAR(255),
    adapter_type VARCHAR(16) NOT NULL,
    base_url VARCHAR(512),
    auth_type VARCHAR(32),
    credential_config JSONB,
    rate_limit INTEGER NOT NULL DEFAULT 100,
    timeout_ms INTEGER NOT NULL DEFAULT 30000,
    retry_config JSONB NOT NULL DEFAULT '{"maxRetries": 3, "backoffMs": 1000}',
    health_check_url VARCHAR(512),
    health_check_interval_sec INTEGER NOT NULL DEFAULT 300,
    last_health_check_at TIMESTAMPTZ,
    is_healthy BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_integration_adapter_parent_id ON tenant_template.integration_adapter(parent_id);
CREATE INDEX IF NOT EXISTS idx_integration_adapter_platform_id ON tenant_template.integration_adapter(platform_id);
CREATE INDEX IF NOT EXISTS idx_integration_adapter_is_active ON tenant_template.integration_adapter(is_active);

-- Webhook
CREATE TABLE IF NOT EXISTS tenant_template.webhook (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    url VARCHAR(512) NOT NULL,
    secret_hash VARCHAR(64),
    events VARCHAR(64)[] NOT NULL DEFAULT '{}',
    headers JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    retry_config JSONB NOT NULL DEFAULT '{"maxRetries": 3, "backoffMs": 1000}',
    last_triggered_at TIMESTAMPTZ,
    last_status INTEGER,
    failure_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_webhook_events ON tenant_template.webhook USING GIN(events);
CREATE INDEX IF NOT EXISTS idx_webhook_is_active ON tenant_template.webhook(is_active);

-- Consumer (API Consumer)
CREATE TABLE IF NOT EXISTS tenant_template.consumer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) NOT NULL UNIQUE,
    name_en VARCHAR(255) NOT NULL,
    name_zh VARCHAR(255),
    name_ja VARCHAR(255),
    consumer_category VARCHAR(16) NOT NULL,
    contact_name VARCHAR(128),
    contact_email VARCHAR(255),
    api_key_hash VARCHAR(64),
    api_key_prefix VARCHAR(8),
    allowed_ips INET[] NOT NULL DEFAULT '{}',
    rate_limit INTEGER NOT NULL DEFAULT 1000,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1
);

-- Customer External ID
CREATE TABLE IF NOT EXISTS tenant_template.customer_external_id (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES tenant_template.customer_profile(id) ON DELETE CASCADE,
    profile_store_id UUID NOT NULL REFERENCES tenant_template.profile_store(id),
    consumer_id UUID NOT NULL REFERENCES tenant_template.consumer(id),
    external_id VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    UNIQUE(profile_store_id, consumer_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_external_id_customer_id ON tenant_template.customer_external_id(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_external_id_profile_store_id ON tenant_template.customer_external_id(profile_store_id);

-- =============================================================================
-- Security
-- =============================================================================

-- Blocklist Entry
CREATE TABLE IF NOT EXISTS tenant_template.blocklist_entry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_type VARCHAR(16) NOT NULL,
    owner_id UUID,
    pattern VARCHAR(512) NOT NULL,
    pattern_type VARCHAR(16) NOT NULL DEFAULT 'keyword',
    name_en VARCHAR(128) NOT NULL,
    name_zh VARCHAR(128),
    name_ja VARCHAR(128),
    description TEXT,
    category VARCHAR(64),
    severity VARCHAR(16) NOT NULL DEFAULT 'medium',
    action VARCHAR(16) NOT NULL DEFAULT 'reject',
    replacement VARCHAR(255) NOT NULL DEFAULT '***',
    scope VARCHAR(64)[] NOT NULL DEFAULT ARRAY['marshmallow'],
    inherit BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    match_count INTEGER NOT NULL DEFAULT 0,
    last_matched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_blocklist_entry_owner ON tenant_template.blocklist_entry(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_blocklist_entry_is_active ON tenant_template.blocklist_entry(is_active);
CREATE INDEX IF NOT EXISTS idx_blocklist_entry_category ON tenant_template.blocklist_entry(category);
CREATE INDEX IF NOT EXISTS idx_blocklist_entry_scope ON tenant_template.blocklist_entry USING GIN(scope);

-- IP Access Rule
CREATE TABLE IF NOT EXISTS tenant_template.ip_access_rule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_type VARCHAR(16) NOT NULL,
    ip_pattern VARCHAR(64) NOT NULL,
    scope VARCHAR(16) NOT NULL DEFAULT 'global',
    reason VARCHAR(255),
    source VARCHAR(16) NOT NULL DEFAULT 'manual',
    expires_at TIMESTAMPTZ,
    hit_count INTEGER NOT NULL DEFAULT 0,
    last_hit_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ip_access_rule_rule_type ON tenant_template.ip_access_rule(rule_type);
CREATE INDEX IF NOT EXISTS idx_ip_access_rule_scope ON tenant_template.ip_access_rule(scope);
CREATE INDEX IF NOT EXISTS idx_ip_access_rule_expires_at ON tenant_template.ip_access_rule(expires_at);
CREATE INDEX IF NOT EXISTS idx_ip_access_rule_is_active ON tenant_template.ip_access_rule(is_active);

-- =============================================================================
-- Jobs
-- =============================================================================

-- Import Job
CREATE TABLE IF NOT EXISTS tenant_template.import_job (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    talent_id UUID NOT NULL REFERENCES tenant_template.talent(id),
    profile_store_id UUID NOT NULL REFERENCES tenant_template.profile_store(id),
    consumer_id UUID REFERENCES tenant_template.consumer(id),
    job_type VARCHAR(32) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'pending',
    file_url VARCHAR(512),
    file_name VARCHAR(255),
    file_size BIGINT,
    total_rows INTEGER,
    processed_rows INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    error_details JSONB NOT NULL DEFAULT '[]',
    options JSONB NOT NULL DEFAULT '{}',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID NOT NULL REFERENCES tenant_template.system_user(id)
);

CREATE INDEX IF NOT EXISTS idx_import_job_talent_id ON tenant_template.import_job(talent_id);
CREATE INDEX IF NOT EXISTS idx_import_job_status ON tenant_template.import_job(status);
CREATE INDEX IF NOT EXISTS idx_import_job_created_at ON tenant_template.import_job(created_at);

-- Report Job
CREATE TABLE IF NOT EXISTS tenant_template.report_job (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    talent_id UUID REFERENCES tenant_template.talent(id),
    profile_store_id UUID REFERENCES tenant_template.profile_store(id),
    report_type VARCHAR(32) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'pending',
    parameters JSONB NOT NULL DEFAULT '{}',
    file_url VARCHAR(512),
    file_name VARCHAR(255),
    file_size BIGINT,
    row_count INTEGER,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID NOT NULL REFERENCES tenant_template.system_user(id)
);

CREATE INDEX IF NOT EXISTS idx_report_job_talent_id ON tenant_template.report_job(talent_id);
CREATE INDEX IF NOT EXISTS idx_report_job_report_type ON tenant_template.report_job(report_type);
CREATE INDEX IF NOT EXISTS idx_report_job_status ON tenant_template.report_job(status);
CREATE INDEX IF NOT EXISTS idx_report_job_created_at ON tenant_template.report_job(created_at);
CREATE INDEX IF NOT EXISTS idx_report_job_expires_at ON tenant_template.report_job(expires_at);

-- =============================================================================
-- Other Configuration Entities
-- =============================================================================

-- Communication Type
CREATE TABLE IF NOT EXISTS tenant_template.communication_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_type VARCHAR(16) NOT NULL,
    owner_id UUID,
    code VARCHAR(32) NOT NULL,
    channel_category VARCHAR(16) NOT NULL,
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

-- Address Type
CREATE TABLE IF NOT EXISTS tenant_template.address_type (
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

-- Consent
CREATE TABLE IF NOT EXISTS tenant_template.consent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_type VARCHAR(16) NOT NULL,
    owner_id UUID,
    code VARCHAR(32) NOT NULL,
    consent_version VARCHAR(16) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_zh VARCHAR(255),
    name_ja VARCHAR(255),
    content_markdown_en TEXT,
    content_markdown_zh TEXT,
    content_markdown_ja TEXT,
    content_url VARCHAR(512),
    effective_from DATE NOT NULL,
    expires_at DATE,
    is_required BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    UNIQUE(owner_type, owner_id, code, consent_version)
);

-- Consent Agreement
CREATE TABLE IF NOT EXISTS tenant_template.consent_agreement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES tenant_template.customer_profile(id) ON DELETE CASCADE,
    consent_id UUID NOT NULL REFERENCES tenant_template.consent(id),
    agreed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address INET,
    user_agent TEXT,
    revoked_at TIMESTAMPTZ,
    revoke_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_consent_agreement_customer_id ON tenant_template.consent_agreement(customer_id);
CREATE INDEX IF NOT EXISTS idx_consent_agreement_consent_id ON tenant_template.consent_agreement(consent_id);
