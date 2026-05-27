-- Phase 3: Identity and SSO foundation.
-- Provider metadata is public-schema authority; account links remain tenant-local.
-- Transient login state and exchange codes are stored in Redis by the API service.

CREATE TABLE IF NOT EXISTS public.tms_sso_provider (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  code VARCHAR(64) NOT NULL,
  display_name JSONB NOT NULL,
  provider_type VARCHAR(32) NOT NULL,
  owner_scope VARCHAR(32) NOT NULL,
  issuer_url VARCHAR(512),
  authorization_url VARCHAR(512),
  token_url VARCHAR(512),
  userinfo_url VARCHAR(512),
  jwks_url VARCHAR(512),
  client_id VARCHAR(255),
  client_secret_ref VARCHAR(255),
  redirect_uri VARCHAR(512),
  scopes VARCHAR(64)[] NOT NULL DEFAULT ARRAY['openid', 'profile', 'email']::VARCHAR(64)[],
  claim_mapping_policy JSONB NOT NULL DEFAULT '{"subject":"sub","email":"email","displayName":"name","emailVerified":"email_verified"}'::jsonb,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT tms_sso_provider_type_check CHECK (provider_type IN ('oidc', 'mock')),
  CONSTRAINT tms_sso_provider_owner_scope_check CHECK (
    owner_scope IN ('tenant_product', 'ac_platform', 'external_tool_readiness')
  ),
  CONSTRAINT tms_sso_provider_secret_ref_check CHECK (
    client_secret_ref IS NULL OR client_secret_ref ~ '^env:[A-Z0-9_]+$'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS tms_sso_provider_tenant_code_unique
  ON public.tms_sso_provider(tenant_id, code);

CREATE INDEX IF NOT EXISTS tms_sso_provider_tenant_enabled_idx
  ON public.tms_sso_provider(tenant_id, owner_scope, is_enabled);

CREATE INDEX IF NOT EXISTS tms_sso_provider_owner_code_idx
  ON public.tms_sso_provider(owner_scope, code);

CREATE TABLE IF NOT EXISTS public.platform_external_tool_sso_readiness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_code VARCHAR(128) NOT NULL UNIQUE,
  status VARCHAR(32) NOT NULL DEFAULT 'blocked',
  required_by_phase VARCHAR(64),
  provider_id UUID REFERENCES public.tms_sso_provider(id) ON DELETE SET NULL,
  fail_closed BOOLEAN NOT NULL DEFAULT true,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  CONSTRAINT platform_external_tool_sso_readiness_status_check CHECK (
    status IN ('blocked', 'ready', 'not_applicable')
  )
);

CREATE INDEX IF NOT EXISTS platform_external_tool_sso_readiness_status_idx
  ON public.platform_external_tool_sso_readiness(status, fail_closed);

CREATE TABLE IF NOT EXISTS tenant_template.tms_sso_account_link (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES tenant_template.system_user(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL,
  provider_code VARCHAR(64) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  display_name VARCHAR(255),
  claims_hash CHAR(64),
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID,
  created_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS tms_sso_account_link_user_revoked_idx
  ON tenant_template.tms_sso_account_link(user_id, revoked_at);

CREATE INDEX IF NOT EXISTS tms_sso_account_link_provider_subject_idx
  ON tenant_template.tms_sso_account_link(provider_id, subject);

CREATE INDEX IF NOT EXISTS tms_sso_account_link_provider_code_idx
  ON tenant_template.tms_sso_account_link(provider_code);

CREATE UNIQUE INDEX IF NOT EXISTS tms_sso_account_link_active_subject_unique
  ON tenant_template.tms_sso_account_link(provider_id, subject)
  WHERE revoked_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tms_sso_account_link_active_user_provider_unique
  ON tenant_template.tms_sso_account_link(user_id, provider_id)
  WHERE revoked_at IS NULL;

DO $$
DECLARE
  tenant_schema text;
BEGIN
  FOR tenant_schema IN
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name LIKE 'tenant\_%' ESCAPE '\'
      AND schema_name <> 'tenant_template'
  LOOP
    IF to_regclass(format('%I.system_user', tenant_schema)) IS NOT NULL THEN
      EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I.tms_sso_account_link (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES %I.system_user(id) ON DELETE CASCADE,
          provider_id UUID NOT NULL,
          provider_code VARCHAR(64) NOT NULL,
          subject VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          display_name VARCHAR(255),
          claims_hash CHAR(64),
          linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          last_login_at TIMESTAMPTZ,
          revoked_at TIMESTAMPTZ,
          revoked_by UUID,
          created_by UUID,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          version INTEGER NOT NULL DEFAULT 1
        )',
        tenant_schema,
        tenant_schema
      );

      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS tms_sso_account_link_user_revoked_idx ON %I.tms_sso_account_link(user_id, revoked_at)',
        tenant_schema
      );
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS tms_sso_account_link_provider_subject_idx ON %I.tms_sso_account_link(provider_id, subject)',
        tenant_schema
      );
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS tms_sso_account_link_provider_code_idx ON %I.tms_sso_account_link(provider_code)',
        tenant_schema
      );
      EXECUTE format(
        'CREATE UNIQUE INDEX IF NOT EXISTS tms_sso_account_link_active_subject_unique ON %I.tms_sso_account_link(provider_id, subject) WHERE revoked_at IS NULL',
        tenant_schema
      );
      EXECUTE format(
        'CREATE UNIQUE INDEX IF NOT EXISTS tms_sso_account_link_active_user_provider_unique ON %I.tms_sso_account_link(user_id, provider_id) WHERE revoked_at IS NULL',
        tenant_schema
      );
    END IF;
  END LOOP;
END $$;
