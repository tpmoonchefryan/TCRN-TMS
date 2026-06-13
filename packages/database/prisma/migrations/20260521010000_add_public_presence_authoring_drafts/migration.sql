-- SPDX-License-Identifier: Apache-2.0
-- Migration: durable template/component authoring drafts for Public Presence IDE

CREATE TABLE IF NOT EXISTS tenant_template.public_presence_authoring_draft (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    talent_id UUID NOT NULL REFERENCES tenant_template.talent(id) ON DELETE CASCADE,
    artifact_kind VARCHAR(32) NOT NULL,
    subject_key VARCHAR(64) NOT NULL,
    artifact_status VARCHAR(32) NOT NULL DEFAULT 'draft',
    validation_state VARCHAR(32) NOT NULL DEFAULT 'unvalidated',
    source_bundle JSONB NOT NULL DEFAULT '[]',
    validation_summary JSONB NOT NULL DEFAULT '{}',
    last_saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_validated_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    UNIQUE (talent_id, artifact_kind, subject_key)
);

CREATE INDEX IF NOT EXISTS public_presence_authoring_draft_talent_kind_updated_idx
    ON tenant_template.public_presence_authoring_draft(talent_id, artifact_kind, updated_at DESC);

CREATE INDEX IF NOT EXISTS public_presence_authoring_draft_kind_status_updated_idx
    ON tenant_template.public_presence_authoring_draft(artifact_kind, artifact_status, updated_at DESC);
