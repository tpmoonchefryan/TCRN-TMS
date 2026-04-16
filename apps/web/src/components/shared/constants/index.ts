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
    nameJa: '顧客ステータス',
    description: 'Customer lifecycle status definitions', 
    descriptionZh: '客户生命周期状态定义',
    descriptionJa: '顧客ライフサイクルの状態定義',
    icon: '👤' 
  },
  { 
    code: 'business-segment', 
    name: 'Business Segment', 
    nameZh: '业务分类', 
    nameJa: 'ビジネスセグメント',
    description: 'Business segment definitions', 
    descriptionZh: '业务分类定义',
    descriptionJa: 'ビジネスセグメント定義',
    icon: '📊' 
  },
  { 
    code: 'reason-category', 
    name: 'Reason Category', 
    nameZh: '原因分类', 
    nameJa: '理由カテゴリー',
    description: 'Reason category definitions', 
    descriptionZh: '原因分类定义',
    descriptionJa: '理由カテゴリー定義',
    icon: '📋' 
  },
  { 
    code: 'inactivation-reason', 
    name: 'Inactivation Reason', 
    nameZh: '停用原因', 
    nameJa: '非アクティブ化理由',
    description: 'Customer inactivation reasons', 
    descriptionZh: '客户停用原因',
    descriptionJa: '顧客の非アクティブ化理由',
    icon: '🚫' 
  },
  { 
    code: 'membership-class', 
    name: 'Membership Class', 
    nameZh: '会籍等级', 
    nameJa: 'メンバーシップクラス',
    description: 'Membership tier definitions', 
    descriptionZh: '会籍层级定义',
    descriptionJa: 'メンバーシップ階層の定義',
    icon: '🎫' 
  },
  { 
    code: 'membership-type', 
    name: 'Membership Type', 
    nameZh: '会籍类型', 
    nameJa: 'メンバーシップタイプ',
    description: 'Platform-specific membership types', 
    descriptionZh: '平台专用会籍类型',
    descriptionJa: 'プラットフォーム固有のメンバーシップタイプ',
    icon: '🎭' 
  },
  { 
    code: 'membership-level', 
    name: 'Membership Level', 
    nameZh: '会籍级别', 
    nameJa: 'メンバーシップレベル',
    description: 'Tier levels within membership types', 
    descriptionZh: '会籍类型下的层级定义',
    descriptionJa: 'メンバーシップタイプ内のレベル定義',
    icon: '⭐' 
  },
  { 
    code: 'consent', 
    name: 'Consent', 
    nameZh: '同意声明', 
    nameJa: '同意',
    description: 'Customer consent definitions', 
    descriptionZh: '客户同意定义',
    descriptionJa: '顧客同意の定義',
    icon: '✅' 
  },
  { 
    code: 'profile-store', 
    name: 'Profile Store', 
    nameZh: '档案存储库', 
    nameJa: 'プロファイルストア',
    description: 'Customer archive isolation and sharing boundary',
    descriptionZh: '客户档案隔离与共享边界',
    descriptionJa: '顧客アーカイブの分離と共有境界',
    icon: '🔐' 
  },
] as const;

// System Dictionary Types
export const DICTIONARY_TYPES = [
  { code: 'countries', name: 'Countries', nameZh: '国家/地区', nameJa: '国/地域', icon: '🌍' },
  { code: 'languages', name: 'Languages', nameZh: '语言', nameJa: '言語', icon: '🗣️' },
  { code: 'timezones', name: 'Timezones', nameZh: '时区', nameJa: 'タイムゾーン', icon: '🕐' },
  { code: 'currencies', name: 'Currencies', nameZh: '货币', nameJa: '通貨', icon: '💰' },
  { code: 'genders', name: 'Genders', nameZh: '性别', nameJa: '性別', icon: '⚧️' },
  { code: 'profile_types', name: 'Profile Types', nameZh: '档案类型', nameJa: 'プロファイルタイプ', icon: '📋' },
  { code: 'social_platforms', name: 'Social Platforms', nameZh: '社交平台', nameJa: 'ソーシャルプラットフォーム', icon: '📱' },
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
