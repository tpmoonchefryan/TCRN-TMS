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
    securitySchema
};

// Core exports (canonical sources)
    export * from './constants/config';
    export * from './constants/error-codes';
    export * from './constants/event-types';
    export * from './constants/personal-info-fields';
    export * from './types/api';
    export * from './types/auth';
    export * from './types/db-schema';
    export * from './types/enums';

// Export only non-conflicting types from entity.ts
// (BaseEntity is in db-schema.ts, ConfigEntity is in config.ts, ProfileType is in enums.ts)
export type {
    Gender, MultilingualText,
    OwnerLevel, SupportedLanguage
} from './types/entity';

// Export change-log types (ChangeAction is also in enums.ts but different definition)
export type {
    ChangeLogDiff,
    ChangeLogEntry, CreateChangeLogDto, RequestContext
} from './types/change-log';

// Utilities
export * from './utils/data-masking';
export * from './utils/i18n-helper';
export * from './utils/string';

// Feature schema - direct exports for non-conflicting modules
export * from './types/config';
export * from './types/homepage/presets';
export * from './types/homepage/schema';
export * from './types/rbac';

// Re-export specific non-conflicting types from feature schemas
// Note: TechEventType, TechEventScope, IntegrationDirection are exported from constants/event-types.ts
export type {
    IntegrationLogEntry, TechEventLogEntry
} from './types/logs/schema';

// Log module types (Loki integration)
export type {
    Address, CustomerAccessLog, CustomerCompany, CustomerIndividual, CustomerProfile, CustomerProfileBase, Email, ImportJob, MembershipRecord, MembershipSummary, PhoneNumber, PiiData, PlatformIdentity,
    PlatformIdentityHistory, TalentSummary
} from './types/customer/schema';
export type {
    WebhookEventDefinition
} from './types/integration/schema';
export { ADAPTER_CONFIG_KEYS } from './types/integration/schema';
export type {
    ChangeLogQueryParams, InboundLogDto, IntegrationLogQueryParams, LokiLogEntry, LokiQueryParams, LokiQueryResponse, OutboundLogDto, PersonalInfoFieldConfig,
    TechEventLogDto, TechEventLogQueryParams
} from './types/log-types';
export {
    IntegrationDirection as IntegrationDirectionEnum,
    PERSONAL_INFO_FIELDS as LOG_PERSONAL_INFO_FIELDS, LogSeverity as LogSeverityEnum, TechEventScope as TechEventScopeEnum, TechEventType as TechEventTypeEnum
} from './types/log-types';
export { DEFAULT_CONFIG as DEFAULT_MARSHMALLOW_CONFIG } from './types/marshmallow/schema';
export type {
    MfrFilterCriteria, ReportDefinition, ReportJobStatus, ReportType
} from './types/report/schema';
export { AVAILABLE_REPORTS } from './types/report/schema';

// Testing utilities
export * from './testing';

// Zod Schemas (for frontend/backend validation)
export * from './schemas';

