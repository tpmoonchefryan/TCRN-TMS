// SPDX-License-Identifier: Apache-2.0
import { parseArgs, verifyEvidenceRedaction, writeJson } from './api-registry-script-utils.mjs';

const options = parseArgs();
writeJson(
  options.out ?? 'api-registry-evidence-redaction-report.json',
  verifyEvidenceRedaction(options['evidence-dir'] ?? '.')
);
