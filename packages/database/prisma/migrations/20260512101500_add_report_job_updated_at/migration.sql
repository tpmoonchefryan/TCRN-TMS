-- Add missing updated_at to report_job in tenant_template and existing tenant schemas.
-- This keeps runtime tables aligned with Prisma and the report worker/status writers.

ALTER TABLE tenant_template.report_job
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

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
        IF to_regclass(format('%I.report_job', schema_record.schema_name)) IS NULL THEN
            RAISE NOTICE 'Skipping schema % because report_job is missing', schema_record.schema_name;
            CONTINUE;
        END IF;

        EXECUTE format(
            'ALTER TABLE %I.report_job
                ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP',
            schema_record.schema_name
        );
    END LOOP;
END $$;
