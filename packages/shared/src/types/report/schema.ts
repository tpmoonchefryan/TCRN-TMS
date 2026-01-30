// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

export type ReportJobStatus = 
  | 'pending' 
  | 'running' 
  | 'success' 
  | 'consumed' 
  | 'expired' 
  | 'failed' 
  | 'retrying' 
  | 'cancelled';

export type ReportType = 'mfr'; // Extendable

export interface ReportJob {
  id: string;
  tenant_id: string;
  talent_id: string;
  report_type: ReportType;
  filter_criteria: MfrFilterCriteria | Record<string, unknown>;
  format: 'xlsx';
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

export interface MfrFilterCriteria {
  platform_codes?: string[];
  membership_level_codes?: string[];
  status_codes?: string[];
  date_range?: { from?: string; to?: string };
}

export interface ReportDefinition {
  code: ReportType;
  name: string;
  description: string;
  icon: string; // lucide icon name
}

export const AVAILABLE_REPORTS: ReportDefinition[] = [
  {
    code: 'mfr',
    name: 'Member Feedback Report',
    description: 'Export membership data including PII for physical gift delivery or digital rewards.',
    icon: 'Gift'
  }
];
