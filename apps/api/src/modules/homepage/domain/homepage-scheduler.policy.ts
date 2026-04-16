// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

export interface HomepageDraftArchivalResult {
  archived: number;
  cutoffDate: Date;
}

export const HOMEPAGE_DRAFT_ARCHIVAL_DAYS = 30;
export const HOMEPAGE_DRAFT_ARCHIVAL_COMPLETED_EVENT =
  'HOMEPAGE_DRAFT_ARCHIVAL_COMPLETED';
export const HOMEPAGE_DRAFT_ARCHIVAL_FAILED_EVENT = 'HOMEPAGE_DRAFT_ARCHIVAL_FAILED';

export const calculateHomepageDraftArchivalCutoff = (
  now = new Date(),
  archivalDays = HOMEPAGE_DRAFT_ARCHIVAL_DAYS,
): Date => {
  const cutoffDate = new Date(now);
  cutoffDate.setDate(cutoffDate.getDate() - archivalDays);
  return cutoffDate;
};

export const accumulateArchivedDraftCount = (
  currentTotal: number,
  archivedForTenant: number,
): number => currentTotal + archivedForTenant;

export const buildHomepageDraftArchivalCompletedPayload = (
  result: HomepageDraftArchivalResult,
) => ({
  archivedCount: result.archived,
  cutoffDate: result.cutoffDate,
});

export const buildHomepageDraftArchivalCompletedMessage = (
  archivedCount: number,
): string => `Archived ${archivedCount} old draft versions`;
