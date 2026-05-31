import { buildForbiddenTermBaseline, parseArgs, writeJson } from './builder-registry-script-utils.mjs';

const options = parseArgs();
writeJson(options.out ?? 'builder-forbidden-term-baseline.json', buildForbiddenTermBaseline(options['source-root']));
