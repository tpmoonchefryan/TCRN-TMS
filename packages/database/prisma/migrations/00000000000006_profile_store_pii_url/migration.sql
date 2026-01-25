-- © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
-- Migration: Add pii_proxy_url to profile_store and make pii_service_config_id optional

-- Add pii_proxy_url column to profile_store
ALTER TABLE tenant_template.profile_store
ADD COLUMN IF NOT EXISTS pii_proxy_url VARCHAR(512);

-- Add sort_order column to profile_store (if not exists)
ALTER TABLE tenant_template.profile_store
ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;

-- Make pii_service_config_id nullable (drop NOT NULL constraint)
ALTER TABLE tenant_template.profile_store
ALTER COLUMN pii_service_config_id DROP NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN tenant_template.profile_store.pii_proxy_url IS 'PII Proxy URL - when empty, PII fields are disabled for customer creation';
