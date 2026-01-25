// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

// --- Common ---
export type LogSeverity = 'debug' | 'info' | 'warn' | 'error' | 'critical';

// --- Change Log ---
export type ChangeAction = 'create' | 'update' | 'deactivate' | 'reactivate';

export interface ChangeLogDiff {
  [field: string]: {
    old: any;
    new: any;
  };
}

export interface ChangeLogEntry {
  id: string;
  occurred_at: string;
  operator_id: string | null;
  operator_name: string | null;
  action: ChangeAction;
  object_type: string;
  object_id: string;
  object_name: string | null;
  diff: ChangeLogDiff | null;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
}

// --- Technical Event Log ---
export enum TechEventType {
  // 简化的示例，实际应包含完整列表
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  AUTH_LOGIN_FAILED = 'AUTH_LOGIN_FAILED',
  REPORT_JOB_FAILED = 'REPORT_JOB_FAILED',
  SYSTEM_STARTUP = 'SYSTEM_STARTUP',
  API_RATE_LIMIT = 'API_RATE_LIMIT'
}

export enum TechEventScope {
  GENERAL = 'general',
  SECURITY = 'security',
  IMPORT = 'import',
  EXPORT = 'export',
  INTEGRATION = 'integration'
}

export interface TechEventLogEntry {
  id: string;
  occurred_at: string;
  severity: LogSeverity;
  event_type: string;
  scope: string;
  trace_id: string | null;
  span_id: string | null;
  source: string | null;
  message: string | null;
  payload_json: any | null;
  error_code: string | null;
  error_stack: string | null;
}

// --- Integration Log ---
export type IntegrationDirection = 'inbound' | 'outbound';

export interface IntegrationLogEntry {
  id: string;
  occurred_at: string;
  consumer_id: string | null;
  consumer_code: string | null;
  direction: IntegrationDirection;
  endpoint: string;
  method: string;
  request_headers: Record<string, string> | null;
  request_body: any | null;
  response_status: number | null;
  response_body: any | null;
  latency_ms: number | null;
  error_message: string | null;
  trace_id: string | null;
}
