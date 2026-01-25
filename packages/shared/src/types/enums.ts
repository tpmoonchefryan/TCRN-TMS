// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

/**
 * Tenant Tier Enum
 */
export enum TenantTier {
  AC = 'ac',
  STANDARD = 'standard',
}

/**
 * Owner Type Enum
 */
export enum OwnerType {
  TENANT = 'tenant',
  SUBSIDIARY = 'subsidiary',
  TALENT = 'talent',
}

/**
 * Scope Type Enum
 * (Identical to OwnerType but used for permissions/roles scope)
 */
export enum ScopeType {
  TENANT = 'tenant',
  SUBSIDIARY = 'subsidiary',
  TALENT = 'talent',
}

/**
 * Profile Type Enum
 */
export enum ProfileType {
  INDIVIDUAL = 'individual',
  COMPANY = 'company',
}

/**
 * Channel Category Enum
 */
export enum ChannelCategory {
  PHONE = 'phone',
  EMAIL = 'email',
  SNS = 'sns',
  OTHER = 'other',
}

/**
 * Action Type Enum (Permission)
 */
export enum ActionType {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  EXECUTE = 'execute',
  ADMIN = 'admin',
}

/**
 * Effect Type Enum (Permission)
 */
export enum EffectType {
  ALLOW = 'allow',
  DENY = 'deny',
}

/**
 * Change Log Action Enum
 */
export enum ChangeAction {
  CREATE = 'create',
  UPDATE = 'update',
  DEACTIVATE = 'deactivate',
  REACTIVATE = 'reactivate',
}

/**
 * Log Severity Enum
 */
export enum LogSeverity {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Job Status Enum
 */
export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Report Status Enum
 */
export enum ReportStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  CONSUMED = 'consumed',
  EXPIRED = 'expired',
  RETRYING = 'retrying',
  CANCELLED = 'cancelled',
}

/**
 * Marshmallow Message Status Enum
 */
export enum MessageStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SPAM = 'spam',
}

/**
 * Homepage Version Status Enum
 */
export enum VersionStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

/**
 * Identity Change Type Enum
 */
export enum IdentityChangeType {
  CREATED = 'created',
  UID_CHANGED = 'uid_changed',
  NICKNAME_CHANGED = 'nickname_changed',
  DEACTIVATED = 'deactivated',
}

/**
 * Direction Type Enum (Integration Log)
 */
export enum DirectionType {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

/**
 * PII Service Auth Type Enum
 */
export enum PiiAuthType {
  MTLS = 'mtls',
  API_KEY = 'api_key',
}

/**
 * Customer Access Log Action Enum
 */
export enum CustomerAccessAction {
  CREATE = 'create',
  UPDATE = 'update',
  DEACTIVATE = 'deactivate',
  REACTIVATE = 'reactivate',
  PII_VIEW = 'pii_view',
  PII_UPDATE = 'pii_update',
}

/**
 * Captcha Mode Enum (Marshmallow)
 */
export enum CaptchaMode {
  ALWAYS = 'always',
  NEVER = 'never',
  AUTO = 'auto',
}

/**
 * Rejection Reason Enum (Marshmallow)
 */
export enum RejectionReason {
  PROFANITY = 'profanity',
  SPAM = 'spam',
  HARASSMENT = 'harassment',
  OFF_TOPIC = 'off_topic',
  DUPLICATE = 'duplicate',
  EXTERNAL_LINK = 'external_link',
  OTHER = 'other',
}

/**
 * Blocklist Pattern Type Enum
 */
export enum BlocklistPatternType {
  KEYWORD = 'keyword',
  REGEX = 'regex',
  WILDCARD = 'wildcard',
}

/**
 * Blocklist Action Enum
 */
export enum BlocklistAction {
  REJECT = 'reject',
  FLAG = 'flag',
  REPLACE = 'replace',
}

/**
 * External Blocklist Pattern Type Enum
 */
export enum ExternalPatternType {
  DOMAIN = 'domain',
  URL_REGEX = 'url_regex',
  KEYWORD = 'keyword',
}

/**
 * IP Access Rule Type
 */
export enum IpRuleType {
  WHITELIST = 'whitelist',
  BLACKLIST = 'blacklist',
}

/**
 * IP Access Rule Scope
 */
export enum IpRuleScope {
  GLOBAL = 'global',
  ADMIN = 'admin',
  PUBLIC = 'public',
  API = 'api',
}

/**
 * IP Access Rule Source
 */
export enum IpRuleSource {
  MANUAL = 'manual',
  AUTO = 'auto',
}

/**
 * Integration Adapter Type
 */
export enum AdapterType {
  OAUTH = 'oauth',
  API_KEY = 'api_key',
  WEBHOOK = 'webhook',
}

/**
 * Consumer Category
 */
export enum ConsumerCategory {
  INTERNAL = 'internal',
  EXTERNAL = 'external',
  PARTNER = 'partner',
}

/**
 * Blocklist Severity Level
 */
export enum SeverityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}
