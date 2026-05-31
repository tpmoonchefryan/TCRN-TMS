import { buildFixtureLifecycle, parseArgs, writeJson } from './builder-registry-script-utils.mjs';

const [command] = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const options = parseArgs(process.argv.slice(3));
writeJson(
  options.out ?? `builder-registry-fixture-${command}.json`,
  buildFixtureLifecycle(command, options.prefix ?? 'TEST_P11_BUILDER', options['evidence-dir'])
);
