-- © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
-- Fix missing columns and tables in tenant schemas
-- Run this script to fix schema structure issues in existing tenants
--
-- IMPORTANT: After running this script, also run fix-rbac-data.sql to ensure
-- RBAC data (resources, roles, policies, role_policy) is properly seeded.

-- Function to fix a single tenant schema
CREATE OR REPLACE FUNCTION fix_tenant_schema(schema_name TEXT) RETURNS VOID AS $$
BEGIN
  RAISE NOTICE 'Fixing schema structure for: %', schema_name;

  -- =========================================================================
  -- Fix technical_event_log table
  -- =========================================================================
  
  -- Add trace_id column to technical_event_log if missing
  EXECUTE format('
    ALTER TABLE %I.technical_event_log 
    ADD COLUMN IF NOT EXISTS trace_id VARCHAR(64)
  ', schema_name);
  
  -- Add span_id column to technical_event_log if missing
  EXECUTE format('
    ALTER TABLE %I.technical_event_log 
    ADD COLUMN IF NOT EXISTS span_id VARCHAR(32)
  ', schema_name);
  
  -- Add source column to technical_event_log if missing
  EXECUTE format('
    ALTER TABLE %I.technical_event_log 
    ADD COLUMN IF NOT EXISTS source VARCHAR(64)
  ', schema_name);
  
  -- Add error_code column to technical_event_log if missing
  EXECUTE format('
    ALTER TABLE %I.technical_event_log 
    ADD COLUMN IF NOT EXISTS error_code VARCHAR(32)
  ', schema_name);
  
  -- Add error_stack column to technical_event_log if missing
  EXECUTE format('
    ALTER TABLE %I.technical_event_log 
    ADD COLUMN IF NOT EXISTS error_stack TEXT
  ', schema_name);
  
  -- Create index on trace_id if not exists
  EXECUTE format('
    CREATE INDEX IF NOT EXISTS idx_technical_event_log_trace_id 
    ON %I.technical_event_log (trace_id)
  ', schema_name);

  -- =========================================================================
  -- Fix refresh_token table (for session persistence)
  -- =========================================================================
  
  -- Ensure refresh_token table has all required columns
  EXECUTE format('
    ALTER TABLE %I.refresh_token 
    ADD COLUMN IF NOT EXISTS device_info TEXT
  ', schema_name);

  EXECUTE format('
    ALTER TABLE %I.refresh_token 
    ADD COLUMN IF NOT EXISTS ip_address INET
  ', schema_name);

  EXECUTE format('
    ALTER TABLE %I.refresh_token 
    ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE
  ', schema_name);

  -- Create index on token_hash for faster lookups
  EXECUTE format('
    CREATE INDEX IF NOT EXISTS idx_refresh_token_token_hash 
    ON %I.refresh_token (token_hash)
  ', schema_name);

  -- Create index on user_id for user-specific queries
  EXECUTE format('
    CREATE INDEX IF NOT EXISTS idx_refresh_token_user_id 
    ON %I.refresh_token (user_id)
  ', schema_name);

  -- =========================================================================
  -- Fix security_event_log table
  -- =========================================================================
  
  EXECUTE format('
    ALTER TABLE %I.security_event_log 
    ADD COLUMN IF NOT EXISTS trace_id VARCHAR(64)
  ', schema_name);

  EXECUTE format('
    CREATE INDEX IF NOT EXISTS idx_security_event_log_trace_id 
    ON %I.security_event_log (trace_id)
  ', schema_name);
  
  RAISE NOTICE 'Fixed schema structure: %', schema_name;
END;
$$ LANGUAGE plpgsql;

-- Fix tenant_template schema
SELECT fix_tenant_schema('tenant_template');

-- Fix all existing tenant schemas
DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN 
    SELECT schema_name FROM public.tenant WHERE schema_name IS NOT NULL AND schema_name != ''
  LOOP
    PERFORM fix_tenant_schema(tenant_record.schema_name);
  END LOOP;
END $$;

-- Clean up
DROP FUNCTION fix_tenant_schema(TEXT);

-- Verify fix
SELECT 
  t.code as tenant_code,
  t.schema_name,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = t.schema_name 
    AND table_name = 'technical_event_log' 
    AND column_name = 'trace_id'
  ) as has_trace_id,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = t.schema_name 
    AND table_name = 'refresh_token' 
    AND column_name = 'revoked_at'
  ) as has_refresh_token_revoked_at,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = t.schema_name 
    AND table_name = 'security_event_log' 
    AND column_name = 'trace_id'
  ) as has_security_log_trace_id
FROM public.tenant t
WHERE t.schema_name IS NOT NULL;

-- Reminder
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Schema structure fixes completed.';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEP: Run fix-rbac-data.sql to fix RBAC data issues';
  RAISE NOTICE '           (resources, roles, policies, role_policy)';
  RAISE NOTICE '============================================================';
END $$;
