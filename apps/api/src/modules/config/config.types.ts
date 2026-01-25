// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

/**
 * Config Entity Types and Interfaces
 * NOTE: All entity types use singular form (e.g., 'customer-status' not 'customer-statuses')
 */

export type OwnerType = 'tenant' | 'subsidiary' | 'talent';

export type ConfigEntityType = 
  | 'channel-category'
  | 'social-platform'
  | 'business-segment'
  | 'communication-type'
  | 'address-type'
  | 'customer-status'
  | 'reason-category'
  | 'inactivation-reason'
  | 'membership-class'
  | 'membership-type'
  | 'membership-level'
  | 'consent'
  | 'consumer'
  | 'blocklist-entry'
  | 'pii-service-config'
  | 'profile-store';

export interface BaseConfigEntity {
  id: string;
  ownerType: OwnerType;
  ownerId: string | null;
  code: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  descriptionEn: string | null;
  descriptionZh: string | null;
  descriptionJa: string | null;
  sortOrder: number;
  isActive: boolean;
  isForceUse: boolean;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  version: number;
}

export interface ConfigEntityWithMeta extends BaseConfigEntity {
  // Computed fields
  name: string;
  description: string | null;
  ownerName: string | null;
  isInherited: boolean;
  isDisabledHere: boolean;
  canDisable: boolean;
}

// Entity-specific fields
export interface SocialPlatformFields {
  displayName: string | null;
  iconUrl: string | null;
  baseUrl: string | null;
  profileUrlTemplate: string | null;
  color: string | null;
}

export interface CustomerStatusFields {
  color: string | null;
}

export interface CommunicationTypeFields {
  channelCategoryId: string | null;
}

export interface InactivationReasonFields {
  reasonCategoryId: string | null;
}

export interface MembershipTypeFields {
  classId: string;
  externalControl: boolean;
  defaultRenewalDays: number;
}

export interface MembershipLevelFields {
  typeId: string;
  rank: number;
  color: string | null;
  badgeUrl: string | null;
}

export interface ConsentFields {
  consentVersion: string;
  effectiveFrom: Date | null;
  expiresAt: Date | null;
  contentMarkdownEn: string | null;
  contentMarkdownZh: string | null;
  contentMarkdownJa: string | null;
  contentUrl: string | null;
  isRequired: boolean;
}

export interface ConsumerFields {
  consumerCategory: 'internal' | 'external' | 'partner';
  contactName: string | null;
  contactEmail: string | null;
  apiKeyHash: string | null;
  apiKeyPrefix: string | null;
  allowedIps: string[] | null;
  rateLimit: number | null;
  notes: string | null;
}

export interface BlocklistEntryFields {
  pattern: string;
  patternType: 'keyword' | 'regex' | 'wildcard';
  action: 'reject' | 'flag' | 'replace';
  replacement: string | null;
  scope: string[] | null;
  severity: 'low' | 'medium' | 'high';
  category: string | null;
  matchCount: number;
  lastMatchedAt: Date | null;
}

// Table name mapping (entity type -> database table name)
export const CONFIG_TABLE_NAMES: Record<ConfigEntityType, string> = {
  'channel-category': 'channel_category',
  'social-platform': 'social_platform',
  'business-segment': 'business_segment',
  'communication-type': 'communication_type',
  'address-type': 'address_type',
  'customer-status': 'customer_status',
  'reason-category': 'reason_category',
  'inactivation-reason': 'inactivation_reason',
  'membership-class': 'membership_class',
  'membership-type': 'membership_type',
  'membership-level': 'membership_level',
  'consent': 'consent',
  'consumer': 'consumer',
  'blocklist-entry': 'blocklist_entry',
  'pii-service-config': 'pii_service_config',
  'profile-store': 'profile_store',
};

// Extra fields for each entity type
export const CONFIG_EXTRA_FIELDS: Record<ConfigEntityType, string[]> = {
  'channel-category': [],
  'social-platform': ['display_name', 'icon_url', 'base_url', 'profile_url_template', 'color'],
  'business-segment': [],
  'communication-type': ['channel_category_id'],
  'address-type': [],
  'customer-status': ['color'],
  'reason-category': [],
  'inactivation-reason': ['reason_category_id'],
  'membership-class': [],
  'membership-type': ['membership_class_id', 'external_control', 'default_renewal_days'],
  'membership-level': ['membership_type_id', 'rank', 'color', 'badge_url'],
  'consent': ['consent_version', 'effective_from', 'expires_at', 'content_markdown_en', 'content_markdown_zh', 'content_markdown_ja', 'content_url', 'is_required'],
  'consumer': ['consumer_category', 'contact_name', 'contact_email', 'api_key_hash', 'api_key_prefix', 'allowed_ips', 'rate_limit', 'notes'],
  'blocklist-entry': ['pattern', 'pattern_type', 'action', 'replacement', 'scope', 'severity', 'category', 'match_count', 'last_matched_at'],
  'pii-service-config': ['api_url', 'auth_type', 'health_check_url', 'health_check_interval_sec', 'is_healthy'],
  'profile-store': ['pii_proxy_url', 'pii_service_config_id', 'is_default'],
};

// Entities that support scoping (have owner_type and owner_id)
// NOTE: membership-type and membership-level use FK relationships instead of owner_type/owner_id
// NOTE: profile-store is a tenant-level global entity without owner_type/owner_id fields
export const CONFIG_SCOPED_ENTITIES: Set<ConfigEntityType> = new Set([
  'channel-category',
  'business-segment',
  'communication-type',
  'address-type',
  'customer-status',
  'reason-category',
  'inactivation-reason',
  'membership-class',
  'consent',
  'blocklist-entry',
]);

// Entities that have localized description fields (description_en, description_zh, description_ja)
// NOTE: 'consent' does NOT have description fields - it uses content_markdown_* instead
export const CONFIG_HAS_DESCRIPTION: Set<ConfigEntityType> = new Set([
  'channel-category',
  'business-segment',
  'communication-type',
  'address-type',
  'customer-status',
  'reason-category',
  'inactivation-reason',
  'membership-class',
  'membership-type',
  'membership-level',
  'pii-service-config',
  'profile-store',
]);

// Entities that have system control fields (is_system, is_force_use)
export const CONFIG_HAS_SYSTEM_CONTROL: Set<ConfigEntityType> = new Set([
  'channel-category',
  'social-platform',
  'business-segment',
  'communication-type',
  'address-type',
  'customer-status',
  'reason-category',
  'inactivation-reason',
  'membership-class',
  'membership-type',
  'membership-level',
  'consent',
  'consumer',
  'blocklist-entry',
]);

/**
 * Note: 'social-platform' has none of the above.
 * 'consumer' has notes, handled separately or ignored in description.
 * 'blocklist-entry' has generic description, not localized.
 */

// Entities that have sort_order field
export const CONFIG_HAS_SORT_ORDER: Set<ConfigEntityType> = new Set([
  'channel-category',
  'social-platform',
  'business-segment',
  'communication-type',
  'address-type',
  'customer-status',
  'reason-category',
  'inactivation-reason',
  'membership-class',
  'membership-type',
  'membership-level',
  'consent',
  'consumer',
  'blocklist-entry',
  'pii-service-config',
  'profile-store',
]);

// Entities that have code field (for search)
// NOTE: blocklist-entry uses 'pattern' instead of 'code'
export const CONFIG_HAS_CODE: Set<ConfigEntityType> = new Set([
  'channel-category',
  'social-platform',
  'business-segment',
  'communication-type',
  'address-type',
  'customer-status',
  'reason-category',
  'inactivation-reason',
  'membership-class',
  'membership-type',
  'membership-level',
  'consent',
  'consumer',
  'pii-service-config',
  'profile-store',
  // NOTE: blocklist-entry does NOT have code field
]);

// Entities that have audit fields (created_by, updated_by)
export const CONFIG_HAS_AUDIT: Set<ConfigEntityType> = new Set([
  'channel-category',
  'business-segment',
  'communication-type',
  'address-type',
  'customer-status',
  'reason-category',
  'inactivation-reason',
  'membership-class',
  'membership-type',
  'membership-level',
  'consent',
  'consumer',
  'blocklist-entry',
  'pii-service-config',
  'profile-store',
]);
