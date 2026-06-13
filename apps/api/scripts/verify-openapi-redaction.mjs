// SPDX-License-Identifier: Apache-2.0
import { parseArgs, verifyOpenApiRedaction, writeJson } from './api-registry-script-utils.mjs';

const options = parseArgs();
writeJson(
  options.out ?? 'openapi-redaction-report.json',
  verifyOpenApiRedaction(options['openapi-dir'] ?? 'openapi-before')
);
