-- Phase 1: first-class Module / Capability assignment authority.
-- The registry definitions live in @tcrn/shared; tenant-owned assignment state
-- lives in public schema and replaces the retired tenant feature-settings authority.

CREATE TABLE IF NOT EXISTS public.tenant_capability_state (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenant(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tenant_capability_assignment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  capability_code VARCHAR(128) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  source VARCHAR(32) NOT NULL DEFAULT 'system',
  assigned_by UUID,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT,
  CONSTRAINT tenant_capability_assignment_tenant_code_unique UNIQUE (tenant_id, capability_code),
  CONSTRAINT tenant_capability_assignment_source_check CHECK (
    source IN ('seed', 'migration', 'ac_manual', 'system')
  )
);

CREATE INDEX IF NOT EXISTS tenant_capability_assignment_tenant_enabled_idx
  ON public.tenant_capability_assignment(tenant_id, enabled);

CREATE INDEX IF NOT EXISTS tenant_capability_assignment_capability_code_idx
  ON public.tenant_capability_assignment(capability_code);

CREATE TABLE IF NOT EXISTS public.tenant_capability_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  actor_id UUID,
  action VARCHAR(64) NOT NULL,
  old_version INTEGER,
  new_version INTEGER NOT NULL,
  old_capability_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
  new_capability_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
  note TEXT,
  request_id VARCHAR(128),
  ip_address VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tenant_capability_audit_tenant_created_idx
  ON public.tenant_capability_audit(tenant_id, created_at);

CREATE INDEX IF NOT EXISTS tenant_capability_audit_actor_idx
  ON public.tenant_capability_audit(actor_id);

INSERT INTO public.tenant_capability_state (tenant_id, version, updated_at)
SELECT id, 1, now()
FROM public.tenant
ON CONFLICT (tenant_id) DO NOTHING;

WITH legacy_assignments AS (
  SELECT tenant_id, capability_code
  FROM (
    SELECT
      t.id AS tenant_id,
      unnest(
        CASE
          WHEN t.tier = 'ac' THEN ARRAY[]::text[]
          WHEN jsonb_typeof(t.settings -> 'features') = 'object' THEN
            ARRAY[
              'public_presence.homepage',
              'marshmallow.mailbox'
            ]::text[]
            || CASE
              WHEN COALESCE((t.settings -> 'features' ->> 'advancedReports')::boolean, false)
                THEN ARRAY['reports.mfr']::text[]
                ELSE ARRAY[]::text[]
            END
            || CASE
              WHEN COALESCE((t.settings -> 'features' ->> 'apiIntegration')::boolean, false)
                OR COALESCE((t.settings -> 'features' ->> 'webhooks')::boolean, false)
                THEN ARRAY['integration.webhooks']::text[]
                ELSE ARRAY[]::text[]
            END
          WHEN jsonb_typeof(t.settings -> 'features') = 'array' THEN
            ARRAY[
              'public_presence.homepage',
              'marshmallow.mailbox'
            ]::text[]
            || CASE
              WHEN t.settings -> 'features' ? 'advancedReports'
                THEN ARRAY['reports.mfr']::text[]
                ELSE ARRAY[]::text[]
            END
            || CASE
              WHEN (t.settings -> 'features' ? 'apiIntegration')
                OR (t.settings -> 'features' ? 'webhooks')
                THEN ARRAY['integration.webhooks']::text[]
                ELSE ARRAY[]::text[]
            END
          ELSE ARRAY[
            'public_presence.homepage',
            'marshmallow.mailbox'
          ]::text[]
        END
      ) AS capability_code
    FROM public.tenant t
  ) mapped
  WHERE capability_code IS NOT NULL
)
INSERT INTO public.tenant_capability_assignment (
  tenant_id,
  capability_code,
  enabled,
  source,
  assigned_at,
  updated_at,
  note
)
SELECT DISTINCT
  tenant_id,
  capability_code,
  true,
  'migration',
  now(),
  now(),
  'Backfilled from legacy feature settings/default Phase 1 module capability rollout'
FROM legacy_assignments
ON CONFLICT (tenant_id, capability_code) DO UPDATE SET
  enabled = true,
  source = CASE
    WHEN public.tenant_capability_assignment.source = 'ac_manual'
      THEN public.tenant_capability_assignment.source
    ELSE EXCLUDED.source
  END,
  updated_at = now(),
  note = EXCLUDED.note;

UPDATE public.tenant
SET settings = settings - 'features',
    updated_at = now()
WHERE settings ? 'features';
