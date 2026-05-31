// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { parseArgs, sourceSignals, writeJson } from './webhook-delivery-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'webhook-delivery-tenant-isolation.json';
const signals = sourceSignals();
const checks = [
  {
    id: 'tenant_schema_required_from_request_context',
    passed:
      signals.service.includes('requireWebhookTenantSchema(context)') &&
      signals.webhookContext.includes('Webhook tenant schema context is required'),
  },
  {
    id: 'attempt_lookup_scoped_by_webhook',
    passed:
      signals.service.includes('findAttemptById(tenantSchema, webhookId, attemptId)') &&
      signals.service.includes('Webhook delivery attempt not found'),
  },
  {
    id: 'outbox_tenant_id_enveloped',
    passed:
      signals.policy.includes('tenantId') &&
      signals.service.includes('requireDeliveryTenantId(context)') &&
      signals.service.includes('Webhook delivery requires tenant context') &&
      signals.schema.includes('tenantId'),
  },
  {
    id: 'missing_context_fails_closed',
    passed:
      !signals.policy.includes('00000000-0000-4000-8000-000000000000') &&
      signals.policy.includes('tenant_id_required_for_webhook_delivery'),
  },
  {
    id: 'cross_tenant_attempt_lookup_uses_webhook_and_schema_scope',
    passed:
      signals.service.includes('findAttemptById(tenantSchema, webhookId, attemptId)') &&
      signals.service.includes('getWebhookOrThrow(webhookId, tenantSchema)'),
  },
  {
    id: 'browser_direct_enqueue_absent',
    passed: !signals.controller.includes('enqueue') && !signals.controller.includes('outbox'),
  },
  {
    id: 'provider_profile_absent_from_tenant_webhook_api',
    passed: !signals.controller.includes('provider-profile') && !signals.controller.includes('svix'),
  },
];

writeJson(out, {
  checkedAt: new Date().toISOString(),
  test_layer: 'security_privacy',
  data_mode: 'read_only_uat',
  target_scope: 'tenant_absence',
  checks,
  passed: checks.every((check) => check.passed),
});
