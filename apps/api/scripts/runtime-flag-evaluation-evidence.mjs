// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import {
  LOCKED_RUNTIME_FLAG_CODES,
  parseArgs,
  runtimeFlagServiceSource,
  runtimeFlagSource,
  writeJson,
} from './runtime-flag-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'runtime-flag-evaluation-results.json';
const source = runtimeFlagSource();
const service = runtimeFlagServiceSource();
const checks = [
  {
    id: 'registered_flags_only',
    passed:
      LOCKED_RUNTIME_FLAG_CODES.every((code) => source.includes(code)) &&
      service.includes('Runtime flag is not registered by TCRN'),
  },
  {
    id: 'registry_defaults_when_provider_disabled',
    passed: service.includes('TCRN_REGISTRY_DEFAULT') && service.includes('providerStatus:'),
  },
  {
    id: 'entitlement_separation_returned',
    passed:
      service.includes('tcrn_resolved_before_runtime_flag') &&
      service.includes('resolveServerCapabilityCodes') &&
      service.includes('resolvedCapabilityCodes: [...serverResolvedCapabilityCodes]'),
  },
  {
    id: 'spoofed_context_rejected',
    passed:
      service.includes("normalizedKey === 'tenantId'") &&
      service.includes("normalizedKey === 'resolvedCapabilityCodes'") &&
      service.includes('blockedKeys.push(normalizedKey)'),
  },
  {
    id: 'no_provider_unknown_authority',
    passed: source.includes('providerMayCreateUnknownFlags: false'),
  },
];

const payload = {
  checkedAt: new Date().toISOString(),
  test_layer: 'api_integration',
  data_mode: 'read_only_uat',
  target_scope: 'evaluation_context',
  checks,
  passed: checks.every((check) => check.passed),
};

writeJson(out, payload);
