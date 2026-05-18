import type { LocalizedText, SupportedUiLocale } from '@tcrn/shared';

import type {
  AdapterType,
  ConsumerCategory,
  EmailProvider,
  EmailTemplateCategory,
  IntegrationTab,
} from '@/domains/integration-management/api/integration-management.api';
import { useUiLocale } from '@/platform/runtime/locale/locale-provider';
import {
  formatLocaleDateTime,
  pickLocaleText,
} from '@/platform/runtime/locale/locale-text';

function resolveLocalizedText(locale: SupportedUiLocale , text: LocalizedText) {
  return pickLocaleText(locale, text);
}

function buildExactText(
  en: string,
  zh_HANS: string,
  zh_HANT: string,
  ja: string,
  ko: string,
  fr: string,
): LocalizedText {
  return {
    en,
    zh_HANS,
    zh_HANT,
    ja,
    ko,
    fr,
  };
}

const LEGACY_TEXT_OVERRIDES: Record<string, LocalizedText> = {
  Adapters: buildExactText('Adapters', '适配器', '適配器', 'アダプター', '어댑터', 'Adaptateurs'),
  Webhooks: buildExactText('Webhooks', 'Webhook', 'Webhook', 'Webhook', '웹훅', 'Webhooks'),
  'API Keys': buildExactText('API Keys', 'API 密钥', 'API 金鑰', 'API キー', 'API 키', 'Cles API'),
  Email: buildExactText('Email', '邮件', '郵件', 'メール', '이메일', 'Email'),
  External: buildExactText('External', '外部', '外部', '外部', '외부', 'Externe'),
  Partner: buildExactText('Partner', '合作方', '合作方', 'パートナー', '파트너', 'Partenaire'),
  Internal: buildExactText('Internal', '内部', '內部', '内部', '내부', 'Interne'),
  System: buildExactText('System', '系统', '系統', 'システム', '시스템', 'Systeme'),
  Business: buildExactText('Business', '业务', '業務', '業務', '업무', 'Metier'),
  Active: buildExactText('Active', '启用', '啟用', '有効', '활성', 'Actif'),
  Inactive: buildExactText('Inactive', '停用', '停用', '無効', '비활성', 'Inactif'),
  Inherited: buildExactText('Inherited', '继承', '繼承', '継承', '상속', 'Herite'),
  Tenant: buildExactText('Tenant', '租户', '租戶', 'テナント', '테넌트', 'Locataire'),
  Platform: buildExactText('Platform', '平台', '平台', 'プラットフォーム', '플랫폼', 'Plateforme'),
  'platform-level': buildExactText('platform-level', '平台级', '平台級', 'プラットフォームレベル', '플랫폼 수준', 'niveau plateforme'),
  'tenant-level': buildExactText('tenant-level', '租户级', '租戶級', 'テナントレベル', '테넌트 수준', 'niveau locataire'),
  Refresh: buildExactText('Refresh', '刷新', '重新整理', '更新', '새로고침', 'Actualiser'),
  Open: buildExactText('Open', '打开', '打開', '開く', '열기', 'Ouvrir'),
  Edit: buildExactText('Edit', '编辑', '編輯', '編集', '수정', 'Modifier'),
  Deactivate: buildExactText('Deactivate', '停用', '停用', '無効化', '비활성화', 'Desactiver'),
  Reactivate: buildExactText('Reactivate', '重新启用', '重新啟用', '再有効化', '다시 활성화', 'Reactiver'),
  Save: buildExactText('Save', '保存', '儲存', '保存', '저장', 'Enregistrer'),
  Cancel: buildExactText('Cancel', '取消', '取消', 'キャンセル', '취소', 'Annuler'),
  Status: buildExactText('Status', '状态', '狀態', '状態', '상태', 'Statut'),
  Actions: buildExactText('Actions', '操作', '操作', '操作', '작업', 'Actions'),
  Code: buildExactText('Code', '代码', '代碼', 'コード', '코드', 'Code'),
  Category: buildExactText('Category', '分类', '分類', 'カテゴリ', '카테고리', 'Categorie'),
  Provider: buildExactText('Provider', '服务提供商', '服務提供商', 'プロバイダー', '제공자', 'Fournisseur'),
  'Test email address': buildExactText('Test email address', '测试邮箱地址', '測試信箱地址', 'テストメールアドレス', '테스트 이메일 주소', 'Adresse email de test'),
  'From address': buildExactText('From address', '发件地址', '寄件地址', '送信元アドレス', '발신 주소', 'Adresse expediteur'),
  'From name': buildExactText('From name', '发件名称', '寄件名稱', '送信者名', '발신자 이름', 'Nom expediteur'),
  'Reply-to': buildExactText('Reply-to', '回复地址', '回覆地址', '返信先', '답장 주소', 'Repondre a'),
  'Translation management': buildExactText('Translation management', '翻译管理', '翻譯管理', '翻訳管理', '번역 관리', 'Gestion des traductions'),
  'Test connection': buildExactText('Test connection', '测试连接', '測試連線', '接続をテスト', '연결 테스트', 'Tester la connexion'),
  'Send test email': buildExactText('Send test email', '发送测试邮件', '傳送測試郵件', 'テストメールを送信', '테스트 이메일 보내기', 'Envoyer un email de test'),
  'Email Templates': buildExactText('Email Templates', '邮件模板', '郵件模板', 'メールテンプレート', '이메일 템플릿', 'Modeles d email'),
  'New template': buildExactText('New template', '新建模板', '新增模板', '新しいテンプレート', '새 템플릿', 'Nouveau modele'),
  'New Template': buildExactText('New Template', '新建模板', '新增模板', '新しいテンプレート', '새 템플릿', 'Nouveau modele'),
  'Template Detail': buildExactText('Template Detail', '模板详情', '模板詳情', 'テンプレート詳細', '템플릿 상세', 'Detail du modele'),
  'Select a scope first': buildExactText('Select a scope first', '请先选择一个范围', '請先選擇一個範圍', '先にスコープを選択してください', '먼저 범위를 선택하세요', 'Selectionnez d abord un perimetre'),
};

function buildLocalizedText(en: string, zh_HANS: string, ja: string, zh_HANT = zh_HANS): LocalizedText {
  return LEGACY_TEXT_OVERRIDES[en] ?? {
    en,
    zh_HANS,
    zh_HANT,
    ja,
    ko: en,
    fr: en,
  };
}

const TAB_LABELS: Record<IntegrationTab, LocalizedText> = {
  adapters: buildLocalizedText('Adapters', '适配器', 'アダプター', '適配器'),
  webhooks: buildLocalizedText('Webhooks', 'Webhook', 'Webhook'),
  'api-keys': buildLocalizedText('API Keys', 'API 密钥', 'API キー', 'API 金鑰'),
  email: buildLocalizedText('Email', '邮件', 'メール', '郵件'),
};

const ADAPTER_TYPE_LABELS: Record<AdapterType, LocalizedText> = {
  api_key: buildLocalizedText('API Key', 'API 密钥', 'API キー', 'API 金鑰'),
  oauth: buildLocalizedText('OAuth', 'OAuth', 'OAuth'),
  webhook: buildLocalizedText('Webhook', 'Webhook', 'Webhook'),
  ai: buildLocalizedText('AI Adapter', 'AI 适配器', 'AI アダプター', 'AI 適配器'),
};

const CONSUMER_CATEGORY_LABELS: Record<ConsumerCategory, LocalizedText> = {
  external: buildLocalizedText('External', '外部', '外部'),
  partner: buildLocalizedText('Partner', '合作方', 'パートナー'),
  internal: buildLocalizedText('Internal', '内部', '内部', '內部'),
};

const EMAIL_PROVIDER_LABELS: Record<EmailProvider, LocalizedText> = {
  smtp: buildLocalizedText('SMTP', 'SMTP', 'SMTP'),
  tencent_ses: buildLocalizedText('Tencent SES', '腾讯 SES', 'Tencent SES', '騰訊 SES'),
};

const EMAIL_TEMPLATE_CATEGORY_LABELS: Record<EmailTemplateCategory, LocalizedText> = {
  system: buildLocalizedText('System', '系统', 'システム', '系統'),
  business: buildLocalizedText('Business', '业务', '業務', '業務'),
};

export function pickIntegrationText(
  locale: SupportedUiLocale ,
  value: LocalizedText,
) {
  return resolveLocalizedText(locale, value);
}

export function formatIntegrationManagementDateTime(
  locale: SupportedUiLocale ,
  value: string | null | undefined,
  fallback: string,
) {
  return formatLocaleDateTime(locale, value ?? null, fallback);
}

export function useIntegrationManagementCopy() {
  const { locale } = useUiLocale();
  const effectiveSelectedLocale = locale;

  return {
    locale: effectiveSelectedLocale,
    text: (valueOrEn: LocalizedText | string, zh?: string, ja?: string) =>
      pickIntegrationText(
        effectiveSelectedLocale,
        typeof valueOrEn === 'string'
          ? buildLocalizedText(valueOrEn, zh ?? valueOrEn, ja ?? valueOrEn)
          : valueOrEn,
      ),
    tabLabel: (tab: IntegrationTab) => resolveLocalizedText(effectiveSelectedLocale, TAB_LABELS[tab]),
    adapterTypeLabel: (type: AdapterType) => resolveLocalizedText(effectiveSelectedLocale, ADAPTER_TYPE_LABELS[type]),
    consumerCategoryLabel: (category: ConsumerCategory) =>
      resolveLocalizedText(effectiveSelectedLocale, CONSUMER_CATEGORY_LABELS[category]),
    emailProviderLabel: (provider: EmailProvider) =>
      resolveLocalizedText(effectiveSelectedLocale, EMAIL_PROVIDER_LABELS[provider]),
    templateCategoryLabel: (category: EmailTemplateCategory) =>
      resolveLocalizedText(effectiveSelectedLocale, EMAIL_TEMPLATE_CATEGORY_LABELS[category]),
    statusLabel: (isActive: boolean) =>
      pickIntegrationText(
        effectiveSelectedLocale,
        buildLocalizedText(
          isActive ? 'Active' : 'Inactive',
          isActive ? '启用' : '停用',
          isActive ? '有効' : '無効',
          isActive ? '啟用' : '停用',
        ),
      ),
    ownerScopeLabel: (isInherited: boolean) =>
      pickIntegrationText(
        effectiveSelectedLocale,
        buildLocalizedText(
          isInherited ? 'Inherited' : 'Tenant',
          isInherited ? '继承' : '租户',
          isInherited ? '継承' : 'テナント',
          isInherited ? '繼承' : '租戶',
        ),
      ),
    workspaceLabel: (isAcWorkspace: boolean) =>
      pickIntegrationText(
        effectiveSelectedLocale,
        buildLocalizedText(
          isAcWorkspace ? 'Platform' : 'Tenant',
          isAcWorkspace ? '平台' : '租户',
          isAcWorkspace ? 'プラットフォーム' : 'テナント',
          isAcWorkspace ? '平台' : '租戶',
        ),
      ),
    workspaceDescriptor: (isAcWorkspace: boolean) =>
      pickIntegrationText(
        effectiveSelectedLocale,
        buildLocalizedText(
          isAcWorkspace ? 'platform-level' : 'tenant-level',
          isAcWorkspace ? '平台级' : '租户级',
          isAcWorkspace ? 'プラットフォームレベル' : 'テナントレベル',
          isAcWorkspace ? '平台級' : '租戶級',
        ),
      ),
  };
}
