#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { basename, join } from 'node:path';

const productRoot = process.cwd();
const args = process.argv.slice(2);
const planOnly = args.includes('--plan');
const requireInstall = process.env.TCRN_TOOLING_INSTALL_REQUIRE === '1';
const destination =
  args.find((arg) => !arg.startsWith('--')) ??
  process.env.TCRN_TOOLING_BIN_DIR ??
  join(productRoot, '.tmp/tooling-bin');
const tempRoot = join(
  process.env.RUNNER_TEMP ?? join(productRoot, '.tmp'),
  'tcrn-advisory-downloads'
);

const tools = [
  {
    name: 'actionlint',
    version: '1.7.12',
    url: 'https://github.com/rhysd/actionlint/releases/download/v1.7.12/actionlint_1.7.12_linux_amd64.tar.gz',
    checksumUrl:
      'https://github.com/rhysd/actionlint/releases/download/v1.7.12/actionlint_1.7.12_checksums.txt',
    asset: 'actionlint_1.7.12_linux_amd64.tar.gz',
    binary: 'actionlint',
    type: 'tar',
    versionArgs: ['-version'],
  },
  {
    name: 'gitleaks',
    version: '8.30.1',
    url: 'https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_linux_x64.tar.gz',
    checksumUrl:
      'https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_checksums.txt',
    asset: 'gitleaks_8.30.1_linux_x64.tar.gz',
    binary: 'gitleaks',
    type: 'tar',
    versionArgs: ['version'],
  },
  {
    name: 'zizmor',
    version: '1.25.2',
    url: 'https://github.com/woodruffw/zizmor/releases/download/v1.25.2/zizmor-x86_64-unknown-linux-gnu.tar.gz',
    asset: 'zizmor-x86_64-unknown-linux-gnu.tar.gz',
    binary: 'zizmor',
    type: 'tar',
    versionArgs: ['--version'],
  },
  {
    name: 'osv-scanner',
    version: '2.3.8',
    url: 'https://github.com/google/osv-scanner/releases/download/v2.3.8/osv-scanner_linux_amd64',
    checksumUrl:
      'https://github.com/google/osv-scanner/releases/download/v2.3.8/osv-scanner_SHA256SUMS',
    asset: 'osv-scanner_linux_amd64',
    binary: 'osv-scanner',
    type: 'binary',
    versionArgs: ['--version'],
  },
  {
    name: 'trivy',
    version: '0.71.0',
    url: 'https://github.com/aquasecurity/trivy/releases/download/v0.71.0/trivy_0.71.0_Linux-64bit.tar.gz',
    checksumUrl:
      'https://github.com/aquasecurity/trivy/releases/download/v0.71.0/trivy_0.71.0_checksums.txt',
    asset: 'trivy_0.71.0_Linux-64bit.tar.gz',
    binary: 'trivy',
    type: 'tar',
    versionArgs: ['--version'],
  },
  {
    name: 'syft',
    version: '1.45.1',
    url: 'https://github.com/anchore/syft/releases/download/v1.45.1/syft_1.45.1_linux_amd64.tar.gz',
    checksumUrl:
      'https://github.com/anchore/syft/releases/download/v1.45.1/syft_1.45.1_checksums.txt',
    asset: 'syft_1.45.1_linux_amd64.tar.gz',
    binary: 'syft',
    type: 'tar',
    versionArgs: ['version'],
  },
  {
    name: 'oasdiff',
    version: '1.18.4',
    url: 'https://github.com/Tufin/oasdiff/releases/download/v1.18.4/oasdiff_1.18.4_linux_amd64.tar.gz',
    checksumUrl: 'https://github.com/Tufin/oasdiff/releases/download/v1.18.4/checksums.txt',
    asset: 'oasdiff_1.18.4_linux_amd64.tar.gz',
    binary: 'oasdiff',
    type: 'tar',
    versionArgs: ['--version'],
  },
];

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd ?? productRoot,
    env: options.env ?? process.env,
    encoding: options.encoding ?? 'utf8',
    shell: false,
    stdio: options.stdio ?? ['ignore', 'pipe', 'pipe'],
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `${command} ${commandArgs.join(' ')} failed with ${result.status}: ${result.stderr ?? ''}`
    );
  }
  return result;
}

function download(url, outputPath) {
  run('curl', ['-fsSL', '--retry', '3', '--retry-delay', '2', '-o', outputPath, url], {
    stdio: 'inherit',
  });
}

function downloadText(url) {
  return run('curl', ['-fsSL', '--retry', '3', '--retry-delay', '2', url]).stdout ?? '';
}

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function expectedChecksum(tool) {
  if (!tool.checksumUrl) {
    return null;
  }

  const checksums = downloadText(tool.checksumUrl);
  const line = checksums
    .split(/\r?\n/)
    .find(
      (entry) => entry.trim().endsWith(` ${tool.asset}`) || entry.trim().endsWith(`  ${tool.asset}`)
    );
  if (!line) {
    throw new Error(`[tooling:install] checksum entry not found for ${tool.asset}`);
  }
  return line.trim().split(/\s+/)[0];
}

function findExtractedBinary(directory, binary) {
  const result = run('find', [directory, '-type', 'f', '-name', binary]);
  const [first] = (result.stdout ?? '').trim().split(/\r?\n/).filter(Boolean);
  if (!first) {
    throw new Error(`[tooling:install] ${binary} not found in extracted archive`);
  }
  return first;
}

function installTool(tool) {
  const archivePath = join(tempRoot, tool.asset);
  const extractDir = join(tempRoot, `${tool.name}-extract`);
  const target = join(destination, tool.binary);

  console.log(`[tooling:install] download ${tool.name}@${tool.version}`);
  download(tool.url, archivePath);

  const expected = expectedChecksum(tool);
  const actual = sha256(archivePath);
  if (expected && actual !== expected) {
    throw new Error(
      `[tooling:install] checksum mismatch for ${tool.asset}: expected=${expected} actual=${actual}`
    );
  }
  console.log(
    `[tooling:install] checksum ${tool.name} ${expected ? 'verified' : `not_provided sha256=${actual}`}`
  );

  rmSync(extractDir, { recursive: true, force: true });
  mkdirSync(extractDir, { recursive: true });

  if (tool.type === 'tar') {
    run('tar', ['-xzf', archivePath, '-C', extractDir], { stdio: 'inherit' });
    copyFileSync(findExtractedBinary(extractDir, tool.binary), target);
  } else {
    copyFileSync(archivePath, target);
  }

  chmodSync(target, 0o755);
  const version = run(target, tool.versionArgs);
  const output = `${version.stdout ?? ''}${version.stderr ?? ''}`.trim().split(/\r?\n/)[0] ?? '';
  console.log(`[tooling:install] ${tool.binary} ready: ${output}`);
}

if (planOnly) {
  for (const tool of tools) {
    console.log(
      `[tooling:install] PLAN ${tool.name}@${tool.version} asset=${basename(tool.url)} checksum=${Boolean(
        tool.checksumUrl
      )}`
    );
  }
  process.exit(0);
}

if (process.platform !== 'linux' || process.arch !== 'x64') {
  console.warn(
    `[tooling:install] SKIP: installer is scoped to linux x64 CI. platform=${process.platform} arch=${process.arch}`
  );
  process.exit(0);
}

mkdirSync(destination, { recursive: true });
rmSync(tempRoot, { recursive: true, force: true });
mkdirSync(tempRoot, { recursive: true });

const failures = [];

try {
  for (const tool of tools) {
    try {
      installTool(tool);
    } catch (error) {
      failures.push(tool.name);
      console.warn(`[tooling:install] ADVISORY_SKIP ${tool.name}: ${error.message}`);
      if (requireInstall) {
        throw error;
      }
    }
  }
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.warn(
    `[tooling:install] ADVISORY_INCOMPLETE missing=${failures.join(',')}. ` +
      'Downstream advisory wrappers will skip missing tools unless require mode is set.'
  );
  process.exit(requireInstall ? 1 : 0);
}

if (process.env.GITHUB_PATH) {
  console.log(`[tooling:install] PATH exported by workflow: ${destination}`);
}
