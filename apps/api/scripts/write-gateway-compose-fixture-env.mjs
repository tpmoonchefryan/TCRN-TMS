import { parseArgs, writeGatewayComposeFixtureEnv } from './api-gateway-readiness-script-utils.mjs';

const options = parseArgs();
const result = writeGatewayComposeFixtureEnv(options.out ?? 'gateway-compose.fixture.env');
console.log(JSON.stringify(result, null, 2));
