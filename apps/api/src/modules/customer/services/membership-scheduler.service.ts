// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LogSeverity } from '@tcrn/shared';
import { TechEventType } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { TechEventLogService } from '../../log';

/**
 * Membership Scheduler Service
 * Handles automatic membership expiration and renewal
 * Iterates over all active tenants for multi-tenant support
 */
@Injectable()
export class MembershipSchedulerService {
  private readonly logger = new Logger(MembershipSchedulerService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly techEventLogService: TechEventLogService,
  ) {}

  /**
   * Process membership expiration and auto-renewal
   * Runs daily at 2:00 AM UTC
   * Iterates over all active tenant schemas
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async processMembershipBatch(): Promise<void> {
    this.logger.log('Starting membership batch processing...');

    const prisma = this.databaseService.getPrisma();
    const startTime = Date.now();
    let totalRenewed = 0;
    let totalRenewFailed = 0;
    let totalExpired = 0;

    try {
      // Get all active tenant schemas
      const tenants = await prisma.$queryRawUnsafe<Array<{
        id: string;
        schema_name: string;
      }>>(`
        SELECT id, schema_name FROM public.tenant WHERE is_active = true
      `);

      // Process each tenant
      for (const tenant of tenants) {
        try {
          // Process auto-renewals
          const renewResult = await this.processAutoRenewals(tenant.schema_name);
          totalRenewed += renewResult.renewed;
          totalRenewFailed += renewResult.failed;

          // Process expirations
          const expiredCount = await this.processExpirations(tenant.schema_name);
          totalExpired += expiredCount;
        } catch (tenantError) {
          this.logger.error(`Failed to process tenant ${tenant.schema_name}`, tenantError);
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Membership batch completed: renewed=${totalRenewed}, renewFailed=${totalRenewFailed}, expired=${totalExpired}, duration=${duration}ms`,
      );

      // Log technical event
      await this.techEventLogService.log({
        eventType: TechEventType.SCHEDULED_TASK_COMPLETED,
        scope: 'scheduled',
        severity: LogSeverity.INFO,
        payload: {
          task: 'membership_batch',
          auto_renewed_count: totalRenewed,
          auto_renew_failed_count: totalRenewFailed,
          expired_count: totalExpired,
          duration_ms: duration,
          tenants_processed: tenants.length,
        },
      });
    } catch (error) {
      this.logger.error('Membership batch processing failed', error);

      await this.techEventLogService.log({
        eventType: TechEventType.SYSTEM_ERROR,
        scope: 'scheduled',
        severity: LogSeverity.ERROR,
        payload: {
          task: 'membership_batch',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  /**
   * Process auto-renewal memberships for a specific tenant schema
   */
  private async processAutoRenewals(tenantSchema: string): Promise<{ renewed: number; failed: number }> {
    const prisma = this.databaseService.getPrisma();
    const now = new Date();
    let renewed = 0;
    let failed = 0;

    // Find memberships that need auto-renewal using raw SQL
    const membershipsToRenew = await prisma.$queryRawUnsafe<Array<{
      id: string;
      valid_to: Date;
      default_renewal_days: number | null;
    }>>(`
      SELECT 
        mr.id,
        mr.valid_to,
        mt.default_renewal_days
      FROM "${tenantSchema}".membership_record mr
      JOIN "${tenantSchema}".membership_level ml ON ml.id = mr.membership_level_id
      JOIN "${tenantSchema}".membership_type mt ON mt.id = ml.membership_type_id
      WHERE mr.valid_to < $1::timestamptz
        AND mr.is_expired = false
        AND mr.auto_renew = true
      LIMIT 100
    `, now);

    for (const record of membershipsToRenew) {
      try {
        // Calculate renewal period
        const renewalDays = record.default_renewal_days || 30;
        const newValidTo = new Date(record.valid_to);
        newValidTo.setDate(newValidTo.getDate() + renewalDays);

        // Update record using raw SQL
        await prisma.$executeRawUnsafe(`
          UPDATE "${tenantSchema}".membership_record
          SET valid_to = $1::timestamptz, updated_at = NOW()
          WHERE id = $2::uuid
        `, newValidTo, record.id);

        // Record change log using raw SQL
        await prisma.$executeRawUnsafe(`
          INSERT INTO "${tenantSchema}".change_log (
            id, action, object_type, object_id, object_name, diff, operator_id, ip_address, occurred_at
          ) VALUES (
            gen_random_uuid(), 'update', 'membership_record', $1::uuid, 'Membership auto-renewal', $2::jsonb, NULL, '0.0.0.0'::inet, NOW()
          )
        `,
          record.id,
          JSON.stringify({
            old: { validTo: record.valid_to?.toISOString() },
            new: { validTo: newValidTo.toISOString(), autoRenewed: true },
          }),
        );

        renewed++;
      } catch (error) {
        this.logger.warn(`Failed to auto-renew membership ${record.id}`, error);
        failed++;
      }
    }

    return { renewed, failed };
  }

  /**
   * Process membership expirations for a specific tenant schema
   */
  private async processExpirations(tenantSchema: string): Promise<number> {
    const prisma = this.databaseService.getPrisma();
    const now = new Date();

    // Mark expired memberships (non-auto-renew) using raw SQL
    const result = await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".membership_record
      SET is_expired = true, expired_at = $1::timestamptz, updated_at = NOW()
      WHERE valid_to < $1::timestamptz
        AND is_expired = false
        AND auto_renew = false
    `, now);

    // Log individual expirations for Change Log
    if (Number(result) > 0) {
      const expiredRecords = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
        SELECT id FROM "${tenantSchema}".membership_record
        WHERE expired_at = $1::timestamptz AND is_expired = true
        LIMIT 100
      `, now);

      // Create change logs for each expired record
      for (const record of expiredRecords) {
        try {
          await prisma.$executeRawUnsafe(`
            INSERT INTO "${tenantSchema}".change_log (
              id, action, object_type, object_id, object_name, diff, operator_id, ip_address, occurred_at
            ) VALUES (
              gen_random_uuid(), 'update', 'membership_record', $1::uuid, 'Membership expired', $2::jsonb, NULL, '0.0.0.0'::inet, NOW()
            )
          `,
            record.id,
            JSON.stringify({
              old: { isExpired: false },
              new: { isExpired: true, expiredAt: now.toISOString() },
            }),
          );
        } catch {
          // Ignore individual change log failures
        }
      }
    }

    return Number(result);
  }

  /**
   * Get upcoming expirations for notifications (multi-tenant aware)
   */
  async getUpcomingExpirations(daysAhead: number = 7, tenantSchema: string): Promise<Array<{
    customerId: string;
    membershipLevelName: string;
    expiresAt: Date;
  }>> {
    const prisma = this.databaseService.getPrisma();
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const upcomingExpirations = await prisma.$queryRawUnsafe<Array<{
      customer_id: string;
      level_name_en: string;
      valid_to: Date;
    }>>(`
      SELECT 
        mr.customer_id,
        ml.name_en as level_name_en,
        mr.valid_to
      FROM "${tenantSchema}".membership_record mr
      JOIN "${tenantSchema}".membership_level ml ON ml.id = mr.membership_level_id
      WHERE mr.valid_to >= $1::timestamptz
        AND mr.valid_to <= $2::timestamptz
        AND mr.is_expired = false
        AND mr.auto_renew = false
    `, now, futureDate);

    return upcomingExpirations.map((record) => ({
      customerId: record.customer_id,
      membershipLevelName: record.level_name_en,
      expiresAt: record.valid_to,
    }));
  }
}
