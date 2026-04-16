// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { MembershipSchedulerApplicationService } from '../application/membership-scheduler.service';
import type { UpcomingExpirationRecord } from '../domain/membership-scheduler.policy';

/**
 * Membership Scheduler Service
 * Handles automatic membership expiration and renewal
 * Compatibility facade for scheduled membership processing.
 */
@Injectable()
export class MembershipSchedulerService {
  constructor(
    private readonly membershipSchedulerApplicationService: MembershipSchedulerApplicationService,
  ) {}

  /**
   * Process membership expiration and auto-renewal
   * Runs daily at 2:00 AM UTC
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async processMembershipBatch(): Promise<void> {
    await this.membershipSchedulerApplicationService.processMembershipBatch();
  }

  /**
   * Get upcoming expirations for notifications (multi-tenant aware)
   */
  getUpcomingExpirations(
    daysAhead = 7,
    tenantSchema: string,
  ): Promise<UpcomingExpirationRecord[]> {
    return this.membershipSchedulerApplicationService.getUpcomingExpirations(
      daysAhead,
      tenantSchema,
    );
  }
}
