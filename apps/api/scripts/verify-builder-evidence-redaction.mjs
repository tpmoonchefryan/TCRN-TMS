import { parseArgs, verifyEvidenceRedaction, writeJson } from './builder-registry-script-utils.mjs';

const options = parseArgs();
writeJson(
  options.out ?? 'builder-evidence-redaction-report.json',
  verifyEvidenceRedaction(options['evidence-dir'])
);
