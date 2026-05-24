// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { CronJob } from 'cron';
import type Redis from 'ioredis';

import { PrismaClient } from '@tcrn/database';

import { scheduleMembershipRenewalJob } from './jobs/membership-renewal.job';
import { workerLogger as logger } from './logger';
import { logCleanupQueue, membershipRenewalQueue } from './queues';

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
const SCHEDULE_LOCK_TTL_SECONDS = 26 * 60 * 60;
const SCHEDULE_DAY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: TOKYO_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export interface ScheduledJobLock {
  acquire: (lockKey: string, ttlSeconds: number) => Promise<boolean>;
}

export interface ScheduledJobsRuntimeOptions {
  nowProvider?: NowProvider;
  redisConnection?: Pick<Redis, 'set'>;
  scheduleLock?: ScheduledJobLock;
  start?: boolean;
}

interface ScheduledJobHandlerOptions {
  nowProvider?: NowProvider;
  scheduleLock?: ScheduledJobLock;
}

const allowAllScheduleLock: ScheduledJobLock = {
  acquire: async () => true,
};

export class RedisScheduledJobLock implements ScheduledJobLock {
  constructor(private readonly redisConnection: Pick<Redis, 'set'>) {}

  async acquire(lockKey: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redisConnection.set(lockKey, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }
}

export function buildScheduleDayKey(nowMillis: number): string {
  return SCHEDULE_DAY_FORMATTER.format(new Date(nowMillis));
}

export function buildScheduleWindowLockKey(jobName: string, nowMillis: number): string {
  return `worker:schedule:${jobName}:${buildScheduleDayKey(nowMillis)}`;
}

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
  eventLogger: ScheduledJobLogger = logger,
  {
    nowProvider = () => Date.now(),
    scheduleLock = allowAllScheduleLock,
  }: ScheduledJobHandlerOptions = {}
): () => Promise<void> {
  return async () => {
    const nowMillis = nowProvider();
    const scheduleDayKey = buildScheduleDayKey(nowMillis);
    const lockKey = buildScheduleWindowLockKey('membership-renewal', nowMillis);
    const acquired = await scheduleLock.acquire(lockKey, SCHEDULE_LOCK_TTL_SECONDS);

    if (!acquired) {
      eventLogger.info(
        `Skipping membership renewal schedule for window ${scheduleDayKey}: another worker already acquired the daily lock`
      );
      return;
    }

    eventLogger.info('Triggering scheduled membership renewal for all tenants');

    try {
      const tenants = await getActiveTenants(prisma, eventLogger);
      eventLogger.info(`Found ${tenants.length} active tenants for membership renewal`);

      for (const tenant of tenants) {
        try {
          await scheduleMembershipRenewalJob(
            membershipRenewalQueue,
            tenant.code,
            tenant.schemaName,
            scheduleDayKey
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

export function createLogCleanupHandler(
  prisma: PrismaClient,
  eventLogger: ScheduledJobLogger = logger,
  nowProvider: NowProvider = () => Date.now(),
  scheduleLock: ScheduledJobLock = allowAllScheduleLock
): () => Promise<void> {
  return async () => {
    const nowMillis = nowProvider();
    const scheduleDayKey = buildScheduleDayKey(nowMillis);
    const lockKey = buildScheduleWindowLockKey('log-cleanup', nowMillis);
    const acquired = await scheduleLock.acquire(lockKey, SCHEDULE_LOCK_TTL_SECONDS);

    if (!acquired) {
      eventLogger.info(
        `Skipping log cleanup schedule for window ${scheduleDayKey}: another worker already acquired the daily lock`
      );
      return;
    }

    eventLogger.info('Triggering scheduled log cleanup for all tenants');

    try {
      const tenants = await getActiveTenants(prisma, eventLogger);
      eventLogger.info(`Found ${tenants.length} active tenants for log cleanup`);

      for (const tenant of tenants) {
        try {
          await logCleanupQueue.add(
            'log-cleanup',
            { tenantSchemaName: tenant.schemaName },
            { jobId: `log_cleanup_${tenant.code}_${scheduleDayKey}` }
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
  nowProvider: NowProvider = () => Date.now(),
  scheduleLock: ScheduledJobLock = allowAllScheduleLock
): CronJob[] {
  const cronJobs = [
    new CronJob(
      '0 2 * * *',
      createMembershipRenewalHandler(prisma, eventLogger, { nowProvider, scheduleLock }),
      null,
      start,
      TOKYO_TIMEZONE
    ),
    new CronJob(
      '0 4 * * *',
      createLogCleanupHandler(prisma, eventLogger, nowProvider, scheduleLock),
      null,
      start,
      TOKYO_TIMEZONE
    ),
  ];

  eventLogger.info('Membership renewal cron scheduled (daily at 2:00 AM JST)');
  eventLogger.info('Log cleanup cron scheduled (daily at 4:00 AM JST)');

  return cronJobs;
}

export async function setupScheduledJobsRuntime(
  eventLogger: ScheduledJobLogger = logger,
  options: ScheduledJobsRuntimeOptions = {}
): Promise<ScheduledJobRuntime> {
  eventLogger.info('Setting up scheduled jobs...');

  const prisma = new PrismaClient();
  const scheduleLock =
    options.scheduleLock ??
    (options.redisConnection
      ? new RedisScheduledJobLock(options.redisConnection)
      : allowAllScheduleLock);
  const cronJobs = createScheduledCronJobs(
    prisma,
    eventLogger,
    options.start ?? true,
    options.nowProvider ?? (() => Date.now()),
    scheduleLock
  );

  eventLogger.info('Scheduled jobs initialized');

  return {
    prisma,
    cronJobs,
  };
}
