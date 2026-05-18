-- Align marshmallow_config custom-domain columns across tenant_template and all
-- existing tenant schemas so runtime reads match schema.prisma and do not fail
-- on older tenant schemas.

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
        IF to_regclass(format('%I.%I', schema_record.schema_name, 'marshmallow_config')) IS NULL THEN
            RAISE NOTICE 'Skipping %.marshmallow_config because table is missing', schema_record.schema_name;
            CONTINUE;
        END IF;

        EXECUTE format(
            'ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255)',
            schema_record.schema_name,
            'marshmallow_config'
        );

        EXECUTE format(
            'ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS custom_domain_verified BOOLEAN NOT NULL DEFAULT false',
            schema_record.schema_name,
            'marshmallow_config'
        );

        EXECUTE format(
            'ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS custom_domain_verification_token VARCHAR(64)',
            schema_record.schema_name,
            'marshmallow_config'
        );
    END LOOP;
END $$;
