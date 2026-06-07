import { spawn } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const storybookPort = Number(process.env.TCRN_STORYBOOK_PORT || 6007);
const storybookBaseUrl = process.env.TCRN_STORYBOOK_BASE_URL || `http://127.0.0.1:${storybookPort}`;
const targetUrl =
  process.env.TCRN_LHCI_TARGET_URL ||
  `${storybookBaseUrl}/iframe.html?id=domains-public-presence-publicpresenceevidence--studio-home-ready&viewMode=story`;
const outputDir = process.env.TCRN_LHCI_OUTPUT_DIR || '.tmp/lhci';
const outputPath = resolve(repoRoot, outputDir);
const internalOutputPath = resolve(repoRoot, '.lighthouseci');
const keepOutput = process.env.TCRN_KEEP_LHCI === '1';
const shouldStartStorybook = process.env.TCRN_LHCI_START_STORYBOOK === '1';
const lhciBin = './node_modules/.bin/lhci';
const storybookBin = './node_modules/.bin/storybook';

function assertRepoTempPath(path, label) {
  const normalizedRoot = repoRoot.endsWith('/') ? repoRoot : `${repoRoot}/`;
  const normalizedPath = path.endsWith('/') ? path : `${path}/`;

  if (!normalizedPath.startsWith(`${normalizedRoot}.tmp/`)) {
    throw new Error(`${label} must resolve under the repository .tmp directory.`);
  }
}

function assertLocalTarget(urlValue) {
  const parsed = new URL(urlValue);
  const allowedHosts = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);

  if (parsed.protocol !== 'http:' || !allowedHosts.has(parsed.hostname)) {
    throw new Error('LHCI target must be an explicit local http URL.');
  }
}

function run(command, args, options = {}) {
  return new Promise((resolveRun) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: { ...process.env, ...options.env },
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

async function waitForUrl(urlValue, timeoutMs = 180_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(urlValue);

      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until the Storybook dev server is ready.
    }

    await new Promise((resolveWait) => setTimeout(resolveWait, 1000));
  }

  throw new Error(`Timed out waiting for ${urlValue}`);
}

function startStorybook() {
  return spawn(
    storybookBin,
    ['dev', '--ci', '--no-open', '--port', String(storybookPort), '--host', '127.0.0.1'],
    {
      cwd: repoRoot,
      env: process.env,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
}

async function stopStorybook(child) {
  if (!child || child.exitCode !== null) {
    return;
  }

  child.kill('SIGTERM');
  await new Promise((resolveStop) => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolveStop();
    }, 5000);

    child.once('exit', () => {
      clearTimeout(timer);
      resolveStop();
    });
  });
}

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

async function readLhciSummary() {
  const manifest = await readJson(join(outputPath, 'manifest.json'), []);
  const reportPath = manifest[0]?.jsonPath;
  const report = reportPath ? await readJson(reportPath, {}) : {};
  const categories = report.categories ?? {};
  const assertionResults = await readJson(join(internalOutputPath, 'assertion-results.json'), []);
  const assertionCounts = { error: 0, warn: 0, pass: 0, unknown: 0 };

  if (Array.isArray(assertionResults)) {
    for (const assertion of assertionResults) {
      const level = assertion.level || assertion.status || 'unknown';
      const key = Object.hasOwn(assertionCounts, level) ? level : 'unknown';
      assertionCounts[key] += 1;
    }
  }

  return {
    assertionCounts,
    categoryScores: Object.fromEntries(
      Object.entries(categories).map(([name, category]) => [name, category.score])
    ),
  };
}

assertRepoTempPath(outputPath, 'LHCI output path');
assertLocalTarget(targetUrl);

let storybookProcess = null;

try {
  if (shouldStartStorybook) {
    storybookProcess = startStorybook();
    await waitForUrl(targetUrl);
  }

  const result = await run(lhciBin, ['autorun', '--config=lighthouserc.cjs'], {
    env: {
      TCRN_LHCI_OUTPUT_DIR: outputDir,
      TCRN_LHCI_TARGET_URL: targetUrl,
    },
  });
  const summary = await readLhciSummary();

  if (!keepOutput) {
    await rm(outputPath, { force: true, recursive: true });
    await rm(internalOutputPath, { force: true, recursive: true });
  }

  if (result.status !== 0) {
    console.log(
      `[tooling:lhci] ADVISORY_EXIT=${result.status} target=${targetUrl} stdout_bytes=${Buffer.byteLength(
        result.stdout
      )} stderr_bytes=${Buffer.byteLength(result.stderr)} categories=${JSON.stringify(
        summary.categoryScores
      )} assertions=${JSON.stringify(summary.assertionCounts)} report=${
        keepOutput ? `${outputDir},.lighthouseci` : 'cleaned'
      }`
    );
    process.exit(0);
  }

  console.log(
    `[tooling:lhci] OK target=${targetUrl} categories=${JSON.stringify(
      summary.categoryScores
    )} assertions=${JSON.stringify(summary.assertionCounts)} report=${
      keepOutput ? `${outputDir},.lighthouseci` : 'cleaned'
    }`
  );
} finally {
  await stopStorybook(storybookProcess);
}
