// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import path from 'node:path';

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

if (options['export-openapi']) {
  exportOpenApiDocs(openapiDir);
}

const document = buildRegistryDocument(openapiDir);
if (options['write-source-snapshot']) {
  document.sourceSnapshot = writeSourceSnapshot(document);
}
writeJson(out, { ...document, passed: true });
