// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, Logger } from '@nestjs/common';

import { TechEventLogService } from '../../log';
import {
  accumulateMembershipBatchStats,
  buildMembershipAutoRenewChangeLogDiff,
  buildMembershipBatchCompletedEvent,
  buildMembershipBatchFailedEvent,
  buildMembershipExpiredChangeLogDiff,
  calculateRenewedMembershipValidTo,
  createEmptyMembershipBatchStats,
  type MembershipBatchStats,
  type UpcomingExpirationRecord,
} from '../domain/membership-scheduler.policy';
import { MembershipSchedulerRepository } from '../infrastructure/membership-scheduler.repository';

@Injectable()
export class MembershipSchedulerApplicationService {
  private readonly logger = new Logger(MembershipSchedulerApplicationService.name);

  constructor(
    private readonly membershipSchedulerRepository: MembershipSchedulerRepository,
    private readonly techEventLogService: TechEventLogService,
  ) {}

  async processMembershipBatch(): Promise<void> {
    this.logger.log('Starting membership batch processing...');

    const startTime = Date.now();
    let totalStats = createEmptyMembershipBatchStats();

    try {
      const tenantSchemas = await this.membershipSchedulerRepository.getActiveTenantSchemas();

      for (const tenantSchema of tenantSchemas) {
        try {
          totalStats = accumulateMembershipBatchStats(
            totalStats,
            await this.processTenantMembershipBatch(tenantSchema),
          );
        } catch (tenantError) {
          this.logger.error(`Failed to process tenant ${tenantSchema}`, tenantError);
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Membership batch completed: renewed=${totalStats.renewed}, renewFailed=${totalStats.failed}, expired=${totalStats.expired}, duration=${duration}ms`,
      );

      await this.techEventLogService.log(
        buildMembershipBatchCompletedEvent(totalStats, duration, tenantSchemas.length),
      );
    } catch (error) {
      this.logger.error('Membership batch processing failed', error);
      await this.techEventLogService.log(buildMembershipBatchFailedEvent(error));
    }
  }

  async getUpcomingExpirations(
    daysAhead = 7,
    tenantSchema: string,
  ): Promise<UpcomingExpirationRecord[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return this.membershipSchedulerRepository.getUpcomingExpirations(
      tenantSchema,
      now,
      futureDate,
    );
  }

  private async processTenantMembershipBatch(
    tenantSchema: string,
  ): Promise<MembershipBatchStats> {
    const now = new Date();
    const autoRenewCandidates =
      await this.membershipSchedulerRepository.findMembershipsToAutoRenew(
        tenantSchema,
        now,
      );

    let stats = createEmptyMembershipBatchStats();

    for (const candidate of autoRenewCandidates) {
      try {
        const newValidTo = calculateRenewedMembershipValidTo(
          candidate.validTo,
          candidate.defaultRenewalDays,
        );

        await this.membershipSchedulerRepository.renewMembershipValidity(
          tenantSchema,
          candidate.id,
          newValidTo,
        );
        await this.membershipSchedulerRepository.insertAutoRenewChangeLog(
          tenantSchema,
          candidate.id,
          buildMembershipAutoRenewChangeLogDiff(candidate.validTo, newValidTo),
        );
        stats = {
          ...stats,
          renewed: stats.renewed + 1,
        };
      } catch (error) {
        this.logger.warn(`Failed to auto-renew membership ${candidate.id}`, error);
        stats = {
          ...stats,
          failed: stats.failed + 1,
        };
      }
    }

    const expired = await this.membershipSchedulerRepository.expireMemberships(
      tenantSchema,
      now,
    );

    if (expired > 0) {
      const expiredMembershipIds =
        await this.membershipSchedulerRepository.findExpiredMembershipIds(
          tenantSchema,
          now,
        );

      for (const membershipId of expiredMembershipIds) {
        try {
          await this.membershipSchedulerRepository.insertExpirationChangeLog(
            tenantSchema,
            membershipId,
            buildMembershipExpiredChangeLogDiff(now),
          );
        } catch {
          // Ignore individual change-log failures to preserve the current scheduled contract.
        }
      }
    }

    return {
      ...stats,
      expired,
    };
  }
}
