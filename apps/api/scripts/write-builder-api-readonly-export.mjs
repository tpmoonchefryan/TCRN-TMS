// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import {
  buildBuilderReadonlyExport,
  parseArgs,
  readJson,
  writeJson,
} from './api-registry-script-utils.mjs';

const options = parseArgs();
const registry = readJson(options.registry ?? 'api-registry-document.json');
writeJson(options.out ?? 'builder-api-readonly-export.json', buildBuilderReadonlyExport(registry));
