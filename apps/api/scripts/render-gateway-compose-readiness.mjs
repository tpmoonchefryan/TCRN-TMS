import { parseArgs, renderGatewayComposeReadiness, writeJson } from './api-gateway-readiness-script-utils.mjs';

const options = parseArgs();
writeJson(options.out ?? 'gateway-compose-caddy-baseline.json', renderGatewayComposeReadiness(options));
