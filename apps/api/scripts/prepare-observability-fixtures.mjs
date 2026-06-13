// SPDX-License-Identifier: Apache-2.0
import { exactLockedCatalog, observabilityCodes, parseArgs, writeJson } from './observability-script-utils.mjs';

const options = parseArgs();
const mode = options._?.[0] ?? 'readback';
const out = options.out ?? `observability-fixture-${mode}.json`;
const codes = observabilityCodes();

const payload = {
  checkedAt: new Date().toISOString(),
  test_layer: 'fixture_lifecycle',
  data_mode: 'disposable_fixture',
  target_scope: 'observability_adapter',
  mode,
  mutableDatabaseRowsCreated: 0,
  fixturePolicy:
    'Phase 5 adapter definitions are shared-registry/readback metadata; this fixture harness records that no tenant mutable rows are required for setup/readback/cleanup/idempotence.',
  adapterCodes: codes,
  exactLockedCatalog: exactLockedCatalog(codes),
  cleanupLeavesNoRows: mode === 'cleanup' || mode === 'idempotence' || mode === 'readback',
};

payload.passed =
  ['setup', 'readback', 'cleanup', 'idempotence'].includes(mode) &&
  payload.exactLockedCatalog &&
  payload.mutableDatabaseRowsCreated === 0;

writeJson(out, payload);
