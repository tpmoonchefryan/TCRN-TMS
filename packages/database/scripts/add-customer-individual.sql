-- Add customer_individual table to tenant_template schema
-- PRD §11.2 - Search hints for PII data

-- Create table in tenant_template
CREATE TABLE IF NOT EXISTS tenant_template.customer_individual (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL UNIQUE,
    search_hint_name VARCHAR(32),
    search_hint_phone_last4 VARCHAR(4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_customer_individual_customer
        FOREIGN KEY (customer_id)
        REFERENCES tenant_template.customer_profile(id)
        ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customer_individual_search_hint_name
    ON tenant_template.customer_individual(search_hint_name);
CREATE INDEX IF NOT EXISTS idx_customer_individual_search_hint_phone_last4
    ON tenant_template.customer_individual(search_hint_phone_last4);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION tenant_template.update_customer_individual_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_customer_individual_updated_at ON tenant_template.customer_individual;
CREATE TRIGGER tr_customer_individual_updated_at
    BEFORE UPDATE ON tenant_template.customer_individual
    FOR EACH ROW
    EXECUTE FUNCTION tenant_template.update_customer_individual_updated_at();

-- Function to create customer_individual table in a specific tenant schema
CREATE OR REPLACE FUNCTION public.create_customer_individual_for_tenant(schema_name TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.customer_individual (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            customer_id UUID NOT NULL UNIQUE,
            search_hint_name VARCHAR(32),
            search_hint_phone_last4 VARCHAR(4),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT fk_customer_individual_customer
                FOREIGN KEY (customer_id)
                REFERENCES %I.customer_profile(id)
                ON DELETE CASCADE
        )', schema_name, schema_name);
    
    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_customer_individual_search_hint_name
            ON %I.customer_individual(search_hint_name)', schema_name);
    
    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_customer_individual_search_hint_phone_last4
            ON %I.customer_individual(search_hint_phone_last4)', schema_name);
    
    -- Create updated_at trigger function if not exists
    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.update_customer_individual_updated_at()
        RETURNS TRIGGER AS $func$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql', schema_name);
    
    -- Create trigger
    EXECUTE format('
        DROP TRIGGER IF EXISTS tr_customer_individual_updated_at ON %I.customer_individual', schema_name);
    EXECUTE format('
        CREATE TRIGGER tr_customer_individual_updated_at
            BEFORE UPDATE ON %I.customer_individual
            FOR EACH ROW
            EXECUTE FUNCTION %I.update_customer_individual_updated_at()', schema_name, schema_name);
END;
$$ LANGUAGE plpgsql;

-- Apply to all existing tenant schemas
DO $$
DECLARE
    tenant_record RECORD;
BEGIN
    FOR tenant_record IN SELECT schema_name FROM public.tenant WHERE is_active = true
    LOOP
        PERFORM public.create_customer_individual_for_tenant(tenant_record.schema_name);
        RAISE NOTICE 'Created customer_individual table in schema: %', tenant_record.schema_name;
    END LOOP;
END $$;
