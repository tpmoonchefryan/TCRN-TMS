import { parseArgs, verifyGatewayComposeRedaction, writeJson } from './api-gateway-readiness-script-utils.mjs';

const options = parseArgs();
writeJson(
  options.out ?? 'gateway-compose-render-redaction.json',
  verifyGatewayComposeRedaction(options['compose-baseline'], options['render-dir'])
);
