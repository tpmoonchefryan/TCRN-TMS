// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { prisma } from '@tcrn/database';

import { PermissionSnapshotService } from './permission-snapshot.service';

/**
 * Permission Scheduler Service
 * Handles periodic full refresh of permission snapshots
 * PRD §12.6 - Ensures snapshot consistency with 6-hour refresh SLA
 */
@Injectable()
export class PermissionSchedulerService {
  private readonly logger = new Logger(PermissionSchedulerService.name);

  constructor(
    private readonly snapshotService: PermissionSnapshotService,
  ) {}

  /**
   * Full permission snapshot refresh
   * Runs every 6 hours (at 0:00, 6:00, 12:00, 18:00 UTC)
   * PRD §12.6 - Fallback to ensure snapshot consistency
   */
  @Cron('0 0 */6 * * *')
  async refreshAllPermissionSnapshots(): Promise<void> {
    this.logger.log('Starting full permission snapshot refresh...');

    const startTime = Date.now();
    let totalTenants = 0;
    let totalUsers = 0;
    let failedTenants = 0;

    try {
      // Get all active tenants
      const tenants = await prisma.tenant.findMany({
        where: { isActive: true },
        select: { id: true, code: true, schemaName: true },
      });

      totalTenants = tenants.length;
      this.logger.log(`Found ${totalTenants} active tenants to process`);

      for (const tenant of tenants) {
        try {
          const usersRefreshed = await this.refreshTenantSnapshots(tenant.schemaName);
          totalUsers += usersRefreshed;
          this.logger.debug(`Tenant ${tenant.code}: refreshed ${usersRefreshed} user snapshots`);
        } catch (error) {
          failedTenants++;
          this.logger.error(`Failed to refresh snapshots for tenant ${tenant.code}`, error);
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Permission snapshot refresh completed: ` +
        `tenants=${totalTenants}, users=${totalUsers}, failed=${failedTenants}, duration=${duration}ms`
      );
    } catch (error) {
      this.logger.error('Permission snapshot refresh failed', error);
    }
  }

  /**
   * Refresh all user snapshots for a specific tenant
   */
  private async refreshTenantSnapshots(tenantSchema: string): Promise<number> {
    // Get all users in the tenant that have role assignments
    const users = await prisma.$queryRawUnsafe<Array<{ userId: string }>>(`
      SELECT DISTINCT user_id as "userId"
      FROM "${tenantSchema}".user_role
      WHERE expires_at IS NULL OR expires_at > NOW()
    `);

    for (const user of users) {
      try {
        await this.snapshotService.refreshUserSnapshots(tenantSchema, user.userId);
      } catch (error) {
        this.logger.warn(`Failed to refresh snapshot for user ${user.userId} in ${tenantSchema}`, error);
      }
    }

    return users.length;
  }

  /**
   * Manual trigger for testing or admin use
   * Can be called via internal API or CLI
   */
  async manualRefresh(tenantSchema?: string): Promise<{ tenants: number; users: number }> {
    this.logger.log(`Manual permission snapshot refresh triggered${tenantSchema ? ` for ${tenantSchema}` : ''}`);

    if (tenantSchema) {
      const users = await this.refreshTenantSnapshots(tenantSchema);
      return { tenants: 1, users };
    }

    // Full refresh
    let totalTenants = 0;
    let totalUsers = 0;

    const tenants = await prisma.tenant.findMany({
      where: { isActive: true },
      select: { schemaName: true },
    });

    for (const tenant of tenants) {
      const users = await this.refreshTenantSnapshots(tenant.schemaName);
      totalUsers += users;
      totalTenants++;
    }

    return { tenants: totalTenants, users: totalUsers };
  }
}
