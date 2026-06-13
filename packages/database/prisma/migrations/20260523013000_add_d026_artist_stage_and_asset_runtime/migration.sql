-- SPDX-License-Identifier: Apache-2.0
-- Migration: D-026 Artist Stage authority and scoped homepage asset runtime foundation
--
-- Backfill / cutover plan:
-- 1. Seed each tenant schema with tenant-owned artist_stage rows mapped from the
--    legacy talent.lifecycle_status values that currently exist in that tenant.
-- 2. Populate talent.artist_stage_id from those seeded stage rows before the API
--    starts requiring artistStageId on Talent create/update flows.
-- 3. After S3 lifecycle proof is green, promote talent.artist_stage_id to NOT NULL
--    and remove legacy lifecycle-direction authority from product flows.

ALTER TABLE tenant_template.talent
    ADD COLUMN IF NOT EXISTS artist_stage_id UUID;

CREATE INDEX IF NOT EXISTS talent_artist_stage_id_idx
    ON tenant_template.talent(artist_stage_id);

CREATE TABLE IF NOT EXISTS tenant_template.artist_stage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_type VARCHAR(16) NOT NULL DEFAULT 'tenant',
    owner_id UUID,
    code VARCHAR(32) NOT NULL,
    name JSONB NOT NULL,
    description JSONB NOT NULL DEFAULT '{"en":"","zh_HANS":"","zh_HANT":"","ja":"","ko":"","fr":""}',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_system BOOLEAN NOT NULL DEFAULT false,
    color VARCHAR(16),
    lifecycle_status_mapping VARCHAR(16) NOT NULL DEFAULT 'draft',
    homepage_policy_key VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    UNIQUE (owner_type, owner_id, code)
);

CREATE INDEX IF NOT EXISTS artist_stage_owner_idx
    ON tenant_template.artist_stage(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS artist_stage_active_idx
    ON tenant_template.artist_stage(is_active);

CREATE TABLE IF NOT EXISTS tenant_template.public_presence_asset (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_kind VARCHAR(16) NOT NULL,
    owner_type VARCHAR(16) NOT NULL,
    owner_id UUID,
    code VARCHAR(64) NOT NULL,
    name JSONB NOT NULL,
    description JSONB NOT NULL DEFAULT '{"en":"","zh_HANS":"","zh_HANT":"","ja":"","ko":"","fr":""}',
    template_id VARCHAR(64),
    component_type VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    is_system BOOLEAN NOT NULL DEFAULT false,
    current_revision_id UUID UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    UNIQUE (owner_type, owner_id, code)
);

CREATE INDEX IF NOT EXISTS public_presence_asset_scope_idx
    ON tenant_template.public_presence_asset(asset_kind, owner_type, owner_id);
CREATE INDEX IF NOT EXISTS public_presence_asset_template_id_idx
    ON tenant_template.public_presence_asset(template_id);
CREATE INDEX IF NOT EXISTS public_presence_asset_component_type_idx
    ON tenant_template.public_presence_asset(component_type);

CREATE TABLE IF NOT EXISTS tenant_template.public_presence_asset_revision (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES tenant_template.public_presence_asset(id) ON DELETE CASCADE,
    revision_number INTEGER NOT NULL,
    source_bundle JSONB NOT NULL DEFAULT '[]',
    manifest JSONB NOT NULL DEFAULT '{}',
    validation_summary JSONB NOT NULL DEFAULT '{}',
    source_hash VARCHAR(64) NOT NULL,
    runtime_contract_version VARCHAR(32) NOT NULL,
    artifact_status VARCHAR(32) NOT NULL DEFAULT 'draft',
    validation_state VARCHAR(32) NOT NULL DEFAULT 'unvalidated',
    last_validated_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    UNIQUE (asset_id, revision_number)
);

CREATE INDEX IF NOT EXISTS public_presence_asset_revision_asset_created_idx
    ON tenant_template.public_presence_asset_revision(asset_id, created_at);
CREATE INDEX IF NOT EXISTS public_presence_asset_revision_status_idx
    ON tenant_template.public_presence_asset_revision(artifact_status, validation_state);

ALTER TABLE tenant_template.public_presence_document_version
    ADD COLUMN IF NOT EXISTS template_asset_id UUID,
    ADD COLUMN IF NOT EXISTS template_asset_revision_id UUID,
    ADD COLUMN IF NOT EXISTS template_asset_source_hash VARCHAR(64),
    ADD COLUMN IF NOT EXISTS template_asset_snapshot JSONB;

CREATE INDEX IF NOT EXISTS public_presence_document_version_template_asset_id_idx
    ON tenant_template.public_presence_document_version(template_asset_id);
CREATE INDEX IF NOT EXISTS public_presence_document_version_template_asset_revision_id_idx
    ON tenant_template.public_presence_document_version(template_asset_revision_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'talent_artist_stage_id_fkey'
          AND connamespace = 'tenant_template'::regnamespace
    ) THEN
        ALTER TABLE tenant_template.talent
            ADD CONSTRAINT talent_artist_stage_id_fkey
            FOREIGN KEY (artist_stage_id)
            REFERENCES tenant_template.artist_stage(id)
            ON DELETE SET NULL
            ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'public_presence_asset_current_revision_id_fkey'
          AND connamespace = 'tenant_template'::regnamespace
    ) THEN
        ALTER TABLE tenant_template.public_presence_asset
            ADD CONSTRAINT public_presence_asset_current_revision_id_fkey
            FOREIGN KEY (current_revision_id)
            REFERENCES tenant_template.public_presence_asset_revision(id)
            ON DELETE SET NULL
            ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'public_presence_document_version_template_asset_id_fkey'
          AND connamespace = 'tenant_template'::regnamespace
    ) THEN
        ALTER TABLE tenant_template.public_presence_document_version
            ADD CONSTRAINT public_presence_document_version_template_asset_id_fkey
            FOREIGN KEY (template_asset_id)
            REFERENCES tenant_template.public_presence_asset(id)
            ON DELETE SET NULL
            ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'public_presence_document_version_template_asset_revision_id_fkey'
          AND connamespace = 'tenant_template'::regnamespace
    ) THEN
        ALTER TABLE tenant_template.public_presence_document_version
            ADD CONSTRAINT public_presence_document_version_template_asset_revision_id_fkey
            FOREIGN KEY (template_asset_revision_id)
            REFERENCES tenant_template.public_presence_asset_revision(id)
            ON DELETE SET NULL
            ON UPDATE CASCADE;
    END IF;
END $$;
