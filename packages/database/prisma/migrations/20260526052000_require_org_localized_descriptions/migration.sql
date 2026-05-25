-- Keep organization read models aligned with the LocalizedText schema contract.

DO $$
DECLARE
    target_schema TEXT;
    empty_localized_text JSONB := '{"en":"","zh_HANS":"","zh_HANT":"","ja":"","ko":"","fr":""}'::jsonb;
BEGIN
    FOR target_schema IN
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name = 'tenant_template'
           OR schema_name LIKE 'tenant_%'
        ORDER BY CASE WHEN schema_name = 'tenant_template' THEN 0 ELSE 1 END, schema_name
    LOOP
        IF to_regclass(format('%I.subsidiary', target_schema)) IS NOT NULL THEN
            EXECUTE format(
                'UPDATE %I.subsidiary
                 SET description = $1
                 WHERE description IS NULL
                    OR jsonb_typeof(description) <> ''object''',
                target_schema
            )
            USING empty_localized_text;

            EXECUTE format(
                'ALTER TABLE %I.subsidiary
                 ALTER COLUMN description SET DEFAULT ''{"en":"","zh_HANS":"","zh_HANT":"","ja":"","ko":"","fr":""}''::jsonb,
                 ALTER COLUMN description SET NOT NULL',
                target_schema
            );
        END IF;

        IF to_regclass(format('%I.talent', target_schema)) IS NOT NULL THEN
            EXECUTE format(
                'UPDATE %I.talent
                 SET description = $1
                 WHERE description IS NULL
                    OR jsonb_typeof(description) <> ''object''',
                target_schema
            )
            USING empty_localized_text;

            EXECUTE format(
                'ALTER TABLE %I.talent
                 ALTER COLUMN description SET DEFAULT ''{"en":"","zh_HANS":"","zh_HANT":"","ja":"","ko":"","fr":""}''::jsonb,
                 ALTER COLUMN description SET NOT NULL',
                target_schema
            );
        END IF;
    END LOOP;
END $$;
