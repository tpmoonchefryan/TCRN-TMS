// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { CronJob } from 'cron';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createLogCleanupHandler,
  createMembershipRenewalHandler,
  createPiiCleanupHandler,
  createScheduledCronJobs,
  getActiveTenants,
} from '../worker-schedules';

const {
  addLogCleanupJob,
  membershipRenewalQueue,
  piiCleanupQueue,
  piiHealthCheckQueue,
  scheduleMembershipRenewalJob,
  schedulePiiCleanupJob,
  setupPiiHealthCheckCron,
} = vi.hoisted(() => ({
  addLogCleanupJob: vi.fn(),
  membershipRenewalQueue: { add: vi.fn() },
  piiCleanupQueue: { add: vi.fn() },
  piiHealthCheckQueue: { add: vi.fn() },
  scheduleMembershipRenewalJob: vi.fn(),
  schedulePiiCleanupJob: vi.fn(),
  setupPiiHealthCheckCron: vi.fn(),
}));

vi.mock('../jobs/membership-renewal.job', () => ({
  scheduleMembershipRenewalJob,
}));

vi.mock('../jobs/pii-cleanup.job', () => ({
  schedulePiiCleanupJob,
}));

vi.mock('../jobs/pii-health-check.job', () => ({
  setupPiiHealthCheckCron,
}));

vi.mock('../queues', () => ({
  logCleanupQueue: { add: addLogCleanupJob },
  membershipRenewalQueue,
  piiCleanupQueue,
  piiHealthCheckQueue,
}));

function createLogger() {
  return {
    info: vi.fn(),
    error: vi.fn(),
  };
}

function createPrismaMock() {
  return {
    tenant: {
      findMany: vi.fn(),
    },
  };
}

describe('getActiveTenants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns active tenants from Prisma', async () => {
    const prisma = createPrismaMock();
    const logger = createLogger();
    prisma.tenant.findMany.mockResolvedValueOnce([
      { id: 'tenant-1', code: 'AC', schemaName: 'tenant_ac' },
    ]);

    await expect(getActiveTenants(prisma as never, logger)).resolves.toEqual([
      { id: 'tenant-1', code: 'AC', schemaName: 'tenant_ac' },
    ]);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs and returns an empty list when tenant discovery fails', async () => {
    const prisma = createPrismaMock();
    const logger = createLogger();
    prisma.tenant.findMany.mockRejectedValueOnce(new Error('db unavailable'));

    await expect(getActiveTenants(prisma as never, logger)).resolves.toEqual([]);
    expect(logger.error).toHaveBeenCalledWith('Failed to fetch active tenants: db unavailable');
  });
});

describe('scheduled job handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('schedules membership renewal per tenant and isolates per-tenant failures', async () => {
    const prisma = createPrismaMock();
    const logger = createLogger();
    prisma.tenant.findMany.mockResolvedValueOnce([
      { id: 'tenant-1', code: 'AC', schemaName: 'tenant_ac' },
      { id: 'tenant-2', code: 'BROKEN', schemaName: 'tenant_broken' },
    ]);
    scheduleMembershipRenewalJob
      .mockResolvedValueOnce('renewal_ac')
      .mockRejectedValueOnce(new Error('queue unavailable'));

    await createMembershipRenewalHandler(prisma as never, logger)();

    expect(scheduleMembershipRenewalJob).toHaveBeenNthCalledWith(
      1,
      membershipRenewalQueue,
      'AC',
      'tenant_ac'
    );
    expect(scheduleMembershipRenewalJob).toHaveBeenNthCalledWith(
      2,
      membershipRenewalQueue,
      'BROKEN',
      'tenant_broken'
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to schedule membership renewal for tenant BROKEN: queue unavailable'
    );
    expect(logger.info).toHaveBeenCalledWith('Membership renewal scheduled for 2 tenants');
  });

  it('schedules tenant log cleanup jobs with deterministic job ids', async () => {
    const prisma = createPrismaMock();
    const logger = createLogger();
    prisma.tenant.findMany.mockResolvedValueOnce([
      { id: 'tenant-1', code: 'AC', schemaName: 'tenant_ac' },
    ]);

    await createLogCleanupHandler(prisma as never, logger, () => 123456)();

    expect(addLogCleanupJob).toHaveBeenCalledWith(
      'log-cleanup',
      { tenantSchemaName: 'tenant_ac' },
      { jobId: 'log_cleanup_AC_123456' }
    );
    expect(logger.info).toHaveBeenCalledWith('Scheduled log cleanup for tenant: AC');
  });

  it('schedules the shared PII cleanup job', async () => {
    const logger = createLogger();

    await createPiiCleanupHandler(logger)();

    expect(schedulePiiCleanupJob).toHaveBeenCalledWith(piiCleanupQueue);
    expect(logger.info).toHaveBeenCalledWith('PII cleanup job scheduled');
  });
});

describe('createScheduledCronJobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates the four started cron registrations in Tokyo timezone when requested', () => {
    const logger = createLogger();
    const cronJobs = createScheduledCronJobs(createPrismaMock() as never, logger, false);

    expect(cronJobs).toHaveLength(4);
    expect(cronJobs.every((cronJob) => cronJob instanceof CronJob)).toBe(true);
    expect(logger.info).toHaveBeenCalledWith(
      'Membership renewal cron scheduled (daily at 2:00 AM JST)'
    );
    expect(logger.info).toHaveBeenCalledWith('Permission refresh cron scheduled (every 6 hours)');
    expect(logger.info).toHaveBeenCalledWith(
      'PII cleanup cron scheduled (weekly on Sunday at 3:00 AM JST)'
    );
    expect(logger.info).toHaveBeenCalledWith('Log cleanup cron scheduled (daily at 4:00 AM JST)');
  });
});
