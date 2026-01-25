// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { Job } from 'bullmq';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { membershipRenewalJobProcessor, MembershipRenewalJobData, MembershipRenewalJobResult } from '../membership-renewal.job';

// Mock PrismaClient
const mockPrisma = {
  membershipRecord: {
    findMany: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
  },
  changeLog: {
    create: vi.fn(),
  },
  $disconnect: vi.fn(),
};

vi.mock('@tcrn/database', () => ({
  PrismaClient: class MockPrismaClient {
    membershipRecord = mockPrisma.membershipRecord;
    changeLog = mockPrisma.changeLog;
    $disconnect = mockPrisma.$disconnect;
  },
}));

describe('MembershipRenewalJobProcessor', () => {
  let mockJob: Job<MembershipRenewalJobData, MembershipRenewalJobResult>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockJob = {
      data: {
        jobId: 'job-123',
        tenantId: 'tenant-456',
        tenantSchemaName: 'tenant_test',
        triggerType: 'scheduled',
        options: {
          dryRun: true,
          daysBeforeExpiry: 7,
        },
      },
      updateProgress: vi.fn(),
    } as unknown as Job<MembershipRenewalJobData, MembershipRenewalJobResult>;
  });

  describe('membershipRenewalJobProcessor', () => {
    it('should process renewal job in dry run mode', async () => {
      // Mock expiring memberships
      mockPrisma.membershipRecord.findMany.mockResolvedValueOnce([
        {
          id: 'membership-1',
          customerId: 'customer-1',
          validTo: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
          autoRenew: true,
          isExpired: false,
          customer: { id: 'customer-1', nickname: 'TestUser', isActive: true },
          membershipType: { id: 'type-1', code: 'YOUTUBE', defaultRenewalDays: 30, externalControl: false },
          membershipLevel: { id: 'level-1', code: 'LEVEL_1' },
        },
      ]);

      // Mock expired memberships
      mockPrisma.membershipRecord.findMany.mockResolvedValueOnce([]);

      const result = await membershipRenewalJobProcessor(mockJob);

      expect(result.dryRun).toBe(true);
      expect(result.processedCount).toBeGreaterThanOrEqual(0);
    });

    it('should skip inactive customers', async () => {
      mockPrisma.membershipRecord.findMany.mockResolvedValueOnce([
        {
          id: 'membership-1',
          customer: { id: 'customer-1', nickname: 'InactiveUser', isActive: false },
          membershipType: { externalControl: false, defaultRenewalDays: 30 },
        },
      ]);
      mockPrisma.membershipRecord.findMany.mockResolvedValueOnce([]);

      const result = await membershipRenewalJobProcessor(mockJob);

      // Should not renew inactive customer's membership
      expect(result.renewedCount).toBe(0);
    });

    it('should skip externally controlled memberships', async () => {
      mockPrisma.membershipRecord.findMany.mockResolvedValueOnce([
        {
          id: 'membership-1',
          customer: { id: 'customer-1', nickname: 'User', isActive: true },
          membershipType: { externalControl: true, defaultRenewalDays: 30 },
        },
      ]);
      mockPrisma.membershipRecord.findMany.mockResolvedValueOnce([]);

      const result = await membershipRenewalJobProcessor(mockJob);

      // Should not renew externally controlled membership
      expect(result.renewedCount).toBe(0);
    });

    it('should mark expired memberships', async () => {
      mockPrisma.membershipRecord.findMany
        .mockResolvedValueOnce([]) // No expiring memberships
        .mockResolvedValueOnce([
          { id: 'expired-1', validTo: new Date(Date.now() - 1000) },
          { id: 'expired-2', validTo: new Date(Date.now() - 2000) },
        ]);

      const result = await membershipRenewalJobProcessor(mockJob);

      expect(result.expiredCount).toBe(2);
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.membershipRecord.findMany.mockResolvedValueOnce([
        {
          id: 'membership-1',
          customer: { id: 'customer-1', nickname: 'User', isActive: true },
          membershipType: { externalControl: false, defaultRenewalDays: 30 },
        },
      ]);
      mockPrisma.membershipRecord.findMany.mockResolvedValueOnce([]);

      // Simulate error on actual update (when not dry run)
      mockJob.data.options = { dryRun: false };
      mockPrisma.membershipRecord.update.mockRejectedValue(new Error('DB error'));

      const result = await membershipRenewalJobProcessor(mockJob);

      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('scheduleMembershipRenewalJob', () => {
    it('should schedule a renewal job', async () => {
      const { scheduleMembershipRenewalJob } = await import('../membership-renewal.job');
      
      const mockQueue = {
        add: vi.fn().mockResolvedValue({}),
      };

      const jobId = await scheduleMembershipRenewalJob(mockQueue, 'tenant-123', 'tenant_test');

      expect(mockQueue.add).toHaveBeenCalledWith(
        'membership-renewal',
        expect.objectContaining({
          tenantId: 'tenant-123',
          triggerType: 'scheduled',
        }),
        expect.any(Object),
      );
      expect(jobId).toBeDefined();
    });
  });
});
