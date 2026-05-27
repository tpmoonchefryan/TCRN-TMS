import type { SupportedUiLocale } from '@tcrn/shared';

import { useUiLocale } from '@/platform/runtime/locale/locale-provider';
import {
  formatLocaleDateTime,
  formatLocaleNumber,
  pickLocaleText,
  resolveLocaleRecord,
} from '@/platform/runtime/locale/locale-text';

interface TenantManagementCopy {
  currentAcTenantFallback: string;
  cancelAction: string;
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
    capabilitiesHint: string;
    capabilitiesLabel: string;
    capabilitiesLoading: string;
    capabilityAssignableBadge: string;
    capabilityLockedBadge: string;
    capabilityLockedSystem: string;
    capabilityEnableLabel: (label: string) => string;
    capabilityConflictHint: string;
    capabilityReloadAction: string;
    capabilityNoOptionalModules: string;
    capabilitySaveNote: string;
    generatedDuringCreate: string;
    loadError: string;
    loading: string;
    maxCustomersLabel: string;
    maxCustomersPlaceholder: string;
    maxTalentsLabel: string;
    maxTalentsPlaceholder: string;
    quotaHelper: string;
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
    sendingDomains: {
      title: string;
      description: string;
      newDomainLabel: string;
      newDomainPlaceholder: string;
      addDomain: string;
      loading: string;
      empty: string;
      hostnameLabel: string;
      statusLabel: string;
      pendingDnsStatus: string;
      verifiedStatus: string;
      disabledStatus: string;
      removeDomain: string;
      saveSubmit: string;
      savePending: string;
      saveSuccess: string;
      loadError: string;
      saveError: string;
      generateTokenNotice: string;
    };
  };
  filters: {
    all: string;
    standard: string;
    status: string;
    tier: string;
  };
}

const COPY: Record<SupportedUiLocale, TenantManagementCopy> = {
  en: {
    currentAcTenantFallback: 'Current AC Tenant',
    cancelAction: 'Cancel',
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
      deactivateDescription:
        'The tenant record stays available, but tenant access is disabled until it is reactivated.',
      deactivateError: 'Failed to deactivate tenant.',
      deactivateSubmit: 'Deactivate tenant',
      editDescription: 'Review tenant identity, limits, modules, and status.',
      capabilitiesHint:
        'Registry-backed modules are product availability controls. RBAC permissions are still required.',
      capabilitiesLabel: 'Capabilities',
      capabilitiesLoading: 'Loading capability registry...',
      capabilityAssignableBadge: 'Assignable',
      capabilityLockedBadge: 'Locked',
      capabilityLockedSystem: 'System capability derived from tenant tier and registry rules.',
      capabilityEnableLabel: (label) => `Enable ${label}`,
      capabilityConflictHint: 'Capability assignments changed elsewhere. Reload before saving again.',
      capabilityReloadAction: 'Reload capabilities',
      capabilityNoOptionalModules: 'No optional modules enabled',
      capabilitySaveNote: 'Updated from AC Tenant Management.',
      generatedDuringCreate: 'Created automatically',
      loadError: 'Failed to load tenant.',
      loading: 'Loading tenant…',
      maxCustomersLabel: 'Max customers per talent',
      maxCustomersPlaceholder: '10000',
      maxTalentsLabel: 'Max talents',
      maxTalentsPlaceholder: '25',
      quotaHelper:
        'Leave empty for no limit. If a future limit is set below current usage, existing records remain available; only new creations are blocked.',
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
      sendingDomains: {
        title: 'Email sending domains',
        description:
          'Manage customer-owned sender domains for this tenant and provide DNS records for customer setup.',
        newDomainLabel: 'New sending domain',
        newDomainPlaceholder: 'mail.example.com',
        addDomain: 'Add sending domain',
        loading: 'Loading email sending domains…',
        empty: 'No customer sending domain has been added for this tenant.',
        hostnameLabel: 'Sending domain hostname',
        statusLabel: 'Sending domain status',
        pendingDnsStatus: 'Pending DNS',
        verifiedStatus: 'Verified',
        disabledStatus: 'Disabled',
        removeDomain: 'Remove domain',
        saveSubmit: 'Save sending domains',
        savePending: 'Saving sending domains…',
        saveSuccess: 'Email sending domains saved.',
        loadError: 'Failed to load email sending domains.',
        saveError: 'Failed to save email sending domains.',
        generateTokenNotice: 'Save to generate verification token',
      },
    },
    filters: {
      all: 'All',
      standard: 'Standard',
      status: 'Status',
      tier: 'Tier',
    },
  },
  zh_HANS: {
    currentAcTenantFallback: '当前 AC 租户',
    cancelAction: '取消',
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
      editDescription: '在一个页面中查看并编辑租户标识、容量、模块与状态。',
      capabilitiesHint: 'Registry 模块控制产品可用性，仍需 RBAC 权限才能访问。',
      capabilitiesLabel: '能力模块',
      capabilitiesLoading: '正在加载能力 Registry...',
      capabilityAssignableBadge: '可分配',
      capabilityLockedBadge: '锁定',
      capabilityLockedSystem: '系统能力由租户层级与 Registry 规则派生。',
      capabilityEnableLabel: (label) => `启用${label}`,
      capabilityConflictHint: '能力分配已在其他位置变更，请重新加载后再保存。',
      capabilityReloadAction: '重新加载能力',
      capabilityNoOptionalModules: '未启用可选模块',
      capabilitySaveNote: '由 AC 租户管理更新。',
      generatedDuringCreate: '创建后自动生成',
      loadError: '加载租户失败。',
      loading: '正在加载租户…',
      maxCustomersLabel: '每位艺人的最大客户数',
      maxCustomersPlaceholder: '10000',
      maxTalentsLabel: '最大艺人数',
      maxTalentsPlaceholder: '25',
      quotaHelper: '留空表示不限制。若未来设置的限制低于当前用量，既有记录仍可用，仅阻止新建。',
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
      sendingDomains: {
        title: '发件域名',
        description: '管理当前租户由客户提供的发件域名，并向客户提供 DNS 记录完成配置。',
        newDomainLabel: '新增发件域名',
        newDomainPlaceholder: 'mail.example.com',
        addDomain: '新增发件域名',
        loading: '正在加载发件域名…',
        empty: '当前租户还没有添加客户发件域名。',
        hostnameLabel: '发件域名主机名',
        statusLabel: '发件域名状态',
        pendingDnsStatus: '等待 DNS',
        verifiedStatus: '已验证',
        disabledStatus: '已停用',
        removeDomain: '移除域名',
        saveSubmit: '保存发件域名',
        savePending: '正在保存发件域名…',
        saveSuccess: '发件域名已保存。',
        loadError: '加载发件域名失败。',
        saveError: '保存发件域名失败。',
        generateTokenNotice: '保存后生成验证令牌',
      },
    },
    filters: {
      all: '全部',
      standard: '标准',
      status: '状态',
      tier: '层级',
    },
  },
  zh_HANT: {
    currentAcTenantFallback: '当前 AC 租户',
    cancelAction: '取消',
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
      editDescription: '在一個頁面中查看並編輯租戶標識、容量、模組與狀態。',
      capabilitiesHint: 'Registry 模組控制產品可用性，仍需 RBAC 權限才能存取。',
      capabilitiesLabel: '能力模組',
      capabilitiesLoading: '正在載入能力 Registry...',
      capabilityAssignableBadge: '可分配',
      capabilityLockedBadge: '鎖定',
      capabilityLockedSystem: '系統能力由租戶層級與 Registry 規則派生。',
      capabilityEnableLabel: (label) => `啟用${label}`,
      capabilityConflictHint: '能力分配已在其他位置變更，請重新載入後再儲存。',
      capabilityReloadAction: '重新載入能力',
      capabilityNoOptionalModules: '未啟用可選模組',
      capabilitySaveNote: '由 AC 租戶管理更新。',
      generatedDuringCreate: '创建后自动生成',
      loadError: '加载租户失败。',
      loading: '正在加载租户…',
      maxCustomersLabel: '每位艺人的最大客户数',
      maxCustomersPlaceholder: '10000',
      maxTalentsLabel: '最大艺人数',
      maxTalentsPlaceholder: '25',
      quotaHelper: '留空表示不限制。若未來設定的限制低於目前用量，既有記錄仍可用，僅阻止新建。',
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
      sendingDomains: {
        title: '发件域名',
        description: '管理当前租户由客户提供的发件域名，并向客户提供 DNS 记录完成配置。',
        newDomainLabel: '新增发件域名',
        newDomainPlaceholder: 'mail.example.com',
        addDomain: '新增发件域名',
        loading: '正在加载发件域名…',
        empty: '当前租户还没有添加客户发件域名。',
        hostnameLabel: '发件域名主机名',
        statusLabel: '发件域名状态',
        pendingDnsStatus: '等待 DNS',
        verifiedStatus: '已验证',
        disabledStatus: '已停用',
        removeDomain: '移除域名',
        saveSubmit: '保存发件域名',
        savePending: '正在保存发件域名…',
        saveSuccess: '发件域名已保存。',
        loadError: '加载发件域名失败。',
        saveError: '保存发件域名失败。',
        generateTokenNotice: '保存后生成验证令牌',
      },
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
    cancelAction: 'キャンセル',
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
      deactivateDescription:
        'テナント記録は残りますが、再有効化されるまでテナントアクセスは停止されます。',
      deactivateError: 'テナントの無効化に失敗しました。',
      deactivateSubmit: 'テナントを無効化',
      editDescription: 'テナント識別情報、上限、モジュール、状態を一箇所で確認・編集します。',
      capabilitiesHint:
        'Registry で管理されるモジュールはプロダクトの利用可否を制御します。アクセスには RBAC 権限も必要です。',
      capabilitiesLabel: '機能モジュール',
      capabilitiesLoading: '機能 Registry を読み込み中...',
      capabilityAssignableBadge: '割り当て可能',
      capabilityLockedBadge: 'ロック中',
      capabilityLockedSystem: 'システム機能はテナントティアと Registry ルールから派生します。',
      capabilityEnableLabel: (label) => `${label} を有効化`,
      capabilityConflictHint:
        '機能割り当てが別の場所で変更されました。再度保存する前に読み込み直してください。',
      capabilityReloadAction: '機能を再読み込み',
      capabilityNoOptionalModules: '有効な任意モジュールはありません',
      capabilitySaveNote: 'AC テナント管理から更新しました。',
      generatedDuringCreate: '作成後に自動生成',
      loadError: 'テナントの読み込みに失敗しました。',
      loading: 'テナントを読み込み中…',
      maxCustomersLabel: 'タレントごとの最大顧客数',
      maxCustomersPlaceholder: '10000',
      maxTalentsLabel: '最大タレント数',
      maxTalentsPlaceholder: '25',
      quotaHelper:
        '空欄の場合は上限なしです。将来の上限が現在の利用数を下回っても、既存レコードは維持され、新規作成のみ停止されます。',
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
      sendingDomains: {
        title: '送信ドメイン',
        description:
          'このテナント向けに顧客所有の送信ドメインを管理し、顧客設定用の DNS レコードを案内します。',
        newDomainLabel: '送信ドメインを追加',
        newDomainPlaceholder: 'mail.example.com',
        addDomain: '送信ドメインを追加',
        loading: '送信ドメインを読み込み中…',
        empty: 'このテナントには顧客の送信ドメインがまだ追加されていません。',
        hostnameLabel: '送信ドメインのホスト名',
        statusLabel: '送信ドメインの状態',
        pendingDnsStatus: 'DNS 待ち',
        verifiedStatus: '確認済み',
        disabledStatus: '無効',
        removeDomain: 'ドメインを削除',
        saveSubmit: '送信ドメインを保存',
        savePending: '送信ドメインを保存中…',
        saveSuccess: '送信ドメインを保存しました。',
        loadError: '送信ドメインの読み込みに失敗しました。',
        saveError: '送信ドメインの保存に失敗しました。',
        generateTokenNotice: '保存すると検証トークンが生成されます',
      },
    },
    filters: {
      all: 'すべて',
      standard: '標準',
      status: '状態',
      tier: 'ティア',
    },
  },
  ko: {
    currentAcTenantFallback: 'Current AC Tenant',
    cancelAction: 'Cancel',
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
      deactivateDescription:
        'The tenant record stays available, but tenant access is disabled until it is reactivated.',
      deactivateError: 'Failed to deactivate tenant.',
      deactivateSubmit: 'Deactivate tenant',
      editDescription: 'Review tenant identity, limits, modules, and status.',
      capabilitiesHint:
        'Registry 기반 모듈은 제품 사용 가능 여부를 제어합니다. 접근에는 RBAC 권한도 필요합니다.',
      capabilitiesLabel: '기능 모듈',
      capabilitiesLoading: '기능 Registry를 불러오는 중...',
      capabilityAssignableBadge: '할당 가능',
      capabilityLockedBadge: '잠김',
      capabilityLockedSystem: '시스템 기능은 테넌트 등급과 Registry 규칙에서 파생됩니다.',
      capabilityEnableLabel: (label) => `${label} 활성화`,
      capabilityConflictHint: '기능 할당이 다른 곳에서 변경되었습니다. 다시 저장하기 전에 새로고침하세요.',
      capabilityReloadAction: '기능 새로고침',
      capabilityNoOptionalModules: '활성화된 선택 모듈 없음',
      capabilitySaveNote: 'AC 테넌트 관리에서 업데이트됨.',
      generatedDuringCreate: 'Created automatically',
      loadError: 'Failed to load tenant.',
      loading: 'Loading tenant…',
      maxCustomersLabel: 'Max customers per talent',
      maxCustomersPlaceholder: '10000',
      maxTalentsLabel: 'Max talents',
      maxTalentsPlaceholder: '25',
      quotaHelper:
        '비워 두면 제한이 없습니다. 향후 제한이 현재 사용량보다 낮아져도 기존 기록은 유지되며 새 생성만 차단됩니다.',
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
      sendingDomains: {
        title: 'Email sending domains',
        description:
          'Manage customer-owned sender domains for this tenant and provide DNS records for customer setup.',
        newDomainLabel: 'New sending domain',
        newDomainPlaceholder: 'mail.example.com',
        addDomain: 'Add sending domain',
        loading: 'Loading email sending domains…',
        empty: 'No customer sending domain has been added for this tenant.',
        hostnameLabel: 'Sending domain hostname',
        statusLabel: 'Sending domain status',
        pendingDnsStatus: 'Pending DNS',
        verifiedStatus: 'Verified',
        disabledStatus: 'Disabled',
        removeDomain: 'Remove domain',
        saveSubmit: 'Save sending domains',
        savePending: 'Saving sending domains…',
        saveSuccess: 'Email sending domains saved.',
        loadError: 'Failed to load email sending domains.',
        saveError: 'Failed to save email sending domains.',
        generateTokenNotice: 'Save to generate verification token',
      },
    },
    filters: {
      all: 'All',
      standard: 'Standard',
      status: 'Status',
      tier: 'Tier',
    },
  },
  fr: {
    currentAcTenantFallback: 'Current AC Tenant',
    cancelAction: 'Cancel',
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
      deactivateDescription:
        'The tenant record stays available, but tenant access is disabled until it is reactivated.',
      deactivateError: 'Failed to deactivate tenant.',
      deactivateSubmit: 'Deactivate tenant',
      editDescription: 'Review tenant identity, limits, modules, and status.',
      capabilitiesHint:
        'Les modules geres par le Registry controlent la disponibilite produit. Les permissions RBAC restent requises.',
      capabilitiesLabel: 'Modules de capacite',
      capabilitiesLoading: 'Chargement du Registry des capacites...',
      capabilityAssignableBadge: 'Assignable',
      capabilityLockedBadge: 'Verrouille',
      capabilityLockedSystem: 'Cette capacite systeme vient du tier tenant et des regles Registry.',
      capabilityEnableLabel: (label) => `Activer ${label}`,
      capabilityConflictHint:
        'Les affectations de capacites ont change ailleurs. Rechargez avant de sauvegarder.',
      capabilityReloadAction: 'Recharger les capacites',
      capabilityNoOptionalModules: 'Aucun module optionnel active',
      capabilitySaveNote: 'Mis a jour depuis AC Tenant Management.',
      generatedDuringCreate: 'Created automatically',
      loadError: 'Failed to load tenant.',
      loading: 'Loading tenant…',
      maxCustomersLabel: 'Max customers per talent',
      maxCustomersPlaceholder: '10000',
      maxTalentsLabel: 'Max talents',
      maxTalentsPlaceholder: '25',
      quotaHelper:
        'Laissez vide pour ne pas limiter. Si une future limite passe sous l usage actuel, les donnees existantes restent disponibles; seules les nouvelles creations sont bloquees.',
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
      sendingDomains: {
        title: 'Email sending domains',
        description:
          'Manage customer-owned sender domains for this tenant and provide DNS records for customer setup.',
        newDomainLabel: 'New sending domain',
        newDomainPlaceholder: 'mail.example.com',
        addDomain: 'Add sending domain',
        loading: 'Loading email sending domains…',
        empty: 'No customer sending domain has been added for this tenant.',
        hostnameLabel: 'Sending domain hostname',
        statusLabel: 'Sending domain status',
        pendingDnsStatus: 'Pending DNS',
        verifiedStatus: 'Verified',
        disabledStatus: 'Disabled',
        removeDomain: 'Remove domain',
        saveSubmit: 'Save sending domains',
        savePending: 'Saving sending domains…',
        saveSuccess: 'Email sending domains saved.',
        loadError: 'Failed to load email sending domains.',
        saveError: 'Failed to save email sending domains.',
        generateTokenNotice: 'Save to generate verification token',
      },
    },
    filters: {
      all: 'All',
      standard: 'Standard',
      status: 'Status',
      tier: 'Tier',
    },
  },
};

export function useTenantManagementCopy() {
  const { locale } = useUiLocale();
  return {
    locale,
    copy: resolveLocaleRecord(
      locale,
      COPY as Record<SupportedUiLocale, TenantManagementCopy>
    ) as TenantManagementCopy,
  };
}

export function formatTenantDateTime(
  value: string | null | undefined,
  locale: SupportedUiLocale,
  fallback: string
) {
  return formatLocaleDateTime(locale, value ?? null, fallback);
}

export function formatTenantMetric(
  value: number,
  kind: 'subsidiaries' | 'talents' | 'users',
  locale: SupportedUiLocale
) {
  const count = formatLocaleNumber(locale, value);

  if (kind === 'subsidiaries') {
    return pickLocaleText(locale, {
      en: `${count} subsidiaries`,
      zh_HANS: `${count} 个分目录`,
      zh_HANT: `${count} 個分目錄`,
      ja: `子組織 ${count}`,
      ko: `하위 조직 ${count}`,
      fr: `${count} périmètres`,
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

export function formatTenantCreatedAt(value: string, locale: SupportedUiLocale, fallback: string) {
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
