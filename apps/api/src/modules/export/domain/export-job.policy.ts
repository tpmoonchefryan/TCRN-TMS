// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  type CreateExportJobDto,
  ExportFormat,
  type ExportFormatValue,
  type ExportJobQueryDto,
  type ExportJobResponse,
  ExportJobStatus,
  type ExportJobStatusValue,
  ExportJobType,
  type ExportJobTypeValue,
} from '../dto/export.dto';

export interface RawExportJobRecord {
  id: string;
  job_type: string;
  format: string;
  status: string;
  file_name: string | null;
  file_path: string | null;
  total_records: number;
  processed_records: number;
  expires_at: Date | null;
  created_at: Date;
  completed_at: Date | null;
}

export interface ExportJobListFilters {
  profileStoreId: string;
  status?: ExportJobQueryDto['status'];
}

export interface ExportJobPagination {
  take: number;
  skip: number;
}

export interface ExportJobDownloadTarget {
  id: string;
  status: string;
  file_path: string | null;
}

export interface ExportJobFilters {
  customerIds?: CreateExportJobDto['customerIds'];
  tags?: CreateExportJobDto['tags'];
  membershipClassCode?: CreateExportJobDto['membershipClassCode'];
  fields?: CreateExportJobDto['fields'];
}

export const GENERIC_EXPORT_JOB_TYPE = ExportJobType.CUSTOMER_EXPORT;
export const EXPORT_JOB_DOWNLOAD_URL_EXPIRY_SECONDS = 3600;

export const canDownloadExportJob = (job: ExportJobDownloadTarget): boolean =>
  job.status === ExportJobStatus.SUCCESS && Boolean(job.file_path);

export const mapExportJobResponse = (job: RawExportJobRecord): ExportJobResponse => ({
  id: job.id,
  jobType: job.job_type as ExportJobTypeValue,
  format: job.format as ExportFormatValue,
  status: job.status as ExportJobStatusValue,
  fileName: job.file_name,
  totalRecords: job.total_records,
  processedRecords: job.processed_records,
  downloadUrl: job.status === ExportJobStatus.SUCCESS && job.file_path
    ? `/api/v1/exports/${job.id}/download`
    : null,
  expiresAt: job.expires_at?.toISOString() ?? null,
  createdAt: job.created_at.toISOString(),
  completedAt: job.completed_at?.toISOString() ?? null,
});

export const getRequestedExportFormat = (
  format: ExportFormatValue | undefined,
): ExportFormatValue => format ?? ExportFormat.CSV;

export const buildExportJobFilters = (
  filters: ExportJobFilters,
): ExportJobFilters => ({
  customerIds: filters.customerIds,
  tags: filters.tags,
  membershipClassCode: filters.membershipClassCode,
  fields: filters.fields,
});
