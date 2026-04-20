-- Expand preferred_language to support extended locale codes such as zh_HANS and zh_HANT.
-- Apply to tenant_template and all existing tenant schemas so profile/session locale persistence
-- does not fail once the expanded frontend locale contract is used at runtime.

ALTER TABLE tenant_template.system_user
    ALTER COLUMN preferred_language TYPE VARCHAR(16);

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
        IF to_regclass(format('%I.system_user', schema_record.schema_name)) IS NULL THEN
            RAISE NOTICE 'Skipping schema % because system_user is missing', schema_record.schema_name;
            CONTINUE;
        END IF;

        EXECUTE format(
            'ALTER TABLE %I.system_user ALTER COLUMN preferred_language TYPE VARCHAR(16)',
            schema_record.schema_name
        );
    END LOOP;
END $$;
