// SPDX-License-Identifier: Apache-2.0
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { parseArgs } from './event-backbone-script-utils.mjs';

const options = parseArgs();
const chunks = [];
for await (const chunk of process.stdin) {
  chunks.push(chunk);
}
let text = Buffer.concat(chunks).toString('utf8');
const fixtureEnv = options['fixture-env'] ? readFileSync(options['fixture-env'], 'utf8') : '';
const deniedEnvPaths = [options['deny-env']].flat().filter(Boolean);
const fixtureValues = fixtureEnv
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'))
  .map((line) => line.split('=').slice(1).join('='))
  .filter((value) => value.length >= 8);

for (const value of fixtureValues) {
  text = text.split(value).join('redacted_fixture');
}

text = text.replace(
  /^(\s*(?:[A-Z0-9_]*?(?:JWT_SECRET|PASSWORD|SECRET|TOKEN|DATABASE_URL)[A-Z0-9_]*?)\s*:\s*).+$/gim,
  '$1redacted'
);

const payloadHeader = [
  `# redacted compose evidence: ${options.label ?? 'compose'}`,
  `# denied env files: ${deniedEnvPaths.join(', ') || 'none'}`,
  '# raw fixture values are redacted; YAML structure is preserved',
  '',
].join('\n');

mkdirSync(path.dirname(options.out), { recursive: true });
writeFileSync(options.out, `${payloadHeader}${text}`, 'utf8');
console.log(`${payloadHeader}${text}`);
