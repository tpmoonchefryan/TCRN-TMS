import { buildBuilderSourceReadback, parseArgs, writeJson } from './builder-registry-script-utils.mjs';

const options = parseArgs();
writeJson(
  options.out ?? 'builder-source-readback.json',
  buildBuilderSourceReadback(options['openapi-dir'], options['source-root'])
);
