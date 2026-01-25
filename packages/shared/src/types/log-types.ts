// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

/**
 * Log Module Types
 * Based on .context/07-日志模块.md specification
 */

// =============================================================================
// Enums
// =============================================================================

/**
 * Log severity levels
 */
export enum LogSeverity {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Technical event types
 */
export enum TechEventType {
  // Import related
  IMPORT_JOB_STARTED = 'IMPORT_JOB_STARTED',
  IMPORT_JOB_COMPLETED = 'IMPORT_JOB_COMPLETED',
  IMPORT_ROW_FAILED = 'IMPORT_ROW_FAILED',

  // Permission related
  PERMISSION_SNAPSHOT_STARTED = 'PERMISSION_SNAPSHOT_STARTED',
  PERMISSION_SNAPSHOT_COMPLETED = 'PERMISSION_SNAPSHOT_COMPLETED',
  PERMISSION_SNAPSHOT_FAILED = 'PERMISSION_SNAPSHOT_FAILED',

  // Authentication related
  AUTH_LOGIN_SUCCESS = 'AUTH_LOGIN_SUCCESS',
  AUTH_LOGIN_FAILED = 'AUTH_LOGIN_FAILED',
  AUTH_TOKEN_REFRESH = 'AUTH_TOKEN_REFRESH',
  AUTH_2FA_ENABLED = 'AUTH_2FA_ENABLED',
  AUTH_RECOVERY_CODE_USED = 'AUTH_RECOVERY_CODE_USED',
  AUTH_PASSWORD_RESET = 'AUTH_PASSWORD_RESET',
  AUTH_LOGOUT = 'AUTH_LOGOUT',

  // PII related
  PII_ACCESS_REQUESTED = 'PII_ACCESS_REQUESTED',
  PII_ACCESS_GRANTED = 'PII_ACCESS_GRANTED',
  PII_ACCESS_DENIED = 'PII_ACCESS_DENIED',
  PII_FETCH_FAILED = 'PII_FETCH_FAILED',

  // Report related
  REPORT_JOB_CREATED = 'REPORT_JOB_CREATED',
  REPORT_JOB_STARTED = 'REPORT_JOB_STARTED',
  REPORT_JOB_COMPLETED = 'REPORT_JOB_COMPLETED',
  REPORT_JOB_FAILED = 'REPORT_JOB_FAILED',
  REPORT_DOWNLOADED = 'REPORT_DOWNLOADED',
  REPORT_PII_BATCH_REQUESTED = 'REPORT_PII_BATCH_REQUESTED',
  REPORT_JOBS_EXPIRED = 'REPORT_JOBS_EXPIRED',

  // System related
  SYSTEM_STARTUP = 'SYSTEM_STARTUP',
  SYSTEM_SHUTDOWN = 'SYSTEM_SHUTDOWN',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  SYSTEM_HEALTH_CHECK = 'SYSTEM_HEALTH_CHECK',

  // Log cleanup
  LOG_CLEANUP_STARTED = 'LOG_CLEANUP_STARTED',
  LOG_CLEANUP_COMPLETED = 'LOG_CLEANUP_COMPLETED',

  // Homepage related
  HOMEPAGE_PUBLISHED = 'HOMEPAGE_PUBLISHED',
  HOMEPAGE_UNPUBLISHED = 'HOMEPAGE_UNPUBLISHED',

  // Marshmallow related
  MARSHMALLOW_SUBMITTED = 'MARSHMALLOW_SUBMITTED',
  MARSHMALLOW_MODERATED = 'MARSHMALLOW_MODERATED',
}

/**
 * Technical event scope categories
 */
export enum TechEventScope {
  GENERAL = 'general',
  SECURITY = 'security',
  IMPORT = 'import',
  EXPORT = 'export',
  PII = 'pii',
  PERMISSION = 'permission',
  INTEGRATION = 'integration',
  REPORT = 'report',
  HOMEPAGE = 'homepage',
  MARSHMALLOW = 'marshmallow',
}

/**
 * Integration log direction
 */
export enum IntegrationDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

// =============================================================================
// PII Masking Types
// =============================================================================

/**
 * PII field type for masking
 */
export type PiiFieldType = 'text' | 'phone_array' | 'email_array' | 'address_array' | 'phone' | 'email';

/**
 * PersonalInfo field configuration
 */
export interface PersonalInfoFieldConfig {
  field: string;
  type: PiiFieldType;
  conditional?: boolean; // Whether masking depends on context
}

/**
 * Default list of personal info fields to mask
 */
export const PERSONAL_INFO_FIELDS: PersonalInfoFieldConfig[] = [
  // Personal profile fields
  { field: 'given_name', type: 'text' },
  { field: 'family_name', type: 'text' },
  { field: 'birth_date', type: 'text' },
  { field: 'gender', type: 'text' },

  // Contact information
  { field: 'phone_numbers', type: 'phone_array' },
  { field: 'emails', type: 'email_array' },
  { field: 'addresses', type: 'address_array' },
  { field: 'phone', type: 'phone' },
  { field: 'email', type: 'email' },

  // Company profile (registration number may need masking)
  { field: 'registration_number', type: 'text' },

  // Notes field (may contain sensitive info)
  { field: 'notes', type: 'text', conditional: true },
];

// =============================================================================
// Log Entry Types
// =============================================================================

/**
 * Technical event log DTO for creating entries
 */
export interface TechEventLogDto {
  severity: LogSeverity;
  eventType: TechEventType | string;
  scope?: TechEventScope | string;
  traceId?: string;
  spanId?: string;
  source?: string;
  message?: string;
  payload?: Record<string, unknown>;
  errorCode?: string;
  errorStack?: string;
}

/**
 * Technical event log entry (full record)
 */
export interface TechEventLogEntry {
  id: string;
  occurredAt: Date;
  severity: LogSeverity;
  eventType: string;
  scope: string;
  traceId: string | null;
  spanId: string | null;
  source: string | null;
  message: string | null;
  payloadJson: Record<string, unknown> | null;
  errorCode: string | null;
  errorStack: string | null;
}

/**
 * Integration log DTO for inbound requests
 */
export interface InboundLogDto {
  consumerId?: string;
  consumerCode?: string;
  endpoint: string;
  method: string;
  requestHeaders?: Record<string, string>;
  requestBody?: unknown;
  responseStatus: number;
  responseBody?: unknown;
  latencyMs: number;
  errorMessage?: string;
  traceId?: string;
}

/**
 * Integration log DTO for outbound requests
 */
export interface OutboundLogDto {
  consumerId?: string;
  consumerCode?: string;
  endpoint: string;
  method: string;
  requestHeaders?: Record<string, string>;
  requestBody?: unknown;
  responseStatus?: number;
  responseBody?: unknown;
  latencyMs: number;
  errorMessage?: string;
  traceId?: string;
}

/**
 * Integration log entry (full record)
 */
export interface IntegrationLogEntry {
  id: string;
  occurredAt: Date;
  consumerId: string | null;
  consumerCode: string | null;
  direction: IntegrationDirection;
  endpoint: string;
  method: string | null;
  requestHeaders: Record<string, string> | null;
  requestBody: unknown | null;
  responseStatus: number | null;
  responseBody: unknown | null;
  latencyMs: number | null;
  errorMessage: string | null;
  traceId: string | null;
}

// =============================================================================
// Query Types
// =============================================================================

/**
 * Change log query parameters
 */
export interface ChangeLogQueryParams {
  objectType?: string;
  objectId?: string;
  operatorId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  requestId?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Technical event log query parameters
 */
export interface TechEventLogQueryParams {
  eventType?: string;
  scope?: string;
  severity?: LogSeverity;
  traceId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Integration log query parameters
 */
export interface IntegrationLogQueryParams {
  consumerId?: string;
  consumerCode?: string;
  direction?: IntegrationDirection;
  responseStatus?: number;
  traceId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Loki query parameters
 */
export interface LokiQueryParams {
  stream?: string;
  severity?: string;
  eventType?: string;
  scope?: string;
  traceId?: string;
  keyword?: string;
  start?: string;
  end?: string;
  limit?: number;
  direction?: 'forward' | 'backward';
  rawQuery?: string;
}

/**
 * Loki query response entry
 */
export interface LokiLogEntry {
  timestamp: Date;
  labels: Record<string, string>;
  data: unknown;
}

/**
 * Loki query response
 */
export interface LokiQueryResponse {
  entries: LokiLogEntry[];
  stats?: Record<string, unknown>;
}
