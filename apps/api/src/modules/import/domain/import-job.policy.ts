// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  type ImportError,
  type ImportJobQueryDto,
  type ImportJobResponse,
  ImportJobStatus,
  type ImportJobType,
} from '../dto/import.dto';

export interface RawImportJobRecord {
  id: string;
  job_type: string;
  status: string;
  file_name: string;
  total_rows: number;
  processed_rows: number;
  success_rows: number;
  failed_rows: number;
  warning_rows: number;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  created_by: string | null;
  consumer_code?: string | null;
}

export interface ImportJobListFilters {
  profileStoreId: string;
  status?: ImportJobQueryDto['status'];
}

export interface ImportJobPagination {
  take: number;
  skip: number;
}

export interface RawImportJobErrorRecord {
  row_number: number;
  error_code: string;
  error_message: string;
  original_data: string;
}

export interface CreatedImportJobResult {
  id: string;
  status: ImportJobStatus;
  fileName: string;
  totalRows: number;
  createdAt: Date;
  profileStoreId: string;
}

export const mapImportJobResponse = (
  job: RawImportJobRecord,
  nowMs: number = Date.now(),
): ImportJobResponse => {
  let estimatedRemainingSeconds: number | null = null;

  if (job.started_at && job.processed_rows > 0 && job.status === ImportJobStatus.RUNNING) {
    const elapsedMs = nowMs - job.started_at.getTime();

    if (elapsedMs > 0) {
      const rowsPerMs = job.processed_rows / elapsedMs;
      const remainingRows = job.total_rows - job.processed_rows;

      if (rowsPerMs > 0 && remainingRows > 0) {
        estimatedRemainingSeconds = Math.ceil(remainingRows / rowsPerMs / 1000);
      }
    }
  }

  return {
    id: job.id,
    jobType: job.job_type as ImportJobType,
    status: job.status as ImportJobStatus,
    fileName: job.file_name,
    consumerCode: job.consumer_code ?? null,
    progress: {
      totalRows: job.total_rows,
      processedRows: job.processed_rows,
      successRows: job.success_rows,
      failedRows: job.failed_rows,
      warningRows: job.warning_rows,
      percentage: job.total_rows > 0
        ? Math.round((job.processed_rows / job.total_rows) * 100)
        : 0,
    },
    startedAt: job.started_at?.toISOString() ?? null,
    completedAt: job.completed_at?.toISOString() ?? null,
    estimatedRemainingSeconds,
    createdAt: job.created_at.toISOString(),
    createdBy: {
      id: job.created_by ?? 'unknown',
      username: 'unknown',
    },
  };
};

export const mapImportErrors = (errors: RawImportJobErrorRecord[]): ImportError[] =>
  errors.map((error) => ({
    rowNumber: error.row_number,
    errorCode: error.error_code,
    errorMessage: error.error_message,
    originalData: error.original_data,
  }));
