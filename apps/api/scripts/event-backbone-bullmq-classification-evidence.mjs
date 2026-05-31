// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { BULLMQ_QUEUE_CLASSIFICATIONS } from '@tcrn/shared';

import { parseArgs, readProductText, writeJson } from './event-backbone-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'event-backbone-bullmq-classification.json';
const queueSource = readProductText('apps/worker/src/queues/index.ts');
const runtimeSource = readProductText('apps/worker/src/worker-runtime.ts');
const queueNames = [...queueSource.matchAll(/([A-Z_]+): '([^']+)'/g)].map((match) => match[2]);
const missingClassifications = queueNames.filter(
  (queue) => !BULLMQ_QUEUE_CLASSIFICATIONS.some((entry) => entry.queue === queue)
);
const checks = [
  { id: 'all_current_queues_classified', passed: missingClassifications.length === 0 },
  { id: 'no_queue_replacement_code', passed: !runtimeSource.includes('NATS') && !runtimeSource.includes('JetStream') },
  { id: 'preserve_log_queue', passed: BULLMQ_QUEUE_CLASSIFICATIONS.find((entry) => entry.queue === 'log')?.classification === 'preserve' },
  {
    id: 'rollback_requirements_present',
    passed: BULLMQ_QUEUE_CLASSIFICATIONS.every(
      (entry) => /unchanged|disable/i.test(entry.rollbackRequirement)
    ),
  },
];

writeJson(out, {
  checkedAt: new Date().toISOString(),
  test_layer: 'source_scan',
  data_mode: 'read_only_uat',
  target_scope: 'bullmq_runtime',
  queueNames,
  classifications: BULLMQ_QUEUE_CLASSIFICATIONS,
  missingClassifications,
  checks,
  passed: checks.every((check) => check.passed),
});
