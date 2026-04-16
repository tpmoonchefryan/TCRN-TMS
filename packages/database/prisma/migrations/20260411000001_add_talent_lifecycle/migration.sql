-- Add talent lifecycle fields to tenant_template and all existing tenant schemas.
-- Existing active talents backfill to published; existing inactive talents backfill to disabled.
-- New talents default to draft and keep published audit fields null until first publish.

ALTER TABLE tenant_template.talent
    ADD COLUMN IF NOT EXISTS lifecycle_status VARCHAR(16);

ALTER TABLE tenant_template.talent
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

ALTER TABLE tenant_template.talent
    ADD COLUMN IF NOT EXISTS published_by UUID;

UPDATE tenant_template.talent
SET lifecycle_status = CASE
    WHEN is_active = true THEN 'published'
    ELSE 'disabled'
END
WHERE lifecycle_status IS NULL;

ALTER TABLE tenant_template.talent
    ALTER COLUMN lifecycle_status SET DEFAULT 'draft';

ALTER TABLE tenant_template.talent
    ALTER COLUMN lifecycle_status SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_talent_lifecycle_status
    ON tenant_template.talent(lifecycle_status);

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
        IF to_regclass(format('%I.talent', schema_record.schema_name)) IS NULL THEN
            RAISE NOTICE 'Skipping schema % because required base table talent is missing', schema_record.schema_name;
            CONTINUE;
        END IF;

        EXECUTE format(
            'ALTER TABLE %I.talent
                ADD COLUMN IF NOT EXISTS lifecycle_status VARCHAR(16)',
            schema_record.schema_name
        );

        EXECUTE format(
            'ALTER TABLE %I.talent
                ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ',
            schema_record.schema_name
        );

        EXECUTE format(
            'ALTER TABLE %I.talent
                ADD COLUMN IF NOT EXISTS published_by UUID',
            schema_record.schema_name
        );

        EXECUTE format(
            'UPDATE %I.talent
             SET lifecycle_status = CASE
                 WHEN is_active = true THEN ''published''
                 ELSE ''disabled''
             END
             WHERE lifecycle_status IS NULL',
            schema_record.schema_name
        );

        EXECUTE format(
            'ALTER TABLE %I.talent
                ALTER COLUMN lifecycle_status SET DEFAULT ''draft''',
            schema_record.schema_name
        );

        EXECUTE format(
            'ALTER TABLE %I.talent
                ALTER COLUMN lifecycle_status SET NOT NULL',
            schema_record.schema_name
        );

        EXECUTE format(
            'CREATE INDEX IF NOT EXISTS idx_talent_lifecycle_status
                ON %I.talent(lifecycle_status)',
            schema_record.schema_name
        );
    END LOOP;
END $$;
