// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Orphan PII Cleanup Job Processor (PRD §11 - PII Data Separation)

import { PrismaClient } from '@tcrn/database';
import type { Job, Processor } from 'bullmq';

import { piiCleanupLogger as logger } from '../logger';

// PII Service configuration
const PII_SERVICE_URL = process.env.PII_SERVICE_URL || 'http://localhost:4100';
const PII_SERVICE_API_KEY = process.env.PII_SERVICE_API_KEY || '';

/**
 * PII cleanup job data
 */
export interface PiiCleanupJobData {
  jobId: string;
  triggerType: 'scheduled' | 'manual';
  options?: {
    dryRun?: boolean;
    batchSize?: number;
  };
}

/**
 * PII cleanup job result
 */
export interface PiiCleanupJobResult {
  totalPiiProfiles: number;
  orphanedProfiles: number;
  cleanedProfiles: number;
  errors: Array<{ profileId: string; message: string }>;
  dryRun: boolean;
}

/**
 * Fetch all profile IDs from PII service
 */
async function fetchPiiProfileIds(): Promise<string[]> {
  try {
    const response = await fetch(`${PII_SERVICE_URL}/api/v1/profiles/ids`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PII_SERVICE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`PII service returned ${response.status}`);
    }

    const data = await response.json() as { profileIds?: string[] };
    return data.profileIds || [];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to fetch PII profile IDs: ${errorMessage}`);
    return [];
  }
}

/**
 * Delete a profile from PII service
 */
async function deletePiiProfile(profileId: string): Promise<boolean> {
  try {
    const response = await fetch(`${PII_SERVICE_URL}/api/v1/profiles/${profileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${PII_SERVICE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`PII service returned ${response.status}`);
    }

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to delete PII profile ${profileId}: ${errorMessage}`);
    return false;
  }
}

/**
 * PII cleanup job processor
 * Identifies and removes orphaned PII records that no longer have corresponding customer profiles
 */
export const piiCleanupJobProcessor: Processor<PiiCleanupJobData, PiiCleanupJobResult> = async (
  job: Job<PiiCleanupJobData, PiiCleanupJobResult>
) => {
  const { jobId, triggerType, options } = job.data;
  const startTime = Date.now();
  const dryRun = options?.dryRun ?? false;
  const batchSize = options?.batchSize ?? 100;

  logger.info(`Processing PII cleanup job ${jobId}`);
  logger.info(`Trigger: ${triggerType}, Dry run: ${dryRun}, Batch size: ${batchSize}`);

  const prisma = new PrismaClient();
  const result: PiiCleanupJobResult = {
    totalPiiProfiles: 0,
    orphanedProfiles: 0,
    cleanedProfiles: 0,
    errors: [],
    dryRun,
  };

  try {
    // 1. Fetch all profile IDs from PII service
    logger.info('Fetching profile IDs from PII service...');
    const piiProfileIds = await fetchPiiProfileIds();
    result.totalPiiProfiles = piiProfileIds.length;
    logger.info(`Found ${piiProfileIds.length} profiles in PII service`);

    if (piiProfileIds.length === 0) {
      logger.info('No PII profiles found, skipping cleanup');
      return result;
    }

    // 2. Get all rm_profile_id from main database (across all tenants)
    // Query customer_profile table directly since rm_profile_id is there
    const existingProfiles = await prisma.customerProfile.findMany({
      where: {
        rmProfileId: {
          in: piiProfileIds,
        },
      },
      select: {
        rmProfileId: true,
      },
    });

    const existingProfileIds = new Set(existingProfiles.map(p => p.rmProfileId));
    logger.info(`Found ${existingProfileIds.size} matching profiles in main database`);

    // 3. Find orphaned profiles (in PII service but not in main database)
    const orphanedIds = piiProfileIds.filter(id => !existingProfileIds.has(id));
    result.orphanedProfiles = orphanedIds.length;
    logger.info(`Found ${orphanedIds.length} orphaned profiles`);

    if (orphanedIds.length === 0) {
      logger.info('No orphaned profiles found');
      return result;
    }

    // 4. Delete orphaned profiles (in batches)
    logger.info(`${dryRun ? '[DRY RUN] Would delete' : 'Deleting'} ${orphanedIds.length} orphaned profiles`);

    for (let i = 0; i < orphanedIds.length; i += batchSize) {
      const batch = orphanedIds.slice(i, i + batchSize);
      
      for (const profileId of batch) {
        if (!dryRun) {
          const success = await deletePiiProfile(profileId);
          if (success) {
            result.cleanedProfiles++;
            logger.info(`Deleted orphaned PII profile: ${profileId}`);
          } else {
            result.errors.push({
              profileId,
              message: 'Failed to delete from PII service',
            });
          }
        } else {
          result.cleanedProfiles++;
          logger.info(`[DRY RUN] Would delete orphaned PII profile: ${profileId}`);
        }
      }

      // Update progress
      const progress = Math.round(((i + batch.length) / orphanedIds.length) * 100);
      await job.updateProgress(progress);
    }

    const duration = Date.now() - startTime;
    logger.info(`PII cleanup job ${jobId} completed in ${duration}ms`);
    logger.info(`Total: ${result.totalPiiProfiles}, Orphaned: ${result.orphanedProfiles}, Cleaned: ${result.cleanedProfiles}`);

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`PII cleanup job ${jobId} failed: ${errorMessage}`);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
};

/**
 * Schedule a PII cleanup job
 * Should be called by a cron job (e.g., weekly on Sunday at 3:00 AM)
 */
export async function schedulePiiCleanupJob(queue: { add: (name: string, data: PiiCleanupJobData, opts?: { jobId?: string; removeOnComplete?: { age: number } }) => Promise<unknown> }): Promise<string> {
  const jobId = `pii_cleanup_${Date.now()}`;

  await queue.add(
    'pii-cleanup',
    {
      jobId,
      triggerType: 'scheduled',
      options: {
        dryRun: false,
        batchSize: 50,
      },
    },
    {
      jobId,
      removeOnComplete: {
        age: 30 * 24 * 3600, // Keep for 30 days
      },
    }
  );

  logger.info(`Scheduled PII cleanup job ${jobId}`);
  return jobId;
}
