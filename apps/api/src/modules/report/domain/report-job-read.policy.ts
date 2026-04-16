// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  type ReportJobListItem,
  type ReportJobResponse,
  ReportJobStatus,
} from '../dto/report.dto';

type RawNumericValue = bigint | number | null;

const toIsoString = (value: Date | null): string | null => value?.toISOString() ?? null;

const toNullableNumber = (value: RawNumericValue): number | null =>
  value === null ? null : Number(value);

export interface RawReportJobDetail {
  id: string;
  report_type: string;
  status: ReportJobStatus | string;
  total_rows: number | null;
  processed_rows: number | null;
  progress_percentage: number | null;
  error_code: string | null;
  error_message: string | null;
  file_name: string | null;
  file_size_bytes: RawNumericValue;
  queued_at: Date | null;
  started_at: Date | null;
  completed_at: Date | null;
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
}

export const REPORT_JOB_DOWNLOAD_URL_EXPIRY_SECONDS = 300;

export const mapReportJobDetail = (job: RawReportJobDetail): ReportJobResponse => ({
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
  fileName: job.file_name,
  fileSizeBytes: toNullableNumber(job.file_size_bytes),
  queuedAt: toIsoString(job.queued_at),
  startedAt: toIsoString(job.started_at),
  completedAt: toIsoString(job.completed_at),
  expiresAt: toIsoString(job.expires_at),
  createdAt: job.created_at.toISOString(),
  createdBy: {
    id: job.creator_id,
    username: job.creator_username,
  },
});

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
