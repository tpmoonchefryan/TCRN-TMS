// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function resolveRepoRoot(moduleUrl: string): string {
  let currentDir = path.dirname(fileURLToPath(moduleUrl));

  while (currentDir !== path.dirname(currentDir)) {
    if (existsSync(path.join(currentDir, 'pnpm-workspace.yaml'))) {
      return currentDir;
    }

    currentDir = path.dirname(currentDir);
  }

  throw new Error(`Unable to resolve repo root for ${moduleUrl}`);
}

export function loadRepoEnvFiles(moduleUrl: string): string[] {
  const repoRoot = resolveRepoRoot(moduleUrl);
  const loadedPaths: string[] = [];

  for (const envFile of ['.env.local', '.env']) {
    const envPath = path.resolve(repoRoot, envFile);

    if (!existsSync(envPath)) {
      continue;
    }

    process.loadEnvFile(envPath);
    loadedPaths.push(envPath);
  }

  return loadedPaths;
}
