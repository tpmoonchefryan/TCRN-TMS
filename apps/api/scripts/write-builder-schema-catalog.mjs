import { buildBuilderSchemaCatalog, parseArgs, readJson, writeJson } from './builder-registry-script-utils.mjs';

const options = parseArgs();
const apiExport = options['api-readonly-export'] ? readJson(options['api-readonly-export']) : null;
writeJson(
  options.out ?? 'builder-schema-catalog.json',
  buildBuilderSchemaCatalog(readJson(options.manifest), apiExport)
);
