import { buildGatewayRoutePolicy, parseArgs, readJson, writeJson } from './api-gateway-readiness-script-utils.mjs';

const options = parseArgs();
const apiRegistry = readJson(options['api-registry'] ?? 'api-registry-document.json');
const phase9Manifest = readJson(options['phase9-manifest'] ?? 'gateway-route-manifest.dry-run.json');
writeJson(options.out ?? 'gateway-route-policy.json', buildGatewayRoutePolicy(apiRegistry, phase9Manifest));
