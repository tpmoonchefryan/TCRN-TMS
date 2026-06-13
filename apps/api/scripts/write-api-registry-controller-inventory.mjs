// SPDX-License-Identifier: Apache-2.0
import { parseArgs, scanControllerInventory, writeJson } from './api-registry-script-utils.mjs';

const options = parseArgs();
writeJson(
  options.out ?? 'api-registry-current-controller-inventory.json',
  scanControllerInventory()
);
