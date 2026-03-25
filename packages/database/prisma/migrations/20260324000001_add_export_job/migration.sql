-- Add missing export_job table to tenant_template and all existing tenant schemas.
-- This fixes schema drift where application code and Prisma expect export_job,
-- but migration history and ad-hoc schema copies left some schemas with either:
-- - no export_job table at all, or
-- - an export_job table missing updated_at.

CREATE TABLE IF NOT EXISTS tenant_template.export_job (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    talent_id UUID NOT NULL,
    profile_store_id UUID NOT NULL,
    job_type VARCHAR(32) NOT NULL,
    format VARCHAR(16) NOT NULL DEFAULT 'csv',
    status VARCHAR(16) NOT NULL DEFAULT 'pending',
    filters JSONB,
    total_records INTEGER NOT NULL DEFAULT 0,
    processed_records INTEGER NOT NULL DEFAULT 0,
    file_name VARCHAR(255),
    file_path VARCHAR(512),
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,

    CONSTRAINT export_job_pkey PRIMARY KEY (id)
);

ALTER TABLE tenant_template.export_job
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS export_job_talent_id_idx
    ON tenant_template.export_job(talent_id);

CREATE INDEX IF NOT EXISTS export_job_profile_store_id_idx
    ON tenant_template.export_job(profile_store_id);

CREATE INDEX IF NOT EXISTS export_job_status_idx
    ON tenant_template.export_job(status);

CREATE INDEX IF NOT EXISTS export_job_created_at_idx
    ON tenant_template.export_job(created_at);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'export_job_talent_id_fkey'
          AND conrelid = 'tenant_template.export_job'::regclass
    ) THEN
        ALTER TABLE tenant_template.export_job
            ADD CONSTRAINT export_job_talent_id_fkey
            FOREIGN KEY (talent_id)
            REFERENCES tenant_template.talent(id)
            ON DELETE RESTRICT
            ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'export_job_profile_store_id_fkey'
          AND conrelid = 'tenant_template.export_job'::regclass
    ) THEN
        ALTER TABLE tenant_template.export_job
            ADD CONSTRAINT export_job_profile_store_id_fkey
            FOREIGN KEY (profile_store_id)
            REFERENCES tenant_template.profile_store(id)
            ON DELETE RESTRICT
            ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'export_job_created_by_fkey'
          AND conrelid = 'tenant_template.export_job'::regclass
    ) THEN
        ALTER TABLE tenant_template.export_job
            ADD CONSTRAINT export_job_created_by_fkey
            FOREIGN KEY (created_by)
            REFERENCES tenant_template.system_user(id)
            ON DELETE SET NULL
            ON UPDATE CASCADE;
    END IF;
END $$;

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
        IF to_regclass(format('%I.talent', schema_record.schema_name)) IS NULL
           OR to_regclass(format('%I.profile_store', schema_record.schema_name)) IS NULL THEN
            RAISE NOTICE 'Skipping schema % because required base tables are missing', schema_record.schema_name;
            CONTINUE;
        END IF;

        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I.export_job (
                id UUID NOT NULL DEFAULT gen_random_uuid(),
                talent_id UUID NOT NULL,
                profile_store_id UUID NOT NULL,
                job_type VARCHAR(32) NOT NULL,
                format VARCHAR(16) NOT NULL DEFAULT ''csv'',
                status VARCHAR(16) NOT NULL DEFAULT ''pending'',
                filters JSONB,
                total_records INTEGER NOT NULL DEFAULT 0,
                processed_records INTEGER NOT NULL DEFAULT 0,
                file_name VARCHAR(255),
                file_path VARCHAR(512),
                error_message TEXT,
                started_at TIMESTAMPTZ,
                completed_at TIMESTAMPTZ,
                expires_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                created_by UUID,
                CONSTRAINT export_job_pkey PRIMARY KEY (id)
            )',
            schema_record.schema_name
        );

        EXECUTE format(
            'ALTER TABLE %I.export_job
                ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP',
            schema_record.schema_name
        );

        EXECUTE format(
            'CREATE INDEX IF NOT EXISTS export_job_talent_id_idx ON %I.export_job(talent_id)',
            schema_record.schema_name
        );

        EXECUTE format(
            'CREATE INDEX IF NOT EXISTS export_job_profile_store_id_idx ON %I.export_job(profile_store_id)',
            schema_record.schema_name
        );

        EXECUTE format(
            'CREATE INDEX IF NOT EXISTS export_job_status_idx ON %I.export_job(status)',
            schema_record.schema_name
        );

        EXECUTE format(
            'CREATE INDEX IF NOT EXISTS export_job_created_at_idx ON %I.export_job(created_at)',
            schema_record.schema_name
        );

        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'export_job_talent_id_fkey'
              AND conrelid = format('%I.export_job', schema_record.schema_name)::regclass
        ) THEN
            EXECUTE format(
                'ALTER TABLE %I.export_job
                    ADD CONSTRAINT export_job_talent_id_fkey
                    FOREIGN KEY (talent_id)
                    REFERENCES %I.talent(id)
                    ON DELETE RESTRICT
                    ON UPDATE CASCADE',
                schema_record.schema_name,
                schema_record.schema_name
            );
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'export_job_profile_store_id_fkey'
              AND conrelid = format('%I.export_job', schema_record.schema_name)::regclass
        ) THEN
            EXECUTE format(
                'ALTER TABLE %I.export_job
                    ADD CONSTRAINT export_job_profile_store_id_fkey
                    FOREIGN KEY (profile_store_id)
                    REFERENCES %I.profile_store(id)
                    ON DELETE RESTRICT
                    ON UPDATE CASCADE',
                schema_record.schema_name,
                schema_record.schema_name
            );
        END IF;

        IF to_regclass(format('%I.system_user', schema_record.schema_name)) IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'export_job_created_by_fkey'
                  AND conrelid = format('%I.export_job', schema_record.schema_name)::regclass
            ) THEN
                EXECUTE format(
                    'ALTER TABLE %I.export_job
                        ADD CONSTRAINT export_job_created_by_fkey
                        FOREIGN KEY (created_by)
                        REFERENCES %I.system_user(id)
                        ON DELETE SET NULL
                        ON UPDATE CASCADE',
                    schema_record.schema_name,
                    schema_record.schema_name
                );
            END IF;
        END IF;
    END LOOP;
END $$;
