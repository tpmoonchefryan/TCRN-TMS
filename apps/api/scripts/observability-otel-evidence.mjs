// SPDX-License-Identifier: Apache-2.0
import { parseArgs, readProductText, writeJson } from './observability-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'observability-otel-readiness.json';
const source = readProductText('apps/api/src/telemetry/init.ts');

const checks = [
  {
    id: 'otel_disabled_by_default_gate',
    passed: source.includes("process.env.OTEL_ENABLED === 'true'") && source.includes('OpenTelemetry disabled'),
  },
  {
    id: 'trace_endpoint_required',
    passed: source.includes('OTEL_EXPORTER_OTLP_ENDPOINT') && source.includes('OpenTelemetry enabled but OTEL_EXPORTER_OTLP_ENDPOINT not set'),
  },
  {
    id: 'metrics_endpoint_independent',
    passed:
      source.includes('OTEL_EXPORTER_OTLP_METRICS_ENDPOINT') &&
      source.includes('telemetryConfig.metricsEndpoint') &&
      source.includes('OpenTelemetry metrics exporter disabled'),
  },
  {
    id: 'metrics_not_inferred_from_trace_endpoint',
    passed: !/metricsEndpoint:\s*env\.OTEL_EXPORTER_OTLP_ENDPOINT/.test(source),
  },
];

writeJson(out, {
  checkedAt: new Date().toISOString(),
  test_layer: 'source_readback',
  data_mode: 'source_scan',
  target_scope: 'otel_readiness',
  checks,
  passed: checks.every((check) => check.passed),
});
