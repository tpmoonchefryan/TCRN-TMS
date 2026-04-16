// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { prisma } from '@tcrn/database';

@Injectable()
export class TenantReadRepository {
  findByCode(code: string) {
    return prisma.tenant.findUnique({
      where: { code },
    });
  }

  findByCodeInsensitive(code: string) {
    return prisma.tenant.findFirst({
      where: {
        code: {
          equals: code,
          mode: 'insensitive',
        },
      },
    });
  }

  findById(id: string) {
    return prisma.tenant.findUnique({
      where: { id },
    });
  }

  findBySchemaName(schemaName: string) {
    return prisma.tenant.findUnique({
      where: { schemaName },
    });
  }

  listActiveTenants() {
    return prisma.tenant.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });
  }
}
