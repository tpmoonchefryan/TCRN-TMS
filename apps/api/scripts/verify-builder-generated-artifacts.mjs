import { parseArgs, verifyGeneratedArtifacts, writeJson } from './builder-registry-script-utils.mjs';

const options = parseArgs();
writeJson(
  options.out ?? 'builder-generated-artifact-validation.json',
  verifyGeneratedArtifacts({
    moduleRegistry: options['module-registry'],
    apiRegistry: options['api-registry'],
    sourceReadback: options['source-readback'],
    openapiDir: options['openapi-dir'],
    manifest: options.manifest,
    apiReadonlyExport: options['api-readonly-export'],
    schemaCatalog: options['schema-catalog'],
    types: options.types,
    sdk: options.sdk,
    openapi: options.openapi,
    composed: options.composed,
  })
);
