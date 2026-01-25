-- © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
-- Migration: Add Email Module (EmailTemplate in public, EmailLog in tenant_template)

-- =============================================================================
-- PUBLIC SCHEMA: Email Template
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.email_template (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) NOT NULL UNIQUE,
    name_en VARCHAR(128) NOT NULL,
    name_zh VARCHAR(128),
    name_ja VARCHAR(128),
    subject_en VARCHAR(255) NOT NULL,
    subject_zh VARCHAR(255),
    subject_ja VARCHAR(255),
    body_html_en TEXT NOT NULL,
    body_html_zh TEXT,
    body_html_ja TEXT,
    body_text_en TEXT,
    body_text_zh TEXT,
    body_text_ja TEXT,
    variables VARCHAR(64)[] NOT NULL DEFAULT '{}',
    category VARCHAR(32) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_template_code ON public.email_template(code);
CREATE INDEX IF NOT EXISTS idx_email_template_category ON public.email_template(category);
CREATE INDEX IF NOT EXISTS idx_email_template_is_active ON public.email_template(is_active);

COMMENT ON TABLE public.email_template IS 'Platform-level email templates with multi-language support';
COMMENT ON COLUMN public.email_template.code IS 'Unique template code, e.g., password_reset, marshmallow_new_message';
COMMENT ON COLUMN public.email_template.variables IS 'Array of variable names used in the template, e.g., userName, resetLink';
COMMENT ON COLUMN public.email_template.category IS 'Template category: system or business';

-- =============================================================================
-- TENANT TEMPLATE SCHEMA: Email Log (error logs only)
-- =============================================================================

CREATE TABLE IF NOT EXISTS tenant_template.email_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_code VARCHAR(64) NOT NULL,
    recipient_hint VARCHAR(64) NOT NULL,
    locale VARCHAR(8) NOT NULL,
    error_code VARCHAR(64),
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_log_template_code ON tenant_template.email_log(template_code);
CREATE INDEX IF NOT EXISTS idx_email_log_created_at ON tenant_template.email_log(created_at);

COMMENT ON TABLE tenant_template.email_log IS 'Email sending error logs (tenant-scoped)';
COMMENT ON COLUMN tenant_template.email_log.recipient_hint IS 'Masked email address, e.g., e***r@gmail.com';
COMMENT ON COLUMN tenant_template.email_log.retry_count IS 'Number of retry attempts before final failure';
