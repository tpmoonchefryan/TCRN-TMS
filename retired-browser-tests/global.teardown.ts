import type { FullConfig } from '@playwright/test';

import { PrismaClient } from '@tcrn/database';

import { readWebSmokeFixture, removeWebSmokeFixture } from './fixtures/web-smoke-fixture';

export default async function globalTeardown(_config: FullConfig): Promise<void> {
  const prisma = new PrismaClient();

  try {
    const fixture = await readWebSmokeFixture();

    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${fixture.schemaName}" CASCADE`);
    await prisma.tenant.delete({
      where: { id: fixture.tenantId },
    }).catch(() => undefined);
  } catch {
    // Keep teardown fail-open so browser proof can still report the primary runtime error.
  } finally {
    await removeWebSmokeFixture().catch(() => undefined);
    await prisma.$disconnect();
  }
}
