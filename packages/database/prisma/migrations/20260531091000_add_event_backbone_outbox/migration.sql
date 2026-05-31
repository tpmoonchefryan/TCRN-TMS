-- Phase 8 event backbone adapter: durable event outbox and consumer cursor storage.
-- TCRN remains the authority for event meaning, tenant scope, idempotency,
-- replay approval, DLQ audit, and side-effect policy. NATS owns transport only.

CREATE TABLE IF NOT EXISTS tenant_template.event_backbone_outbox (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    event_code VARCHAR(128) NOT NULL,
    event_family VARCHAR(64) NOT NULL,
    payload_version VARCHAR(32) NOT NULL DEFAULT '1',
    producer VARCHAR(128) NOT NULL,
    tenant_id UUID,
    subsidiary_id UUID,
    talent_id UUID,
    scope_class VARCHAR(32) NOT NULL,
    pii_class VARCHAR(64) NOT NULL,
    idempotency_key VARCHAR(160) NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    payload_envelope JSONB NOT NULL DEFAULT '{}'::jsonb,
    redacted_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    bridge_mode VARCHAR(32) NOT NULL DEFAULT 'disabled',
    publish_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    publish_attempts INTEGER NOT NULL DEFAULT 0,
    next_publish_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    dead_lettered_at TIMESTAMPTZ,
    dlq_reason TEXT,
    replay_of_outbox_id UUID,
    replay_reason TEXT,
    correlation_id VARCHAR(128),
    trace_id VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    version INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT event_backbone_outbox_pkey PRIMARY KEY (id),
    CONSTRAINT event_backbone_outbox_idempotency_key_key UNIQUE (idempotency_key)
);

CREATE TABLE IF NOT EXISTS tenant_template.event_backbone_consumer_cursor (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    outbox_id UUID NOT NULL,
    consumer_owner VARCHAR(128) NOT NULL,
    durable_name VARCHAR(160) NOT NULL,
    side_effect_key VARCHAR(160) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    dead_lettered_at TIMESTAMPTZ,
    dlq_reason TEXT,
    replay_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT event_backbone_consumer_cursor_pkey PRIMARY KEY (id),
    CONSTRAINT event_backbone_consumer_cursor_outbox_owner_key UNIQUE (outbox_id, consumer_owner),
    CONSTRAINT event_backbone_consumer_cursor_side_effect_key_key UNIQUE (side_effect_key)
);

CREATE INDEX IF NOT EXISTS event_backbone_outbox_event_code_idx
    ON tenant_template.event_backbone_outbox(event_code);

CREATE INDEX IF NOT EXISTS event_backbone_outbox_family_status_idx
    ON tenant_template.event_backbone_outbox(event_family, publish_status);

CREATE INDEX IF NOT EXISTS event_backbone_outbox_status_next_publish_idx
    ON tenant_template.event_backbone_outbox(publish_status, next_publish_at);

CREATE INDEX IF NOT EXISTS event_backbone_outbox_tenant_event_idx
    ON tenant_template.event_backbone_outbox(tenant_id, event_code);

CREATE INDEX IF NOT EXISTS event_backbone_outbox_trace_id_idx
    ON tenant_template.event_backbone_outbox(trace_id);

CREATE INDEX IF NOT EXISTS event_backbone_outbox_created_at_idx
    ON tenant_template.event_backbone_outbox(created_at);

CREATE INDEX IF NOT EXISTS event_backbone_consumer_cursor_durable_status_idx
    ON tenant_template.event_backbone_consumer_cursor(durable_name, status);

CREATE INDEX IF NOT EXISTS event_backbone_consumer_cursor_status_attempt_idx
    ON tenant_template.event_backbone_consumer_cursor(status, last_attempt_at);

CREATE INDEX IF NOT EXISTS event_backbone_consumer_cursor_created_at_idx
    ON tenant_template.event_backbone_consumer_cursor(created_at);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'event_backbone_consumer_cursor_outbox_id_fkey'
          AND conrelid = 'tenant_template.event_backbone_consumer_cursor'::regclass
    ) THEN
        ALTER TABLE tenant_template.event_backbone_consumer_cursor
            ADD CONSTRAINT event_backbone_consumer_cursor_outbox_id_fkey
            FOREIGN KEY (outbox_id)
            REFERENCES tenant_template.event_backbone_outbox(id)
            ON DELETE CASCADE
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
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I.event_backbone_outbox (
                id UUID NOT NULL DEFAULT gen_random_uuid(),
                event_code VARCHAR(128) NOT NULL,
                event_family VARCHAR(64) NOT NULL,
                payload_version VARCHAR(32) NOT NULL DEFAULT ''1'',
                producer VARCHAR(128) NOT NULL,
                tenant_id UUID,
                subsidiary_id UUID,
                talent_id UUID,
                scope_class VARCHAR(32) NOT NULL,
                pii_class VARCHAR(64) NOT NULL,
                idempotency_key VARCHAR(160) NOT NULL,
                payload_hash VARCHAR(64) NOT NULL,
                payload_envelope JSONB NOT NULL DEFAULT ''{}''::jsonb,
                redacted_payload JSONB NOT NULL DEFAULT ''{}''::jsonb,
                bridge_mode VARCHAR(32) NOT NULL DEFAULT ''disabled'',
                publish_status VARCHAR(32) NOT NULL DEFAULT ''pending'',
                publish_attempts INTEGER NOT NULL DEFAULT 0,
                next_publish_at TIMESTAMPTZ,
                published_at TIMESTAMPTZ,
                dead_lettered_at TIMESTAMPTZ,
                dlq_reason TEXT,
                replay_of_outbox_id UUID,
                replay_reason TEXT,
                correlation_id VARCHAR(128),
                trace_id VARCHAR(64),
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                created_by UUID,
                version INTEGER NOT NULL DEFAULT 1,
                CONSTRAINT event_backbone_outbox_pkey PRIMARY KEY (id),
                CONSTRAINT event_backbone_outbox_idempotency_key_key UNIQUE (idempotency_key)
            )',
            schema_record.schema_name
        );

        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I.event_backbone_consumer_cursor (
                id UUID NOT NULL DEFAULT gen_random_uuid(),
                outbox_id UUID NOT NULL,
                consumer_owner VARCHAR(128) NOT NULL,
                durable_name VARCHAR(160) NOT NULL,
                side_effect_key VARCHAR(160) NOT NULL,
                status VARCHAR(32) NOT NULL DEFAULT ''pending'',
                attempt_count INTEGER NOT NULL DEFAULT 0,
                last_attempt_at TIMESTAMPTZ,
                acknowledged_at TIMESTAMPTZ,
                dead_lettered_at TIMESTAMPTZ,
                dlq_reason TEXT,
                replay_reason TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT event_backbone_consumer_cursor_pkey PRIMARY KEY (id),
                CONSTRAINT event_backbone_consumer_cursor_outbox_owner_key UNIQUE (outbox_id, consumer_owner),
                CONSTRAINT event_backbone_consumer_cursor_side_effect_key_key UNIQUE (side_effect_key)
            )',
            schema_record.schema_name
        );

        EXECUTE format('CREATE INDEX IF NOT EXISTS event_backbone_outbox_event_code_idx ON %I.event_backbone_outbox(event_code)', schema_record.schema_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS event_backbone_outbox_family_status_idx ON %I.event_backbone_outbox(event_family, publish_status)', schema_record.schema_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS event_backbone_outbox_status_next_publish_idx ON %I.event_backbone_outbox(publish_status, next_publish_at)', schema_record.schema_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS event_backbone_outbox_tenant_event_idx ON %I.event_backbone_outbox(tenant_id, event_code)', schema_record.schema_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS event_backbone_outbox_trace_id_idx ON %I.event_backbone_outbox(trace_id)', schema_record.schema_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS event_backbone_outbox_created_at_idx ON %I.event_backbone_outbox(created_at)', schema_record.schema_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS event_backbone_consumer_cursor_durable_status_idx ON %I.event_backbone_consumer_cursor(durable_name, status)', schema_record.schema_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS event_backbone_consumer_cursor_status_attempt_idx ON %I.event_backbone_consumer_cursor(status, last_attempt_at)', schema_record.schema_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS event_backbone_consumer_cursor_created_at_idx ON %I.event_backbone_consumer_cursor(created_at)', schema_record.schema_name);

        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'event_backbone_consumer_cursor_outbox_id_fkey'
              AND conrelid = format('%I.event_backbone_consumer_cursor', schema_record.schema_name)::regclass
        ) THEN
            EXECUTE format(
                'ALTER TABLE %I.event_backbone_consumer_cursor
                    ADD CONSTRAINT event_backbone_consumer_cursor_outbox_id_fkey
                    FOREIGN KEY (outbox_id)
                    REFERENCES %I.event_backbone_outbox(id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE',
                schema_record.schema_name,
                schema_record.schema_name
            );
        END IF;
    END LOOP;
END $$;
