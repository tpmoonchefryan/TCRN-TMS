// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { parseArgs, readProductText, writeJson } from './observability-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'observability-query-safety.json';
const policy = readProductText('apps/api/src/modules/log/domain/loki-query.policy.ts');
const gateway = readProductText('apps/api/src/modules/log/infrastructure/loki-query.gateway.ts');
const application = readProductText('apps/api/src/modules/log/application/loki-query.service.ts');
const controller = readProductText('apps/api/src/modules/log/controllers/log-search.controller.ts');

const checks = [
  {
    id: 'safe_stream_allowlist',
    passed:
      policy.includes("['change_log', 'technical_event_log', 'integration_log']") &&
      policy.includes('normalizeLogSearchStream'),
  },
  {
    id: 'bounded_result_limit',
    passed: policy.includes('LOKI_MAX_RESULT_LIMIT') && policy.includes('Math.min'),
  },
  {
    id: 'bounded_relative_ranges',
    passed:
      ['15m', '1h', '6h', '24h'].every((range) => policy.includes(range)) &&
      policy.includes('LOKI_MAX_QUERY_RANGE_MS') &&
      application.includes('normalizeLokiQueryRange'),
  },
  {
    id: 'ordinary_raw_logql_denied',
    passed:
      policy.includes('isRawLogQuerySyntax') &&
      controller.includes('Raw LogQL queries are not available through product log search'),
  },
  {
    id: 'tenant_scoped_safe_log_search',
    passed:
      policy.includes("buildLabelMatcher('tenant_schema'") &&
      policy.includes('normalizeTenantSchemaLabel') &&
      controller.includes('resolveTenantSchema') &&
      controller.includes('Tenant-scoped log search requires a valid tenant context'),
  },
  {
    id: 'loki_push_exports_tenant_label_when_available',
    passed:
      readProductText('apps/api/src/modules/log/services/loki-push.service.ts').includes(
        'tenant_schema'
      ) &&
      readProductText('apps/api/src/modules/log/services/loki-push.service.ts').includes(
        'tenantScopeLabel'
      ),
  },
  {
    id: 'untrusted_raw_query_not_executed',
    passed:
      policy.includes('trustedRawQuery?: true') &&
      application.includes('params.rawQuery && params.trustedRawQuery'),
  },
  {
    id: 'loki_disabled_returns_empty_safe_results',
    passed:
      gateway.includes("LOKI_ENABLED', 'false'") &&
      application.includes('!this.lokiQueryGateway.isEnabled()') &&
      application.includes('return { entries: [] }'),
  },
  {
    id: 'ordinary_controller_uses_tcrn_service_not_raw_external_console',
    passed:
      controller.includes('LokiQueryService') &&
      !controller.includes('Grafana') &&
      !controller.includes('Prometheus'),
  },
];

writeJson(out, {
  checkedAt: new Date().toISOString(),
  test_layer: 'source_readback',
  data_mode: 'source_scan',
  target_scope: 'loki_query',
  checks,
  passed: checks.every((check) => check.passed),
});
