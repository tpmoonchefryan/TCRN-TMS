-- SPDX-License-Identifier: Apache-2.0
-- Migration: Public Presence persistence, hash, and workflow foundation

CREATE TABLE IF NOT EXISTS tenant_template.public_presence_portal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    talent_id UUID NOT NULL UNIQUE REFERENCES tenant_template.talent(id),
    draft_version_id UUID UNIQUE,
    live_version_id UUID UNIQUE,
    latest_version_number INTEGER NOT NULL DEFAULT 0,
    latest_validation_state VARCHAR(32),
    last_validated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS public_presence_portal_latest_validation_state_idx
    ON tenant_template.public_presence_portal(latest_validation_state);

CREATE TABLE IF NOT EXISTS tenant_template.public_presence_document_version (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portal_id UUID NOT NULL REFERENCES tenant_template.public_presence_portal(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    document_schema_version VARCHAR(32) NOT NULL,
    template_id VARCHAR(64) NOT NULL,
    document JSONB NOT NULL,
    document_state VARCHAR(32) NOT NULL DEFAULT 'draft',
    content_hash_algorithm VARCHAR(32) NOT NULL DEFAULT 'sha256',
    content_hash VARCHAR(64) NOT NULL,
    last_validation_snapshot_id UUID UNIQUE,
    scheduled_for TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    published_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    UNIQUE(portal_id, version_number)
);

CREATE INDEX IF NOT EXISTS public_presence_document_version_portal_id_document_state_idx
    ON tenant_template.public_presence_document_version(portal_id, document_state);
CREATE INDEX IF NOT EXISTS public_presence_document_version_portal_id_content_hash_idx
    ON tenant_template.public_presence_document_version(portal_id, content_hash);
CREATE INDEX IF NOT EXISTS public_presence_document_version_content_hash_idx
    ON tenant_template.public_presence_document_version(content_hash);
CREATE INDEX IF NOT EXISTS public_presence_document_version_scheduled_for_idx
    ON tenant_template.public_presence_document_version(scheduled_for);
CREATE INDEX IF NOT EXISTS public_presence_document_version_published_at_idx
    ON tenant_template.public_presence_document_version(published_at);

CREATE TABLE IF NOT EXISTS tenant_template.public_presence_validation_snapshot (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portal_id UUID NOT NULL REFERENCES tenant_template.public_presence_portal(id) ON DELETE CASCADE,
    version_id UUID NOT NULL REFERENCES tenant_template.public_presence_document_version(id) ON DELETE CASCADE,
    validation_mode VARCHAR(32) NOT NULL,
    validation_state VARCHAR(32) NOT NULL,
    fatal_count INTEGER NOT NULL DEFAULT 0,
    blocker_count INTEGER NOT NULL DEFAULT 0,
    warning_count INTEGER NOT NULL DEFAULT 0,
    info_count INTEGER NOT NULL DEFAULT 0,
    issue_counts JSONB NOT NULL DEFAULT '{}',
    blocker_ids JSONB NOT NULL DEFAULT '[]',
    acknowledgement_ids JSONB NOT NULL DEFAULT '[]',
    blocks_publish BOOLEAN NOT NULL DEFAULT false,
    blocks_visual_edit BOOLEAN NOT NULL DEFAULT false,
    blocks_ai_patch BOOLEAN NOT NULL DEFAULT false,
    projection_hash VARCHAR(255),
    registry_version VARCHAR(64) NOT NULL,
    safety_policy_version VARCHAR(64) NOT NULL,
    snapshot JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID
);

CREATE INDEX IF NOT EXISTS public_presence_validation_snapshot_portal_id_created_at_idx
    ON tenant_template.public_presence_validation_snapshot(portal_id, created_at);
CREATE INDEX IF NOT EXISTS public_presence_validation_snapshot_version_id_created_at_idx
    ON tenant_template.public_presence_validation_snapshot(version_id, created_at);
CREATE INDEX IF NOT EXISTS public_presence_validation_snapshot_mode_state_idx
    ON tenant_template.public_presence_validation_snapshot(validation_mode, validation_state);
CREATE INDEX IF NOT EXISTS public_presence_validation_snapshot_blockers_idx
    ON tenant_template.public_presence_validation_snapshot(blocks_publish, blocks_visual_edit, blocks_ai_patch);

CREATE TABLE IF NOT EXISTS tenant_template.public_presence_workflow_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portal_id UUID NOT NULL REFERENCES tenant_template.public_presence_portal(id) ON DELETE CASCADE,
    version_id UUID REFERENCES tenant_template.public_presence_document_version(id) ON DELETE SET NULL,
    event_type VARCHAR(64) NOT NULL,
    from_document_state VARCHAR(32),
    to_document_state VARCHAR(32),
    content_hash_algorithm VARCHAR(32),
    content_hash VARCHAR(64),
    payload JSONB NOT NULL DEFAULT '{}',
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor_id UUID
);

CREATE INDEX IF NOT EXISTS public_presence_workflow_event_portal_id_occurred_at_idx
    ON tenant_template.public_presence_workflow_event(portal_id, occurred_at);
CREATE INDEX IF NOT EXISTS public_presence_workflow_event_version_id_occurred_at_idx
    ON tenant_template.public_presence_workflow_event(version_id, occurred_at);
CREATE INDEX IF NOT EXISTS public_presence_workflow_event_event_type_occurred_at_idx
    ON tenant_template.public_presence_workflow_event(event_type, occurred_at);

ALTER TABLE tenant_template.public_presence_portal
    ADD CONSTRAINT public_presence_portal_draft_version_id_fkey
    FOREIGN KEY (draft_version_id)
    REFERENCES tenant_template.public_presence_document_version(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

ALTER TABLE tenant_template.public_presence_portal
    ADD CONSTRAINT public_presence_portal_live_version_id_fkey
    FOREIGN KEY (live_version_id)
    REFERENCES tenant_template.public_presence_document_version(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

ALTER TABLE tenant_template.public_presence_document_version
    ADD CONSTRAINT public_presence_document_version_last_validation_snapshot_id_fkey
    FOREIGN KEY (last_validation_snapshot_id)
    REFERENCES tenant_template.public_presence_validation_snapshot(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
