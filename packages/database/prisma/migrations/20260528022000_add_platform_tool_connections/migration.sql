-- Phase 4: AC-only platform tool connection framework.
-- These records describe connection/readiness metadata only. They do not install,
-- enable, or cut over any external tool stack.

CREATE TABLE IF NOT EXISTS public.platform_tool_definition (
  code VARCHAR(128) PRIMARY KEY,
  family VARCHAR(64) NOT NULL,
  display_key VARCHAR(128) NOT NULL,
  label VARCHAR(128) NOT NULL,
  localized_label JSONB NOT NULL,
  default_state VARCHAR(64) NOT NULL,
  owner_phase VARCHAR(128) NOT NULL,
  human_ui BOOLEAN NOT NULL DEFAULT false,
  deep_link BOOLEAN NOT NULL DEFAULT false,
  allowed_local_dev_modes VARCHAR(64)[] NOT NULL,
  sso_requirement VARCHAR(32) NOT NULL,
  license_posture VARCHAR(255) NOT NULL,
  default_connection VARCHAR(32) NOT NULL DEFAULT 'none',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_tool_definition_family_check CHECK (
    family IN (
      'identity_provider',
      'observability_console',
      'runtime_flags',
      'webhook_delivery',
      'event_backbone',
      'api_gateway',
      'internal_tooling',
      'developer_portal',
      'external_authorization'
    )
  ),
  CONSTRAINT platform_tool_definition_default_state_check CHECK (
    default_state IN (
      'readiness_candidate_disabled',
      'selected_candidate_disabled',
      'existing_infra_classification_disabled',
      'deferred_disabled',
      'deferred_shadow_disabled'
    )
  ),
  CONSTRAINT platform_tool_definition_sso_requirement_check CHECK (
    sso_requirement IN ('required', 'not_applicable')
  ),
  CONSTRAINT platform_tool_definition_default_connection_check CHECK (
    default_connection = 'none'
  )
);

CREATE INDEX IF NOT EXISTS platform_tool_definition_family_sort_idx
  ON public.platform_tool_definition(family, sort_order);

CREATE TABLE IF NOT EXISTS public.platform_tool_connection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  tool_code VARCHAR(128) NOT NULL REFERENCES public.platform_tool_definition(code) ON DELETE RESTRICT,
  environment VARCHAR(32) NOT NULL DEFAULT 'local',
  deployment_mode VARCHAR(64) NOT NULL DEFAULT 'disabled',
  local_dev_mode VARCHAR(64) NOT NULL DEFAULT 'disabled',
  endpoint_url VARCHAR(1024),
  internal_service_url VARCHAR(1024),
  namespace VARCHAR(128),
  service_name VARCHAR(128),
  enabled BOOLEAN NOT NULL DEFAULT false,
  readiness_state VARCHAR(64) NOT NULL DEFAULT 'not_configured',
  sso_readiness_state VARCHAR(32) NOT NULL DEFAULT 'blocked',
  health_status VARCHAR(32) NOT NULL DEFAULT 'unknown',
  last_checked_at TIMESTAMPTZ,
  config_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT platform_tool_connection_environment_check CHECK (
    environment IN ('local', 'shared_dev', 'staging', 'production')
  ),
  CONSTRAINT platform_tool_connection_deployment_mode_check CHECK (
    deployment_mode IN ('disabled', 'stubbed', 'compose_opt_in', 'external_provided')
  ),
  CONSTRAINT platform_tool_connection_local_dev_mode_check CHECK (
    local_dev_mode IN ('disabled', 'stubbed', 'compose_opt_in', 'external_provided')
  ),
  CONSTRAINT platform_tool_connection_readiness_state_check CHECK (
    readiness_state IN (
      'not_configured',
      'disabled',
      'configured',
      'sso_required',
      'ready',
      'degraded',
      'unhealthy',
      'unsafe_url'
    )
  ),
  CONSTRAINT platform_tool_connection_sso_readiness_check CHECK (
    sso_readiness_state IN ('blocked', 'ready', 'not_applicable')
  ),
  CONSTRAINT platform_tool_connection_health_status_check CHECK (
    health_status IN (
      'unknown',
      'not_configured',
      'disabled',
      'healthy',
      'degraded',
      'unhealthy',
      'sso_required',
      'forbidden',
      'stale'
    )
  ),
  UNIQUE (tenant_id, tool_code, environment)
);

CREATE OR REPLACE FUNCTION public.enforce_platform_tool_connection_ac_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.tenant tenant
    WHERE tenant.id = NEW.tenant_id
      AND tenant.tier = 'ac'
  ) THEN
    RAISE EXCEPTION 'platform_tool_connection tenant_id must reference an AC tenant'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS platform_tool_connection_ac_tenant_guard
  ON public.platform_tool_connection;

CREATE TRIGGER platform_tool_connection_ac_tenant_guard
  BEFORE INSERT OR UPDATE OF tenant_id
  ON public.platform_tool_connection
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_platform_tool_connection_ac_tenant();

CREATE INDEX IF NOT EXISTS platform_tool_connection_tenant_tool_idx
  ON public.platform_tool_connection(tenant_id, tool_code);

CREATE INDEX IF NOT EXISTS platform_tool_connection_readiness_idx
  ON public.platform_tool_connection(tool_code, readiness_state);

CREATE TABLE IF NOT EXISTS public.platform_tool_config_value (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.platform_tool_connection(id) ON DELETE CASCADE,
  config_key VARCHAR(128) NOT NULL,
  config_value JSONB,
  is_secret BOOLEAN NOT NULL DEFAULT false,
  secret_ref VARCHAR(255),
  secret_status VARCHAR(64) NOT NULL DEFAULT 'not_set',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  CONSTRAINT platform_tool_config_secret_status_check CHECK (
    secret_status IN ('not_set', 'set', 'external_reference', 'cleared', 'kept')
  ),
  CONSTRAINT platform_tool_config_no_plain_secret_check CHECK (
    is_secret = false OR config_value IS NULL
  ),
  UNIQUE (connection_id, config_key)
);

CREATE INDEX IF NOT EXISTS platform_tool_config_connection_idx
  ON public.platform_tool_config_value(connection_id);

CREATE TABLE IF NOT EXISTS public.platform_tool_health_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.platform_tool_connection(id) ON DELETE CASCADE,
  status VARCHAR(32) NOT NULL,
  latency_ms INTEGER,
  safe_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_by UUID,
  CONSTRAINT platform_tool_health_snapshot_status_check CHECK (
    status IN (
      'unknown',
      'not_configured',
      'disabled',
      'healthy',
      'degraded',
      'unhealthy',
      'sso_required',
      'forbidden',
      'stale'
    )
  )
);

CREATE INDEX IF NOT EXISTS platform_tool_health_snapshot_connection_checked_idx
  ON public.platform_tool_health_snapshot(connection_id, checked_at);

CREATE TABLE IF NOT EXISTS public.platform_tool_audit_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.platform_tool_connection(id) ON DELETE SET NULL,
  tool_code VARCHAR(128) NOT NULL,
  action VARCHAR(64) NOT NULL,
  actor_id UUID,
  before_state JSONB,
  after_state JSONB,
  request_id VARCHAR(128),
  ip_address VARCHAR(64),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_tool_audit_event_tenant_tool_created_idx
  ON public.platform_tool_audit_event(tenant_id, tool_code, created_at);

CREATE INDEX IF NOT EXISTS platform_tool_audit_event_connection_created_idx
  ON public.platform_tool_audit_event(connection_id, created_at);

INSERT INTO public.platform_tool_definition (
  code,
  family,
  display_key,
  label,
  localized_label,
  default_state,
  owner_phase,
  human_ui,
  deep_link,
  allowed_local_dev_modes,
  sso_requirement,
  license_posture,
  default_connection,
  sort_order
)
VALUES
  (
    'keycloak',
    'identity_provider',
    'platformTools.keycloak',
    'Keycloak',
    '{"en":"Keycloak","zh_HANS":"Keycloak","zh_HANT":"Keycloak","ja":"Keycloak","ko":"Keycloak","fr":"Keycloak"}'::jsonb,
    'readiness_candidate_disabled',
    'phase_3_foundation_or_later_owner_approved_iam_migration',
    true,
    true,
    ARRAY['disabled','stubbed','external_provided']::VARCHAR(64)[],
    'required',
    'apache_2_compatible_evidence_required_before_ready',
    'none',
    10
  ),
  (
    'grafana',
    'observability_console',
    'platformTools.grafana',
    'Grafana',
    '{"en":"Grafana","zh_HANS":"Grafana","zh_HANT":"Grafana","ja":"Grafana","ko":"Grafana","fr":"Grafana"}'::jsonb,
    'selected_candidate_disabled',
    'phase_5',
    true,
    true,
    ARRAY['disabled','stubbed','compose_opt_in','external_provided']::VARCHAR(64)[],
    'required',
    'agpl_or_enterprise_edition_posture_required_before_ready',
    'none',
    20
  ),
  (
    'flagsmith',
    'runtime_flags',
    'platformTools.flagsmith',
    'Flagsmith',
    '{"en":"Flagsmith","zh_HANS":"Flagsmith","zh_HANT":"Flagsmith","ja":"Flagsmith","ko":"Flagsmith","fr":"Flagsmith"}'::jsonb,
    'selected_candidate_disabled',
    'phase_6',
    true,
    true,
    ARRAY['disabled','stubbed','external_provided']::VARCHAR(64)[],
    'required',
    'open_core_edition_evidence_required_before_ready',
    'none',
    30
  ),
  (
    'svix',
    'webhook_delivery',
    'platformTools.svix',
    'Svix',
    '{"en":"Svix","zh_HANS":"Svix","zh_HANT":"Svix","ja":"Svix","ko":"Svix","fr":"Svix"}'::jsonb,
    'selected_candidate_disabled',
    'phase_7',
    true,
    true,
    ARRAY['disabled','stubbed','external_provided']::VARCHAR(64)[],
    'required',
    'open_source_or_edition_evidence_required_before_ready',
    'none',
    40
  ),
  (
    'nats-jetstream',
    'event_backbone',
    'platformTools.natsJetstream',
    'NATS JetStream',
    '{"en":"NATS JetStream","zh_HANS":"NATS JetStream","zh_HANT":"NATS JetStream","ja":"NATS JetStream","ko":"NATS JetStream","fr":"NATS JetStream"}'::jsonb,
    'existing_infra_classification_disabled',
    'phase_8',
    false,
    false,
    ARRAY['disabled','compose_opt_in','external_provided']::VARCHAR(64)[],
    'not_applicable',
    'apache_2_evidence_retained',
    'none',
    50
  ),
  (
    'apisix',
    'api_gateway',
    'platformTools.apisix',
    'Apache APISIX',
    '{"en":"Apache APISIX","zh_HANS":"Apache APISIX","zh_HANT":"Apache APISIX","ja":"Apache APISIX","ko":"Apache APISIX","fr":"Apache APISIX"}'::jsonb,
    'selected_candidate_disabled',
    'phase_10',
    true,
    true,
    ARRAY['disabled','stubbed','external_provided']::VARCHAR(64)[],
    'required',
    'apache_2_evidence_required_before_ready',
    'none',
    60
  ),
  (
    'appsmith',
    'internal_tooling',
    'platformTools.appsmith',
    'Appsmith',
    '{"en":"Appsmith","zh_HANS":"Appsmith","zh_HANT":"Appsmith","ja":"Appsmith","ko":"Appsmith","fr":"Appsmith"}'::jsonb,
    'deferred_disabled',
    'later_owner_approved_phase',
    true,
    true,
    ARRAY['disabled','stubbed','external_provided']::VARCHAR(64)[],
    'required',
    'apache_2_or_edition_evidence_required_before_ready',
    'none',
    70
  ),
  (
    'backstage',
    'developer_portal',
    'platformTools.backstage',
    'Backstage',
    '{"en":"Backstage","zh_HANS":"Backstage","zh_HANT":"Backstage","ja":"Backstage","ko":"Backstage","fr":"Backstage"}'::jsonb,
    'deferred_disabled',
    'later_owner_approved_phase',
    true,
    true,
    ARRAY['disabled','stubbed','external_provided']::VARCHAR(64)[],
    'required',
    'apache_2_evidence_required_before_ready',
    'none',
    80
  ),
  (
    'openfga',
    'external_authorization',
    'platformTools.openfga',
    'OpenFGA',
    '{"en":"OpenFGA","zh_HANS":"OpenFGA","zh_HANT":"OpenFGA","ja":"OpenFGA","ko":"OpenFGA","fr":"OpenFGA"}'::jsonb,
    'deferred_shadow_disabled',
    'later_owner_approved_phase',
    false,
    false,
    ARRAY['disabled','stubbed','external_provided']::VARCHAR(64)[],
    'not_applicable',
    'apache_2_evidence_required_before_ready',
    'none',
    90
  ),
  (
    'opa',
    'external_authorization',
    'platformTools.opa',
    'OPA',
    '{"en":"OPA","zh_HANS":"OPA","zh_HANT":"OPA","ja":"OPA","ko":"OPA","fr":"OPA"}'::jsonb,
    'deferred_shadow_disabled',
    'later_owner_approved_phase',
    false,
    false,
    ARRAY['disabled','stubbed','external_provided']::VARCHAR(64)[],
    'not_applicable',
    'apache_2_evidence_required_before_ready',
    'none',
    100
  ),
  (
    'cerbos',
    'external_authorization',
    'platformTools.cerbos',
    'Cerbos',
    '{"en":"Cerbos","zh_HANS":"Cerbos","zh_HANT":"Cerbos","ja":"Cerbos","ko":"Cerbos","fr":"Cerbos"}'::jsonb,
    'deferred_shadow_disabled',
    'later_owner_approved_phase',
    true,
    true,
    ARRAY['disabled','stubbed','external_provided']::VARCHAR(64)[],
    'required',
    'apache_2_or_edition_evidence_required_before_ready',
    'none',
    110
  )
ON CONFLICT (code) DO UPDATE SET
  family = EXCLUDED.family,
  display_key = EXCLUDED.display_key,
  label = EXCLUDED.label,
  localized_label = EXCLUDED.localized_label,
  default_state = EXCLUDED.default_state,
  owner_phase = EXCLUDED.owner_phase,
  human_ui = EXCLUDED.human_ui,
  deep_link = EXCLUDED.deep_link,
  allowed_local_dev_modes = EXCLUDED.allowed_local_dev_modes,
  sso_requirement = EXCLUDED.sso_requirement,
  license_posture = EXCLUDED.license_posture,
  default_connection = EXCLUDED.default_connection,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

INSERT INTO public.platform_external_tool_sso_readiness (
  tool_code,
  status,
  required_by_phase,
  fail_closed,
  evidence
)
SELECT
  definition.code,
  CASE WHEN definition.sso_requirement = 'not_applicable' THEN 'not_applicable' ELSE 'blocked' END,
  definition.owner_phase,
  CASE WHEN definition.sso_requirement = 'not_applicable' THEN false ELSE true END,
  jsonb_build_object(
    'source', 'phase_4_platform_tool_connection_seed',
    'humanUi', definition.human_ui,
    'deepLink', definition.deep_link,
    'defaultConnection', definition.default_connection
  )
FROM public.platform_tool_definition definition
ON CONFLICT (tool_code) DO UPDATE SET
  status = CASE
    WHEN public.platform_external_tool_sso_readiness.status = 'ready' THEN 'ready'
    WHEN EXCLUDED.status = 'not_applicable' THEN 'not_applicable'
    ELSE 'blocked'
  END,
  required_by_phase = EXCLUDED.required_by_phase,
  fail_closed = CASE
    WHEN public.platform_external_tool_sso_readiness.status = 'ready' THEN public.platform_external_tool_sso_readiness.fail_closed
    ELSE EXCLUDED.fail_closed
  END,
  evidence = public.platform_external_tool_sso_readiness.evidence || EXCLUDED.evidence,
  updated_at = now();

DO $$
DECLARE
  target_schema text;
  resource_id uuid;
  policy_id uuid;
  platform_admin_id uuid;
  action_code text;
BEGIN
  FOR target_schema IN
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name = 'tenant_template'
       OR schema_name LIKE 'tenant\_%' ESCAPE '\'
  LOOP
    IF to_regclass(format('%I.resource', target_schema)) IS NULL
       OR to_regclass(format('%I.policy', target_schema)) IS NULL
       OR to_regclass(format('%I.role', target_schema)) IS NULL
       OR to_regclass(format('%I.role_policy', target_schema)) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format(
      'INSERT INTO %I.resource (id, code, name, module, sort_order, is_active, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2::jsonb, $3, $4, true, now(), now())
       ON CONFLICT (code) DO UPDATE SET
         name = EXCLUDED.name,
         module = EXCLUDED.module,
         sort_order = EXCLUDED.sort_order,
         is_active = true,
         updated_at = now()
       RETURNING id',
      target_schema
    )
    USING
      'platform.tool_connection',
      '{"en":"Platform Tool Connections","zh_HANS":"平台工具连接","zh_HANT":"平台工具連線","ja":"プラットフォームツール接続","ko":"플랫폼 도구 연결","fr":"Connexions aux outils plateforme"}',
      'platform',
      15
    INTO resource_id;

    FOREACH action_code IN ARRAY ARRAY['read','write','execute','admin']
    LOOP
      EXECUTE format(
        'INSERT INTO %I.policy (id, resource_id, action, description, is_active, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, true, now(), now())
         ON CONFLICT (resource_id, action) DO UPDATE SET
           description = EXCLUDED.description,
           is_active = true,
           updated_at = now()
         RETURNING id',
        target_schema
      )
      USING
        resource_id,
        action_code,
        'Phase 4 AC-only platform tool connection framework'
      INTO policy_id;

      EXECUTE format('SELECT id FROM %I.role WHERE code = $1', target_schema)
      USING 'PLATFORM_ADMIN'
      INTO platform_admin_id;

      IF platform_admin_id IS NOT NULL THEN
        EXECUTE format(
          'INSERT INTO %I.role_policy (id, role_id, policy_id, effect, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, now())
           ON CONFLICT (role_id, policy_id) DO UPDATE SET effect = EXCLUDED.effect',
          target_schema
        )
        USING platform_admin_id, policy_id, 'grant';
      END IF;
    END LOOP;
  END LOOP;
END $$;
