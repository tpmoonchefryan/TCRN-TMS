// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

/**
 * Shared constants for Configuration Entity and Dictionary types
 * Used across Tenant, Subsidiary, and Talent settings pages
 */

// Configuration Entity Types (using singular kebab-case format to match backend API)
export const CONFIG_ENTITY_TYPES = [
  { 
    code: 'customer-status', 
    name: 'Customer Status', 
    nameZh: '客户状态', 
    description: 'Customer lifecycle status definitions', 
    icon: '👤' 
  },
  { 
    code: 'business-segment', 
    name: 'Business Segment', 
    nameZh: '业务分类', 
    description: 'Business segment definitions', 
    icon: '📊' 
  },
  { 
    code: 'reason-category', 
    name: 'Reason Category', 
    nameZh: '原因分类', 
    description: 'Reason category definitions', 
    icon: '📋' 
  },
  { 
    code: 'inactivation-reason', 
    name: 'Inactivation Reason', 
    nameZh: '停用原因', 
    description: 'Customer inactivation reasons', 
    icon: '🚫' 
  },
  { 
    code: 'membership-class', 
    name: 'Membership Class', 
    nameZh: '会籍等级', 
    description: 'Membership tier definitions', 
    icon: '🎫' 
  },
  { 
    code: 'membership-type', 
    name: 'Membership Type', 
    nameZh: '会籍类型', 
    description: 'Platform-specific membership types', 
    icon: '🎭' 
  },
  { 
    code: 'membership-level', 
    name: 'Membership Level', 
    nameZh: '会籍级别', 
    description: 'Tier levels within membership types', 
    icon: '⭐' 
  },
  { 
    code: 'consent', 
    name: 'Consent', 
    nameZh: '同意声明', 
    description: 'Customer consent definitions', 
    icon: '✅' 
  },
  { 
    code: 'blocklist-entry', 
    name: 'Blocklist Entry', 
    nameZh: '屏蔽词条', 
    description: 'Content blocklist patterns', 
    icon: '🛡️' 
  },
  { 
    code: 'profile-store', 
    name: 'Profile Store', 
    nameZh: '档案存储库', 
    description: 'Customer PII storage configuration', 
    icon: '🔐' 
  },
  { 
    code: 'pii-service-config', 
    name: 'PII Service Config', 
    nameZh: 'PII服务配置', 
    description: 'PII proxy service configuration', 
    icon: '🔒' 
  },
] as const;

// System Dictionary Types
export const DICTIONARY_TYPES = [
  { code: 'countries', name: 'Countries', nameZh: '国家/地区', icon: '🌍' },
  { code: 'languages', name: 'Languages', nameZh: '语言', icon: '🗣️' },
  { code: 'timezones', name: 'Timezones', nameZh: '时区', icon: '🕐' },
  { code: 'currencies', name: 'Currencies', nameZh: '货币', icon: '💰' },
  { code: 'genders', name: 'Genders', nameZh: '性别', icon: '⚧️' },
  { code: 'profile_types', name: 'Profile Types', nameZh: '档案类型', icon: '📋' },
  { code: 'social_platforms', name: 'Social Platforms', nameZh: '社交平台', icon: '📱' },
] as const;

// Type definitions for Config Entity
export interface ConfigEntity {
  id: string;
  code: string;
  nameEn: string;
  nameZh: string;
  nameJa: string;
  ownerType: 'tenant' | 'subsidiary' | 'talent';
  ownerLevel: string;
  isActive: boolean;
  isForceUse: boolean;
  isSystem: boolean;
  sortOrder: number;
  inheritedFrom?: string;
}

// Type definitions for Dictionary Record
export interface DictionaryRecord {
  code: string;
  nameEn: string;
  nameZh: string;
  nameJa: string;
  isActive: boolean;
}

// Type for entity type configuration
export type ConfigEntityTypeInfo = typeof CONFIG_ENTITY_TYPES[number];
export type DictionaryTypeInfo = typeof DICTIONARY_TYPES[number];

// Scope types
export type ScopeType = 'tenant' | 'subsidiary' | 'talent';
