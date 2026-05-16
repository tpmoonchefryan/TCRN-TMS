// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function loadRepoEnvFiles(moduleUrl: string): string[] {
  const scriptDir = path.dirname(fileURLToPath(moduleUrl));
  const repoRoot = path.resolve(scriptDir, '..', '..', '..');
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
