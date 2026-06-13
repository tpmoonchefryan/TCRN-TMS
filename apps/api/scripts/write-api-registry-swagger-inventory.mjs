// SPDX-License-Identifier: Apache-2.0
import { parseArgs, writeJson, writeSwaggerInventory } from './api-registry-script-utils.mjs';

const options = parseArgs();
writeJson(
  options.out ?? 'api-registry-current-swagger-inventory.json',
  writeSwaggerInventory(options['openapi-dir'] ?? 'openapi-before')
);
