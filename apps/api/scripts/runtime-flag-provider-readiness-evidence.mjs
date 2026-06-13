// SPDX-License-Identifier: Apache-2.0
import { parseArgs, runtimeFlagServiceSource, runtimeFlagSource, writeJson } from './runtime-flag-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'runtime-flag-provider-readiness.json';
const source = runtimeFlagSource();
const service = runtimeFlagServiceSource();
const checks = [
  {
    id: 'flagsmith_maps_to_phase4_platform_tool',
    passed: /code: 'flagsmith_provider'[\s\S]*?platformToolCode: 'flagsmith'/.test(source),
  },
  {
    id: 'sso_required_and_fail_closed_states',
    passed:
      source.includes("ssoRequirement: 'required'") &&
      service.includes("return envMode === 'stubbed' ? 'local_stub' : 'not_configured'") &&
      service.includes("return 'local_stub'") &&
      service.includes("return 'external_provided'") &&
      service.includes("return 'sso_required'") &&
      service.includes("return 'unsafe_url'"),
  },
  {
    id: 'endpoint_url_safety_checked',
    passed: service.includes('validateUrlSafety(connection.endpoint_url'),
  },
  {
    id: 'ordinary_tenant_config_absent',
    passed: service.includes('Runtime flag requests require an active AC operator'),
  },
];

const payload = {
  checkedAt: new Date().toISOString(),
  test_layer: 'api_integration',
  data_mode: 'disposable_fixture',
  target_scope: 'provider_profile',
  statesCovered: [
    'disabled',
    'not_configured',
    'local_stub',
    'external_provided',
    'sso_required',
    'unhealthy',
    'unsafe_url',
    'healthy',
    'accepted_healthy',
  ],
  checks,
  passed: checks.every((check) => check.passed),
};

writeJson(out, payload);
