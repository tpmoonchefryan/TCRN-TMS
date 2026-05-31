import { buildLicenseSbomPosture, parseArgs, writeJson } from './builder-registry-script-utils.mjs';

const options = parseArgs();
writeJson(
  options.out ?? 'builder-license-sbom-posture.json',
  buildLicenseSbomPosture(options['source-root'], options['evidence-dir'])
);
