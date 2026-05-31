import { parseArgs, prepareApiGatewayReadinessFixtures, writeJson } from './api-gateway-readiness-script-utils.mjs';

const [mode = 'readback', ...rest] = process.argv.slice(2);
const options = parseArgs(rest);
writeJson(options.out ?? `api-gateway-readiness-fixture-${mode}.json`, prepareApiGatewayReadinessFixtures(mode, options));
