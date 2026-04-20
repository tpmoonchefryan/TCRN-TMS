import { resolveTrilingualLocaleFamily, type SupportedUiLocale } from '@tcrn/shared';

import type { ProfileStoreListItem } from '@/domains/config-dictionary-settings/api/settings.api';
import type { OrganizationTalent } from '@/domains/organization-access/api/organization.api';
import { type RuntimeLocale, useRuntimeLocale } from '@/platform/runtime/locale/locale-provider';
import { pickLocaleText, resolveLocaleRecord } from '@/platform/runtime/locale/locale-text';
import { resolveLocalizedLabel } from '@/platform/runtime/translations/managed-translations';

function getEffectiveSelectedLocale(
  currentLocale: RuntimeLocale,
  selectedLocale: SupportedUiLocale | undefined,
): SupportedUiLocale {
  if (selectedLocale && resolveTrilingualLocaleFamily(selectedLocale) === currentLocale) {
    return selectedLocale;
  }

  return currentLocale === 'zh' ? 'zh_HANS' : currentLocale;
}

interface OrganizationStructureCopy {
  state: {
    loading: string;
    unavailableTitle: string;
    noPayload: string;
    loadTreeError: string;
    loadProfileStoresError: string;
    createError: string;
    createSubsidiaryError: string;
    loadTalentDetailError: string;
  };
  header: {
    eyebrow: string;
    tenantBadge: string;
    subsidiaryBadge: string;
  };
  actions: {
    showInactive: string;
    hideInactive: string;
    refresh: string;
    refreshing: string;
    createSubsidiary: string;
    createTalent: string;
    openWorkspace: string;
    editTalentSettings: string;
    disableWorkspace: string;
    reEnableWorkspace: string;
    editTenantSettings: string;
    editSubsidiarySettings: string;
    cancel: string;
  };
  tree: {
    title: string;
    searchPlaceholder: string;
    tenantRootLabel: string;
    tenantRootHint: string;
    emptyTitle: string;
    emptyDescription: string;
  };
  inventory: {
    title: string;
    tenantDescription: string;
    scopedDescription: string;
    emptyTitle: string;
    emptyDescription: string;
    tenantRootTalent: string;
  };
  form: {
    rootTitle: string;
    scopeTitlePrefix: string;
    rootDescription: string;
    scopeDescriptionPrefix: string;
    sectionTitle: string;
    sectionDescriptionRoot: string;
    sectionDescriptionScopePrefix: string;
    talentCodeLabel: string;
    displayNameLabel: string;
    legalNameLabel: string;
    homepagePathLabel: string;
    profileStoreLabel: string;
    timezoneLabel: string;
    talentCodePlaceholder: string;
    displayNamePlaceholder: string;
    legalNamePlaceholder: string;
    homepagePathPlaceholder: string;
    timezonePlaceholder: string;
    noProfileStores: string;
    createPending: string;
    submit: string;
    subsidiaryRootTitle: string;
    subsidiaryScopeTitlePrefix: string;
    subsidiaryRootDescription: string;
    subsidiaryScopeDescriptionPrefix: string;
    subsidiarySectionTitle: string;
    subsidiarySectionDescriptionRoot: string;
    subsidiarySectionDescriptionScopePrefix: string;
    subsidiaryCodeLabel: string;
    subsidiaryNameLabel: string;
    subsidiaryDescriptionLabel: string;
    subsidiaryCodePlaceholder: string;
    subsidiaryNamePlaceholder: string;
    subsidiaryDescriptionPlaceholder: string;
    subsidiaryCreatePending: string;
    subsidiarySubmit: string;
    closeCreateSubsidiaryDrawer: string;
    closeCreateTalentDrawer: string;
  };
  translationManagement: {
    talentNameTitle: string;
    talentNameTrigger: string;
    talentNameSummary: (count: number) => string;
    talentNameEmpty: string;
    subsidiaryNameTitle: string;
    subsidiaryNameTrigger: string;
    subsidiaryNameSummary: (count: number) => string;
    subsidiaryNameEmpty: string;
    baseValueLabel: string;
    save: string;
    cancel: string;
    closeDrawer: string;
    languageLoadError: string;
  };
  validation: {
    code: string;
    displayName: string;
    legalName: string;
    profileStore: string;
    homepagePath: string;
    subsidiaryCode: string;
    subsidiaryName: string;
  };
  notices: {
    createdInTenantRoot: string;
    createdInScopePrefix: string;
    subsidiaryCreatedInTenantRoot: string;
    subsidiaryCreatedInScopePrefix: string;
  };
  lifecycle: {
    draft: string;
    published: string;
    disabled: string;
    confirmFallback: string;
    disableTitlePrefix: string;
    disableDescription: string;
    disableConfirm: string;
    disablePending: string;
    disableSuccessSuffix: string;
    disableError: string;
    reEnableTitlePrefix: string;
    reEnableDescription: string;
    reEnableConfirm: string;
    reEnablePending: string;
    reEnableSuccessSuffix: string;
    reEnableError: string;
  };
}

const copyByLocale: Record<RuntimeLocale, OrganizationStructureCopy> = {
  en: {
    state: {
      loading: 'Loading organization structure…',
      unavailableTitle: 'Organization tree unavailable',
      noPayload: 'No organization payload was returned.',
      loadTreeError: 'Failed to load organization tree.',
      loadProfileStoresError: 'Failed to load profile stores.',
      createError: 'Failed to create talent from the organization page.',
      createSubsidiaryError: 'Failed to create subsidiary from the organization page.',
      loadTalentDetailError: 'Failed to load talent details for the lifecycle action.',
    },
    header: {
      eyebrow: 'Organization structure',
      tenantBadge: 'Tenant',
      subsidiaryBadge: 'Subsidiary',
    },
    actions: {
      showInactive: 'Show inactive',
      hideInactive: 'Hide inactive',
      refresh: 'Refresh structure',
      refreshing: 'Refreshing…',
      createSubsidiary: 'Create subsidiary',
      createTalent: 'Create talent',
      openWorkspace: 'Open business pages',
      editTalentSettings: 'Edit talent settings',
      disableWorkspace: 'Disable talent',
      reEnableWorkspace: 'Re-enable talent',
      editTenantSettings: 'Edit tenant settings',
      editSubsidiarySettings: 'Edit subsidiary settings',
      cancel: 'Cancel',
    },
    tree: {
      title: 'Scopes',
      searchPlaceholder: 'Search subsidiaries',
      tenantRootLabel: 'Tenant root',
      tenantRootHint: 'Tenant overview and all reachable talents',
      emptyTitle: 'No scopes available yet',
      emptyDescription: 'Create the first talent to start building the tenant structure.',
    },
    inventory: {
      title: 'Talent list',
      tenantDescription: 'All tenant talents appear here. Select a subsidiary to narrow the list.',
      scopedDescription: 'Talents under the selected subsidiary branch appear here.',
      emptyTitle: 'No talents in this branch',
      emptyDescription: 'Create a talent in this branch or switch to another branch from the left tree.',
      tenantRootTalent: 'Tenant-root talent',
    },
    form: {
      rootTitle: 'Create tenant-root talent',
      scopeTitlePrefix: 'Create talent in',
      rootDescription: 'Create a talent directly under the tenant root.',
      scopeDescriptionPrefix: 'Create a talent under',
      sectionTitle: 'Talent setup',
      sectionDescriptionRoot: 'This talent will be created directly under the tenant root.',
      sectionDescriptionScopePrefix: 'This talent will be created inside',
      talentCodeLabel: 'Talent code',
      displayNameLabel: 'Display name',
      legalNameLabel: 'Legal / English name',
      homepagePathLabel: 'Homepage path',
      profileStoreLabel: 'Profile store',
      timezoneLabel: 'Timezone',
      talentCodePlaceholder: 'SORA',
      displayNamePlaceholder: 'Sora',
      legalNamePlaceholder: 'Tokino Sora',
      homepagePathPlaceholder: 'sora',
      timezonePlaceholder: 'Asia/Shanghai',
      noProfileStores: 'No profile stores are available yet. Add one before creating the first talent.',
      createPending: 'Creating…',
      submit: 'Create talent',
      subsidiaryRootTitle: 'Create top-level subsidiary',
      subsidiaryScopeTitlePrefix: 'Create subsidiary under',
      subsidiaryRootDescription: 'Create a new subsidiary directly under the tenant root.',
      subsidiaryScopeDescriptionPrefix: 'Create a child subsidiary under',
      subsidiarySectionTitle: 'Subsidiary details',
      subsidiarySectionDescriptionRoot: 'This subsidiary will be created at the top level of the tenant tree.',
      subsidiarySectionDescriptionScopePrefix: 'This subsidiary will be created under',
      subsidiaryCodeLabel: 'Subsidiary code',
      subsidiaryNameLabel: 'Subsidiary name',
      subsidiaryDescriptionLabel: 'Description',
      subsidiaryCodePlaceholder: 'TOKYO',
      subsidiaryNamePlaceholder: 'Tokyo Branch',
      subsidiaryDescriptionPlaceholder: 'Optional operating note for this branch',
      subsidiaryCreatePending: 'Creating…',
      subsidiarySubmit: 'Create subsidiary',
      closeCreateSubsidiaryDrawer: 'Close create subsidiary drawer',
      closeCreateTalentDrawer: 'Close create talent drawer',
    },
    translationManagement: {
      talentNameTitle: 'Talent name translations',
      talentNameTrigger: 'Manage translations',
      talentNameSummary: (count) => `${count} locale variants configured for the talent name.`,
      talentNameEmpty: 'Only the English name is configured right now.',
      subsidiaryNameTitle: 'Subsidiary name translations',
      subsidiaryNameTrigger: 'Manage translations',
      subsidiaryNameSummary: (count) => `${count} locale variants configured for the subsidiary name.`,
      subsidiaryNameEmpty: 'Only the English name is configured right now.',
      baseValueLabel: 'Base value (English)',
      save: 'Save translations',
      cancel: 'Cancel',
      closeDrawer: 'Close translations drawer',
      languageLoadError: 'Unable to load language options right now.',
    },
    validation: {
      code: 'Talent code must be 3-32 characters using only A-Z, 0-9, and _.',
      displayName: 'Display name is required.',
      legalName: 'Legal / English name is required.',
      profileStore: 'Select a profile store before creating a talent.',
      homepagePath: 'Homepage path must use lowercase letters, numbers, and hyphens only.',
      subsidiaryCode: 'Subsidiary code must be 3-32 characters using only A-Z, 0-9, and _.',
      subsidiaryName: 'Subsidiary name is required.',
    },
    notices: {
      createdInTenantRoot: 'was created in tenant root.',
      createdInScopePrefix: 'was created in',
      subsidiaryCreatedInTenantRoot: 'was created at tenant root.',
      subsidiaryCreatedInScopePrefix: 'was created under',
    },
    lifecycle: {
      draft: 'Draft',
      published: 'Published',
      disabled: 'Disabled',
      confirmFallback: 'Confirm organization action',
      disableTitlePrefix: 'Disable',
      disableDescription: 'This removes the talent from the default organization view until inactive scopes are shown or the talent is re-enabled.',
      disableConfirm: 'Disable talent',
      disablePending: 'Disabling…',
      disableSuccessSuffix: 'was disabled.',
      disableError: 'Failed to disable the talent.',
      reEnableTitlePrefix: 'Re-enable',
      reEnableDescription: 'This returns the talent to active organization views and restores access to business pages.',
      reEnableConfirm: 'Re-enable talent',
      reEnablePending: 'Re-enabling…',
      reEnableSuccessSuffix: 'was re-enabled.',
      reEnableError: 'Failed to re-enable the talent.',
    },
  },
  zh: {
    state: {
      loading: '正在加载组织结构…',
      unavailableTitle: '组织结构不可用',
      noPayload: '未返回组织结构数据。',
      loadTreeError: '加载组织结构失败。',
      loadProfileStoresError: '加载档案库失败。',
      createError: '无法在组织结构页创建艺人。',
      createSubsidiaryError: '无法在组织结构页创建分目录。',
      loadTalentDetailError: '加载艺人详情失败，无法执行生命周期操作。',
    },
    header: {
      eyebrow: '组织结构',
      tenantBadge: '租户',
      subsidiaryBadge: '分目录',
    },
    actions: {
      showInactive: '显示停用项',
      hideInactive: '隐藏停用项',
      refresh: '刷新结构',
      refreshing: '刷新中…',
      createSubsidiary: '创建分目录',
      createTalent: '创建艺人',
      openWorkspace: '进入业务页',
      editTalentSettings: '编辑艺人设置',
      disableWorkspace: '停用艺人',
      reEnableWorkspace: '重新启用艺人',
      editTenantSettings: '编辑租户设置',
      editSubsidiarySettings: '编辑分目录设置',
      cancel: '取消',
    },
    tree: {
      title: '层级范围',
      searchPlaceholder: '搜索分目录',
      tenantRootLabel: '租户根级',
      tenantRootHint: '租户总览与所有可达艺人',
      emptyTitle: '当前还没有可用层级',
      emptyDescription: '先创建第一个艺人，再继续搭建租户结构。',
    },
    inventory: {
      title: '艺人列表',
      tenantDescription: '当前租户下的全部艺人都显示在这里，选择左侧分目录可收窄范围。',
      scopedDescription: '当前仅显示所选分目录分支下的艺人。',
      emptyTitle: '当前范围下暂无艺人',
      emptyDescription: '可在当前范围创建艺人，或从左侧切换到其他分支。',
      tenantRootTalent: '租户根级艺人',
    },
    form: {
      rootTitle: '创建租户根级艺人',
      scopeTitlePrefix: '在以下范围创建艺人：',
      rootDescription: '直接在租户根级下创建艺人。',
      scopeDescriptionPrefix: '在以下分目录下创建艺人：',
      sectionTitle: '艺人信息',
      sectionDescriptionRoot: '该艺人将直接创建在租户根级下。',
      sectionDescriptionScopePrefix: '该艺人将创建在以下分目录中：',
      talentCodeLabel: '艺人代码',
      displayNameLabel: '显示名称',
      legalNameLabel: '法务 / 英文名称',
      homepagePathLabel: '主页路径',
      profileStoreLabel: '档案库',
      timezoneLabel: '时区',
      talentCodePlaceholder: 'SORA',
      displayNamePlaceholder: '时乃空',
      legalNamePlaceholder: 'Tokino Sora',
      homepagePathPlaceholder: 'sora',
      timezonePlaceholder: 'Asia/Shanghai',
      noProfileStores: '当前还没有可用档案库。请先准备档案库，再创建第一个艺人。',
      createPending: '创建中…',
      submit: '创建艺人',
      subsidiaryRootTitle: '创建顶层分目录',
      subsidiaryScopeTitlePrefix: '在以下范围创建分目录：',
      subsidiaryRootDescription: '直接在租户根级下创建一个新的分目录。',
      subsidiaryScopeDescriptionPrefix: '在以下分目录下创建子分目录：',
      subsidiarySectionTitle: '分目录信息',
      subsidiarySectionDescriptionRoot: '该分目录将创建在租户根级。',
      subsidiarySectionDescriptionScopePrefix: '该分目录将创建在以下分目录下：',
      subsidiaryCodeLabel: '分目录代码',
      subsidiaryNameLabel: '分目录名称',
      subsidiaryDescriptionLabel: '说明（可选）',
      subsidiaryCodePlaceholder: 'TOKYO',
      subsidiaryNamePlaceholder: '东京分部',
      subsidiaryDescriptionPlaceholder: '补充说明该分目录的职责或区域',
      subsidiaryCreatePending: '创建中…',
      subsidiarySubmit: '创建分目录',
      closeCreateSubsidiaryDrawer: '关闭创建分目录抽屉',
      closeCreateTalentDrawer: '关闭创建艺人抽屉',
    },
    translationManagement: {
      talentNameTitle: '艺人名称翻译',
      talentNameTrigger: '翻译管理',
      talentNameSummary: (count) => `已为艺人名称配置 ${count} 个语言变体。`,
      talentNameEmpty: '当前仅配置英文名称。',
      subsidiaryNameTitle: '分目录名称翻译',
      subsidiaryNameTrigger: '翻译管理',
      subsidiaryNameSummary: (count) => `已为分目录名称配置 ${count} 个语言变体。`,
      subsidiaryNameEmpty: '当前仅配置英文名称。',
      baseValueLabel: '基础值（英文）',
      save: '保存翻译',
      cancel: '取消',
      closeDrawer: '关闭翻译抽屉',
      languageLoadError: '暂时无法加载语言选项。',
    },
    validation: {
      code: '艺人代码必须为 3-32 位，且只能使用 A-Z、0-9 与 _。',
      displayName: '显示名称不能为空。',
      legalName: '法务 / 英文名称不能为空。',
      profileStore: '创建艺人前必须先选择档案库。',
      homepagePath: '主页路径只能使用小写字母、数字和连字符。',
      subsidiaryCode: '分目录代码必须为 3-32 位，且只能使用 A-Z、0-9 与 _。',
      subsidiaryName: '分目录名称不能为空。',
    },
    notices: {
      createdInTenantRoot: '已创建在租户根级。',
      createdInScopePrefix: '已创建在以下范围：',
      subsidiaryCreatedInTenantRoot: '已创建在租户根级。',
      subsidiaryCreatedInScopePrefix: '已创建在以下分目录下：',
    },
    lifecycle: {
      draft: '草稿',
      published: '已发布',
      disabled: '已停用',
      confirmFallback: '确认组织操作',
      disableTitlePrefix: '停用',
      disableDescription: '该操作会把艺人从默认组织视图中移除，直到显示停用项或重新启用该艺人。',
      disableConfirm: '停用艺人',
      disablePending: '停用中…',
      disableSuccessSuffix: '已停用。',
      disableError: '停用艺人失败。',
      reEnableTitlePrefix: '重新启用',
      reEnableDescription: '该操作会把艺人恢复到组织视图，并重新开放下游业务模块访问。',
      reEnableConfirm: '重新启用艺人',
      reEnablePending: '重新启用中…',
      reEnableSuccessSuffix: '已重新启用。',
      reEnableError: '重新启用艺人失败。',
    },
  },
  ja: {
    state: {
      loading: '組織構造を読み込み中…',
      unavailableTitle: '組織ツリーを読み込めません',
      noPayload: '組織データが返されませんでした。',
      loadTreeError: '組織ツリーの読み込みに失敗しました。',
      loadProfileStoresError: 'プロフィールストアの読み込みに失敗しました。',
      createError: '組織画面からタレントを作成できませんでした。',
      createSubsidiaryError: '組織画面から配下スコープを作成できませんでした。',
      loadTalentDetailError: 'ライフサイクル操作のためのタレント詳細を読み込めませんでした。',
    },
    header: {
      eyebrow: '組織構造',
      tenantBadge: 'テナント',
      subsidiaryBadge: '配下スコープ',
    },
    actions: {
      showInactive: '無効を表示',
      hideInactive: '無効を非表示',
      refresh: '構造を更新',
      refreshing: '更新中…',
      createSubsidiary: '配下スコープを作成',
      createTalent: 'タレントを作成',
      openWorkspace: '業務画面を開く',
      editTalentSettings: 'タレント設定を編集',
      disableWorkspace: 'タレントを無効化',
      reEnableWorkspace: 'タレントを再有効化',
      editTenantSettings: 'テナント設定を編集',
      editSubsidiarySettings: '配下スコープ設定を編集',
      cancel: 'キャンセル',
    },
    tree: {
      title: 'スコープ',
      searchPlaceholder: '配下スコープを検索',
      tenantRootLabel: 'テナントルート',
      tenantRootHint: 'テナント全体と到達可能な全タレント',
      emptyTitle: '利用可能なスコープがまだありません',
      emptyDescription: '最初のタレントを作成して、テナント構造を構築してください。',
    },
    inventory: {
      title: 'タレント一覧',
      tenantDescription: 'テナント配下の全タレントを表示します。左側で配下スコープを選ぶと一覧を絞り込めます。',
      scopedDescription: '選択中の配下スコープ配下に属するタレントのみを表示します。',
      emptyTitle: '現在のスコープにタレントがありません',
      emptyDescription: 'このスコープでタレントを作成するか、左のツリーで別の枝を選択してください。',
      tenantRootTalent: 'テナントルートのタレント',
    },
    form: {
      rootTitle: 'テナントルートにタレントを作成',
      scopeTitlePrefix: '次のスコープにタレントを作成:',
      rootDescription: 'テナントルート直下にタレントを作成します。',
      scopeDescriptionPrefix: '次の配下スコープにタレントを作成:',
      sectionTitle: 'タレント設定',
      sectionDescriptionRoot: 'このタレントはテナントルート直下に作成されます。',
      sectionDescriptionScopePrefix: 'このタレントは次の配下スコープに作成されます:',
      talentCodeLabel: 'タレントコード',
      displayNameLabel: '表示名',
      legalNameLabel: '法務 / 英語名',
      homepagePathLabel: 'ホームページパス',
      profileStoreLabel: 'プロフィールストア',
      timezoneLabel: 'タイムゾーン',
      talentCodePlaceholder: 'SORA',
      displayNamePlaceholder: 'Sora',
      legalNamePlaceholder: 'Tokino Sora',
      homepagePathPlaceholder: 'sora',
      timezonePlaceholder: 'Asia/Tokyo',
      noProfileStores: '利用可能なプロフィールストアがまだありません。最初のタレントを作成する前に準備してください。',
      createPending: '作成中…',
      submit: 'タレントを作成',
      subsidiaryRootTitle: 'トップレベルの配下スコープを作成',
      subsidiaryScopeTitlePrefix: '次のスコープ配下に作成:',
      subsidiaryRootDescription: 'テナントルート直下に新しい配下スコープを作成します。',
      subsidiaryScopeDescriptionPrefix: '次の配下スコープの下に子スコープを作成:',
      subsidiarySectionTitle: '配下スコープ情報',
      subsidiarySectionDescriptionRoot: 'この配下スコープはテナントルート直下に作成されます。',
      subsidiarySectionDescriptionScopePrefix: 'この配下スコープは次の親スコープの下に作成されます:',
      subsidiaryCodeLabel: '配下スコープコード',
      subsidiaryNameLabel: '配下スコープ名',
      subsidiaryDescriptionLabel: '説明（任意）',
      subsidiaryCodePlaceholder: 'TOKYO',
      subsidiaryNamePlaceholder: 'Tokyo Branch',
      subsidiaryDescriptionPlaceholder: 'このスコープの担当領域を補足します',
      subsidiaryCreatePending: '作成中…',
      subsidiarySubmit: '配下スコープを作成',
      closeCreateSubsidiaryDrawer: '配下スコープ作成ドロワーを閉じる',
      closeCreateTalentDrawer: 'タレント作成ドロワーを閉じる',
    },
    translationManagement: {
      talentNameTitle: 'タレント名の翻訳',
      talentNameTrigger: '翻訳管理',
      talentNameSummary: (count) => `タレント名に ${count} 件の言語バリアントを設定済みです。`,
      talentNameEmpty: '現在は英語名のみ設定されています。',
      subsidiaryNameTitle: '配下スコープ名の翻訳',
      subsidiaryNameTrigger: '翻訳管理',
      subsidiaryNameSummary: (count) => `配下スコープ名に ${count} 件の言語バリアントを設定済みです。`,
      subsidiaryNameEmpty: '現在は英語名のみ設定されています。',
      baseValueLabel: '基本値（英語）',
      save: '翻訳を保存',
      cancel: 'キャンセル',
      closeDrawer: '翻訳ドロワーを閉じる',
      languageLoadError: '言語オプションを読み込めませんでした。',
    },
    validation: {
      code: 'タレントコードは 3〜32 文字で、A-Z、0-9、_ のみ使用できます。',
      displayName: '表示名は必須です。',
      legalName: '法務 / 英語名は必須です。',
      profileStore: 'タレント作成前にプロフィールストアを選択してください。',
      homepagePath: 'ホームページパスには小文字、数字、ハイフンのみ使用できます。',
      subsidiaryCode: '配下スコープコードは 3〜32 文字で、A-Z、0-9、_ のみ使用できます。',
      subsidiaryName: '配下スコープ名は必須です。',
    },
    notices: {
      createdInTenantRoot: 'をテナントルートに作成しました。',
      createdInScopePrefix: 'を次のスコープに作成しました:',
      subsidiaryCreatedInTenantRoot: 'をテナントルートに作成しました。',
      subsidiaryCreatedInScopePrefix: 'を次の親スコープ配下に作成しました:',
    },
    lifecycle: {
      draft: '下書き',
      published: '公開済み',
      disabled: '無効',
      confirmFallback: '組織操作を確認',
      disableTitlePrefix: '無効化:',
      disableDescription: 'この操作により、無効なスコープを表示するまでタレントは既定の組織ビューから外れます。',
      disableConfirm: 'タレントを無効化',
      disablePending: '無効化中…',
      disableSuccessSuffix: 'を無効化しました。',
      disableError: 'タレントの無効化に失敗しました。',
      reEnableTitlePrefix: '再有効化:',
      reEnableDescription: 'この操作により、タレントは組織ビューに戻り、下流モジュールへのアクセスが再開されます。',
      reEnableConfirm: 'タレントを再有効化',
      reEnablePending: '再有効化中…',
      reEnableSuccessSuffix: 'を再有効化しました。',
      reEnableError: 'タレントの再有効化に失敗しました。',
    },
  },
};

export function useOrganizationStructureCopy() {
  const { currentLocale, selectedLocale } = useRuntimeLocale();
  const effectiveSelectedLocale = getEffectiveSelectedLocale(currentLocale, selectedLocale);

  return {
    currentLocale,
    selectedLocale: effectiveSelectedLocale,
    copy: resolveLocaleRecord(
      effectiveSelectedLocale,
      copyByLocale as Record<RuntimeLocale, OrganizationStructureCopy>,
      currentLocale,
    ) as OrganizationStructureCopy,
  };
}

export function formatOrganizationTalentCount(locale: SupportedUiLocale | RuntimeLocale, count: number) {
  return pickLocaleText(locale, {
    en: `${count} talent${count === 1 ? '' : 's'}`,
    zh: `${count} 名艺人`,
    ja: `${count} 人のタレント`,
  });
}

export function formatOrganizationSubsidiaryCount(locale: SupportedUiLocale | RuntimeLocale, count: number) {
  return pickLocaleText(locale, {
    en: `${count} subsidiar${count === 1 ? 'y' : 'ies'}`,
    zh: `${count} 个分目录`,
    ja: `${count} 件の配下スコープ`,
  });
}

export function formatOrganizationDirectSubsidiaryCount(locale: SupportedUiLocale | RuntimeLocale, count: number) {
  return pickLocaleText(locale, {
    en: `${count} direct subsidiar${count === 1 ? 'y' : 'ies'}`,
    zh: `${count} 个直属分目录`,
    ja: `${count} 件の直属配下スコープ`,
  });
}

export function pickLocalizedProfileStoreName(
  profileStore: ProfileStoreListItem,
  locale: SupportedUiLocale | RuntimeLocale,
) {
  if (profileStore.translations && Object.keys(profileStore.translations).length > 0) {
    return resolveLocalizedLabel(
      profileStore.translations,
      locale,
      profileStore.name || profileStore.nameZh || profileStore.nameJa || profileStore.code,
    );
  }

  return profileStore.name || profileStore.code;
}

export function getOrganizationLifecycleLabel(
  lifecycleStatus: OrganizationTalent['lifecycleStatus'],
  locale: SupportedUiLocale | RuntimeLocale,
) {
  const copy = resolveLocaleRecord(locale, copyByLocale as Record<RuntimeLocale, OrganizationStructureCopy>).lifecycle;

  switch (lifecycleStatus) {
    case 'published':
      return copy.published;
    case 'disabled':
      return copy.disabled;
    case 'draft':
    default:
      return copy.draft;
  }
}

export function getOrganizationTalentScopeLabel(
  talent: OrganizationTalent,
  locale: SupportedUiLocale | RuntimeLocale,
) {
  if (!talent.subsidiaryName) {
    return resolveLocaleRecord(locale, copyByLocale as Record<RuntimeLocale, OrganizationStructureCopy>).inventory.tenantRootTalent;
  }

  return pickLocaleText(locale, {
    en: `Subsidiary: ${talent.subsidiaryName}`,
    zh: `分目录：${talent.subsidiaryName}`,
    ja: `配下スコープ: ${talent.subsidiaryName}`,
  });
}
