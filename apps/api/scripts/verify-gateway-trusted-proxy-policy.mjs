import { parseArgs, readJson, verifyGatewayTrustedProxyPolicy, writeJson } from './api-gateway-readiness-script-utils.mjs';

const options = parseArgs();
writeJson(options.out ?? 'gateway-trusted-proxy-policy.json', verifyGatewayTrustedProxyPolicy(readJson(options.policy)));
