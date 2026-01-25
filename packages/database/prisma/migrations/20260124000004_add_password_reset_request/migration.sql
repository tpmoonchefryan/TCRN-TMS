-- © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
-- Migration: Add PasswordResetRequest table for forgot password workflow

CREATE TABLE IF NOT EXISTS tenant_template.password_reset_request (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_request_user_id ON tenant_template.password_reset_request(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_request_token ON tenant_template.password_reset_request(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_request_expires_at ON tenant_template.password_reset_request(expires_at);

COMMENT ON TABLE tenant_template.password_reset_request IS 'Password reset requests for forgot password workflow (tenant-scoped)';
COMMENT ON COLUMN tenant_template.password_reset_request.user_id IS 'User requesting password reset';
COMMENT ON COLUMN tenant_template.password_reset_request.email IS 'Email address used for the request';
COMMENT ON COLUMN tenant_template.password_reset_request.token IS 'Verification token sent via email';
COMMENT ON COLUMN tenant_template.password_reset_request.expires_at IS 'Token expiration time';
COMMENT ON COLUMN tenant_template.password_reset_request.used_at IS 'When the token was used to reset password';
