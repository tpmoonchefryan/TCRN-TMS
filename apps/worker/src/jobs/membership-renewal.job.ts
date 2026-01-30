// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Membership Auto-Renewal Job Processor (PRD §11.6)

import { PrismaClient } from '@tcrn/database';
import type { Job, Processor, Queue } from 'bullmq';

import { membershipRenewalLogger as logger } from '../logger';

/**
 * Membership renewal job data
 */
export interface MembershipRenewalJobData {
  jobId: string;
  tenantId: string;
  tenantSchemaName: string;
  triggerType: 'scheduled' | 'manual';
  options?: {
    dryRun?: boolean;
    membershipTypeIds?: string[];
    daysBeforeExpiry?: number; // Default: 7 days
  };
}

/**
 * Membership renewal job result
 */
export interface MembershipRenewalJobResult {
  processedCount: number;
  renewedCount: number;
  expiredCount: number;
  errors: Array<{ membershipId: string; message: string }>;
  dryRun: boolean;
}

/**
 * Membership renewal job processor
 * Handles auto-renewal of memberships based on configuration
 */
export const membershipRenewalJobProcessor: Processor<MembershipRenewalJobData, MembershipRenewalJobResult> = async (
  job: Job<MembershipRenewalJobData, MembershipRenewalJobResult>
) => {
  const { jobId, tenantId, tenantSchemaName: _tenantSchemaName, triggerType, options } = job.data;
  const startTime = Date.now();
  const dryRun = options?.dryRun ?? false;
  const daysBeforeExpiry = options?.daysBeforeExpiry ?? 7;

  logger.info(`Processing membership renewal job ${jobId} for tenant ${tenantId}`);
  logger.info(`Trigger: ${triggerType}, Dry run: ${dryRun}`);

  const prisma = new PrismaClient();
  const result: MembershipRenewalJobResult = {
    processedCount: 0,
    renewedCount: 0,
    expiredCount: 0,
    errors: [],
    dryRun,
  };

  try {
    const now = new Date();
    const expiryThreshold = new Date(now.getTime() + daysBeforeExpiry * 24 * 60 * 60 * 1000);

    // 1. Find memberships expiring soon with auto_renew enabled
    const expiringMemberships = await prisma.membershipRecord.findMany({
      where: {
        autoRenew: true,
        isExpired: false,
        validTo: {
          lte: expiryThreshold,
          gt: now,
        },
        membershipTypeId: options?.membershipTypeIds?.length
          ? { in: options.membershipTypeIds }
          : undefined,
      },
      include: {
        customer: {
          select: {
            id: true,
            nickname: true,
            isActive: true,
          },
        },
        membershipType: {
          select: {
            id: true,
            code: true,
            defaultRenewalDays: true,
            externalControl: true,
          },
        },
        membershipLevel: {
          select: {
            id: true,
            code: true,
          },
        },
      },
    });

    logger.info(`Found ${expiringMemberships.length} memberships expiring within ${daysBeforeExpiry} days`);

    // 2. Process each membership
    for (const membership of expiringMemberships) {
      result.processedCount++;

      try {
        // Skip if customer is inactive
        if (!membership.customer.isActive) {
          logger.info(`Skipping ${membership.id}: customer ${membership.customer.nickname} is inactive`);
          continue;
        }

        // Skip if externally controlled (renewal handled by external API)
        if (membership.membershipType.externalControl) {
          logger.info(`Skipping ${membership.id}: externally controlled membership`);
          continue;
        }

        // Calculate new expiry date
        const currentExpiry = membership.validTo;
        if (!currentExpiry) {
          logger.info(`Skipping ${membership.id}: no valid_to date`);
          continue;
        }
        const renewalDays = membership.membershipType.defaultRenewalDays;
        const newExpiry = new Date(currentExpiry.getTime() + renewalDays * 24 * 60 * 60 * 1000);

        if (!dryRun) {
          // Update membership with new expiry
          await prisma.membershipRecord.update({
            where: { id: membership.id },
            data: {
              validTo: newExpiry,
              note: `Auto-renewed on ${now.toISOString().split('T')[0]}. Previous expiry: ${currentExpiry.toISOString().split('T')[0]}`,
            },
          });

          // Log the renewal (Change Log)
          await prisma.changeLog.create({
            data: {
              objectType: 'MembershipRecord',
              objectId: membership.id,
              action: 'auto_renew',
              diff: {
                validTo: {
                  old: currentExpiry.toISOString(),
                  new: newExpiry.toISOString(),
                },
              },
              operatorName: 'System',
              occurredAt: now,
            },
          });
        }

        result.renewedCount++;
        logger.info(`${dryRun ? '[DRY RUN] Would renew' : 'Renewed'} membership ${membership.id} for customer ${membership.customer.nickname}`);
        logger.info(`Old expiry: ${currentExpiry.toISOString().split('T')[0]}, New expiry: ${newExpiry.toISOString().split('T')[0]}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push({
          membershipId: membership.id,
          message: errorMessage,
        });
        logger.error(`Error renewing membership ${membership.id}: ${errorMessage}`);
      }

      // Update progress
      if (result.processedCount % 50 === 0) {
        await job.updateProgress(Math.round((result.processedCount / expiringMemberships.length) * 100));
      }
    }

    // 3. Mark expired memberships
    const expiredMemberships = await prisma.membershipRecord.findMany({
      where: {
        isExpired: false,
        validTo: {
          lt: now,
        },
      },
    });

    logger.info(`Found ${expiredMemberships.length} memberships to mark as expired`);

    if (!dryRun && expiredMemberships.length > 0) {
      await prisma.membershipRecord.updateMany({
        where: {
          id: {
            in: expiredMemberships.map(m => m.id),
          },
        },
        data: {
          isExpired: true,
          expiredAt: now,
        },
      });
    }

    result.expiredCount = expiredMemberships.length;

    const duration = Date.now() - startTime;
    logger.info(`Membership renewal job ${jobId} completed in ${duration}ms`);
    logger.info(`Processed: ${result.processedCount}, Renewed: ${result.renewedCount}, Expired: ${result.expiredCount}`);

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Membership renewal job ${jobId} failed: ${errorMessage}`);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
};


/**
 * Create scheduled membership renewal job
 * Should be called by a cron job (e.g., daily at 2:00 AM)
 */
export async function scheduleMembershipRenewalJob(
  queue: Queue | { add: (name: string, data: MembershipRenewalJobData, opts?: unknown) => Promise<unknown> },
  tenantId: string,
  tenantSchemaName: string
) {
  const jobId = `renewal_${tenantId}_${Date.now()}`;

  await queue.add(
    'membership-renewal',
    {
      jobId,
      tenantId,
      tenantSchemaName,
      triggerType: 'scheduled',
      options: {
        daysBeforeExpiry: 7,
      },
    },
    {
      jobId,
      removeOnComplete: {
        age: 7 * 24 * 3600, // Keep for 7 days
      },
    }
  );

  logger.info(`Scheduled membership renewal job ${jobId} for tenant ${tenantId}`);
  return jobId;
}
