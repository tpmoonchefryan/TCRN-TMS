// SPDX-License-Identifier: Apache-2.0
import { WEBHOOK_DELIVERY_ADAPTER_CATALOG } from '@tcrn/shared';

import {
  EXPECTED_WEBHOOK_DELIVERY_ADAPTER_CODES,
  parseArgs,
  sourceSignals,
  writeJson,
} from './webhook-delivery-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'webhook-delivery-rollout-readback.json';
const mode = options.mode ?? 'readback';
const signals = sourceSignals();
const adapterCodes = WEBHOOK_DELIVERY_ADAPTER_CATALOG.map((entry) => entry.code);
const missingAdapterCodes = EXPECTED_WEBHOOK_DELIVERY_ADAPTER_CODES.filter(
  (code) => !adapterCodes.includes(code)
);
const unexpectedAdapterCodes = adapterCodes.filter(
  (code) => !EXPECTED_WEBHOOK_DELIVERY_ADAPTER_CODES.includes(code)
);
const duplicateAdapterCodes = adapterCodes.filter((code, index) => adapterCodes.indexOf(code) !== index);

const checks = [
  {
    id: 'adapter_catalog_exact',
    passed:
      missingAdapterCodes.length === 0 &&
      unexpectedAdapterCodes.length === 0 &&
      duplicateAdapterCodes.length === 0,
  },
  {
    id: 'delivery_routes_present',
    passed:
      signals.controller.includes("delivery-attempts'") &&
      signals.controller.includes("test-delivery'") &&
      signals.controller.includes("delivery-attempts/:attemptId/replay'"),
  },
  {
    id: 'subscription_authority_stays_tcrn',
    passed:
      signals.service.includes('Webhook is not subscribed to event') &&
      signals.service.includes('getTcrnWebhookEventOrThrow') &&
      signals.writeService.includes('Webhook definition') &&
      signals.writeService.includes('controls code, name, and event fields'),
  },
  {
    id: 'default_external_provider_disabled',
    passed: WEBHOOK_DELIVERY_ADAPTER_CATALOG.every((entry) =>
      entry.kind === 'external_provider' || entry.kind === 'stream_readiness'
        ? entry.defaultState === 'disabled_readiness_only'
        : true
    ),
  },
];

const payload = {
  checkedAt: new Date().toISOString(),
  test_layer: mode === 'seed-idempotence' ? 'manual_readback' : 'api_integration',
  data_mode: 'read_only_uat',
  target_scope: 'provider_profile',
  mode,
  adapterCodes,
  missingAdapterCodes,
  unexpectedAdapterCodes,
  duplicateAdapterCodes,
  checks,
};

payload.passed = checks.every((check) => check.passed);

writeJson(out, payload);
