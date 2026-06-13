// SPDX-License-Identifier: Apache-2.0
import { WEBHOOK_EVENT_CATALOG } from '@tcrn/shared';

import {
  EXPECTED_WEBHOOK_EVENT_CODES,
  parseArgs,
  sourceSignals,
  writeJson,
} from './webhook-delivery-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'webhook-event-catalog-readback.json';
const signals = sourceSignals();
const codes = WEBHOOK_EVENT_CATALOG.map((entry) => entry.eventCode);
const duplicateCodes = codes.filter((code, index) => codes.indexOf(code) !== index);
const missingCodes = EXPECTED_WEBHOOK_EVENT_CODES.filter((code) => !codes.includes(code));
const unexpectedCodes = codes.filter((code) => !EXPECTED_WEBHOOK_EVENT_CODES.includes(code));
const metadataFailures = WEBHOOK_EVENT_CATALOG.filter(
  (entry) =>
    !entry.payloadVersion ||
    !entry.producer ||
    !entry.schemaRef ||
    !entry.redactionPolicy ||
    !['none', 'reference', 'limited_pii'].includes(entry.piiClass) ||
    entry.subscriptionEligible !== true
);

const payload = {
  checkedAt: new Date().toISOString(),
  test_layer: 'api_integration',
  data_mode: 'read_only_uat',
  target_scope: 'event_catalog',
  codes,
  missingCodes,
  unexpectedCodes,
  duplicateCodes,
  metadataFailures,
  authorityProof: {
    sharedCatalogConstant: signals.sharedCatalog.includes('WEBHOOK_EVENT_CATALOG'),
    unknownEventFailsClosed: signals.policy.includes('is not registered by TCRN'),
    providerCannotCreateEvents:
      !signals.policy.includes('providerCreated') &&
      !signals.service.includes('providerEvent') &&
      !signals.controller.includes('provider/events'),
  },
};

payload.passed =
  missingCodes.length === 0 &&
  unexpectedCodes.length === 0 &&
  duplicateCodes.length === 0 &&
  metadataFailures.length === 0 &&
  Object.values(payload.authorityProof).every(Boolean);

writeJson(out, payload);
