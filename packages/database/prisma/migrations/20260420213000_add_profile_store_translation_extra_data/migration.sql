-- Add JSONB metadata storage for profile store translation maps.
-- Applies to tenant_template and existing tenant schemas so runtime reads/writes stay aligned.

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
        IF to_regclass(format('%I.%I', schema_record.schema_name, 'profile_store')) IS NULL THEN
            RAISE NOTICE 'Skipping %.profile_store because table is missing', schema_record.schema_name;
            CONTINUE;
        END IF;

        EXECUTE format(
            'ALTER TABLE %I.profile_store ADD COLUMN IF NOT EXISTS extra_data JSONB',
            schema_record.schema_name
        );
    END LOOP;
END $$;
