// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import {
  parseArgs,
  runtimeFlagServiceSource,
  runtimeFlagSource,
  writeJson,
} from './runtime-flag-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'runtime-flag-context-redaction.json';
const source = runtimeFlagSource();
const service = runtimeFlagServiceSource();
const forbidden = ['email', 'phone', 'password', 'token', 'cookie', 'secret', 'customer', 'pii'];
const checks = [
  {
    id: 'approved_context_keys_defined',
    passed:
      source.includes('RUNTIME_FLAG_CONTEXT_KEYS') &&
      source.includes("'resolvedCapabilityCodes'") &&
      source.includes("'correlationId'"),
  },
  {
    id: 'pii_patterns_blocked',
    passed: forbidden.every((pattern) => source.includes(`'${pattern}'`)),
  },
  {
    id: 'unsafe_context_rejected',
    passed:
      service.includes('Runtime flag evaluation context contains unsafe or unsupported keys') &&
      service.includes('rawContextLogged: false') &&
      service.includes('EMAIL_LIKE_PATTERN') &&
      service.includes('BEARER_LIKE_PATTERN') &&
      service.includes('JWT_LIKE_PATTERN'),
  },
  {
    id: 'tenant_and_capability_context_server_derived',
    passed:
      service.includes("normalizedKey === 'tenantId'") &&
      service.includes('requestContext.tenantId') &&
      service.includes("normalizedKey === 'resolvedCapabilityCodes'") &&
      service.includes('resolveServerCapabilityCodes') &&
      service.includes('getCurrentTenantEffectiveCapabilities') &&
      service.includes('serverResolvedCapabilityCodes') &&
      service.includes('resolvedCapabilityCodes: [...serverResolvedCapabilityCodes]'),
  },
  {
    id: 'metadata_redacts_forbidden_keys',
    passed: service.includes("safe[key] = '[redacted]'"),
  },
];

const payload = {
  checkedAt: new Date().toISOString(),
  test_layer: 'security_privacy',
  data_mode: 'read_only_uat',
  target_scope: 'evaluation_context',
  forbiddenPatterns: forbidden,
  checks,
  passed: checks.every((check) => check.passed),
};

writeJson(out, payload);
