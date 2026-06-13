// SPDX-License-Identifier: Apache-2.0
import { observabilitySource, parseArgs, readProductText, writeJson } from './observability-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'observability-redaction-results.json';
const shared = observabilitySource();
const pushService = readProductText('apps/api/src/modules/log/services/loki-push.service.ts');
const swaggerSchemas = readProductText('apps/api/src/modules/log/controllers/log-swagger.schemas.ts');
const forbiddenTerms = ['authorization', 'cookie', 'password', 'secret', 'token'];

const checks = [
  {
    id: 'signal_policy_has_forbidden_attribute_patterns',
    passed: forbiddenTerms.every((term) => shared.toLowerCase().includes(term)),
  },
  {
    id: 'loki_push_masks_sensitive_material',
    passed:
      pushService.includes('redact') ||
      ['authorization', 'cookie', 'password', 'secret', 'token'].every((term) =>
        pushService.toLowerCase().includes(term)
      ),
  },
  {
    id: 'swagger_examples_do_not_include_raw_secret_values',
    passed: !/(secretValue|clientSecret|access_token|refresh_token|password":\s*"[^"*])/i.test(swaggerSchemas),
  },
];

writeJson(out, {
  checkedAt: new Date().toISOString(),
  test_layer: 'source_readback',
  data_mode: 'security_privacy',
  target_scope: 'redaction_policy',
  checks,
  passed: checks.every((check) => check.passed),
});
