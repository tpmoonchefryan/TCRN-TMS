// SPDX-License-Identifier: Apache-2.0
import { WEBHOOK_DELIVERY_ADAPTER_CATALOG } from '@tcrn/shared';

import { parseArgs, sourceSignals, writeJson } from './webhook-delivery-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'webhook-delivery-provider-readiness.json';
const signals = sourceSignals();
const svix = WEBHOOK_DELIVERY_ADAPTER_CATALOG.find((entry) => entry.code === 'svix_delivery_provider');
const localDispatcher = WEBHOOK_DELIVERY_ADAPTER_CATALOG.find(
  (entry) => entry.code === 'tcrn_local_webhook_dispatcher'
);
const platformToolLinked =
  signals.platformTools.includes("code: 'svix'") &&
  signals.platformTools.includes("family: 'webhook_delivery'");
const checks = [
  {
    id: 'svix_readiness_only_default_disabled',
    passed:
      svix?.defaultState === 'disabled_readiness_only' &&
      svix?.phase4Family === 'webhook_delivery' &&
      svix?.ssoRequired === true,
  },
  {
    id: 'local_dispatcher_default_disabled',
    passed: localDispatcher?.defaultState === 'disabled_readiness_only',
  },
  {
    id: 'phase4_platform_tool_linked',
    passed: platformToolLinked,
  },
  {
    id: 'ordinary_tenant_no_provider_console',
    passed:
      !signals.controller.includes('provider-profile') &&
      !signals.controller.includes('provider console') &&
      signals.service.includes('No outbound HTTP unless') === false,
  },
];

writeJson(out, {
  checkedAt: new Date().toISOString(),
  test_layer: 'manual_readback',
  data_mode: 'read_only_uat',
  target_scope: 'provider_profile',
  svix,
  localDispatcher,
  platformToolLinked,
  checks,
  passed: checks.every((check) => check.passed),
});
