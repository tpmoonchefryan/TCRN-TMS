import { buildBuilderModuleCapabilityManifest, parseArgs, readJson, writeJson } from './builder-registry-script-utils.mjs';

const options = parseArgs();
writeJson(
  options.out ?? 'builder-module-capability-manifest.json',
  buildBuilderModuleCapabilityManifest(
    readJson(options['module-registry']),
    readJson(options['api-readonly-export']),
    readJson(options['source-readback'])
  )
);
