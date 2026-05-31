// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { classifyRuntimeFlagHits, parseArgs, runRg, writeJson } from './runtime-flag-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'runtime-flag-overloaded-flag-classification.json';
const hits = runRg([
  '-n',
  'flag|Flag|FLAG|Flagsmith|OpenFeature',
  'apps',
  'packages',
  'tests',
  'infra',
  '-g',
  '!**/node_modules/**',
  '-g',
  '!**/generated/**',
]);
const classified = classifyRuntimeFlagHits(hits);
const unclassifiedRuntimeAuthorityHits = classified.filter(
  (entry) =>
    entry.classification === 'unrelated_flag_term' &&
    /runtime.?flag|feature.?flag|provider.?flag/i.test(entry.line)
);

const payload = {
  checkedAt: new Date().toISOString(),
  test_layer: 'source_scan',
  data_mode: 'source_scan',
  target_scope: 'legacy_feature_quarantine',
  totalHits: hits.length,
  classified,
  unclassifiedRuntimeAuthorityHits,
  classificationCounts: classified.reduce((acc, entry) => {
    acc[entry.classification] = (acc[entry.classification] ?? 0) + 1;
    return acc;
  }, {}),
  passed: unclassifiedRuntimeAuthorityHits.length === 0,
};

writeJson(out, payload);
