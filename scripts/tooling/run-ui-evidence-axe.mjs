import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const outputDir = process.env.TCRN_UI_EVIDENCE_OUTPUT_DIR || '.tmp/ui-evidence';
const outputPath = resolve(repoRoot, outputDir);
const keepOutput = process.env.TCRN_KEEP_UI_EVIDENCE === '1';

function assertRepoTempPath(path, label) {
  const normalizedRoot = repoRoot.endsWith('/') ? repoRoot : `${repoRoot}/`;
  const normalizedPath = path.endsWith('/') ? path : `${path}/`;

  if (!normalizedPath.startsWith(`${normalizedRoot}.tmp/`)) {
    throw new Error(`${label} must resolve under the repository .tmp directory.`);
  }
}

function run(command, args) {
  return new Promise((resolveRun) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: process.env,
      shell: false,
      stdio: 'inherit',
    });

    child.on('close', (status) => {
      resolveRun(status ?? 1);
    });
  });
}

assertRepoTempPath(outputPath, 'UI evidence output path');

const status = await run('./node_modules/.bin/playwright', [
  'test',
  '--config',
  'playwright.ui-evidence.config.ts',
]);

if (!keepOutput) {
  await rm(outputPath, { force: true, recursive: true });
}

console.log(
  `[tooling:ui-evidence] ${status === 0 ? 'OK' : `EXIT=${status}`} output=${keepOutput ? outputDir : 'cleaned'}`
);
process.exit(status);
