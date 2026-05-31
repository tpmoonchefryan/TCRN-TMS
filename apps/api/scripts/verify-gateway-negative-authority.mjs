import { parseArgs, verifyGatewayNegativeAuthority, writeJson } from './api-gateway-readiness-script-utils.mjs';

const options = parseArgs();
const sourceIndex = process.argv.indexOf('--source');
const source =
  sourceIndex >= 0
    ? process.argv.slice(sourceIndex + 1, process.argv.findIndex((value, index) => index > sourceIndex && value.startsWith('--')) > sourceIndex
        ? process.argv.findIndex((value, index) => index > sourceIndex && value.startsWith('--'))
        : process.argv.length)
    : options.source ?? [];
writeJson(
  options.out ?? 'gateway-negative-authority-scan.json',
  verifyGatewayNegativeAuthority(source, options['evidence-dir'])
);
