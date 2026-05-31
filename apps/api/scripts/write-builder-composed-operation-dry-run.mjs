import { buildComposedDryRun, parseArgs, readJson, writeJson } from './builder-registry-script-utils.mjs';

const options = parseArgs();
writeJson(
  options.out ?? 'builder-composed-operation.dry-run.json',
  buildComposedDryRun(
    readJson(options.manifest),
    readJson(options['api-readonly-export'])
  )
);
