import { buildGatewayCutoverRunbook, parseArgs, readJson, writeText } from './api-gateway-readiness-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'gateway-cutover-runbook.md';
writeText(out, buildGatewayCutoverRunbook(readJson(options.policy)));
console.log(JSON.stringify({ out, passed: true }, null, 2));
