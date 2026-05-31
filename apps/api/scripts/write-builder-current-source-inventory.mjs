import { buildCurrentSourceInventory, parseArgs, writeJson } from './builder-registry-script-utils.mjs';

const options = parseArgs();
writeJson(options.out ?? 'builder-current-source-inventory.json', buildCurrentSourceInventory(options['source-root']));
