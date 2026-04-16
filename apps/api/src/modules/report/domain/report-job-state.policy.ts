// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ReportJobStatus } from '../dto/report.dto';

const STATUS_TRANSITIONS: Record<ReportJobStatus, ReportJobStatus[]> = {
  [ReportJobStatus.PENDING]: [ReportJobStatus.RUNNING, ReportJobStatus.CANCELLED],
  [ReportJobStatus.RUNNING]: [ReportJobStatus.SUCCESS, ReportJobStatus.FAILED],
  [ReportJobStatus.SUCCESS]: [ReportJobStatus.CONSUMED, ReportJobStatus.EXPIRED],
  [ReportJobStatus.CONSUMED]: [ReportJobStatus.EXPIRED],
  [ReportJobStatus.EXPIRED]: [],
  [ReportJobStatus.FAILED]: [ReportJobStatus.RETRYING, ReportJobStatus.CANCELLED],
  [ReportJobStatus.RETRYING]: [ReportJobStatus.RUNNING, ReportJobStatus.FAILED],
  [ReportJobStatus.CANCELLED]: [],
};

export const canTransitionReportJob = (
  currentStatus: ReportJobStatus,
  targetStatus: ReportJobStatus,
): boolean => STATUS_TRANSITIONS[currentStatus].includes(targetStatus);

export const buildReportJobTransitionUpdates = (
  job: {
    retryCount: number;
    downloadedAt: Date | null;
  },
  targetStatus: ReportJobStatus,
  updates?: Record<string, unknown>,
  now: Date = new Date(),
): Record<string, unknown> => {
  const statusUpdates: Record<string, unknown> = { status: targetStatus };

  switch (targetStatus) {
    case ReportJobStatus.RUNNING:
      statusUpdates.startedAt = now;
      break;
    case ReportJobStatus.SUCCESS:
      statusUpdates.completedAt = now;
      statusUpdates.expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
      break;
    case ReportJobStatus.CONSUMED:
      if (!job.downloadedAt) {
        statusUpdates.downloadedAt = now;
      }
      break;
    case ReportJobStatus.FAILED:
    case ReportJobStatus.CANCELLED:
      statusUpdates.completedAt = now;
      break;
    case ReportJobStatus.RETRYING:
      statusUpdates.retryCount = job.retryCount + 1;
      break;
    default:
      break;
  }

  return { ...statusUpdates, ...updates };
};

export const getReportJobProgressPercentage = (
  processedRows: number,
  totalRows: number,
): number => {
  if (totalRows <= 0) {
    return 0;
  }

  return Math.min(Math.round((processedRows / totalRows) * 100), 100);
};

export const canDownloadReportJob = (job: {
  status: ReportJobStatus;
  expiresAt: Date | null;
}): boolean => {
  if (
    job.status !== ReportJobStatus.SUCCESS &&
    job.status !== ReportJobStatus.CONSUMED
  ) {
    return false;
  }

  if (job.expiresAt && job.expiresAt < new Date()) {
    return false;
  }

  return true;
};
