// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { type ReportJobListItem, type ReportJobResponse, ReportJobStatus } from '../dto/report.dto';

type RawNumericValue = bigint | number | null;

const toIsoString = (value: Date | null): string | null => value?.toISOString() ?? null;

const toNullableNumber = (value: RawNumericValue): number | null =>
  value === null ? null : Number(value);

const toRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
};

const getFailureReason = (job: RawReportJobDetail): string | null =>
  job.error_message || job.error_code || null;

const getArtifactDownloadState = (job: RawReportJobDetail, now: Date = new Date()) => {
  if (job.status === 'expired') {
    return 'expired';
  }

  if (job.expires_at && job.expires_at < now) {
    return 'expired';
  }

  if (job.status === 'consumed' || job.downloaded_at) {
    return 'consumed';
  }

  if (job.status === 'success') {
    return 'available';
  }

  return 'unavailable';
};

export interface RawReportJobDetail {
  id: string;
  report_type: string;
  format: string;
  filter_criteria: unknown;
  status: ReportJobStatus | string;
  total_rows: number | null;
  processed_rows: number | null;
  progress_percentage: number | null;
  error_code: string | null;
  error_message: string | null;
  file_name: string | null;
  file_path: string | null;
  file_size_bytes: RawNumericValue;
  queued_at: Date | null;
  started_at: Date | null;
  completed_at: Date | null;
  downloaded_at: Date | null;
  expires_at: Date | null;
  created_at: Date;
  creator_id: string;
  creator_username: string;
}

export interface RawReportJobListItem {
  id: string;
  report_type: string;
  status: ReportJobStatus | string;
  total_rows: number | null;
  file_name: string | null;
  created_at: Date;
  completed_at: Date | null;
  expires_at: Date | null;
}

export interface ReportJobReadFilters {
  talentId: string;
  statuses?: string[];
  createdFrom?: Date;
  createdTo?: Date;
}

export interface ReportJobPagination {
  take: number;
  skip: number;
}

export interface ReportJobDownloadTarget {
  id: string;
  status: ReportJobStatus | string;
  file_path: string | null;
  file_name: string | null;
  expires_at: Date | null;
  downloaded_at: Date | null;
}

export const REPORT_JOB_DOWNLOAD_URL_EXPIRY_SECONDS = 300;

export const mapReportJobDetail = (job: RawReportJobDetail): ReportJobResponse => {
  const fileSizeBytes = toNullableNumber(job.file_size_bytes);
  const queuedAt = toIsoString(job.queued_at);
  const startedAt = toIsoString(job.started_at);
  const completedAt = toIsoString(job.completed_at);
  const downloadedAt = toIsoString(job.downloaded_at);
  const expiresAt = toIsoString(job.expires_at);
  const now = new Date();
  const isExpired = job.status === 'expired' || (job.expires_at !== null && job.expires_at < now);

  return {
    id: job.id,
    reportType: job.report_type,
    status: job.status as ReportJobStatus,
    progress: {
      totalRows: job.total_rows,
      processedRows: job.processed_rows ?? 0,
      percentage: job.progress_percentage ?? 0,
    },
    error: job.error_code
      ? {
          code: job.error_code,
          message: job.error_message || '',
        }
      : undefined,
    failureReason: getFailureReason(job),
    parameterSnapshot: {
      reportType: job.report_type as ReportJobResponse['parameterSnapshot']['reportType'],
      format: job.format as ReportJobResponse['parameterSnapshot']['format'],
      requestedAt: queuedAt ?? job.created_at.toISOString(),
      filters: toRecord(job.filter_criteria),
    },
    timeline: [
      { phase: 'queued', at: queuedAt ?? job.created_at.toISOString() },
      { phase: 'started', at: startedAt },
      { phase: 'completed', at: completedAt },
      { phase: 'downloaded', at: downloadedAt },
      { phase: 'expired', at: isExpired ? expiresAt : null },
    ],
    artifacts:
      job.file_name || job.file_path
        ? [
            {
              kind: 'report-file',
              downloadState: getArtifactDownloadState(job, now),
              fileName: job.file_name,
              fileSizeBytes,
              expiresAt,
              downloadedAt,
            },
          ]
        : [],
    fileName: job.file_name,
    fileSizeBytes,
    queuedAt,
    startedAt,
    completedAt,
    downloadedAt,
    expiresAt,
    createdAt: job.created_at.toISOString(),
    createdBy: {
      id: job.creator_id,
      username: job.creator_username,
    },
  };
};

export const mapReportJobListItem = (job: RawReportJobListItem): ReportJobListItem => ({
  id: job.id,
  reportType: job.report_type,
  status: job.status as ReportJobStatus,
  totalRows: job.total_rows,
  fileName: job.file_name,
  createdAt: job.created_at.toISOString(),
  completedAt: toIsoString(job.completed_at),
  expiresAt: toIsoString(job.expires_at),
});
