// SPDX-License-Identifier: Apache-2.0
import { buildSwaggerExposurePolicy, parseArgs, writeJson } from './api-registry-script-utils.mjs';

const options = parseArgs();
writeJson(options.out ?? 'swagger-exposure-policy.json', buildSwaggerExposurePolicy());
