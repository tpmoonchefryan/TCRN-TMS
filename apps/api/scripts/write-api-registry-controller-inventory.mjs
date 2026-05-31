// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { parseArgs, scanControllerInventory, writeJson } from './api-registry-script-utils.mjs';

const options = parseArgs();
writeJson(
  options.out ?? 'api-registry-current-controller-inventory.json',
  scanControllerInventory()
);
