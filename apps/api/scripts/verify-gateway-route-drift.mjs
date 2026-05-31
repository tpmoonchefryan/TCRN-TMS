import { parseArgs, readJson, verifyGatewayRouteDrift, writeJson } from './api-gateway-readiness-script-utils.mjs';

const options = parseArgs();
writeJson(
  options.out ?? 'gateway-route-drift-report.json',
  verifyGatewayRouteDrift(readJson(options.policy), readJson(options['current-proxy']))
);
