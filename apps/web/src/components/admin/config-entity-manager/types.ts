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
  | 'profile-store';

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
  labelZh?: string;
  labelJa?: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'color' | 'boolean' | 'url' | 'array';
  required?: boolean;
  options?: {
    value: string;
    label: string;
    labelZh?: string;
    labelJa?: string;
  }[];
  placeholder?: string;
  placeholderZh?: string;
  placeholderJa?: string;
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
      { name: 'displayName', label: 'Display Name', labelZh: '显示名称', labelJa: '表示名', type: 'text', required: true },
      { name: 'iconUrl', label: 'Icon URL', labelZh: '图标 URL', labelJa: 'アイコン URL', type: 'url' },
      { name: 'baseUrl', label: 'Base URL', labelZh: '基础 URL', labelJa: 'ベース URL', type: 'url' },
      {
        name: 'profileUrlTemplate',
        label: 'Profile URL Template',
        labelZh: '个人资料 URL 模板',
        labelJa: 'プロフィール URL テンプレート',
        type: 'text',
        placeholder: 'https://example.com/user/{uid}',
      },
      { name: 'color', label: 'Brand Color', labelZh: '品牌色', labelJa: 'ブランドカラー', type: 'color' },
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
      { name: 'channelCategoryId', label: 'Channel Category', labelZh: '渠道分类', labelJa: 'チャネルカテゴリー', type: 'select' },
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
      { name: 'color', label: 'Color', labelZh: '颜色', labelJa: '色', type: 'color' },
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
      { name: 'reasonCategoryId', label: 'Reason Category', labelZh: '原因分类', labelJa: '理由カテゴリー', type: 'select' },
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
      { name: 'membershipClassId', label: 'Membership Class', labelZh: '会籍大类', labelJa: 'メンバーシップクラス', type: 'select', required: true },
      { name: 'externalControl', label: 'External Control', labelZh: '外部控制', labelJa: '外部制御', type: 'boolean' },
      { name: 'defaultRenewalDays', label: 'Default Renewal Days', labelZh: '默认续期天数', labelJa: 'デフォルト更新日数', type: 'number' },
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
      { name: 'membershipTypeId', label: 'Membership Type', labelZh: '会籍类型', labelJa: 'メンバーシップタイプ', type: 'select', required: true },
      { name: 'rank', label: 'Rank (lower = higher)', labelZh: '排序等级（越小越高）', labelJa: 'ランク（小さいほど上位）', type: 'number', required: true },
      { name: 'color', label: 'Color', labelZh: '颜色', labelJa: '色', type: 'color' },
      { name: 'badgeUrl', label: 'Badge URL', labelZh: '徽章 URL', labelJa: 'バッジ URL', type: 'url' },
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
      { name: 'consentVersion', label: 'Version', labelZh: '版本', labelJa: 'バージョン', type: 'text', required: true, placeholder: '1.0.0' },
      { name: 'effectiveFrom', label: 'Effective From', labelZh: '生效时间', labelJa: '有効開始日', type: 'text', required: true },
      { name: 'expiresAt', label: 'Expires At', labelZh: '到期时间', labelJa: '有効期限', type: 'text' },
      { name: 'contentMarkdownEn', label: 'Content (English)', labelZh: '内容（英文）', labelJa: '内容（英語）', type: 'textarea' },
      { name: 'contentMarkdownZh', label: 'Content (中文)', labelZh: '内容（中文）', labelJa: '内容（中国語）', type: 'textarea' },
      { name: 'contentMarkdownJa', label: 'Content (日本語)', labelZh: '内容（日文）', labelJa: '内容（日本語）', type: 'textarea' },
      { name: 'contentUrl', label: 'Content URL', labelZh: '内容 URL', labelJa: 'コンテンツ URL', type: 'url' },
      { name: 'isRequired', label: 'Required', labelZh: '必填', labelJa: '必須', type: 'boolean' },
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
      { name: 'consumerCategory', label: 'Category', labelZh: '分类', labelJa: 'カテゴリ', type: 'select', required: true, options: [
        { value: 'internal', label: 'Internal', labelZh: '内部', labelJa: '内部' },
        { value: 'external', label: 'External', labelZh: '外部', labelJa: '外部' },
        { value: 'partner', label: 'Partner', labelZh: '合作伙伴', labelJa: 'パートナー' },
      ]},
      { name: 'contactName', label: 'Contact Name', labelZh: '联系人姓名', labelJa: '連絡先名', type: 'text' },
      { name: 'contactEmail', label: 'Contact Email', labelZh: '联系邮箱', labelJa: '連絡先メール', type: 'text' },
      { name: 'allowedIps', label: 'Allowed IPs', labelZh: '允许的 IP', labelJa: '許可 IP', type: 'text', placeholder: '192.168.1.1, 10.0.0.0/8' },
      { name: 'rateLimit', label: 'Rate Limit (per minute)', labelZh: '限流（每分钟）', labelJa: 'レート制限（分あたり）', type: 'number' },
      { name: 'notes', label: 'Notes', labelZh: '备注', labelJa: 'メモ', type: 'textarea' },
    ],
  },
  'profile-store': {
    type: 'profile-store',
    label: 'Profile Store',
    labelZh: '档案存储库',
    labelJa: 'プロファイルストア',
    description: 'Profile stores for customer archive isolation and sharing',
    descriptionZh: '用于客户档案隔离与共享的档案存储库',
    descriptionJa: '顧客アーカイブの分離と共有に使うプロファイルストア',
    extraFields: [
      { name: 'piiProxyUrl', label: 'PII Proxy URL', labelZh: 'PII 代理 URL', labelJa: 'PII プロキシ URL', type: 'url' },
      { name: 'isDefault', label: 'Is Default', labelZh: '设为默认', labelJa: 'デフォルトにする', type: 'boolean' },
    ],
  },
};
