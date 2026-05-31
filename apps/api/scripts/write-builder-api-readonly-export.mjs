// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import {
  buildBuilderApiReadonlyExport,
  parseArgs,
  readJson,
  writeJson,
} from './builder-registry-script-utils.mjs';

const options = parseArgs();
writeJson(
  options.out ?? 'builder-api-readonly-export.json',
  buildBuilderApiReadonlyExport(
    readJson(options['api-registry']),
    readJson(options['source-readback'])
  )
);
