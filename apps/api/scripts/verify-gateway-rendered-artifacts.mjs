import { parseArgs, verifyGatewayRenderedArtifacts, writeJson } from './api-gateway-readiness-script-utils.mjs';

const options = parseArgs();
writeJson(options.out ?? 'gateway-render-validation.json', verifyGatewayRenderedArtifacts(options['render-dir'] ?? 'gateway-rendered'));
