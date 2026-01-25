// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    ActionType,
    AdapterType,
    BlocklistAction,
    BlocklistPatternType,
    CaptchaMode,
    ChangeAction,
    ChannelCategory,
    ConsumerCategory,
    CustomerAccessAction,
    DirectionType,
    EffectType,
    ExternalPatternType,
    IdentityChangeType,
    IpRuleScope,
    IpRuleSource,
    IpRuleType,
    JobStatus,
    LogSeverity,
    MessageStatus,
    OwnerType,
    PiiAuthType,
    ProfileType,
    RejectionReason,
    ReportStatus,
    ScopeType,
    SeverityLevel,
    TenantTier,
    VersionStatus
} from './enums';

// Base Interfaces
export interface BaseEntity {
  id: string;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  version?: number;
}

export interface AuditableEntity extends BaseEntity {
  created_by?: string; // UUID
  updated_by?: string; // UUID
}

export interface SoftDeletableEntity extends AuditableEntity {
  is_active: boolean;
}

export interface LocalizableEntity {
  name_en: string;
  name_zh?: string;
  name_ja?: string;
  description_en?: string;
  description_zh?: string;
  description_ja?: string;
}

// ------------------------------------------------------------------
// Public Schema Entities
// ------------------------------------------------------------------

export interface Tenant extends BaseEntity {
  code: string;
  name: string;
  schema_name: string;
  tier: TenantTier;
  is_active: boolean;
  settings: Record<string, unknown>;
}

export interface GlobalConfig extends BaseEntity {
  key: string;
  value: unknown;
  description?: string;
  updated_by?: string;
}

// ------------------------------------------------------------------
// Tenant Schema - Organization
// ------------------------------------------------------------------

export interface Subsidiary extends SoftDeletableEntity, LocalizableEntity {
  parent_id?: string | null;
  code: string;
  path: string;
  depth: number;
  sort_order: number;
}

export interface Talent extends SoftDeletableEntity, LocalizableEntity {
  subsidiary_id?: string | null;
  code: string;
  path: string;
  display_name: string;
  avatar_url?: string;
  homepage_path?: string;
  timezone?: string;
  settings?: Record<string, unknown>;
}

// ------------------------------------------------------------------
// Tenant Schema - User & Auth
// ------------------------------------------------------------------

export interface SystemUser extends SoftDeletableEntity {
  username: string;
  email: string;
  phone?: string;
  // password_hash not exposed to frontend usually
  display_name?: string;
  avatar_url?: string;
  preferred_language?: string;
  // totp_secret not exposed
  totp_enabled_at?: string;
  is_totp_enabled: boolean;
  force_reset: boolean;
  password_changed_at?: string;
  last_login_at?: string;
  last_login_ip?: string;
  failed_login_count: number;
  locked_until?: string;
}

export interface RecoveryCode extends BaseEntity {
  user_id: string;
  is_used: boolean;
  used_at?: string;
}

export interface Role extends SoftDeletableEntity, LocalizableEntity {
  code: string;
  description?: string; // Markdown
  is_system: boolean;
}

export interface Resource extends SoftDeletableEntity, LocalizableEntity {
  code: string;
  module: string;
  sort_order: number;
}

export interface Policy extends SoftDeletableEntity {
  resource_id: string;
  action: ActionType;
  effect: EffectType;
  conditions?: Record<string, unknown>;
  description?: string;
}

export interface RolePolicy extends BaseEntity {
  role_id: string;
  policy_id: string;
}

export interface UserRole extends BaseEntity {
  user_id: string;
  role_id: string;
  scope_type: ScopeType;
  scope_id?: string | null;
  inherit: boolean;
  granted_at: string;
  granted_by?: string;
  expires_at?: string | null;
}

export interface DelegatedAdmin extends BaseEntity {
  scope_type: ScopeType; // 'subsidiary' | 'talent'
  scope_id: string;
  admin_user_id?: string | null;
  admin_role_id?: string | null;
  granted_at: string;
  granted_by: string;
}

// ------------------------------------------------------------------
// Tenant Schema - Customer Management
// ------------------------------------------------------------------

export interface CustomerProfile extends SoftDeletableEntity {
  talent_id: string; // Origin talent (compatibility)
  profile_store_id: string;
  origin_talent_id: string;
  last_modified_talent_id?: string;
  rm_profile_id: string;
  profile_type: ProfileType;
  nickname: string;
  primary_language?: string;
  status_id?: string;
  inactivation_reason_id?: string;
  inactivated_at?: string;
  notes?: string;
  tags: string[];
  source?: string;
  
  // Relations often populated
  status?: CustomerStatus;
}

export interface CustomerAccessLog extends BaseEntity {
  customer_id: string;
  profile_store_id: string;
  talent_id: string;
  action: CustomerAccessAction;
  field_changes?: Record<string, unknown>;
  operator_id?: string;
  operator_name?: string;
  occurred_at: string;
  ip_address?: string;
  user_agent?: string;
  request_id?: string;
}

export interface CustomerCompanyInfo extends AuditableEntity {
  customer_id: string;
  company_legal_name: string;
  company_short_name?: string;
  registration_number?: string;
  vat_id?: string;
  establishment_date?: string;
  business_segment_id?: string;
  website?: string;
}

export interface CustomerExternalId extends AuditableEntity {
  customer_id: string;
  profile_store_id: string;
  consumer_id: string;
  external_id: string;
}

export interface PlatformIdentity extends AuditableEntity {
  customer_id: string;
  platform_id: string;
  platform_uid: string;
  platform_nickname?: string;
  platform_avatar_url?: string;
  profile_url?: string;
  is_verified: boolean;
  is_current: boolean;
  captured_at: string;
}

export interface PlatformIdentityHistory extends BaseEntity {
  identity_id: string;
  customer_id: string;
  change_type: IdentityChangeType;
  old_value?: string;
  new_value?: string;
  captured_at: string;
  captured_by?: string;
}

export interface MembershipRecord extends SoftDeletableEntity {
  customer_id: string;
  platform_id: string;
  membership_class_id: string;
  membership_type_id: string;
  membership_level_id: string;
  valid_from: string;
  valid_to?: string;
  auto_renew: boolean;
  is_expired: boolean;
  expired_at?: string;
  note?: string;
}

export interface ConsentAgreement extends BaseEntity {
  customer_id: string;
  consent_id: string;
  agreed_at: string;
  ip_address?: string;
  user_agent?: string;
  revoked_at?: string;
  revoke_reason?: string;
}

// ------------------------------------------------------------------
// Tenant Schema - Config Entities
// ------------------------------------------------------------------

export interface PiiServiceConfig extends SoftDeletableEntity, LocalizableEntity {
  code: string;
  api_url: string;
  auth_type: PiiAuthType;
  // Certs/Keys not exposed
  health_check_url?: string;
  health_check_interval_sec: number;
  last_health_check_at?: string;
  is_healthy: boolean;
}

export interface ProfileStore extends SoftDeletableEntity, LocalizableEntity {
  code: string;
  pii_service_config_id: string;
  is_default: boolean;
}

export interface BusinessSegment extends SoftDeletableEntity, LocalizableEntity {
  owner_type: OwnerType;
  owner_id?: string | null;
  code: string;
}

export interface CommunicationType extends SoftDeletableEntity, LocalizableEntity {
  owner_type: OwnerType;
  owner_id?: string | null;
  code: string;
  channel_category: ChannelCategory;
}

export interface AddressType extends SoftDeletableEntity, LocalizableEntity {
  owner_type: OwnerType;
  owner_id?: string | null;
  code: string;
}

export interface CustomerStatus extends SoftDeletableEntity, LocalizableEntity {
  owner_type: OwnerType;
  owner_id?: string | null;
  code: string;
  color: string;
  sort_order: number;
}

export interface ReasonCategory extends SoftDeletableEntity, LocalizableEntity {
  owner_type: OwnerType;
  owner_id?: string | null;
  code: string;
}

export interface InactivationReason extends SoftDeletableEntity, LocalizableEntity {
  owner_type: OwnerType;
  owner_id?: string | null;
  reason_category_id: string;
  code: string;
}

export interface MembershipClass extends SoftDeletableEntity, LocalizableEntity {
  owner_type: OwnerType;
  owner_id?: string | null;
  code: string;
}

export interface MembershipType extends SoftDeletableEntity, LocalizableEntity {
  membership_class_id: string;
  code: string;
  external_control: boolean;
  default_renewal_days: number;
}

export interface MembershipLevel extends SoftDeletableEntity, LocalizableEntity {
  membership_type_id: string;
  code: string;
  rank: number;
  color?: string;
  badge_url?: string;
}

export interface Consent extends SoftDeletableEntity, LocalizableEntity {
  owner_type: OwnerType;
  owner_id?: string | null;
  code: string;
  consent_version: string;
  content_markdown_en?: string;
  content_markdown_zh?: string;
  content_markdown_ja?: string;
  content_url?: string;
  effective_from: string;
  expires_at?: string;
  is_required: boolean;
}

export interface Consumer extends SoftDeletableEntity, LocalizableEntity {
  code: string;
  consumer_category: ConsumerCategory;
  contact_name?: string;
  contact_email?: string;
  api_key_prefix?: string;
  allowed_ips?: string[];
  rate_limit: number;
  notes?: string;
}

export interface SocialPlatform extends AuditableEntity {
  code: string;
  name_en: string;
  name_zh?: string;
  name_ja?: string;
  display_name: string;
  icon_url?: string;
  base_url?: string;
  profile_url_template?: string;
  color?: string;
  sort_order: number;
  is_active: boolean;
}

export interface BlocklistEntry extends SoftDeletableEntity, LocalizableEntity {
  owner_type: OwnerType;
  owner_id?: string | null;
  pattern: string;
  pattern_type: BlocklistPatternType;
  category?: string;
  severity: SeverityLevel;
  action: BlocklistAction;
  replacement?: string;
  scope: string[];
  inherit: boolean;
  match_count: number;
  last_matched_at?: string;
}

export interface IpAccessRule extends SoftDeletableEntity {
  rule_type: IpRuleType;
  ip_pattern: string;
  scope: IpRuleScope;
  reason?: string;
  source: IpRuleSource;
  expires_at?: string;
  hit_count: number;
  last_hit_at?: string;
}

// ------------------------------------------------------------------
// Tenant Schema - Logs
// ------------------------------------------------------------------

export interface ChangeLog extends BaseEntity {
  occurred_at: string;
  operator_id?: string;
  operator_name?: string;
  action: ChangeAction;
  object_type: string;
  object_id: string;
  object_name?: string;
  diff?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  request_id?: string;
}

export interface TechnicalEventLog extends BaseEntity {
  occurred_at: string;
  severity: LogSeverity;
  event_type: string;
  scope: string;
  trace_id?: string;
  span_id?: string;
  source?: string;
  message?: string;
  payload_json?: unknown;
  error_code?: string;
  error_stack?: string;
}

export interface IntegrationLog extends BaseEntity {
  occurred_at: string;
  consumer_id?: string;
  consumer_code?: string;
  direction: DirectionType;
  endpoint: string;
  method?: string;
  request_headers?: Record<string, unknown>;
  request_body?: unknown;
  response_status?: number;
  response_body?: unknown;
  latency_ms?: number;
  error_message?: string;
  trace_id?: string;
}

// ------------------------------------------------------------------
// Tenant Schema - External Pages
// ------------------------------------------------------------------

export interface TalentHomepage extends AuditableEntity {
  talent_id: string;
  is_published: boolean;
  published_version_id?: string;
  draft_version_id?: string;
  custom_domain?: string;
  custom_domain_verified: boolean;
  custom_domain_verification_token?: string;
  seo_title?: string;
  seo_description?: string;
  og_image_url?: string;
  analytics_id?: string;
  theme?: Record<string, unknown>;
  version: number;
}

export interface HomepageVersion extends AuditableEntity {
  homepage_id: string;
  version_number: number;
  content: unknown;
  theme?: unknown;
  status: VersionStatus;
  content_hash?: string;
  published_at?: string;
  published_by?: string;
  archived_at?: string;
}

export interface MarshmallowConfig extends AuditableEntity {
  talent_id: string;
  is_enabled: boolean;
  title?: string;
  welcome_text?: string;
  placeholder_text?: string;
  thank_you_text?: string;
  allow_anonymous: boolean;
  captcha_mode: CaptchaMode;
  moderation_enabled: boolean;
  auto_approve: boolean;
  profanity_filter_enabled: boolean;
  external_blocklist_enabled: boolean;
  max_message_length: number;
  min_message_length: number;
  rate_limit_per_ip: number;
  rate_limit_window_hours: number;
  reactions_enabled: boolean;
  allowed_reactions: string[];
  theme?: unknown;
  version: number;
}

export interface MarshmallowMessage extends BaseEntity {
  config_id: string;
  talent_id: string;
  content: string;
  sender_name?: string;
  is_anonymous: boolean;
  status: MessageStatus;
  rejection_reason?: RejectionReason;
  rejection_note?: string;
  moderated_at?: string;
  moderated_by?: string;
  is_read: boolean;
  is_starred: boolean;
  is_pinned: boolean;
  reply_content?: string;
  replied_at?: string;
  replied_by?: string;
  reaction_counts?: Record<string, number>;
  ip_address?: string;
  user_agent?: string;
  fingerprint_hash?: string;
  profanity_flags?: string[];
}

export interface MarshmallowReaction extends BaseEntity {
  message_id: string;
  reaction: string;
  fingerprint_hash: string;
  ip_address?: string;
}

export interface ExternalBlocklistPattern extends SoftDeletableEntity, LocalizableEntity {
  owner_type: OwnerType;
  owner_id?: string | null;
  pattern: string;
  pattern_type: ExternalPatternType;
  category?: string;
  severity: SeverityLevel;
  action: BlocklistAction;
  replacement?: string;
  inherit: boolean;
}

// ------------------------------------------------------------------
// Tenant Schema - Jobs
// ------------------------------------------------------------------

export interface ImportJob extends BaseEntity {
  talent_id: string;
  job_type: string;
  status: JobStatus;
  file_key: string;
  file_name: string;
  file_size?: number;
  total_rows?: number;
  processed_rows: number;
  success_rows: number;
  failed_rows: number;
  errors?: unknown[];
  started_at?: string;
  completed_at?: string;
  created_by: string;
}

export interface ReportJob extends BaseEntity {
  tenant_id: string;
  talent_id: string;
  profile_store_id: string;
  report_type: string; // 'mfr'
  filter_criteria: unknown;
  format: string;
  status: ReportStatus;
  retry_count: number;
  max_retries: number;
  error_code?: string;
  error_message?: string;
  total_rows?: number;
  processed_rows: number;
  progress_percentage: number;
  file_name?: string;
  file_path?: string;
  file_size_bytes?: number;
  queued_at?: string;
  started_at?: string;
  completed_at?: string;
  expires_at?: string;
  downloaded_at?: string;
  created_by: string;
}

// ------------------------------------------------------------------
// Tenant Schema - Integration
// ------------------------------------------------------------------

export interface IntegrationAdapter extends SoftDeletableEntity, LocalizableEntity {
  owner_type: OwnerType;
  owner_id?: string | null;
  platform_id: string;
  code: string;
  adapter_type: AdapterType;
  inherit: boolean;
}

export interface AdapterConfig extends BaseEntity {
  adapter_id: string;
  config_key: string;
  config_value: string;
  is_secret: boolean;
}

export interface Webhook extends SoftDeletableEntity, LocalizableEntity {
  code: string;
  url: string;
  // secret not exposed
  events: string[];
  headers?: Record<string, unknown>;
  retry_policy?: unknown;
  last_triggered_at?: string;
  last_status?: number;
  consecutive_failures: number;
  disabled_at?: string;
}

// ------------------------------------------------------------------
// Sessions & Tokens
// ------------------------------------------------------------------

export interface RefreshToken extends BaseEntity {
  user_id: string;
  // token_hash not exposed
  device_info?: string;
  ip_address?: string;
  expires_at: string;
  revoked_at?: string;
}
