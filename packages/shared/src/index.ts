// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import * as adminSchema from './types/admin/schema';
import * as customerSchema from './types/customer/schema';
import * as integrationSchema from './types/integration/schema';
import * as logsSchema from './types/logs/schema';
import * as marshmallowSchema from './types/marshmallow/schema';
import * as reportSchema from './types/report/schema';
import * as securitySchema from './types/security/schema';

export { 
  adminSchema,
  customerSchema,
  integrationSchema,
  logsSchema,
  marshmallowSchema, 
  reportSchema, 
  securitySchema,
};

// Core exports (canonical sources)
export * from './constants/error-codes';
export * from './constants/config';
export * from './constants/personal-info-fields';
export * from './constants/event-types';
export * from './types/enums';
export * from './types/db-schema';
export * from './types/api';
export * from './types/auth';

// Export only non-conflicting types from entity.ts
// (BaseEntity is in db-schema.ts, ConfigEntity is in config.ts, ProfileType is in enums.ts)
export type { 
  MultilingualText, 
  OwnerLevel, 
  Gender, 
  SupportedLanguage 
} from './types/entity';

// Export change-log types (ChangeAction is also in enums.ts but different definition)
export type { 
  RequestContext, 
  CreateChangeLogDto,
  ChangeLogDiff,
  ChangeLogEntry
} from './types/change-log';

// Utilities
export * from './utils/i18n-helper';
export * from './utils/data-masking';
export * from './utils/string';

// Feature schema - direct exports for non-conflicting modules
export * from './types/rbac';
export * from './types/config';
export * from './types/homepage/schema';
export * from './types/homepage/presets';

// Re-export specific non-conflicting types from feature schemas
// Note: TechEventType, TechEventScope, IntegrationDirection are exported from constants/event-types.ts
export type { 
  TechEventLogEntry,
  IntegrationLogEntry 
} from './types/logs/schema';

// Log module types (Loki integration)
export type {
  LokiQueryParams,
  LokiLogEntry,
  LokiQueryResponse,
  PersonalInfoFieldConfig,
  TechEventLogDto,
  InboundLogDto,
  OutboundLogDto,
  ChangeLogQueryParams,
  TechEventLogQueryParams,
  IntegrationLogQueryParams,
} from './types/log-types';
export { 
  LogSeverity as LogSeverityEnum,
  TechEventType as TechEventTypeEnum,
  TechEventScope as TechEventScopeEnum,
  IntegrationDirection as IntegrationDirectionEnum,
  PERSONAL_INFO_FIELDS as LOG_PERSONAL_INFO_FIELDS,
} from './types/log-types';

export type {
  CustomerProfileBase,
  CustomerIndividual,
  CustomerCompany,
  CustomerProfile,
  PiiData,
  PhoneNumber,
  Email,
  Address,
  TalentSummary,
  MembershipSummary,
  ImportJob,
  PlatformIdentity,
  PlatformIdentityHistory,
  MembershipRecord,
  CustomerAccessLog
} from './types/customer/schema';

export type {
  ReportDefinition,
  ReportType,
  ReportJobStatus,
  MfrFilterCriteria
} from './types/report/schema';

export { AVAILABLE_REPORTS } from './types/report/schema';

export type {
  WebhookEventDefinition
} from './types/integration/schema';

export { ADAPTER_CONFIG_KEYS } from './types/integration/schema';

export { DEFAULT_CONFIG as DEFAULT_MARSHMALLOW_CONFIG } from './types/marshmallow/schema';

// Testing utilities
export * from './testing';
