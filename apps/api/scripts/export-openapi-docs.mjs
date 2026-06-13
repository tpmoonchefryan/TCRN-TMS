// SPDX-License-Identifier: Apache-2.0
import { exportOpenApiDocs, parseArgs } from './builder-registry-script-utils.mjs';

const options = parseArgs();
exportOpenApiDocs(options['out-dir'] ?? 'openapi');
