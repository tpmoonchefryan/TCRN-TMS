// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { spawnSync } from 'node:child_process';

const REDIS_CONTAINER_NAME = process.env.PLAYWRIGHT_REDIS_CONTAINER ?? 'tcrn-redis';

function runRedisCli(args: string[]): string {
  const result = spawnSync(
    'docker',
    ['exec', REDIS_CONTAINER_NAME, 'redis-cli', ...args],
    {
      encoding: 'utf8',
    },
  );

  if (result.status !== 0) {
    throw new Error(
      result.stderr.trim() ||
        result.stdout.trim() ||
        `redis-cli exited with status ${result.status ?? 'unknown'}`,
    );
  }

  return result.stdout;
}

export async function clearPlaywrightRedisState(): Promise<void> {
  const rawKeys = runRedisCli(['--scan', '--pattern', 'rl_auth*']).trim();
  const keys = rawKeys ? rawKeys.split(/\s+/).filter(Boolean) : [];

  if (keys.length === 0) {
    return;
  }

  runRedisCli(['DEL', ...keys]);
}
