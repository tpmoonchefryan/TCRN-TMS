// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type {
  LocalReportJobCreateResponse as SharedLocalReportJobCreateResponse,
  MfrFilterCriteria as SharedMfrFilterCriteria,
  PiiPlatformReportCreateResponse as SharedPiiPlatformReportCreateResponse,
  ReportCreateResponse as SharedReportCreateResponse,
  ReportFormat as SharedReportFormat,
  ReportJobStatus as SharedReportJobStatus,
  ReportType as SharedReportType,
} from '../../../schemas/report';

export type ReportJobStatus = SharedReportJobStatus;
export type ReportType = SharedReportType;
export type ReportFormat = SharedReportFormat;
export type MfrFilterCriteria = SharedMfrFilterCriteria;
export type LocalReportJobCreateResponse = SharedLocalReportJobCreateResponse;
export type PiiPlatformReportCreateResponse = SharedPiiPlatformReportCreateResponse;
export type ReportCreateResponse = SharedReportCreateResponse;

export interface ReportDefinition {
  code: ReportType;
  name: string;
  description: string;
  icon: string;
}

export const AVAILABLE_REPORTS: ReportDefinition[] = [
  {
    code: 'mfr',
    name: 'Member Feedback Report',
    description:
      'Export membership data including PII for physical gift delivery or digital rewards.',
    icon: 'Gift',
  },
];
