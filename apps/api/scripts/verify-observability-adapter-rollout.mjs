// SPDX-License-Identifier: Apache-2.0
import {
  LOCKED_OBSERVABILITY_ADAPTER_CODES,
  exactLockedCatalog,
  observabilityCodes,
  observabilitySource,
  parseArgs,
  writeJson,
} from './observability-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'observability-adapter-rollout-readback.json';
const source = observabilitySource();
const codes = observabilityCodes();
const defaultEnabledFalseCount = (source.match(/defaultEnabled: false/g) ?? []).length;
const defaultEnabledFalseDefinitionCount = Math.max(0, defaultEnabledFalseCount - 1);

const payload = {
  checkedAt: new Date().toISOString(),
  test_layer: 'source_readback',
  data_mode: 'source_scan',
  target_scope: 'observability_adapter',
  expectedCodes: LOCKED_OBSERVABILITY_ADAPTER_CODES,
  actualCodes: codes,
  missingCodes: LOCKED_OBSERVABILITY_ADAPTER_CODES.filter((code) => !codes.includes(code)),
  extraCodes: codes.filter((code) => !LOCKED_OBSERVABILITY_ADAPTER_CODES.includes(code)),
  exactOrder: exactLockedCatalog(codes),
  jaegerTraceUiActive: source.includes("'jaeger_trace_ui'") || source.includes('"jaeger_trace_ui"'),
  defaultEnabledFalseCount,
  defaultEnabledFalseDefinitionCount,
  grafanaMappedToPhase4Tool: source.includes("platformToolCode: 'grafana'"),
  rawQueryOrdinaryDenied: source.includes('rawQueryAllowedForOrdinaryTenants: false'),
};

payload.passed =
  payload.exactOrder &&
  payload.missingCodes.length === 0 &&
  payload.extraCodes.length === 0 &&
  !payload.jaegerTraceUiActive &&
  payload.defaultEnabledFalseDefinitionCount === LOCKED_OBSERVABILITY_ADAPTER_CODES.length &&
  payload.grafanaMappedToPhase4Tool &&
  payload.rawQueryOrdinaryDenied;

writeJson(out, payload);
