// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type {
  MfrFilterCriteria,
  ReportFormat,
  ReportJobStatus,
  ReportType,
} from '../../domains/reporting-dataflow';

export type {
  LocalReportJobCreateResponse,
  MfrFilterCriteria,
  PiiPlatformReportCreateResponse,
  ReportCreateResponse,
  ReportDefinition,
  ReportFormat,
  ReportJobStatus,
  ReportType,
} from '../../domains/reporting-dataflow';
export { AVAILABLE_REPORTS } from '../../domains/reporting-dataflow';

/**
 * @deprecated Legacy DB-shaped compatibility type. Prefer the canonical
 * reporting-dataflow shared contract entry instead.
 */
export interface ReportJob {
  id: string;
  tenant_id: string;
  talent_id: string;
  report_type: ReportType;
  filter_criteria: MfrFilterCriteria | Record<string, unknown>;
  format: Exclude<ReportFormat, 'csv'>;
  status: ReportJobStatus;
  total_rows?: number;
  processed_rows: number;
  progress_percentage: number;
  file_name?: string;
  file_size_bytes?: number;
  queued_at?: string;
  started_at?: string;
  completed_at?: string;
  expires_at?: string;
  downloaded_at?: string;
  created_at: string;
  created_by: { id: string; username: string };
  error_code?: string;
  error_message?: string;
}
