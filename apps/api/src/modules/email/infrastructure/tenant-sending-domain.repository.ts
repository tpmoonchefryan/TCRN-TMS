// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { Injectable } from '@nestjs/common';

import { Prisma } from '@tcrn/database';

import { DatabaseService } from '../../database';
import type { TenantRecordWithEmailSettings } from '../domain/tenant-sending-domain.policy';

@Injectable()
export class TenantSendingDomainRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  private get prisma() {
    return this.databaseService.getPrisma();
  }

  async findTenantById(tenantId: string): Promise<TenantRecordWithEmailSettings | null> {
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        schemaName: true,
        settings: true,
      },
    }) as Promise<TenantRecordWithEmailSettings | null>;
  }

  async findTenantBySchema(tenantSchema: string): Promise<TenantRecordWithEmailSettings | null> {
    return this.prisma.tenant.findUnique({
      where: { schemaName: tenantSchema },
      select: {
        id: true,
        schemaName: true,
        settings: true,
      },
    }) as Promise<TenantRecordWithEmailSettings | null>;
  }

  async updateTenantSettings(tenantId: string, settings: Record<string, unknown>): Promise<void> {
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        settings: settings as Prisma.InputJsonObject,
      },
    });
  }
}
