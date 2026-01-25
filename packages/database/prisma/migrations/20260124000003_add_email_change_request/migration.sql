-- © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
-- Migration: Add EmailChangeRequest table for email verification workflow

-- =============================================================================
-- TENANT TEMPLATE SCHEMA: Email Change Request
-- =============================================================================

CREATE TABLE IF NOT EXISTS tenant_template.email_change_request (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    new_email VARCHAR(255) NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_change_request_user_id ON tenant_template.email_change_request(user_id);
CREATE INDEX IF NOT EXISTS idx_email_change_request_token ON tenant_template.email_change_request(token);
CREATE INDEX IF NOT EXISTS idx_email_change_request_expires_at ON tenant_template.email_change_request(expires_at);

COMMENT ON TABLE tenant_template.email_change_request IS 'Email change verification requests (tenant-scoped)';
COMMENT ON COLUMN tenant_template.email_change_request.user_id IS 'User requesting the email change';
COMMENT ON COLUMN tenant_template.email_change_request.new_email IS 'New email address to be verified';
COMMENT ON COLUMN tenant_template.email_change_request.token IS 'Verification token sent via email';
COMMENT ON COLUMN tenant_template.email_change_request.expires_at IS 'Token expiration time';
COMMENT ON COLUMN tenant_template.email_change_request.confirmed_at IS 'When the email change was confirmed';
