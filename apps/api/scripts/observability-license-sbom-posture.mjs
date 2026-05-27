// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { parseArgs, writeJson } from './observability-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'observability-license-sbom-posture.json';
const candidates = [
  { code: 'otel_trace_exporter', project: 'OpenTelemetry', license: 'Apache-2.0', phase5State: 'disabled_readiness' },
  { code: 'otel_metrics_exporter', project: 'OpenTelemetry', license: 'Apache-2.0', phase5State: 'disabled_readiness' },
  { code: 'prometheus_metrics_backend', project: 'Prometheus', license: 'Apache-2.0', phase5State: 'disabled_readiness' },
  { code: 'prometheus_alert_rules', project: 'Prometheus', license: 'Apache-2.0', phase5State: 'repository_readback_only' },
  { code: 'loki_log_backend', project: 'Grafana Loki', license: 'AGPL-3.0-or-enterprise-edition-review-required', phase5State: 'compose_opt_in_readiness' },
  { code: 'tempo_trace_backend', project: 'Grafana Tempo', license: 'AGPL-3.0-or-enterprise-edition-review-required', phase5State: 'compose_opt_in_readiness' },
  { code: 'grafana_console', project: 'Grafana', license: 'AGPL-3.0-or-enterprise-edition-review-required', phase5State: 'platform_tool_connection_disabled_until_sso_ready' },
  { code: 'jaeger_trace_ui', project: 'Jaeger', license: 'Apache-2.0', phase5State: 'deferred_not_seeded' },
];

writeJson(out, {
  checkedAt: new Date().toISOString(),
  test_layer: 'source_scan',
  data_mode: 'source_scan',
  target_scope: 'license_sbom',
  candidates,
  readinessGate:
    'No candidate may move to ready without license/edition/SBOM readback and accepted deployment boundary evidence.',
  passed: candidates.every((candidate) => candidate.phase5State !== 'ready'),
});
