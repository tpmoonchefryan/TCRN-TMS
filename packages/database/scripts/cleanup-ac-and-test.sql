-- © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
-- Cleanup script for AC tenant restructure and TEST_TENANT removal
-- WARNING: This script contains destructive operations. Run with caution.

-- ============================================================================
-- Part 1: Clean AC tenant data (remove illegal subsidiary and talent per PRD §7)
-- AC tenant should only have Tenant Management and Customer Management modules
-- ============================================================================

-- First, check what we're about to delete
SELECT 'AC Subsidiary count:' AS info, COUNT(*) AS count FROM tenant_ac.subsidiary;
SELECT 'AC Talent count:' AS info, COUNT(*) AS count FROM tenant_ac.talent;

-- Delete talents first (foreign key to subsidiary)
DELETE FROM tenant_ac.talent;

-- Then delete subsidiaries
DELETE FROM tenant_ac.subsidiary;

-- Verify cleanup
SELECT 'After cleanup - AC Subsidiary count:' AS info, COUNT(*) AS count FROM tenant_ac.subsidiary;
SELECT 'After cleanup - AC Talent count:' AS info, COUNT(*) AS count FROM tenant_ac.talent;

-- ============================================================================
-- Part 2: Remove TEST_TENANT completely
-- ============================================================================

-- Check if TEST_TENANT exists
SELECT 'TEST_TENANT exists:' AS info, COUNT(*) AS count FROM public.tenant WHERE code = 'TEST_TENANT';

-- Drop the entire tenant_test schema (including all tables and data)
DROP SCHEMA IF EXISTS tenant_test CASCADE;

-- Remove tenant record from public.tenant
DELETE FROM public.tenant WHERE code = 'TEST_TENANT';

-- Verify removal
SELECT 'After removal - TEST_TENANT:' AS info, COUNT(*) AS count FROM public.tenant WHERE code = 'TEST_TENANT';

-- ============================================================================
-- Part 3: Remove DEMO tenant (optional, per implementation plan)
-- ============================================================================

-- Check if DEMO tenant exists
SELECT 'DEMO tenant exists:' AS info, COUNT(*) AS count FROM public.tenant WHERE code = 'DEMO';

-- Drop the entire tenant_demo schema
DROP SCHEMA IF EXISTS tenant_demo CASCADE;

-- Remove tenant record from public.tenant
DELETE FROM public.tenant WHERE code = 'DEMO';

-- Verify removal
SELECT 'After removal - DEMO tenant:' AS info, COUNT(*) AS count FROM public.tenant WHERE code = 'DEMO';

-- ============================================================================
-- Summary: List remaining tenants
-- ============================================================================
SELECT '=== Remaining Tenants ===' AS summary;
SELECT code, name, schema_name, tier, is_active FROM public.tenant ORDER BY code;
