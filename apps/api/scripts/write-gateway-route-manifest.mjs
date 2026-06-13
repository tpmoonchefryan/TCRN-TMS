// SPDX-License-Identifier: Apache-2.0
import {
  buildGatewayManifest,
  parseArgs,
  readJson,
  writeJson,
} from './api-registry-script-utils.mjs';

const options = parseArgs();
const registry = readJson(options.registry ?? 'api-registry-document.json');
writeJson(options.out ?? 'gateway-route-manifest.dry-run.json', buildGatewayManifest(registry));
