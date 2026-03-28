// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { PrismaClient } from '@tcrn/database';
import { CronJob } from 'cron';

import { scheduleMembershipRenewalJob } from './jobs/membership-renewal.job';
import { schedulePiiCleanupJob } from './jobs/pii-cleanup.job';
import { setupPiiHealthCheckCron } from './jobs/pii-health-check.job';
import { workerLogger as logger } from './logger';
import {
  logCleanupQueue,
  membershipRenewalQueue,
  piiCleanupQueue,
  piiHealthCheckQueue,
} from './queues';

export interface ActiveTenant {
  id: string;
  code: string;
  schemaName: string;
}

export interface ScheduledJobLogger {
  info: (message: string) => void;
  error: (message: string) => void;
}

export interface ScheduledJobRuntime {
  prisma: PrismaClient;
  cronJobs: CronJob[];
}

type NowProvider = () => number;

const TOKYO_TIMEZONE = 'Asia/Tokyo';

export async function getActiveTenants(
  prisma: PrismaClient,
  eventLogger: ScheduledJobLogger = logger
): Promise<ActiveTenant[]> {
  try {
    return await prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true, code: true, schemaName: true },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    eventLogger.error(`Failed to fetch active tenants: ${errorMessage}`);
    return [];
  }
}

export function createMembershipRenewalHandler(
  prisma: PrismaClient,
  eventLogger: ScheduledJobLogger = logger
): () => Promise<void> {
  return async () => {
    eventLogger.info('Triggering scheduled membership renewal for all tenants');

    try {
      const tenants = await getActiveTenants(prisma, eventLogger);
      eventLogger.info(`Found ${tenants.length} active tenants for membership renewal`);

      for (const tenant of tenants) {
        try {
          await scheduleMembershipRenewalJob(
            membershipRenewalQueue,
            tenant.code,
            tenant.schemaName
          );
          eventLogger.info(`Scheduled membership renewal for tenant: ${tenant.code}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          eventLogger.error(
            `Failed to schedule membership renewal for tenant ${tenant.code}: ${errorMessage}`
          );
        }
      }

      eventLogger.info(`Membership renewal scheduled for ${tenants.length} tenants`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      eventLogger.error(`Failed to schedule membership renewal: ${errorMessage}`);
    }
  };
}

export function createPermissionRefreshHandler(
  prisma: PrismaClient,
  eventLogger: ScheduledJobLogger = logger
): () => Promise<void> {
  return async () => {
    eventLogger.info('Triggering scheduled permission refresh for all tenants');

    try {
      const tenants = await getActiveTenants(prisma, eventLogger);
      eventLogger.info(`Found ${tenants.length} active tenants for permission refresh`);

      for (const tenant of tenants) {
        eventLogger.info(`Permission refresh triggered for tenant: ${tenant.code}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      eventLogger.error(`Failed to trigger permission refresh: ${errorMessage}`);
    }
  };
}

export function createPiiCleanupHandler(
  eventLogger: ScheduledJobLogger = logger
): () => Promise<void> {
  return async () => {
    eventLogger.info('Triggering scheduled PII orphan cleanup');

    try {
      await schedulePiiCleanupJob(piiCleanupQueue);
      eventLogger.info('PII cleanup job scheduled');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      eventLogger.error(`Failed to schedule PII cleanup: ${errorMessage}`);
    }
  };
}

export function createLogCleanupHandler(
  prisma: PrismaClient,
  eventLogger: ScheduledJobLogger = logger,
  nowProvider: NowProvider = () => Date.now()
): () => Promise<void> {
  return async () => {
    eventLogger.info('Triggering scheduled log cleanup for all tenants');

    try {
      const tenants = await getActiveTenants(prisma, eventLogger);
      eventLogger.info(`Found ${tenants.length} active tenants for log cleanup`);

      for (const tenant of tenants) {
        try {
          await logCleanupQueue.add(
            'log-cleanup',
            { tenantSchemaName: tenant.schemaName },
            { jobId: `log_cleanup_${tenant.code}_${nowProvider()}` }
          );
          eventLogger.info(`Scheduled log cleanup for tenant: ${tenant.code}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          eventLogger.error(
            `Failed to schedule log cleanup for tenant ${tenant.code}: ${errorMessage}`
          );
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      eventLogger.error(`Failed to schedule log cleanup: ${errorMessage}`);
    }
  };
}

export function createScheduledCronJobs(
  prisma: PrismaClient,
  eventLogger: ScheduledJobLogger = logger,
  start = true,
  nowProvider: NowProvider = () => Date.now()
): CronJob[] {
  const cronJobs = [
    new CronJob(
      '0 2 * * *',
      createMembershipRenewalHandler(prisma, eventLogger),
      null,
      start,
      TOKYO_TIMEZONE
    ),
    new CronJob(
      '0 */6 * * *',
      createPermissionRefreshHandler(prisma, eventLogger),
      null,
      start,
      TOKYO_TIMEZONE
    ),
    new CronJob('0 3 * * 0', createPiiCleanupHandler(eventLogger), null, start, TOKYO_TIMEZONE),
    new CronJob(
      '0 4 * * *',
      createLogCleanupHandler(prisma, eventLogger, nowProvider),
      null,
      start,
      TOKYO_TIMEZONE
    ),
  ];

  eventLogger.info('Membership renewal cron scheduled (daily at 2:00 AM JST)');
  eventLogger.info('Permission refresh cron scheduled (every 6 hours)');
  eventLogger.info('PII cleanup cron scheduled (weekly on Sunday at 3:00 AM JST)');
  eventLogger.info('Log cleanup cron scheduled (daily at 4:00 AM JST)');

  return cronJobs;
}

export async function setupScheduledJobsRuntime(
  eventLogger: ScheduledJobLogger = logger
): Promise<ScheduledJobRuntime> {
  eventLogger.info('Setting up scheduled jobs...');

  const prisma = new PrismaClient();
  const cronJobs = createScheduledCronJobs(prisma, eventLogger);

  try {
    await setupPiiHealthCheckCron(piiHealthCheckQueue, 60);
    eventLogger.info('PII health check recurring job scheduled (every 60 seconds)');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    eventLogger.error(`Failed to setup PII health check cron: ${errorMessage}`);
  }

  eventLogger.info('Scheduled jobs initialized');

  return {
    prisma,
    cronJobs,
  };
}
