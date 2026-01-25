-- Role and Permission System Refactor Migration
-- This migration implements:
-- 1. Three-state permission model (Grant/Deny/Unset) with effect in RolePolicy
-- 2. Unified functional roles (ADMIN replaces TENANT_ADMIN/SUBSIDIARY_ADMIN/TALENT_ADMIN)

-- ============================================================================
-- Part 1: Schema Changes - Add effect column to role_policy
-- ============================================================================

-- Add effect column to role_policy table (for tenant_template and all tenant schemas)
DO $$
DECLARE
    schema_name TEXT;
BEGIN
    -- Update tenant_template schema
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'tenant_template' 
        AND table_name = 'role_policy' 
        AND column_name = 'effect'
    ) THEN
        ALTER TABLE tenant_template.role_policy 
        ADD COLUMN effect VARCHAR(16) NOT NULL DEFAULT 'grant';
        
        RAISE NOTICE 'Added effect column to tenant_template.role_policy';
    END IF;
    
    -- Update all tenant schemas
    FOR schema_name IN 
        SELECT nspname FROM pg_namespace 
        WHERE nspname LIKE 'tenant_%' AND nspname != 'tenant_template'
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = schema_name 
            AND table_name = 'role_policy' 
            AND column_name = 'effect'
        ) THEN
            EXECUTE format('ALTER TABLE %I.role_policy ADD COLUMN effect VARCHAR(16) NOT NULL DEFAULT ''grant''', schema_name);
            RAISE NOTICE 'Added effect column to %.role_policy', schema_name;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- Part 2: Schema Changes - Remove effect column from policy (optional)
-- ============================================================================

-- Note: We're keeping the effect column in policy for now (as it may be used elsewhere)
-- but it's no longer the source of truth for permission effects.
-- The RolePolicy.effect field now determines the actual effect.

-- Drop the unique constraint that includes effect, then add new one without it
DO $$
DECLARE
    schema_name TEXT;
BEGIN
    -- Update tenant_template schema
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'tenant_template' 
        AND table_name = 'policy' 
        AND constraint_name = 'policy_resource_id_action_effect_key'
    ) THEN
        ALTER TABLE tenant_template.policy 
        DROP CONSTRAINT policy_resource_id_action_effect_key;
        
        -- Add new unique constraint without effect
        ALTER TABLE tenant_template.policy 
        ADD CONSTRAINT policy_resource_id_action_key UNIQUE (resource_id, action);
        
        RAISE NOTICE 'Updated unique constraint on tenant_template.policy';
    END IF;
    
    -- Update all tenant schemas
    FOR schema_name IN 
        SELECT nspname FROM pg_namespace 
        WHERE nspname LIKE 'tenant_%' AND nspname != 'tenant_template'
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_schema = schema_name 
            AND table_name = 'policy' 
            AND constraint_name = 'policy_resource_id_action_effect_key'
        ) THEN
            EXECUTE format('ALTER TABLE %I.policy DROP CONSTRAINT policy_resource_id_action_effect_key', schema_name);
            EXECUTE format('ALTER TABLE %I.policy ADD CONSTRAINT policy_resource_id_action_key UNIQUE (resource_id, action)', schema_name);
            RAISE NOTICE 'Updated unique constraint on %.policy', schema_name;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- Part 3: Data Migration - Create new unified roles
-- ============================================================================

DO $$
DECLARE
    schema_name TEXT;
    admin_role_id UUID;
    talent_manager_role_id UUID;
    viewer_role_id UUID;
BEGIN
    -- Process tenant_template and all tenant schemas
    FOR schema_name IN 
        SELECT nspname FROM pg_namespace 
        WHERE nspname LIKE 'tenant_%'
    LOOP
        -- Create ADMIN role if not exists
        EXECUTE format('
            INSERT INTO %I.role (id, code, name_en, name_zh, name_ja, description, is_system, is_active, created_at, updated_at, version)
            VALUES (gen_random_uuid(), ''ADMIN'', ''Administrator'', ''管理员'', ''管理者'', ''Full access within assigned scope'', true, true, now(), now(), 1)
            ON CONFLICT (code) DO NOTHING
        ', schema_name);
        
        -- Create TALENT_MANAGER role if not exists
        EXECUTE format('
            INSERT INTO %I.role (id, code, name_en, name_zh, name_ja, description, is_system, is_active, created_at, updated_at, version)
            VALUES (gen_random_uuid(), ''TALENT_MANAGER'', ''Talent Manager'', ''艺人经理'', ''タレントマネージャー'', ''Manage talent operations'', false, true, now(), now(), 1)
            ON CONFLICT (code) DO NOTHING
        ', schema_name);
        
        -- Create VIEWER role if not exists
        EXECUTE format('
            INSERT INTO %I.role (id, code, name_en, name_zh, name_ja, description, is_system, is_active, created_at, updated_at, version)
            VALUES (gen_random_uuid(), ''VIEWER'', ''Viewer'', ''只读访问者'', ''閲覧者'', ''Read-only access'', false, true, now(), now(), 1)
            ON CONFLICT (code) DO NOTHING
        ', schema_name);
        
        RAISE NOTICE 'Created new roles in schema %', schema_name;
    END LOOP;
END $$;

-- ============================================================================
-- Part 4: Data Migration - Migrate user_role assignments
-- ============================================================================

DO $$
DECLARE
    schema_name TEXT;
BEGIN
    FOR schema_name IN 
        SELECT nspname FROM pg_namespace 
        WHERE nspname LIKE 'tenant_%' AND nspname != 'tenant_template'
    LOOP
        -- Migrate TENANT_ADMIN, SUBSIDIARY_ADMIN, TALENT_ADMIN, SUPER_ADMIN to ADMIN
        EXECUTE format('
            UPDATE %I.user_role 
            SET role_id = (SELECT id FROM %I.role WHERE code = ''ADMIN'' LIMIT 1)
            WHERE role_id IN (
                SELECT id FROM %I.role WHERE code IN (''TENANT_ADMIN'', ''SUBSIDIARY_ADMIN'', ''TALENT_ADMIN'', ''SUPER_ADMIN'')
            )
        ', schema_name, schema_name, schema_name);
        
        -- Migrate CUSTOMER_VIEWER to VIEWER
        EXECUTE format('
            UPDATE %I.user_role 
            SET role_id = (SELECT id FROM %I.role WHERE code = ''VIEWER'' LIMIT 1)
            WHERE role_id IN (
                SELECT id FROM %I.role WHERE code = ''CUSTOMER_VIEWER''
            )
        ', schema_name, schema_name, schema_name);
        
        RAISE NOTICE 'Migrated user_role assignments in schema %', schema_name;
    END LOOP;
END $$;

-- ============================================================================
-- Part 5: Cleanup - Deactivate old roles (optional, can be deleted later)
-- ============================================================================

DO $$
DECLARE
    schema_name TEXT;
BEGIN
    FOR schema_name IN 
        SELECT nspname FROM pg_namespace 
        WHERE nspname LIKE 'tenant_%'
    LOOP
        -- Deactivate old roles instead of deleting (for safety)
        EXECUTE format('
            UPDATE %I.role 
            SET is_active = false, updated_at = now()
            WHERE code IN (''TENANT_ADMIN'', ''SUBSIDIARY_ADMIN'', ''TALENT_ADMIN'', ''SUPER_ADMIN'', 
                          ''CUSTOMER_VIEWER'', ''REPORT_MANAGER'', ''INTEGRATION_VIEWER'', ''INTEGRATION_ADMIN'')
        ', schema_name);
        
        RAISE NOTICE 'Deactivated old roles in schema %', schema_name;
    END LOOP;
END $$;

-- ============================================================================
-- Note: After running this migration, you should:
-- 1. Run the seed script to update role-policy mappings with the new effect field
-- 2. Regenerate all user permission snapshots
-- ============================================================================
