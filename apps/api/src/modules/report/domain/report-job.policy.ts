// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ReportJobStatus } from '../dto/report.dto';

export const REPORT_JOB_MAX_ROWS = 50000;

export const exceedsReportJobRowLimit = (estimatedRows: number): boolean =>
  estimatedRows > REPORT_JOB_MAX_ROWS;

export const canCancelReportJob = (status: ReportJobStatus): boolean =>
  status === ReportJobStatus.PENDING || status === ReportJobStatus.FAILED;
