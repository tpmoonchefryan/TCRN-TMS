// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { parseArgs, verifyOpenApiRedaction, writeJson } from './api-registry-script-utils.mjs';

const options = parseArgs();
writeJson(
  options.out ?? 'openapi-redaction-report.json',
  verifyOpenApiRedaction(options['openapi-dir'] ?? 'openapi-before')
);
