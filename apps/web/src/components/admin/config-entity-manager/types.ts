// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

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
  | 'blocklist-entry';

export interface ConfigEntity {
  id: string;
  ownerType: 'tenant' | 'subsidiary' | 'talent';
  ownerId: string | null;
  code: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  name: string;
  descriptionEn: string | null;
  descriptionZh: string | null;
  descriptionJa: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  isForceUse: boolean;
  isSystem: boolean;
  isInherited: boolean;
  isDisabledHere: boolean;
  canDisable: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
  // Extra fields based on entity type
  [key: string]: unknown;
}

export interface ConfigEntityTypeConfig {
  type: ConfigEntityType;
  label: string;
  labelZh: string;
  labelJa: string;
  description: string;
  descriptionZh: string;
  descriptionJa: string;
  extraFields: ExtraFieldConfig[];
  hasParent?: boolean;
  parentType?: ConfigEntityType;
  parentFieldName?: string;
}

export interface ExtraFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'color' | 'boolean' | 'url' | 'array';
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

// Entity type configurations
export const ENTITY_TYPE_CONFIGS: Record<ConfigEntityType, ConfigEntityTypeConfig> = {
  'channel-category': {
    type: 'channel-category',
    label: 'Channel Category',
    labelZh: '渠道分类',
    labelJa: 'チャネルカテゴリー',
    description: 'Categories for communication channels',
    descriptionZh: '沟通渠道的分类',
    descriptionJa: 'コミュニケーションチャネルのカテゴリー',
    extraFields: [],
  },
  'social-platform': {
    type: 'social-platform',
    label: 'Social Platform',
    labelZh: '社交平台',
    labelJa: 'ソーシャルプラットフォーム',
    description: 'Social media platforms for customer identities',
    descriptionZh: '用于客户身份识别的社交媒体平台',
    descriptionJa: '顧客IDに使用するソーシャルメディアプラットフォーム',
    extraFields: [
      { name: 'displayName', label: 'Display Name', type: 'text', required: true },
      { name: 'iconUrl', label: 'Icon URL', type: 'url' },
      { name: 'baseUrl', label: 'Base URL', type: 'url' },
      { name: 'profileUrlTemplate', label: 'Profile URL Template', type: 'text', placeholder: 'https://example.com/user/{uid}' },
      { name: 'color', label: 'Brand Color', type: 'color' },
    ],
  },
  'business-segment': {
    type: 'business-segment',
    label: 'Business Segment',
    labelZh: '业务线',
    labelJa: 'ビジネスセグメント',
    description: 'Business line classification for companies',
    descriptionZh: '企业客户的业务线分类',
    descriptionJa: '企業顧客のビジネスライン分類',
    extraFields: [],
  },
  'communication-type': {
    type: 'communication-type',
    label: 'Communication Type',
    labelZh: '沟通类型',
    labelJa: 'コミュニケーションタイプ',
    description: 'Types of communication methods',
    descriptionZh: '沟通方式的类型',
    descriptionJa: 'コミュニケーション方法の種類',
    extraFields: [
      { name: 'channelCategoryId', label: 'Channel Category', type: 'select' },
    ],
    hasParent: true,
    parentType: 'channel-category',
    parentFieldName: 'channelCategoryId',
  },
  'address-type': {
    type: 'address-type',
    label: 'Address Type',
    labelZh: '地址类型',
    labelJa: '住所タイプ',
    description: 'Types of addresses',
    descriptionZh: '地址的类型',
    descriptionJa: '住所の種類',
    extraFields: [],
  },
  'customer-status': {
    type: 'customer-status',
    label: 'Customer Status',
    labelZh: '客户状态',
    labelJa: '顧客ステータス',
    description: 'Status labels for customers',
    descriptionZh: '客户的状态标签',
    descriptionJa: '顧客のステータスラベル',
    extraFields: [
      { name: 'color', label: 'Color', type: 'color' },
    ],
  },
  'reason-category': {
    type: 'reason-category',
    label: 'Reason Category',
    labelZh: '原因分类',
    labelJa: '理由カテゴリー',
    description: 'Categories for inactivation reasons',
    descriptionZh: '停用原因的分类',
    descriptionJa: '非アクティブ化理由のカテゴリー',
    extraFields: [],
  },
  'inactivation-reason': {
    type: 'inactivation-reason',
    label: 'Inactivation Reason',
    labelZh: '停用原因',
    labelJa: '非アクティブ化理由',
    description: 'Reasons for deactivating customers',
    descriptionZh: '停用客户的原因',
    descriptionJa: '顧客を非アクティブ化する理由',
    extraFields: [
      { name: 'reasonCategoryId', label: 'Reason Category', type: 'select' },
    ],
    hasParent: true,
    parentType: 'reason-category',
    parentFieldName: 'reasonCategoryId',
  },
  'membership-class': {
    type: 'membership-class',
    label: 'Membership Class',
    labelZh: '会员大类',
    labelJa: '会員クラス',
    description: 'Top-level membership classifications',
    descriptionZh: '顶层会员分类',
    descriptionJa: 'トップレベルの会員分類',
    extraFields: [],
  },
  'membership-type': {
    type: 'membership-type',
    label: 'Membership Type',
    labelZh: '会员类型',
    labelJa: '会員タイプ',
    description: 'Types within a membership class',
    descriptionZh: '会员大类下的会员类型',
    descriptionJa: '会員クラス内の会員タイプ',
    extraFields: [
      { name: 'membershipClassId', label: 'Membership Class', type: 'select', required: true },
      { name: 'externalControl', label: 'External Control', type: 'boolean' },
      { name: 'defaultRenewalDays', label: 'Default Renewal Days', type: 'number' },
    ],
    hasParent: true,
    parentType: 'membership-class',
    parentFieldName: 'membershipClassId',
  },
  'membership-level': {
    type: 'membership-level',
    label: 'Membership Level',
    labelZh: '会员等级',
    labelJa: '会員レベル',
    description: 'Levels within a membership type',
    descriptionZh: '会员类型下的会员等级',
    descriptionJa: '会員タイプ内の会員レベル',
    extraFields: [
      { name: 'membershipTypeId', label: 'Membership Type', type: 'select', required: true },
      { name: 'rank', label: 'Rank (lower = higher)', type: 'number', required: true },
      { name: 'color', label: 'Color', type: 'color' },
      { name: 'badgeUrl', label: 'Badge URL', type: 'url' },
    ],
    hasParent: true,
    parentType: 'membership-type',
    parentFieldName: 'membershipTypeId',
  },
  'consent': {
    type: 'consent',
    label: 'Consent',
    labelZh: '同意协议',
    labelJa: '同意',
    description: 'Consent agreements for customers',
    descriptionZh: '客户同意协议',
    descriptionJa: '顧客の同意',
    extraFields: [
      { name: 'consentVersion', label: 'Version', type: 'text', required: true, placeholder: '1.0.0' },
      { name: 'effectiveFrom', label: 'Effective From', type: 'text', required: true },
      { name: 'expiresAt', label: 'Expires At', type: 'text' },
      { name: 'contentUrl', label: 'Content URL', type: 'url' },
      { name: 'isRequired', label: 'Required', type: 'boolean' },
    ],
  },
  'consumer': {
    type: 'consumer',
    label: 'API Consumer',
    labelZh: 'API消费者',
    labelJa: 'APIコンシューマー',
    description: 'External API consumers',
    descriptionZh: '外部API消费者',
    descriptionJa: '外部APIコンシューマー',
    extraFields: [
      { name: 'consumerCategory', label: 'Category', type: 'select', required: true, options: [
        { value: 'internal', label: 'Internal' },
        { value: 'external', label: 'External' },
        { value: 'partner', label: 'Partner' },
      ]},
      { name: 'contactName', label: 'Contact Name', type: 'text' },
      { name: 'contactEmail', label: 'Contact Email', type: 'text' },
      { name: 'rateLimit', label: 'Rate Limit (per minute)', type: 'number' },
    ],
  },
  'blocklist-entry': {
    type: 'blocklist-entry',
    label: 'Blocklist Entry',
    labelZh: '屏蔽词条目',
    labelJa: 'ブロックリストエントリー',
    description: 'Blocked words and patterns',
    descriptionZh: '屏蔽词和模式',
    descriptionJa: 'ブロックワードとパターン',
    extraFields: [
      { name: 'pattern', label: 'Pattern', type: 'text', required: true },
      { name: 'patternType', label: 'Pattern Type', type: 'select', required: true, options: [
        { value: 'keyword', label: 'Keyword' },
        { value: 'regex', label: 'Regex' },
        { value: 'wildcard', label: 'Wildcard' },
      ]},
      { name: 'action', label: 'Action', type: 'select', required: true, options: [
        { value: 'reject', label: 'Reject' },
        { value: 'flag', label: 'Flag' },
        { value: 'replace', label: 'Replace' },
      ]},
      { name: 'replacement', label: 'Replacement Text', type: 'text', placeholder: '***' },
      { name: 'severity', label: 'Severity', type: 'select', required: true, options: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
      ]},
      { name: 'category', label: 'Category', type: 'text' },
    ],
  },
};
