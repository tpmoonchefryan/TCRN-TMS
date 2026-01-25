-- © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
-- Migration: Add ChannelCategory table and is_force_use/is_system fields

-- ==============================================================================
-- Part 1: Create channel_category table in tenant_template schema
-- ==============================================================================

CREATE TABLE IF NOT EXISTS "tenant_template"."channel_category" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_type" VARCHAR(16) NOT NULL,
    "owner_id" UUID,
    "code" VARCHAR(32) NOT NULL,
    "name_en" VARCHAR(255) NOT NULL,
    "name_zh" VARCHAR(255),
    "name_ja" VARCHAR(255),
    "description_en" TEXT,
    "description_zh" TEXT,
    "description_ja" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_force_use" BOOLEAN NOT NULL DEFAULT false,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "channel_category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "channel_category_owner_code_key" 
    ON "tenant_template"."channel_category"("owner_type", COALESCE("owner_id", '00000000-0000-0000-0000-000000000000'::uuid), "code");

-- ==============================================================================
-- Part 2: Add is_force_use and is_system fields to configuration entity tables
-- ==============================================================================

-- BusinessSegment
ALTER TABLE "tenant_template"."business_segment" 
    ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "is_force_use" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "is_system" BOOLEAN NOT NULL DEFAULT false;

-- CommunicationType  
ALTER TABLE "tenant_template"."communication_type"
    ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "is_force_use" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "is_system" BOOLEAN NOT NULL DEFAULT false;

-- AddressType
ALTER TABLE "tenant_template"."address_type"
    ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "is_force_use" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "is_system" BOOLEAN NOT NULL DEFAULT false;

-- CustomerStatus (already has sort_order)
ALTER TABLE "tenant_template"."customer_status"
    ADD COLUMN IF NOT EXISTS "is_force_use" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "is_system" BOOLEAN NOT NULL DEFAULT false;

-- ReasonCategory
ALTER TABLE "tenant_template"."reason_category"
    ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "is_force_use" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "is_system" BOOLEAN NOT NULL DEFAULT false;

-- InactivationReason
ALTER TABLE "tenant_template"."inactivation_reason"
    ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "is_force_use" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "is_system" BOOLEAN NOT NULL DEFAULT false;

-- MembershipClass
ALTER TABLE "tenant_template"."membership_class"
    ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "is_force_use" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "is_system" BOOLEAN NOT NULL DEFAULT false;

-- MembershipType (has FK to class, but add system control fields)
ALTER TABLE "tenant_template"."membership_type"
    ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "is_force_use" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "is_system" BOOLEAN NOT NULL DEFAULT false;

-- MembershipLevel (has FK to type, but add system control fields)
ALTER TABLE "tenant_template"."membership_level"
    ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "is_force_use" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "is_system" BOOLEAN NOT NULL DEFAULT false;

-- Consent (already has sort_order from earlier)
ALTER TABLE "tenant_template"."consent"
    ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "is_force_use" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "is_system" BOOLEAN NOT NULL DEFAULT false;

-- Consumer
ALTER TABLE "tenant_template"."consumer"
    ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "is_force_use" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "is_system" BOOLEAN NOT NULL DEFAULT false;

-- BlocklistEntry
ALTER TABLE "tenant_template"."blocklist_entry"
    ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "is_force_use" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "is_system" BOOLEAN NOT NULL DEFAULT false;

-- SocialPlatform (global, already has sort_order)
ALTER TABLE "tenant_template"."social_platform"
    ADD COLUMN IF NOT EXISTS "is_force_use" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "is_system" BOOLEAN NOT NULL DEFAULT false;

-- ==============================================================================
-- Part 3: Add channel_category_id FK to communication_type
-- ==============================================================================

-- Add new FK column
ALTER TABLE "tenant_template"."communication_type"
    ADD COLUMN IF NOT EXISTS "channel_category_id" UUID;

-- Note: We keep the old channel_category varchar column for backward compatibility
-- The migration will populate channel_category_id based on existing channel_category values
-- after seed data is created

-- ==============================================================================
-- Part 4: Create indexes for new fields
-- ==============================================================================

CREATE INDEX IF NOT EXISTS "channel_category_owner_idx" 
    ON "tenant_template"."channel_category"("owner_type", "owner_id");
CREATE INDEX IF NOT EXISTS "channel_category_active_idx" 
    ON "tenant_template"."channel_category"("is_active");

CREATE INDEX IF NOT EXISTS "communication_type_category_id_idx" 
    ON "tenant_template"."communication_type"("channel_category_id");
