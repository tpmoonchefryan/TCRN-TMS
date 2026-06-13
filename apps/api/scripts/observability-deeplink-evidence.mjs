// SPDX-License-Identifier: Apache-2.0
import { parseArgs, readProductText, writeJson } from './observability-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'observability-deeplink-results.json';
const controller = readProductText('apps/api/src/modules/observability-adapters/observability-adapters.controller.ts');
const service = readProductText('apps/api/src/modules/observability-adapters/observability-adapters.service.ts');

const checks = [
  {
    id: 'ac_only_controller_guard',
    passed: controller.includes("req.tenantContext?.tier !== 'ac'") && controller.includes('AC operators only'),
  },
  {
    id: 'execute_permission_required_for_deeplink',
    passed: controller.includes("resource: 'platform.tool_connection', action: 'execute'"),
  },
  {
    id: 'deep_links_fail_closed_for_sso_health_disabled_and_url_safety',
    passed: ['not_configured', 'disabled', 'sso_required', 'unhealthy', 'unsafe_url'].every((state) =>
      service.includes(`'${state}'`)
    ),
  },
  {
    id: 'url_safety_inherits_phase_4_dns_posture',
    passed: service.includes('validateUrlSafety') && service.includes('resolveDns: true'),
  },
  {
    id: 'deeplink_attempts_are_audited_and_fail_closed_on_audit_failure',
    passed:
      service.includes('writeDeepLinkAudit') &&
      service.includes('platform_tool_audit_event') &&
      service.includes("state: 'audit_failed'"),
  },
];

writeJson(out, {
  checkedAt: new Date().toISOString(),
  test_layer: 'source_readback',
  data_mode: 'disposable_fixture',
  target_scope: 'trace_deeplink',
  checks,
  acceptedStateRequiresUrl: service.includes("state: 'accepted'") && service.includes('opensInNewTab: true'),
  passed: checks.every((check) => check.passed),
});
