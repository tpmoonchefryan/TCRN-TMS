// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { FullConfig } from '@playwright/test';

import { PrismaClient } from '@tcrn/database';

import { clearPlaywrightRedisState } from './fixtures/redis-test-state';
import {
  readWebSmokeFixture,
  removeWebSmokeFixture,
} from './fixtures/web-smoke-fixture';

export default async function globalTeardown(_config: FullConfig): Promise<void> {
  const prisma = new PrismaClient();

  try {
    const fixture = await readWebSmokeFixture();

    await prisma.$executeRawUnsafe(
      `DROP SCHEMA IF EXISTS "${fixture.schemaName}" CASCADE`,
    );
    await prisma.tenant.delete({
      where: { id: fixture.tenantId },
    }).catch(() => undefined);
  } catch {
    // Ignore teardown failures; the verification result should still surface from tests.
  } finally {
    await clearPlaywrightRedisState().catch(() => undefined);
    await removeWebSmokeFixture().catch(() => undefined);
    await prisma.$disconnect();
  }
}
