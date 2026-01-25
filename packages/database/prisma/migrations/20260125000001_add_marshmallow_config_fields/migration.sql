-- Add missing fields to marshmallow_config table
-- These fields support custom avatar and multi-language terms/privacy content

-- Add avatar_url field
ALTER TABLE "tenant_template"."marshmallow_config"
ADD COLUMN IF NOT EXISTS "avatar_url" VARCHAR(512);

-- Add terms content fields (multi-language)
ALTER TABLE "tenant_template"."marshmallow_config"
ADD COLUMN IF NOT EXISTS "terms_content_en" TEXT;

ALTER TABLE "tenant_template"."marshmallow_config"
ADD COLUMN IF NOT EXISTS "terms_content_zh" TEXT;

ALTER TABLE "tenant_template"."marshmallow_config"
ADD COLUMN IF NOT EXISTS "terms_content_ja" TEXT;

-- Add privacy content fields (multi-language)
ALTER TABLE "tenant_template"."marshmallow_config"
ADD COLUMN IF NOT EXISTS "privacy_content_en" TEXT;

ALTER TABLE "tenant_template"."marshmallow_config"
ADD COLUMN IF NOT EXISTS "privacy_content_zh" TEXT;

ALTER TABLE "tenant_template"."marshmallow_config"
ADD COLUMN IF NOT EXISTS "privacy_content_ja" TEXT;
