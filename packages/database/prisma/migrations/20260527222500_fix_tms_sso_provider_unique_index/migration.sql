-- Phase 3 SSO provider upsert requires a full unique constraint on tenant_id/code.
-- The provider table stores tenant_id as NOT NULL, so the previous partial unique index
-- is equivalent for reads but cannot be targeted by ON CONFLICT (tenant_id, code).

DROP INDEX IF EXISTS public.tms_sso_provider_tenant_code_unique;

CREATE UNIQUE INDEX IF NOT EXISTS tms_sso_provider_tenant_code_unique
  ON public.tms_sso_provider(tenant_id, code);
