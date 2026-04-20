-- Add JSONB metadata storage for integration/email translation maps.
-- Tenant-scoped tables are updated across tenant_template and existing tenant schemas.

ALTER TABLE public.email_template
ADD COLUMN IF NOT EXISTS extra_data JSONB;

DO $$
DECLARE
    schema_record RECORD;
BEGIN
    FOR schema_record IN
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name LIKE 'tenant_%'
        ORDER BY CASE WHEN schema_name = 'tenant_template' THEN 0 ELSE 1 END, schema_name
    LOOP
        IF to_regclass(format('%I.%I', schema_record.schema_name, 'integration_adapter')) IS NOT NULL THEN
            EXECUTE format(
                'ALTER TABLE %I.integration_adapter ADD COLUMN IF NOT EXISTS extra_data JSONB',
                schema_record.schema_name
            );
        END IF;

        IF to_regclass(format('%I.%I', schema_record.schema_name, 'webhook')) IS NOT NULL THEN
            EXECUTE format(
                'ALTER TABLE %I.webhook ADD COLUMN IF NOT EXISTS extra_data JSONB',
                schema_record.schema_name
            );
        END IF;
    END LOOP;
END $$;
