// SPDX-License-Identifier: Apache-2.0
import path from 'node:path';
import { existsSync } from 'node:fs';

import {
  buildRegistryDocument,
  exportOpenApiDocs,
  parseArgs,
  writeJson,
  writeSourceSnapshot,
} from './api-registry-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'api-registry-document.json';
const inferredOpenapiDir = path.join(path.dirname(out), 'openapi-before');
const openapiDir = options['openapi-dir'] ?? inferredOpenapiDir;

if (
  options['export-openapi'] ||
  !existsSync(path.join(openapiDir, 'openapi-operations.json')) ||
  !existsSync(path.join(openapiDir, 'openapi-config.json')) ||
  !existsSync(path.join(openapiDir, 'openapi-public.json'))
) {
  exportOpenApiDocs(openapiDir);
}

const document = buildRegistryDocument(openapiDir);
if (options['write-source-snapshot']) {
  document.sourceSnapshot = writeSourceSnapshot(document);
}
writeJson(out, { ...document, passed: true });
