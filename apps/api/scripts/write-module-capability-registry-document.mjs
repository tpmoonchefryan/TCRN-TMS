import { buildModuleCapabilityRegistryDocument, parseArgs, writeJson } from './builder-registry-script-utils.mjs';

const options = parseArgs();
writeJson(options.out ?? 'module-capability-registry-document.json', buildModuleCapabilityRegistryDocument());
