import { parseArgs, verifyNegativeAuthority, writeJson } from './builder-registry-script-utils.mjs';

const options = parseArgs();
const source = Array.isArray(options.source) ? options.source : [options.source].filter(Boolean);
writeJson(
  options.out ?? 'builder-negative-authority-scan.json',
  verifyNegativeAuthority(source, options['evidence-dir'])
);
