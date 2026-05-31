import { parseArgs, readJson, renderGatewayReadinessArtifacts, writeJson } from './api-gateway-readiness-script-utils.mjs';

const options = parseArgs();
const policy = readJson(options.policy ?? 'gateway-route-policy.json');
const outDir = options['out-dir'] ?? 'gateway-rendered';
const result = renderGatewayReadinessArtifacts(policy, outDir);
writeJson(options.out ?? `${outDir}/gateway-render-manifest.json`, result);
