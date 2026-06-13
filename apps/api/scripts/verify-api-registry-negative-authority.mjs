// SPDX-License-Identifier: Apache-2.0
import { parseArgs, verifyNegativeAuthority, writeJson } from './api-registry-script-utils.mjs';

const options = parseArgs();
const sourceRoots = Array.isArray(options.source)
  ? options.source
  : typeof options.source === 'string'
    ? [options.source]
    : ['apps', 'packages'];
writeJson(
  options.out ?? 'api-registry-negative-source-scan.json',
  verifyNegativeAuthority(sourceRoots)
);
