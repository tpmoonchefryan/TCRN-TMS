import { parseArgs, verifyBrowserArtifacts, writeJson } from './builder-registry-script-utils.mjs';

const options = parseArgs();
const required = Array.isArray(options.required) ? options.required : [options.required].filter(Boolean);
writeJson(
  options.out ?? 'builder-registry-browser-artifact-presence.json',
  verifyBrowserArtifacts(options['evidence-dir'], required)
);
