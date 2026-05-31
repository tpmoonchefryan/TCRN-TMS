import { parseArgs, readJson, verifyGatewayRateLimitCorsPolicy, writeJson } from './api-gateway-readiness-script-utils.mjs';

const options = parseArgs();
writeJson(options.out ?? 'gateway-rate-limit-cors-policy.json', verifyGatewayRateLimitCorsPolicy(readJson(options.policy)));
