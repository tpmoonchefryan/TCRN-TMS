// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { parseArgs, verifyEvidenceRedaction, writeJson } from './api-registry-script-utils.mjs';

const options = parseArgs();
writeJson(
  options.out ?? 'api-registry-evidence-redaction-report.json',
  verifyEvidenceRedaction(options['evidence-dir'] ?? '.')
);
