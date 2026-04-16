// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { ExportMessagesDto } from '../dto/marshmallow.dto';

export const MARSHMALLOW_EXPORT_QUEUE_JOB_NAME = 'marshmallow_export';
export const MARSHMALLOW_EXPORT_CURRENT_TABLE = 'marshmallow_export_job';
export const MARSHMALLOW_EXPORT_LEGACY_TABLE = 'export_job';
export const MARSHMALLOW_EXPORT_DOWNLOAD_URL_EXPIRY_SECONDS = 3600;

export enum MarshmallowExportStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface MarshmallowExportJobFilters {
  status?: ExportMessagesDto['status'];
  startDate?: string;
  endDate?: string;
  includeRejected?: boolean;
}

export interface MarshmallowExportJobData {
  jobId: string;
  talentId: string;
  tenantSchema: string;
  format: ExportMessagesDto['format'];
  filters: MarshmallowExportJobFilters;
}

export interface RawMarshmallowExportJobRecord {
  id: string;
  status: string;
  format: string;
  file_name: string | null;
  file_path: string | null;
  total_records: number;
  processed_records: number;
  expires_at: Date | null;
  created_at: Date;
  completed_at: Date | null;
}

export interface MarshmallowExportJobResponse {
  id: string;
  status: MarshmallowExportStatus;
  format: string;
  fileName: string | null;
  totalRecords: number;
  processedRecords: number;
  downloadUrl: string | null;
  expiresAt: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface MarshmallowExportJobCreateResponse {
  jobId: string;
  status: string;
}

export interface MarshmallowExportDownloadTarget {
  id: string;
  status: string;
  file_path: string | null;
}

export const buildMarshmallowExportFilters = (
  dto: ExportMessagesDto,
): MarshmallowExportJobFilters => ({
  status: dto.status,
  startDate: dto.startDate,
  endDate: dto.endDate,
  includeRejected: dto.includeRejected,
});

export const canDownloadMarshmallowExportJob = (
  job: MarshmallowExportDownloadTarget,
): boolean => job.status === MarshmallowExportStatus.SUCCESS && Boolean(job.file_path);

export const mapMarshmallowExportJobResponse = (
  job: RawMarshmallowExportJobRecord,
  talentId: string,
): MarshmallowExportJobResponse => ({
  id: job.id,
  status: job.status as MarshmallowExportStatus,
  format: job.format,
  fileName: job.file_name,
  totalRecords: job.total_records,
  processedRecords: job.processed_records,
  downloadUrl: job.status === MarshmallowExportStatus.SUCCESS && job.file_path
    ? `/api/v1/talents/${talentId}/marshmallow/export/${job.id}/download`
    : null,
  expiresAt: job.expires_at?.toISOString() ?? null,
  createdAt: job.created_at.toISOString(),
  completedAt: job.completed_at?.toISOString() ?? null,
});
