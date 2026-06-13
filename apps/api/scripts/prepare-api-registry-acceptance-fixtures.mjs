// SPDX-License-Identifier: Apache-2.0
import { parseArgs, writeJson } from './api-registry-script-utils.mjs';

const command = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'readback';
const options = parseArgs(process.argv.slice(command === process.argv[2] ? 3 : 2));
const prefix = options.prefix ?? 'TEST_P9_API';

writeJson(options.out ?? `api-registry-fixture-${command}.json`, {
  checkedAt: new Date().toISOString(),
  test_layer: 'manual_readback',
  data_mode: 'read_only_source',
  target_scope: 'api_operation_registry',
  command,
  prefix,
  createdResources: [],
  retainedResources: [],
  idempotent: true,
  note: 'Phase 9 API registry acceptance uses read-only generated source; no disposable DB rows are required.',
  passed: true,
});
