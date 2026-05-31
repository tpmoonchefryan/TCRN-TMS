// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { readEventRegistryBaseline } from '@tcrn/shared';

import { parseArgs, sourceSignals, writeJson } from './event-backbone-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'event-backbone-redaction-isolation.json';
const signals = sourceSignals();
const subjects = readEventRegistryBaseline('local').definitions.map((definition) => definition.subject);
const forbiddenSubjectHits = subjects.filter((subject) =>
  /tenant-[a-z0-9]|customer-[a-z0-9]|talent-[a-z0-9]|email@example|@|secret=|access_token=|phone=|report-[0-9]/i.test(subject)
);
const checks = [
  { id: 'no_forbidden_subject_material', passed: forbiddenSubjectHits.length === 0 },
  { id: 'redacted_payload_storage', passed: signals.migration.includes('redacted_payload') && signals.prismaSchema.includes('redactedPayload') },
  { id: 'ac_only_controller_guard', passed: signals.controller.includes('AC operators only') },
  {
    id: 'ordinary_raw_payload_absent_from_ui',
    passed:
      signals.platformToolsScreen.includes('copy.eventBackbone.noRawPayload') &&
      signals.platformToolsScreen.includes('rawPayloadAccess') &&
      signals.platformToolsCopy.includes('No raw payload, token, or PII surface.') &&
      !signals.platformToolsScreen.includes('<iframe'),
  },
  { id: 'dlq_summary_only', passed: signals.service.includes('dlqCount') && !signals.service.includes('requestBody') && !signals.service.includes('responseBody') },
];

writeJson(out, {
  checkedAt: new Date().toISOString(),
  test_layer: 'security_privacy',
  data_mode: 'source_scan',
  target_scope: 'tenant_absence',
  forbiddenSubjectHits,
  checks,
  passed: checks.every((check) => check.passed),
});
