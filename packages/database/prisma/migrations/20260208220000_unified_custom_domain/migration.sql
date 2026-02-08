-- Migration: Add unified custom domain fields to Talent model
-- This migration adds custom domain management at the Talent level

-- Add new columns to talent table
ALTER TABLE tenant_template.talent
ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS custom_domain_verified BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_domain_verification_token VARCHAR(64),
ADD COLUMN IF NOT EXISTS homepage_custom_path VARCHAR(128) DEFAULT '/',
ADD COLUMN IF NOT EXISTS marshmallow_custom_path VARCHAR(128) DEFAULT '/ask';

-- Create index for custom domain lookups
CREATE INDEX IF NOT EXISTS idx_talent_custom_domain ON tenant_template.talent(custom_domain);

-- Note: Data migration from TalentHomepage/MarshmallowConfig is removed
-- as those tables may not have custom_domain columns in all environments.
-- The unified system starts fresh with the Talent model.
