-- © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
-- Migration: Add User Scope Access table for controlling visibility of organization nodes

-- =============================================================================
-- Part 1: Create table in tenant_template schema
-- =============================================================================

CREATE TABLE IF NOT EXISTS "tenant_template"."user_scope_access" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "scope_type" VARCHAR(32) NOT NULL, -- 'tenant', 'subsidiary', 'talent'
    "scope_id" UUID, -- NULL = tenant level
    "include_subunits" BOOLEAN NOT NULL DEFAULT false,
    "granted_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "granted_by" UUID,

    CONSTRAINT "user_scope_access_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_scope_access_user_id_fkey" FOREIGN KEY ("user_id") 
        REFERENCES "tenant_template"."system_user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Unique constraint: one access record per user per scope
CREATE UNIQUE INDEX IF NOT EXISTS "user_scope_access_user_id_scope_type_scope_id_key" 
    ON "tenant_template"."user_scope_access"("user_id", "scope_type", "scope_id");

-- Index for user lookup
CREATE INDEX IF NOT EXISTS "user_scope_access_user_id_idx" 
    ON "tenant_template"."user_scope_access"("user_id");

-- Index for scope lookup
CREATE INDEX IF NOT EXISTS "user_scope_access_scope_type_scope_id_idx" 
    ON "tenant_template"."user_scope_access"("scope_type", "scope_id");

-- =============================================================================
-- Part 2: Sync to all existing tenant schemas
-- =============================================================================

DO $$
DECLARE
    tenant_schema TEXT;
BEGIN
    -- Loop through all tenant schemas (schemas starting with 'tenant_' but not 'tenant_template')
    FOR tenant_schema IN 
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name LIKE 'tenant_%' 
          AND schema_name != 'tenant_template'
    LOOP
        -- Create user_scope_access table in tenant schema
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I."user_scope_access" (
                "id" UUID NOT NULL DEFAULT gen_random_uuid(),
                "user_id" UUID NOT NULL,
                "scope_type" VARCHAR(32) NOT NULL,
                "scope_id" UUID,
                "include_subunits" BOOLEAN NOT NULL DEFAULT false,
                "granted_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "granted_by" UUID,
                CONSTRAINT "user_scope_access_pkey" PRIMARY KEY ("id"),
                CONSTRAINT "user_scope_access_user_id_fkey" FOREIGN KEY ("user_id") 
                    REFERENCES %I."system_user"("id") ON DELETE CASCADE ON UPDATE CASCADE
            )', tenant_schema, tenant_schema);
        
        -- Create indexes
        EXECUTE format('
            CREATE UNIQUE INDEX IF NOT EXISTS "user_scope_access_user_id_scope_type_scope_id_key" 
                ON %I."user_scope_access"("user_id", "scope_type", "scope_id")', tenant_schema);
        
        EXECUTE format('
            CREATE INDEX IF NOT EXISTS "user_scope_access_user_id_idx" 
                ON %I."user_scope_access"("user_id")', tenant_schema);
        
        EXECUTE format('
            CREATE INDEX IF NOT EXISTS "user_scope_access_scope_type_scope_id_idx" 
                ON %I."user_scope_access"("scope_type", "scope_id")', tenant_schema);
        
        RAISE NOTICE 'Created user_scope_access table in schema: %', tenant_schema;
    END LOOP;
END $$;
