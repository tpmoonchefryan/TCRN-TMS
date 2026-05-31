import { parseArgs, writeGatewayCurrentProxyInventory, writeJson } from './api-gateway-readiness-script-utils.mjs';

const options = parseArgs();
writeJson(options.out ?? 'gateway-current-proxy-inventory.json', writeGatewayCurrentProxyInventory(options['product-root']));
