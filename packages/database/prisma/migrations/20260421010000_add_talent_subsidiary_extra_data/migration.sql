-- Add JSONB metadata storage for subsidiary/talent managed name translations.
-- Applies to tenant_template and all existing tenant schemas so organization/talent
-- read-write contracts stay aligned with runtime raw SQL.

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
        IF to_regclass(format('%I.%I', schema_record.schema_name, 'subsidiary')) IS NOT NULL THEN
            EXECUTE format(
                'ALTER TABLE %I.subsidiary ADD COLUMN IF NOT EXISTS extra_data JSONB',
                schema_record.schema_name
            );
        END IF;

        IF to_regclass(format('%I.%I', schema_record.schema_name, 'talent')) IS NOT NULL THEN
            EXECUTE format(
                'ALTER TABLE %I.talent ADD COLUMN IF NOT EXISTS extra_data JSONB',
                schema_record.schema_name
            );
        END IF;
    END LOOP;
END $$;
