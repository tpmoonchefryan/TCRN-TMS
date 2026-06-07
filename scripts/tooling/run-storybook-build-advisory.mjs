import { spawn } from 'node:child_process';
import { rm, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const outputDir = process.env.TCRN_STORYBOOK_OUTPUT_DIR || '.tmp/storybook-static';
const outputPath = resolve(repoRoot, outputDir);
const keepOutput = process.env.TCRN_KEEP_STORYBOOK === '1';
const storybookBin = './node_modules/.bin/storybook';

function assertRepoTempPath(path, label) {
  const normalizedRoot = repoRoot.endsWith('/') ? repoRoot : `${repoRoot}/`;
  const normalizedPath = path.endsWith('/') ? path : `${path}/`;

  if (!normalizedPath.startsWith(`${normalizedRoot}.tmp/`)) {
    throw new Error(`${label} must resolve under the repository .tmp directory.`);
  }
}

assertRepoTempPath(outputPath, 'Storybook output path');

function run(command, args) {
  return new Promise((resolveRun) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: process.env,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('close', (status) => {
      resolveRun({ status: status ?? 1, stdout, stderr });
    });
  });
}

async function fileExists(path) {
  try {
    const info = await stat(path);

    return info.isFile();
  } catch {
    return false;
  }
}

const result = await run(storybookBin, ['build', '--output-dir', outputDir, '--quiet']);

if (result.status !== 0) {
  const stdoutBytes = Buffer.byteLength(result.stdout);
  const stderrBytes = Buffer.byteLength(result.stderr);
  await rm(outputPath, { force: true, recursive: true });
  console.log(
    `[tooling:storybook] BUILD_EXIT=${result.status} stdout_bytes=${stdoutBytes} stderr_bytes=${stderrBytes} output=cleaned`
  );
  process.exit(0);
}

const built = await fileExists(join(outputPath, 'iframe.html'));

if (!keepOutput) {
  await rm(outputPath, { force: true, recursive: true });
}

console.log(
  `[tooling:storybook] OK iframe=${built ? 'present' : 'missing'} output=${
    keepOutput ? outputDir : 'cleaned'
  }`
);
