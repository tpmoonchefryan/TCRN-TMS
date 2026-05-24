// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '..', '..', '..');

export const repoEnvFilePaths = ['.env.local', '.env'].map((envFile) => resolve(repoRoot, envFile));

export function loadRepoEnvFiles(): void {
  for (const envPath of repoEnvFilePaths) {
    if (existsSync(envPath)) {
      process.loadEnvFile(envPath);
    }
  }
}
