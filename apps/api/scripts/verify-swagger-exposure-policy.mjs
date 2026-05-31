// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { buildSwaggerExposurePolicy, parseArgs, writeJson } from './api-registry-script-utils.mjs';

const options = parseArgs();
writeJson(options.out ?? 'swagger-exposure-policy.json', buildSwaggerExposurePolicy());
