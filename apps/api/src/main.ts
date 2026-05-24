// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { Logger } from '@nestjs/common';

import { loadRepoEnvFiles } from './repo-env';

const logger = new Logger('Main');

async function start(): Promise<void> {
  loadRepoEnvFiles();

  const { initTelemetry } = await import('./telemetry/init');
  await initTelemetry();

  const { bootstrap } = await import('./bootstrap');
  await bootstrap();
}

void start().catch((error: unknown) => {
  const details = error instanceof Error ? (error.stack ?? error.message) : String(error);
  logger.error('Failed to start API application', details);
  process.exitCode = 1;
});
