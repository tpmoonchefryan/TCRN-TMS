// SPDX-License-Identifier: Apache-2.0
import { parseArgs, sourceSignals, writeJson } from './webhook-delivery-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'webhook-delivery-redaction.json';
const signals = sourceSignals();
const checks = [
  {
    id: 'secret_masking_preserved',
    passed: signals.service.includes('******') && signals.policy.includes('rawPayloadStored: false'),
  },
  {
    id: 'raw_request_response_body_not_modeled',
    passed:
      signals.schema.includes('requestBodySummary') &&
      signals.schema.includes('responseBodySummary') &&
      signals.migration.includes('request_body_summary') &&
      signals.migration.includes('response_body_summary') &&
      !signals.migration.includes('request_body JSONB') &&
      !signals.migration.includes('response_body JSONB'),
  },
  {
    id: 'payload_pii_classified',
    passed:
      signals.sharedCatalog.includes('piiClass') &&
      signals.sharedCatalog.includes('limited_pii') &&
      signals.sharedCatalog.includes('redactionPolicy'),
  },
  {
    id: 'swagger_secret_redaction_source_present',
    passed:
      signals.service.includes('redactSignatureHeaders') &&
      signals.service.includes('requestHeaders: this.redactRecord'),
  },
];

writeJson(out, {
  checkedAt: new Date().toISOString(),
  test_layer: 'security_privacy',
  data_mode: 'read_only_uat',
  target_scope: 'signature_policy',
  checks,
  forbiddenEvidence: {
    rawSecret: false,
    rawProviderToken: false,
    rawReportBinary: false,
    importedRowData: false,
  },
  passed: checks.every((check) => check.passed),
});
