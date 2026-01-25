-- © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
-- Migration: Fix duplicate codes in configuration entities
-- This migration removes duplicate records (keeping oldest) and adds unique constraints on code
-- IMPORTANT: Delete in correct order to respect foreign key constraints

-- ==============================================================================
-- Part 1: Remove duplicates from membership hierarchy (child to parent order)
-- ==============================================================================

-- 1a. First, delete membership_levels that belong to duplicate types
DELETE FROM "tenant_template"."membership_level" 
WHERE membership_type_id IN (
  SELECT a.id FROM "tenant_template"."membership_type" a
  INNER JOIN "tenant_template"."membership_type" b
  ON a.code = b.code AND a.id != b.id AND a.created_at > b.created_at
);

-- 1b. Delete duplicate membership_level by code (keep oldest)
DELETE FROM "tenant_template"."membership_level" a
USING "tenant_template"."membership_level" b
WHERE a.created_at > b.created_at 
  AND a.code = b.code
  AND a.id != b.id;

-- 2a. Delete membership_types that belong to duplicate classes
DELETE FROM "tenant_template"."membership_type" 
WHERE membership_class_id IN (
  SELECT a.id FROM "tenant_template"."membership_class" a
  INNER JOIN "tenant_template"."membership_class" b
  ON a.code = b.code AND a.id != b.id AND a.created_at > b.created_at
);

-- 2b. Delete duplicate membership_type by code (keep oldest)
DELETE FROM "tenant_template"."membership_type" a
USING "tenant_template"."membership_type" b
WHERE a.created_at > b.created_at 
  AND a.code = b.code
  AND a.id != b.id;

-- 3. Delete duplicate membership_class (keep oldest)
DELETE FROM "tenant_template"."membership_class" a
USING "tenant_template"."membership_class" b
WHERE a.created_at > b.created_at 
  AND a.code = b.code
  AND a.id != b.id;

-- ==============================================================================
-- Part 2: Remove duplicates from reason hierarchy (child to parent order)
-- ==============================================================================

-- 2a. Delete inactivation_reasons that belong to duplicate reason_categories
DELETE FROM "tenant_template"."inactivation_reason" 
WHERE reason_category_id IN (
  SELECT a.id FROM "tenant_template"."reason_category" a
  INNER JOIN "tenant_template"."reason_category" b
  ON a.code = b.code AND a.id != b.id AND a.created_at > b.created_at
);

-- 2b. Delete duplicate inactivation_reason by code (keep oldest)
DELETE FROM "tenant_template"."inactivation_reason" a
USING "tenant_template"."inactivation_reason" b
WHERE a.created_at > b.created_at 
  AND a.code = b.code
  AND a.id != b.id;

-- 2c. Delete duplicate reason_category (keep oldest)
DELETE FROM "tenant_template"."reason_category" a
USING "tenant_template"."reason_category" b
WHERE a.created_at > b.created_at 
  AND a.code = b.code
  AND a.id != b.id;

-- ==============================================================================
-- Part 3: Remove duplicates from other config tables (no FK dependencies)
-- ==============================================================================

-- social_platform duplicates
DELETE FROM "tenant_template"."social_platform" a
USING "tenant_template"."social_platform" b
WHERE a.created_at > b.created_at 
  AND a.code = b.code
  AND a.id != b.id;

-- customer_status duplicates
DELETE FROM "tenant_template"."customer_status" a
USING "tenant_template"."customer_status" b
WHERE a.created_at > b.created_at 
  AND a.code = b.code
  AND a.id != b.id;

-- business_segment duplicates
DELETE FROM "tenant_template"."business_segment" a
USING "tenant_template"."business_segment" b
WHERE a.created_at > b.created_at 
  AND a.code = b.code
  AND a.id != b.id;

-- ==============================================================================
-- Part 4: Drop old constraints and add new unique constraints on code
-- Note: Must drop constraint BEFORE dropping index
-- ==============================================================================

-- membership_class: drop old constraint, add new one
ALTER TABLE "tenant_template"."membership_class" 
  DROP CONSTRAINT IF EXISTS "membership_class_owner_type_owner_id_code_key";

CREATE UNIQUE INDEX IF NOT EXISTS "membership_class_code_key" 
  ON "tenant_template"."membership_class" (code);

-- membership_type: drop old constraint, add new one
ALTER TABLE "tenant_template"."membership_type" 
  DROP CONSTRAINT IF EXISTS "membership_type_membership_class_id_code_key";

CREATE UNIQUE INDEX IF NOT EXISTS "membership_type_code_key" 
  ON "tenant_template"."membership_type" (code);

-- membership_level: drop old constraint, add new one
ALTER TABLE "tenant_template"."membership_level" 
  DROP CONSTRAINT IF EXISTS "membership_level_membership_type_id_code_key";

CREATE UNIQUE INDEX IF NOT EXISTS "membership_level_code_key" 
  ON "tenant_template"."membership_level" (code);

-- Log completion
DO $$ BEGIN
  RAISE NOTICE 'Migration completed: Duplicate codes removed and unique constraints added';
END $$;
