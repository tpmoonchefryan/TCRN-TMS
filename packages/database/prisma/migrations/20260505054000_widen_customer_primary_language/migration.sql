-- Expand customer_profile.primary_language to support supported UI locale tags such as zh_HANS and zh_HANT.
-- Applies to tenant_template and existing tenant schemas so customer create/update contracts match the browser runtime locale selector.

ALTER TABLE tenant_template.customer_profile
    ALTER COLUMN primary_language TYPE VARCHAR(16);

DO $$
DECLARE
    schema_record RECORD;
BEGIN
    FOR schema_record IN
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name LIKE 'tenant_%'
          AND schema_name != 'tenant_template'
        ORDER BY schema_name
    LOOP
        IF to_regclass(format('%I.customer_profile', schema_record.schema_name)) IS NULL THEN
            RAISE NOTICE 'Skipping schema % because customer_profile is missing', schema_record.schema_name;
            CONTINUE;
        END IF;

        EXECUTE format(
            'ALTER TABLE %I.customer_profile ALTER COLUMN primary_language TYPE VARCHAR(16)',
            schema_record.schema_name
        );
    END LOOP;
END $$;
