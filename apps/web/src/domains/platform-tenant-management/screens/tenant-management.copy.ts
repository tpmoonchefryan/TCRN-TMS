import type { SupportedUiLocale } from '@tcrn/shared';

import { type RuntimeLocale, useRuntimeLocale } from '@/platform/runtime/locale/locale-provider';
import {
  formatLocaleDateTime,
  formatLocaleNumber,
  pickLocaleText,
  resolveLocaleRecord,
} from '@/platform/runtime/locale/locale-text';

interface TenantManagementCopy {
  currentAcTenantFallback: string;
  confirmAction: string;
  management: {
    active: string;
    activeHint: string;
    activeStatus: string;
    actionsColumn: string;
    acTierLabel: string;
    acTierHint: string;
    badge: string;
    createTenant: string;
    editTenant: string;
    emptyDescription: string;
    emptyTitle: string;
    inactiveStatus: string;
    lifecycleColumn: string;
    loadError: string;
    searchPlaceholder: string;
    standardTierHint: string;
    standardTierLabel: string;
    statsColumn: string;
    statusFilter: string;
    summaryDescription: string;
    tenantColumn: string;
    tierColumn: string;
    tierFilter: string;
    title: string;
    updatedColumn: string;
    visibleTenantsHint: string;
    visibleTenantsLabel: string;
  };
  editor: {
    activeStatus: string;
    acTierLabel: string;
    adminDisplayNameHint: string;
    adminDisplayNameLabel: string;
    adminDisplayNamePlaceholder: string;
    adminEmailLabel: string;
    adminEmailPlaceholder: string;
    adminPasswordLabel: string;
    adminPasswordPlaceholder: string;
    adminUsernameLabel: string;
    adminUsernamePlaceholder: string;
    backToInventory: string;
    badge: string;
    createDescription: string;
    createError: string;
    createSubmit: string;
    createdLabel: string;
    currentSelection: string;
    deactivateDescription: string;
    deactivateError: string;
    deactivateSubmit: string;
    editDescription: string;
    featuresHint: string;
    featuresLabel: string;
    featuresPlaceholder: string;
    generatedDuringCreate: string;
    loadError: string;
    loading: string;
    maxCustomersLabel: string;
    maxCustomersPlaceholder: string;
    maxTalentsLabel: string;
    maxTalentsPlaceholder: string;
    newTenant: string;
    inactiveStatus: string;
    provisionTitle: string;
    reactivateDescription: string;
    reactivateError: string;
    reactivateSubmit: string;
    savePending: string;
    saveSubmit: string;
    schemaLabel: string;
    selectionTierLabel: string;
    successCreate: string;
    successDeactivate: string;
    successReactivate: string;
    successUpdate: string;
    summarySubsidiariesHint: string;
    summarySubsidiariesLabel: string;
    summaryTalentsHint: string;
    summaryTalentsLabel: string;
    summaryUsersHint: string;
    summaryUsersLabel: string;
    tenantCodeHintCreate: string;
    tenantCodeHintEdit: string;
    tenantCodeLabel: string;
    tenantCodePlaceholder: string;
    tenantEditorFallbackTitle: string;
    tenantNameLabel: string;
    tenantNamePlaceholder: string;
    tenantSelectionLabel: string;
    updateError: string;
    updatedLabel: string;
    standardTierLabel: string;
  };
  filters: {
    all: string;
    standard: string;
    status: string;
    tier: string;
  };
}

const COPY: Record<RuntimeLocale, TenantManagementCopy> = {
  en: {
    currentAcTenantFallback: 'Current AC Tenant',
    confirmAction: 'Confirm',
    management: {
      active: 'Active',
      activeHint: 'Active tenants in the current results.',
      activeStatus: 'Active',
      actionsColumn: 'Actions',
      acTierLabel: 'AC tenants',
      acTierHint: 'AC tenants in the current results.',
      badge: 'AC',
      createTenant: 'Create tenant',
      editTenant: 'Edit tenant',
      emptyDescription: 'Change the current search or filters to show more tenants.',
      emptyTitle: 'No tenants matched this filter',
      inactiveStatus: 'Inactive',
      lifecycleColumn: 'Lifecycle',
      loadError: 'Failed to load tenants.',
      searchPlaceholder: 'Search tenant code or name',
      standardTierHint: 'Standard tenants in the current results.',
      standardTierLabel: 'Standard tenants',
      statsColumn: 'Stats',
      statusFilter: 'Status',
      summaryDescription: 'Search, filter, and open tenant records.',
      tenantColumn: 'Tenant',
      tierColumn: 'Tier',
      tierFilter: 'Tier',
      title: 'Tenant Management',
      updatedColumn: 'Updated',
      visibleTenantsHint: 'Tenants in the current results.',
      visibleTenantsLabel: 'Visible tenants',
    },
    editor: {
      activeStatus: 'Active',
      acTierLabel: 'AC',
      adminDisplayNameHint: '',
      adminDisplayNameLabel: 'Admin display name',
      adminDisplayNamePlaceholder: 'Tenant Administrator',
      adminEmailLabel: 'Admin email',
      adminEmailPlaceholder: 'admin@example.com',
      adminPasswordLabel: 'Admin password',
      adminPasswordPlaceholder: 'Minimum 12 characters',
      adminUsernameLabel: 'Admin username',
      adminUsernamePlaceholder: 'tenant.admin',
      backToInventory: 'Back to tenants',
      badge: 'AC',
      createDescription: 'Create a tenant and its initial administrator.',
      createError: 'Failed to create tenant.',
      createSubmit: 'Create tenant',
      createdLabel: 'Created',
      currentSelection: 'Current tenant',
      deactivateDescription: 'The tenant record stays available, but tenant access is disabled until it is reactivated.',
      deactivateError: 'Failed to deactivate tenant.',
      deactivateSubmit: 'Deactivate tenant',
      editDescription: 'Review tenant identity, limits, and status.',
      featuresHint: 'Separate multiple enabled modules with commas.',
      featuresLabel: 'Enabled features',
      featuresPlaceholder: 'homepage, marshmallow',
      generatedDuringCreate: 'Created automatically',
      loadError: 'Failed to load tenant.',
      loading: 'Loading tenant…',
      maxCustomersLabel: 'Max customers per talent',
      maxCustomersPlaceholder: '10000',
      maxTalentsLabel: 'Max talents',
      maxTalentsPlaceholder: '25',
      newTenant: 'New tenant',
      inactiveStatus: 'Inactive',
      provisionTitle: 'Create tenant',
      reactivateDescription: 'Restore tenant access and return the tenant to active operation.',
      reactivateError: 'Failed to reactivate tenant.',
      reactivateSubmit: 'Reactivate tenant',
      savePending: 'Saving…',
      saveSubmit: 'Save changes',
      schemaLabel: 'Schema',
      selectionTierLabel: 'Tier',
      successCreate: 'Tenant created.',
      successDeactivate: 'was deactivated.',
      successReactivate: 'was reactivated.',
      successUpdate: 'was updated.',
      summarySubsidiariesHint: 'Current organization branches in this tenant.',
      summarySubsidiariesLabel: 'Subsidiaries',
      summaryTalentsHint: 'Current talents in this tenant.',
      summaryTalentsLabel: 'Talents',
      summaryUsersHint: 'Current user count in this tenant.',
      summaryUsersLabel: 'Users',
      tenantCodeHintCreate: 'Uppercase letters, numbers, and underscores only.',
      tenantCodeHintEdit: 'Tenant code cannot be changed after creation.',
      tenantCodeLabel: 'Tenant code',
      tenantCodePlaceholder: 'ACME_CORP',
      tenantEditorFallbackTitle: 'Tenant',
      tenantNameLabel: 'Tenant name',
      tenantNamePlaceholder: 'Acme Corporation',
      tenantSelectionLabel: 'Tenant',
      updateError: 'Failed to update tenant.',
      updatedLabel: 'Updated',
      standardTierLabel: 'Standard',
    },
    filters: {
      all: 'All',
      standard: 'Standard',
      status: 'Status',
      tier: 'Tier',
    },
  },
  zh: {
    currentAcTenantFallback: '当前 AC 租户',
    confirmAction: '确认',
    management: {
      active: '启用中',
      activeHint: '当前结果中处于启用状态的租户数量。',
      activeStatus: '启用',
      actionsColumn: '操作',
      acTierLabel: 'AC 租户',
      acTierHint: '当前结果中的 AC 租户数量。',
      badge: 'AC',
      createTenant: '创建租户',
      editTenant: '编辑租户',
      emptyDescription: '调整当前搜索或筛选条件，显示更多租户。',
      emptyTitle: '没有匹配当前筛选条件的租户',
      inactiveStatus: '停用',
      lifecycleColumn: '生命周期',
      loadError: '加载租户失败。',
      searchPlaceholder: '搜索租户代码或名称',
      standardTierHint: '当前结果中的标准租户数量。',
      standardTierLabel: '标准租户',
      statsColumn: '统计',
      statusFilter: '状态',
      summaryDescription: '在这里搜索、筛选并打开租户记录。',
      tenantColumn: '租户',
      tierColumn: '层级',
      tierFilter: '层级',
      title: '租户管理',
      updatedColumn: '更新时间',
      visibleTenantsHint: '当前结果中的租户数量。',
      visibleTenantsLabel: '可见租户',
    },
    editor: {
      activeStatus: '启用',
      acTierLabel: 'AC',
      adminDisplayNameHint: '',
      adminDisplayNameLabel: '管理员显示名',
      adminDisplayNamePlaceholder: '租户管理员',
      adminEmailLabel: '管理员邮箱',
      adminEmailPlaceholder: 'admin@example.com',
      adminPasswordLabel: '管理员密码',
      adminPasswordPlaceholder: '至少 12 个字符',
      adminUsernameLabel: '管理员用户名',
      adminUsernamePlaceholder: 'tenant.admin',
      backToInventory: '返回租户列表',
      badge: 'AC',
      createDescription: '创建租户并配置初始管理员。',
      createError: '创建租户失败。',
      createSubmit: '创建租户',
      createdLabel: '创建时间',
      currentSelection: '当前租户',
      deactivateDescription: '租户记录会被保留，但租户访问会被停用，直到再次启用。',
      deactivateError: '停用租户失败。',
      deactivateSubmit: '停用租户',
      editDescription: '在一个页面中查看并编辑租户标识、容量与状态。',
      featuresHint: '多个已启用模块请用逗号分隔。',
      featuresLabel: '启用功能',
      featuresPlaceholder: 'homepage, marshmallow',
      generatedDuringCreate: '创建后自动生成',
      loadError: '加载租户失败。',
      loading: '正在加载租户…',
      maxCustomersLabel: '每位艺人的最大客户数',
      maxCustomersPlaceholder: '10000',
      maxTalentsLabel: '最大艺人数',
      maxTalentsPlaceholder: '25',
      newTenant: '新租户',
      inactiveStatus: '停用',
      provisionTitle: '创建租户',
      reactivateDescription: '恢复租户访问，让该租户重新回到可用状态。',
      reactivateError: '重新启用租户失败。',
      reactivateSubmit: '重新启用租户',
      savePending: '保存中…',
      saveSubmit: '保存更改',
      schemaLabel: 'Schema',
      selectionTierLabel: '层级',
      successCreate: '租户已创建。',
      successDeactivate: '已停用。',
      successReactivate: '已重新启用。',
      successUpdate: '已更新。',
      summarySubsidiariesHint: '该租户当前的组织分支数量。',
      summarySubsidiariesLabel: '分目录',
      summaryTalentsHint: '该租户当前的艺人数量。',
      summaryTalentsLabel: '艺人',
      summaryUsersHint: '该租户当前的用户数量。',
      summaryUsersLabel: '用户',
      tenantCodeHintCreate: '仅允许大写字母、数字与下划线。',
      tenantCodeHintEdit: '租户代码创建后不可修改。',
      tenantCodeLabel: '租户代码',
      tenantCodePlaceholder: 'ACME_CORP',
      tenantEditorFallbackTitle: '租户',
      tenantNameLabel: '租户名称',
      tenantNamePlaceholder: 'Acme Corporation',
      tenantSelectionLabel: '租户',
      updateError: '更新租户失败。',
      updatedLabel: '更新时间',
      standardTierLabel: '标准',
    },
    filters: {
      all: '全部',
      standard: '标准',
      status: '状态',
      tier: '层级',
    },
  },
  ja: {
    currentAcTenantFallback: '現在の AC テナント',
    confirmAction: '確認',
    management: {
      active: '稼働中',
      activeHint: '現在の結果に含まれる有効なテナント数です。',
      activeStatus: '有効',
      actionsColumn: '操作',
      acTierLabel: 'AC テナント',
      acTierHint: '現在の結果に含まれる AC テナント数です。',
      badge: 'AC',
      createTenant: 'テナントを作成',
      editTenant: 'テナントを編集',
      emptyDescription: '検索や絞り込み条件を調整して、さらにテナントを表示してください。',
      emptyTitle: '条件に一致するテナントがありません',
      inactiveStatus: '無効',
      lifecycleColumn: 'ライフサイクル',
      loadError: 'テナントの読み込みに失敗しました。',
      searchPlaceholder: 'テナントコードまたは名前を検索',
      standardTierHint: '現在の結果に含まれる標準テナント数です。',
      standardTierLabel: '標準テナント',
      statsColumn: '統計',
      statusFilter: '状態',
      summaryDescription: 'この画面からテナントを検索、絞り込み、開きます。',
      tenantColumn: 'テナント',
      tierColumn: 'ティア',
      tierFilter: 'ティア',
      title: 'テナント管理',
      updatedColumn: '更新日時',
      visibleTenantsHint: '現在の結果に含まれるテナント数です。',
      visibleTenantsLabel: '表示中のテナント',
    },
    editor: {
      activeStatus: '有効',
      acTierLabel: 'AC',
      adminDisplayNameHint: '',
      adminDisplayNameLabel: '管理者表示名',
      adminDisplayNamePlaceholder: 'テナント管理者',
      adminEmailLabel: '管理者メール',
      adminEmailPlaceholder: 'admin@example.com',
      adminPasswordLabel: '管理者パスワード',
      adminPasswordPlaceholder: '12 文字以上',
      adminUsernameLabel: '管理者ユーザー名',
      adminUsernamePlaceholder: 'tenant.admin',
      backToInventory: 'テナント一覧へ戻る',
      badge: 'AC',
      createDescription: 'テナントと初期管理者を作成します。',
      createError: 'テナントの作成に失敗しました。',
      createSubmit: 'テナントを作成',
      createdLabel: '作成日時',
      currentSelection: '現在のテナント',
      deactivateDescription: 'テナント記録は残りますが、再有効化されるまでテナントアクセスは停止されます。',
      deactivateError: 'テナントの無効化に失敗しました。',
      deactivateSubmit: 'テナントを無効化',
      editDescription: 'テナント識別情報、上限、状態を一箇所で確認・編集します。',
      featuresHint: '有効なモジュールをカンマ区切りで入力します。',
      featuresLabel: '有効な機能',
      featuresPlaceholder: 'homepage, marshmallow',
      generatedDuringCreate: '作成後に自動生成',
      loadError: 'テナントの読み込みに失敗しました。',
      loading: 'テナントを読み込み中…',
      maxCustomersLabel: 'タレントごとの最大顧客数',
      maxCustomersPlaceholder: '10000',
      maxTalentsLabel: '最大タレント数',
      maxTalentsPlaceholder: '25',
      newTenant: '新規テナント',
      inactiveStatus: '無効',
      provisionTitle: 'テナントを作成',
      reactivateDescription: 'テナントアクセスを復元し、運用状態へ戻します。',
      reactivateError: 'テナントの再有効化に失敗しました。',
      reactivateSubmit: 'テナントを再有効化',
      savePending: '保存中…',
      saveSubmit: '変更を保存',
      schemaLabel: 'Schema',
      selectionTierLabel: 'ティア',
      successCreate: 'テナントを作成しました。',
      successDeactivate: 'を無効化しました。',
      successReactivate: 'を再有効化しました。',
      successUpdate: 'を更新しました。',
      summarySubsidiariesHint: 'このテナント内の現在の組織ブランチ数です。',
      summarySubsidiariesLabel: '子組織',
      summaryTalentsHint: 'このテナント内の現在のタレント数です。',
      summaryTalentsLabel: 'タレント',
      summaryUsersHint: 'このテナント内の現在の運用ユーザー数です。',
      summaryUsersLabel: 'ユーザー',
      tenantCodeHintCreate: '大文字、数字、アンダースコアのみ使用できます。',
      tenantCodeHintEdit: 'テナントコードは作成後に変更できません。',
      tenantCodeLabel: 'テナントコード',
      tenantCodePlaceholder: 'ACME_CORP',
      tenantEditorFallbackTitle: 'テナント',
      tenantNameLabel: 'テナント名',
      tenantNamePlaceholder: 'Acme Corporation',
      tenantSelectionLabel: 'テナント',
      updateError: 'テナントの更新に失敗しました。',
      updatedLabel: '更新日時',
      standardTierLabel: '標準',
    },
    filters: {
      all: 'すべて',
      standard: '標準',
      status: '状態',
      tier: 'ティア',
    },
  },
};

export function useTenantManagementCopy() {
  const { currentLocale, selectedLocale } = useRuntimeLocale();
  return {
    currentLocale,
    selectedLocale,
    copy: resolveLocaleRecord(selectedLocale, COPY as Record<RuntimeLocale, TenantManagementCopy>, currentLocale) as TenantManagementCopy,
  };
}

export function formatTenantDateTime(
  value: string | null | undefined,
  locale: SupportedUiLocale | RuntimeLocale,
  fallback: string,
) {
  return formatLocaleDateTime(locale, value ?? null, fallback);
}

export function formatTenantMetric(
  value: number,
  kind: 'subsidiaries' | 'talents' | 'users',
  locale: SupportedUiLocale | RuntimeLocale,
) {
  const count = formatLocaleNumber(locale, value);

  if (kind === 'subsidiaries') {
    return pickLocaleText(locale, {
      en: `${count} subsidiaries`,
      zh_HANS: `${count} 个分目录`,
      zh_HANT: `${count} 個分目錄`,
      ja: `子組織 ${count}`,
      ko: `하위 조직 ${count}`,
      fr: `${count} filiales`,
    });
  }

  if (kind === 'talents') {
    return pickLocaleText(locale, {
      en: `${count} talents`,
      zh_HANS: `${count} 个艺人`,
      zh_HANT: `${count} 位藝人`,
      ja: `タレント ${count}`,
      ko: `탤런트 ${count}`,
      fr: `${count} talents`,
    });
  }

  return pickLocaleText(locale, {
    en: `${count} users`,
    zh_HANS: `${count} 个用户`,
    zh_HANT: `${count} 位使用者`,
    ja: `ユーザー ${count}`,
    ko: `사용자 ${count}`,
    fr: `${count} utilisateurs`,
  });
}

export function formatTenantCreatedAt(
  value: string,
  locale: SupportedUiLocale | RuntimeLocale,
  fallback: string,
) {
  const formatted = formatTenantDateTime(value, locale, fallback);

  return pickLocaleText(locale, {
    en: `Created ${formatted}`,
    zh_HANS: `创建于 ${formatted}`,
    zh_HANT: `建立於 ${formatted}`,
    ja: `${formatted} に作成`,
    ko: `${formatted} 생성`,
    fr: `Créé le ${formatted}`,
  });
}
