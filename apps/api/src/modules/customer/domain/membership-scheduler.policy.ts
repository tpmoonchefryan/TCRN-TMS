// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { LogSeverity, TechEventType } from '@tcrn/shared';

export interface MembershipBatchStats {
  renewed: number;
  failed: number;
  expired: number;
}

export interface MembershipRenewalCandidate {
  id: string;
  validTo: Date;
  defaultRenewalDays: number | null;
}

export interface UpcomingExpirationRecord {
  customerId: string;
  membershipLevelName: string;
  expiresAt: Date;
}

export const createEmptyMembershipBatchStats = (): MembershipBatchStats => ({
  renewed: 0,
  failed: 0,
  expired: 0,
});

export const accumulateMembershipBatchStats = (
  current: MembershipBatchStats,
  next: MembershipBatchStats,
): MembershipBatchStats => ({
  renewed: current.renewed + next.renewed,
  failed: current.failed + next.failed,
  expired: current.expired + next.expired,
});

export const calculateRenewedMembershipValidTo = (
  validTo: Date,
  defaultRenewalDays: number | null,
): Date => {
  const newValidTo = new Date(validTo);
  newValidTo.setDate(newValidTo.getDate() + (defaultRenewalDays || 30));
  return newValidTo;
};

export const buildMembershipAutoRenewChangeLogDiff = (
  oldValidTo: Date,
  newValidTo: Date,
): string =>
  JSON.stringify({
    old: { validTo: oldValidTo.toISOString() },
    new: { validTo: newValidTo.toISOString(), autoRenewed: true },
  });

export const buildMembershipExpiredChangeLogDiff = (expiredAt: Date): string =>
  JSON.stringify({
    old: { isExpired: false },
    new: { isExpired: true, expiredAt: expiredAt.toISOString() },
  });

export const buildMembershipBatchCompletedEvent = (
  stats: MembershipBatchStats,
  durationMs: number,
  tenantsProcessed: number,
) => ({
  eventType: TechEventType.SCHEDULED_TASK_COMPLETED,
  scope: 'scheduled' as const,
  severity: LogSeverity.INFO,
  payload: {
    task: 'membership_batch',
    auto_renewed_count: stats.renewed,
    auto_renew_failed_count: stats.failed,
    expired_count: stats.expired,
    duration_ms: durationMs,
    tenants_processed: tenantsProcessed,
  },
});

export const buildMembershipBatchFailedEvent = (error: unknown) => ({
  eventType: TechEventType.SYSTEM_ERROR,
  scope: 'scheduled' as const,
  severity: LogSeverity.ERROR,
  payload: {
    task: 'membership_batch',
    error: error instanceof Error ? error.message : 'Unknown error',
  },
});
