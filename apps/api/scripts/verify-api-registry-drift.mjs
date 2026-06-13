// SPDX-License-Identifier: Apache-2.0
import {
  parseArgs,
  readJson,
  verifyRegistryDrift,
  writeRuntimeDriftReport,
  writeJson,
} from './api-registry-script-utils.mjs';

const options = parseArgs();
const registry = readJson(options.registry ?? 'api-registry-document.json');
const report = verifyRegistryDrift(registry, options['openapi-dir'] ?? 'openapi-before');
writeRuntimeDriftReport(report);
writeJson(
  options.out ?? 'api-registry-drift-report.json',
  report
);
