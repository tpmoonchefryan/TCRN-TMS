-- Phase 6: Runtime Feature Flag Adapter kill-switch audit-safe storage.

CREATE TABLE IF NOT EXISTS public.runtime_flag_kill_switch (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  flag_code VARCHAR(160) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  affected_behavior VARCHAR(255) NOT NULL,
  reason TEXT NOT NULL,
  rollback_instruction TEXT NOT NULL,
  source VARCHAR(64) NOT NULL DEFAULT 'ac_runtime_flags',
  expires_at TIMESTAMPTZ NOT NULL,
  activated_by UUID,
  deactivated_by UUID,
  deactivated_at TIMESTAMPTZ,
  audit_metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT runtime_flag_kill_switch_status_check CHECK (
    status IN ('active', 'deactivated', 'expired')
  ),
  CONSTRAINT runtime_flag_kill_switch_code_check CHECK (
    flag_code ~ '^[a-z0-9][a-z0-9_.:-]{1,159}$'
  ),
  CONSTRAINT runtime_flag_kill_switch_text_check CHECK (
    btrim(affected_behavior) <> ''
    AND btrim(reason) <> ''
    AND btrim(rollback_instruction) <> ''
  ),
  CONSTRAINT runtime_flag_kill_switch_expiry_check CHECK (
    expires_at > created_at
  )
);

CREATE INDEX IF NOT EXISTS runtime_flag_kill_switch_tenant_status_idx
  ON public.runtime_flag_kill_switch(tenant_id, status, expires_at);

CREATE INDEX IF NOT EXISTS runtime_flag_kill_switch_flag_status_idx
  ON public.runtime_flag_kill_switch(flag_code, status, expires_at);

DROP TRIGGER IF EXISTS runtime_flag_kill_switch_ac_tenant_guard
  ON public.runtime_flag_kill_switch;

CREATE TRIGGER runtime_flag_kill_switch_ac_tenant_guard
  BEFORE INSERT OR UPDATE
  ON public.runtime_flag_kill_switch
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_platform_tool_connection_ac_tenant();
