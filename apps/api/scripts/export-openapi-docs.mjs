// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { exportOpenApiDocs, parseArgs } from './api-registry-script-utils.mjs';

const options = parseArgs();
exportOpenApiDocs(options['out-dir'] ?? 'openapi-before');
