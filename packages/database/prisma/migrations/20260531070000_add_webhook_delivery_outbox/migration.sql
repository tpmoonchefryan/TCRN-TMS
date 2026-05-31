-- Phase 7 webhook delivery adapter: durable outbox and attempt storage.
-- TCRN remains the authority for event catalog, subscription ownership,
-- idempotency, replay, audit, and delivery state projection.

CREATE TABLE IF NOT EXISTS tenant_template.webhook_delivery_outbox (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    webhook_id UUID,
    event_id VARCHAR(128) NOT NULL,
    event_code VARCHAR(64) NOT NULL,
    payload_version VARCHAR(32) NOT NULL DEFAULT 'v1',
    tenant_id UUID,
    subsidiary_id UUID,
    talent_id UUID,
    idempotency_key VARCHAR(128) NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    payload_envelope JSONB NOT NULL DEFAULT '{}'::jsonb,
    redacted_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    dispatch_mode VARCHAR(32) NOT NULL DEFAULT 'disabled',
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ,
    available_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMPTZ,
    dead_lettered_at TIMESTAMPTZ,
    dlq_reason TEXT,
    provider_message_id VARCHAR(128),
    correlation_id VARCHAR(128),
    trace_id VARCHAR(64),
    replay_of_outbox_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    version INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT webhook_delivery_outbox_pkey PRIMARY KEY (id),
    CONSTRAINT webhook_delivery_outbox_idempotency_key_key UNIQUE (idempotency_key)
);

CREATE TABLE IF NOT EXISTS tenant_template.webhook_delivery_attempt (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    outbox_id UUID NOT NULL,
    webhook_id UUID,
    attempt_number INTEGER NOT NULL,
    status VARCHAR(32) NOT NULL,
    dispatch_mode VARCHAR(32) NOT NULL DEFAULT 'disabled',
    endpoint_url VARCHAR(512) NOT NULL,
    provider_attempt_id VARCHAR(128),
    request_headers JSONB NOT NULL DEFAULT '{}'::jsonb,
    request_body_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    response_status SMALLINT,
    response_body_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_code VARCHAR(64),
    error_message TEXT,
    latency_ms INTEGER,
    next_retry_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    replay_reason TEXT,
    requested_by UUID,
    trace_id VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT webhook_delivery_attempt_pkey PRIMARY KEY (id),
    CONSTRAINT webhook_delivery_attempt_outbox_number_key UNIQUE (outbox_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS webhook_delivery_outbox_webhook_status_idx
    ON tenant_template.webhook_delivery_outbox(webhook_id, status);

CREATE INDEX IF NOT EXISTS webhook_delivery_outbox_event_code_idx
    ON tenant_template.webhook_delivery_outbox(event_code);

CREATE INDEX IF NOT EXISTS webhook_delivery_outbox_status_next_attempt_idx
    ON tenant_template.webhook_delivery_outbox(status, next_attempt_at);

CREATE INDEX IF NOT EXISTS webhook_delivery_outbox_trace_id_idx
    ON tenant_template.webhook_delivery_outbox(trace_id);

CREATE INDEX IF NOT EXISTS webhook_delivery_outbox_created_at_idx
    ON tenant_template.webhook_delivery_outbox(created_at);

CREATE INDEX IF NOT EXISTS webhook_delivery_attempt_webhook_status_idx
    ON tenant_template.webhook_delivery_attempt(webhook_id, status);

CREATE INDEX IF NOT EXISTS webhook_delivery_attempt_status_next_retry_idx
    ON tenant_template.webhook_delivery_attempt(status, next_retry_at);

CREATE INDEX IF NOT EXISTS webhook_delivery_attempt_trace_id_idx
    ON tenant_template.webhook_delivery_attempt(trace_id);

CREATE INDEX IF NOT EXISTS webhook_delivery_attempt_created_at_idx
    ON tenant_template.webhook_delivery_attempt(created_at);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'webhook_delivery_outbox_webhook_id_fkey'
          AND conrelid = 'tenant_template.webhook_delivery_outbox'::regclass
    ) THEN
        ALTER TABLE tenant_template.webhook_delivery_outbox
            ADD CONSTRAINT webhook_delivery_outbox_webhook_id_fkey
            FOREIGN KEY (webhook_id)
            REFERENCES tenant_template.webhook(id)
            ON DELETE SET NULL
            ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'webhook_delivery_attempt_outbox_id_fkey'
          AND conrelid = 'tenant_template.webhook_delivery_attempt'::regclass
    ) THEN
        ALTER TABLE tenant_template.webhook_delivery_attempt
            ADD CONSTRAINT webhook_delivery_attempt_outbox_id_fkey
            FOREIGN KEY (outbox_id)
            REFERENCES tenant_template.webhook_delivery_outbox(id)
            ON DELETE CASCADE
            ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'webhook_delivery_attempt_webhook_id_fkey'
          AND conrelid = 'tenant_template.webhook_delivery_attempt'::regclass
    ) THEN
        ALTER TABLE tenant_template.webhook_delivery_attempt
            ADD CONSTRAINT webhook_delivery_attempt_webhook_id_fkey
            FOREIGN KEY (webhook_id)
            REFERENCES tenant_template.webhook(id)
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
        IF to_regclass(format('%I.webhook', schema_record.schema_name)) IS NULL THEN
            RAISE NOTICE 'Skipping schema % because webhook table is missing', schema_record.schema_name;
            CONTINUE;
        END IF;

        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I.webhook_delivery_outbox (
                id UUID NOT NULL DEFAULT gen_random_uuid(),
                webhook_id UUID,
                event_id VARCHAR(128) NOT NULL,
                event_code VARCHAR(64) NOT NULL,
                payload_version VARCHAR(32) NOT NULL DEFAULT ''v1'',
                tenant_id UUID,
                subsidiary_id UUID,
                talent_id UUID,
                idempotency_key VARCHAR(128) NOT NULL,
                payload_hash VARCHAR(64) NOT NULL,
                payload_envelope JSONB NOT NULL DEFAULT ''{}''::jsonb,
                redacted_payload JSONB NOT NULL DEFAULT ''{}''::jsonb,
                dispatch_mode VARCHAR(32) NOT NULL DEFAULT ''disabled'',
                status VARCHAR(32) NOT NULL DEFAULT ''pending'',
                attempt_count INTEGER NOT NULL DEFAULT 0,
                next_attempt_at TIMESTAMPTZ,
                available_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                delivered_at TIMESTAMPTZ,
                dead_lettered_at TIMESTAMPTZ,
                dlq_reason TEXT,
                provider_message_id VARCHAR(128),
                correlation_id VARCHAR(128),
                trace_id VARCHAR(64),
                replay_of_outbox_id UUID,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                created_by UUID,
                version INTEGER NOT NULL DEFAULT 1,
                CONSTRAINT webhook_delivery_outbox_pkey PRIMARY KEY (id),
                CONSTRAINT webhook_delivery_outbox_idempotency_key_key UNIQUE (idempotency_key)
            )',
            schema_record.schema_name
        );

        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I.webhook_delivery_attempt (
                id UUID NOT NULL DEFAULT gen_random_uuid(),
                outbox_id UUID NOT NULL,
                webhook_id UUID,
                attempt_number INTEGER NOT NULL,
                status VARCHAR(32) NOT NULL,
                dispatch_mode VARCHAR(32) NOT NULL DEFAULT ''disabled'',
                endpoint_url VARCHAR(512) NOT NULL,
                provider_attempt_id VARCHAR(128),
                request_headers JSONB NOT NULL DEFAULT ''{}''::jsonb,
                request_body_summary JSONB NOT NULL DEFAULT ''{}''::jsonb,
                response_status SMALLINT,
                response_body_summary JSONB NOT NULL DEFAULT ''{}''::jsonb,
                error_code VARCHAR(64),
                error_message TEXT,
                latency_ms INTEGER,
                next_retry_at TIMESTAMPTZ,
                delivered_at TIMESTAMPTZ,
                replay_reason TEXT,
                requested_by UUID,
                trace_id VARCHAR(64),
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT webhook_delivery_attempt_pkey PRIMARY KEY (id),
                CONSTRAINT webhook_delivery_attempt_outbox_number_key UNIQUE (outbox_id, attempt_number)
            )',
            schema_record.schema_name
        );

        EXECUTE format('CREATE INDEX IF NOT EXISTS webhook_delivery_outbox_webhook_status_idx ON %I.webhook_delivery_outbox(webhook_id, status)', schema_record.schema_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS webhook_delivery_outbox_event_code_idx ON %I.webhook_delivery_outbox(event_code)', schema_record.schema_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS webhook_delivery_outbox_status_next_attempt_idx ON %I.webhook_delivery_outbox(status, next_attempt_at)', schema_record.schema_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS webhook_delivery_outbox_trace_id_idx ON %I.webhook_delivery_outbox(trace_id)', schema_record.schema_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS webhook_delivery_outbox_created_at_idx ON %I.webhook_delivery_outbox(created_at)', schema_record.schema_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS webhook_delivery_attempt_webhook_status_idx ON %I.webhook_delivery_attempt(webhook_id, status)', schema_record.schema_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS webhook_delivery_attempt_status_next_retry_idx ON %I.webhook_delivery_attempt(status, next_retry_at)', schema_record.schema_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS webhook_delivery_attempt_trace_id_idx ON %I.webhook_delivery_attempt(trace_id)', schema_record.schema_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS webhook_delivery_attempt_created_at_idx ON %I.webhook_delivery_attempt(created_at)', schema_record.schema_name);

        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'webhook_delivery_outbox_webhook_id_fkey'
              AND conrelid = format('%I.webhook_delivery_outbox', schema_record.schema_name)::regclass
        ) THEN
            EXECUTE format(
                'ALTER TABLE %I.webhook_delivery_outbox
                    ADD CONSTRAINT webhook_delivery_outbox_webhook_id_fkey
                    FOREIGN KEY (webhook_id)
                    REFERENCES %I.webhook(id)
                    ON DELETE SET NULL
                    ON UPDATE CASCADE',
                schema_record.schema_name,
                schema_record.schema_name
            );
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'webhook_delivery_attempt_outbox_id_fkey'
              AND conrelid = format('%I.webhook_delivery_attempt', schema_record.schema_name)::regclass
        ) THEN
            EXECUTE format(
                'ALTER TABLE %I.webhook_delivery_attempt
                    ADD CONSTRAINT webhook_delivery_attempt_outbox_id_fkey
                    FOREIGN KEY (outbox_id)
                    REFERENCES %I.webhook_delivery_outbox(id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE',
                schema_record.schema_name,
                schema_record.schema_name
            );
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'webhook_delivery_attempt_webhook_id_fkey'
              AND conrelid = format('%I.webhook_delivery_attempt', schema_record.schema_name)::regclass
        ) THEN
            EXECUTE format(
                'ALTER TABLE %I.webhook_delivery_attempt
                    ADD CONSTRAINT webhook_delivery_attempt_webhook_id_fkey
                    FOREIGN KEY (webhook_id)
                    REFERENCES %I.webhook(id)
                    ON DELETE SET NULL
                    ON UPDATE CASCADE',
                schema_record.schema_name,
                schema_record.schema_name
            );
        END IF;
    END LOOP;
END $$;
