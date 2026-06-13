// SPDX-License-Identifier: Apache-2.0
import {
  observabilityCodes,
  parseArgs,
  readProductText,
  runGit,
  writeJson,
} from './observability-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'observability-inventory-baseline.json';
const composeText = readProductText('docker-compose.yml');
const k8sEnvText = readProductText('infra/k8s/runtime.env.example');
const telemetryText = readProductText('apps/api/src/telemetry/init.ts');

const payload = {
  checkedAt: new Date().toISOString(),
  test_layer: 'source_scan',
  data_mode: 'source_scan',
  target_scope: 'observability_adapter',
  git: {
    branch: runGit(['status', '--short', '--branch']).split('\n')[0],
    head: runGit(['rev-parse', 'HEAD']),
    dirtyEntries: runGit(['status', '--short']).split('\n').filter(Boolean),
  },
  currentSignals: {
    adapterCodes: observabilityCodes(),
    telemetryOptInGate: telemetryText.includes("process.env.OTEL_ENABLED === 'true'"),
    traceEndpointKey: telemetryText.includes('OTEL_EXPORTER_OTLP_ENDPOINT'),
    metricsEndpointKey: telemetryText.includes('OTEL_EXPORTER_OTLP_METRICS_ENDPOINT'),
    composeObservabilityProfile: composeText.includes('profiles:') && composeText.includes('- observability'),
    composeLocalOptInServices: ['loki', 'tempo'].filter((service) =>
      composeText.includes(`container_name: tcrn-${service}`)
    ),
    k8sObservabilityKeys: [
      'LOKI_ENABLED',
      'LOKI_PUSH_URL',
      'OTEL_ENABLED',
      'OTEL_EXPORTER_OTLP_ENDPOINT',
      'OTEL_EXPORTER_OTLP_METRICS_ENDPOINT',
    ].filter((key) => k8sEnvText.includes(`${key}=`)),
  },
};

payload.passed =
  payload.currentSignals.adapterCodes.length === 7 &&
  payload.currentSignals.telemetryOptInGate &&
  payload.currentSignals.traceEndpointKey &&
  payload.currentSignals.metricsEndpointKey &&
  payload.currentSignals.composeObservabilityProfile &&
  payload.currentSignals.composeLocalOptInServices.length === 2 &&
  payload.currentSignals.k8sObservabilityKeys.length === 5;

writeJson(out, payload);
