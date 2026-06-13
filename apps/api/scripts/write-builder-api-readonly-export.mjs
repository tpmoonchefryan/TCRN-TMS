// SPDX-License-Identifier: Apache-2.0
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
