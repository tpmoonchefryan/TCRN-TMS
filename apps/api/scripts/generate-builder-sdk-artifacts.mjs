import { generateBuilderArtifacts, parseArgs, readJson, writeJson, writeText } from './builder-registry-script-utils.mjs';

const options = parseArgs();
const manifest = readJson(options.manifest);
const schemaCatalog = readJson(options['schema-catalog']);
const apiExport = options['api-readonly-export'] ? readJson(options['api-readonly-export']) : null;
const artifacts = generateBuilderArtifacts(manifest, schemaCatalog, apiExport);

writeText(options.types ?? 'builder-types.d.ts', artifacts.types);
writeText(options.sdk ?? 'builder-sdk-readonly.ts', artifacts.sdk);
writeJson(options.openapi ?? 'builder-openapi-readonly.json', artifacts.openapi);
