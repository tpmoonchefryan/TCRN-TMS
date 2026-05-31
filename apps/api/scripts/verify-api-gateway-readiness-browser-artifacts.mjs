import { parseArgs, verifyApiGatewayBrowserArtifacts, writeJson } from './api-gateway-readiness-script-utils.mjs';

const options = parseArgs();
const required = Array.isArray(options.required)
  ? options.required
  : options.required
    ? [options.required]
    : [];
writeJson(
  options.out ?? 'api-gateway-readiness-browser-artifact-presence.json',
  verifyApiGatewayBrowserArtifacts(options['evidence-dir'], required, { after: options.after })
);
