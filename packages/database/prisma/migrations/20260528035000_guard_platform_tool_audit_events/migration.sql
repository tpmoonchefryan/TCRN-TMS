-- Guard platform tool audit events to AC tenants only.
-- The trigger function was introduced by 20260528022000_add_platform_tool_connections.

DROP TRIGGER IF EXISTS platform_tool_audit_event_ac_guard ON public.platform_tool_audit_event;

CREATE TRIGGER platform_tool_audit_event_ac_guard
  BEFORE INSERT OR UPDATE ON public.platform_tool_audit_event
  FOR EACH ROW EXECUTE FUNCTION public.enforce_platform_tool_connection_ac_tenant();
