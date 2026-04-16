// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database';

@Injectable()
export class HomepageSchedulerRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async listActiveTenantSchemas(): Promise<string[]> {
    const prisma = this.databaseService.getPrisma();
    const tenants = await prisma.tenant.findMany({
      where: { isActive: true },
      select: { schemaName: true },
    });

    return tenants.map((tenant) => tenant.schemaName);
  }

  async archiveOldDraftVersions(tenantSchema: string, cutoffDate: Date): Promise<number> {
    const prisma = this.databaseService.getPrisma();
    const archived = await prisma.$executeRawUnsafe(
      `
        UPDATE "${tenantSchema}".homepage_version hv
        SET
          status = 'archived',
          archived_at = NOW(),
          updated_at = NOW()
        WHERE hv.status = 'draft'
          AND hv.created_at < $1::timestamptz
          AND NOT EXISTS (
            SELECT 1
            FROM "${tenantSchema}".talent_homepage th
            WHERE th.draft_version_id = hv.id
               OR th.published_version_id = hv.id
          )
      `,
      cutoffDate,
    );

    return Number(archived);
  }
}
