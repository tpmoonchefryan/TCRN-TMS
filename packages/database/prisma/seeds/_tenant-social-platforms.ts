// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { PrismaClient } from '@prisma/client';

export async function getTenantSocialPlatformMap(
  prisma: PrismaClient,
  schemaName: string
): Promise<Record<string, string>> {
  const platforms = await prisma.$queryRawUnsafe<Array<{ id: string; code: string }>>(
    `SELECT id, code FROM "${schemaName}".social_platform`
  );

  const platformMap: Record<string, string> = {};

  for (const platform of platforms) {
    platformMap[platform.code] = platform.id;
  }

  return platformMap;
}
