import type { SupportedUiLocale } from '@tcrn/shared';

import type { HomepageVersionStatus } from '@/domains/homepage-management/api/homepage.api';
import { type RuntimeLocale, useRuntimeLocale } from '@/platform/runtime/locale/locale-provider';
import {
  formatLocaleDateTime,
  formatLocaleNumber,
  pickLocaleText,
  resolveLocaleRecord,
} from '@/platform/runtime/locale/locale-text';

type VersionFilter = 'all' | 'draft' | 'published' | 'archived';

interface HomepageManagementCopy {
  state: {
    loading: string;
    unavailableTitle: string;
    loadWorkspaceError: string;
    loadLedgerError: string;
  };
  header: {
    eyebrow: string;
    title: string;
    description: string;
  };
  actions: {
    openEditor: string;
    workspaceSettings: string;
    openRoutingInSettings: string;
    publishDraft: string;
    unpublish: string;
    restore: string;
  };
  dialogs: {
    publishTitle: string;
    publishDescription: string;
    publishConfirm: string;
    publishPending: string;
    publishSuccess: string;
    publishError: string;
    unpublishTitle: string;
    unpublishDescription: string;
    unpublishConfirm: string;
    unpublishPending: string;
    unpublishSuccess: string;
    unpublishError: string;
    restoreTitlePrefix: string;
    restoreDescription: string;
    restoreConfirm: string;
    restorePending: string;
    restoreSuccessPrefix: string;
    restoreError: string;
  };
  summary: {
    tenantLabel: string;
    tenantFallback: string;
    tenantHint: string;
    publicStateLabel: string;
    publicPublishedValue: string;
    publicDraftOnlyValue: string;
    publicPublishedHint: string;
    publicDraftOnlyHint: string;
    draftVersionLabel: string;
    noDraftVersion: string;
    draftVersionHint: string;
    versionLedgerLabel: string;
    versionLedgerHint: string;
  };
  facts: {
    title: string;
    description: string;
    homepageUrlLabel: string;
    homepageUrlHint: string;
    customDomainLabel: string;
    customDomainUnconfigured: string;
    customDomainVerifiedHint: string;
    customDomainPendingHint: string;
    customDomainPathOnlyHint: string;
    homepagePathLabel: string;
    homepagePathUnconfigured: string;
    homepagePathHint: string;
    publishedVersionLabel: string;
    noPublishedVersion: string;
    updatedAtPrefix: string;
    updatedAtUnknown: string;
  };
  ledger: {
    title: string;
    description: string;
    errorTitle: string;
    columns: {
      version: string;
      status: string;
      preview: string;
      created: string;
      published: string;
      actions: string;
    };
    emptyTitle: string;
    emptyDescription: string;
    noPreview: string;
    componentsSuffixSingular: string;
    componentsSuffixPlural: string;
    createdByPrefix: string;
    createdBySystem: string;
    publishedByUnpublished: string;
    currentDraft: string;
  };
  filters: Record<VersionFilter, string>;
  statuses: Record<HomepageVersionStatus | 'inactive', string>;
  common: {
    never: string;
    none: string;
    unknown: string;
  };
}

const COPY: Record<RuntimeLocale, HomepageManagementCopy> = {
  en: {
    state: {
      loading: 'Loading homepage management…',
      unavailableTitle: 'Homepage management unavailable',
      loadWorkspaceError: 'Failed to load homepage details.',
      loadLedgerError: 'Failed to load homepage version history.',
    },
    header: {
      eyebrow: 'Talent business / Homepage',
      title: 'Homepage management',
      description: 'Review publication status, version history, and public access for this talent homepage.',
    },
    actions: {
      openEditor: 'Open editor',
      workspaceSettings: 'Public access settings',
      openRoutingInSettings: 'Manage public address',
      publishDraft: 'Publish draft',
      unpublish: 'Unpublish',
      restore: 'Restore',
    },
    dialogs: {
      publishTitle: 'Publish current draft?',
      publishDescription: 'Publishing promotes the current draft into the live homepage slot.',
      publishConfirm: 'Publish homepage',
      publishPending: 'Publishing…',
      publishSuccess: 'Homepage draft published.',
      publishError: 'Failed to publish homepage draft.',
      unpublishTitle: 'Unpublish homepage?',
      unpublishDescription: 'Unpublishing removes the current live homepage while keeping the version history intact.',
      unpublishConfirm: 'Unpublish homepage',
      unpublishPending: 'Unpublishing…',
      unpublishSuccess: 'Homepage unpublished.',
      unpublishError: 'Failed to unpublish homepage.',
      restoreTitlePrefix: 'Restore',
      restoreDescription: 'Restoring creates a new draft from the selected version so it can be revised or published again.',
      restoreConfirm: 'Restore to draft',
      restorePending: 'Restoring…',
      restoreSuccessPrefix: 'Version restored to a new draft:',
      restoreError: 'Failed to restore homepage version.',
    },
    summary: {
      tenantLabel: 'Tenant',
      tenantFallback: 'Current tenant',
      tenantHint: 'Current tenant context for this homepage.',
      publicStateLabel: 'Public state',
      publicPublishedValue: 'Published',
      publicDraftOnlyValue: 'Draft only',
      publicPublishedHint: 'The published version is currently live.',
      publicDraftOnlyHint: 'No live homepage is currently published.',
      draftVersionLabel: 'Draft version',
      noDraftVersion: 'None',
      draftVersionHint: 'Publishing is only available when a draft version exists.',
      versionLedgerLabel: 'Version history',
      versionLedgerHint: 'Version records available for review or restore.',
    },
    facts: {
      title: 'Public access',
      description: 'Keep the public address, domain, and published version visible alongside publication controls.',
      homepageUrlLabel: 'Homepage URL',
      homepageUrlHint: 'Current public address for this homepage.',
      customDomainLabel: 'Custom domain',
      customDomainUnconfigured: 'Unconfigured',
      customDomainVerifiedHint: 'The current custom domain is verified.',
      customDomainPendingHint: 'The current custom domain exists but is not verified yet.',
      customDomainPathOnlyHint: 'The homepage currently uses path-based routing only.',
      homepagePathLabel: 'Shared-domain route',
      homepagePathUnconfigured: 'Unconfigured',
      homepagePathHint: 'This route is generated from tenant code and talent code.',
      publishedVersionLabel: 'Published version',
      noPublishedVersion: 'None',
      updatedAtPrefix: 'Last updated',
      updatedAtUnknown: 'Unknown',
    },
    ledger: {
      title: 'Version history',
      description: 'Review earlier versions and restore a new draft when needed.',
      errorTitle: 'Homepage version history unavailable',
      columns: {
        version: 'Version',
        status: 'Status',
        preview: 'Content preview',
        created: 'Created',
        published: 'Published',
        actions: 'Actions',
      },
      emptyTitle: 'No homepage versions match this filter',
      emptyDescription: 'This filter currently does not return any homepage history rows.',
      noPreview: 'No preview summary available.',
      componentsSuffixSingular: 'component',
      componentsSuffixPlural: 'components',
      createdByPrefix: 'by',
      createdBySystem: 'system',
      publishedByUnpublished: 'Not published',
      currentDraft: 'Current draft',
    },
    filters: {
      all: 'All',
      draft: 'Draft',
      published: 'Published',
      archived: 'Archived',
    },
    statuses: {
      draft: 'Draft',
      published: 'Published',
      archived: 'Archived',
      inactive: 'Inactive',
    },
    common: {
      never: 'Never',
      none: 'None',
      unknown: 'Unknown',
    },
  },
  zh: {
    state: {
      loading: '正在加载主页管理…',
      unavailableTitle: '主页管理不可用',
      loadWorkspaceError: '加载主页详情失败。',
      loadLedgerError: '加载主页版本历史失败。',
    },
    header: {
      eyebrow: '艺人业务 / 主页',
      title: '主页管理',
      description: '查看该艺人主页的发布状态、版本历史与公开访问信息。',
    },
    actions: {
      openEditor: '打开编辑器',
      workspaceSettings: '公开访问设置',
      openRoutingInSettings: '管理公开地址',
      publishDraft: '发布草稿',
      unpublish: '取消发布',
      restore: '恢复',
    },
    dialogs: {
      publishTitle: '发布当前草稿？',
      publishDescription: '发布后，当前草稿将成为线上主页版本。',
      publishConfirm: '发布主页',
      publishPending: '发布中…',
      publishSuccess: '主页草稿已发布。',
      publishError: '发布主页草稿失败。',
      unpublishTitle: '取消发布主页？',
      unpublishDescription: '取消发布会下线当前线上主页，但保留完整版本历史。',
      unpublishConfirm: '取消发布主页',
      unpublishPending: '取消发布中…',
      unpublishSuccess: '主页已取消发布。',
      unpublishError: '取消发布主页失败。',
      restoreTitlePrefix: '恢复',
      restoreDescription: '恢复后会从所选版本生成一份新的草稿，便于继续修改或再次发布。',
      restoreConfirm: '恢复为草稿',
      restorePending: '恢复中…',
      restoreSuccessPrefix: '版本已恢复为新草稿：',
      restoreError: '恢复主页版本失败。',
    },
    summary: {
      tenantLabel: '租户',
      tenantFallback: '当前租户',
      tenantHint: '当前主页所属的租户上下文。',
      publicStateLabel: '公开状态',
      publicPublishedValue: '已发布',
      publicDraftOnlyValue: '仅草稿',
      publicPublishedHint: '当前已发布版本正在对外生效。',
      publicDraftOnlyHint: '当前没有线上主页版本。',
      draftVersionLabel: '草稿版本',
      noDraftVersion: '无',
      draftVersionHint: '只有存在草稿版本时才能执行发布。',
      versionLedgerLabel: '版本历史',
      versionLedgerHint: '当前筛选条件下可查看或恢复的版本记录。',
    },
    facts: {
      title: '公开访问',
      description: '将公开地址、域名与已发布版本和发布控制放在同一处查看。',
      homepageUrlLabel: '主页链接',
      homepageUrlHint: '当前主页的公开访问地址。',
      customDomainLabel: '自定义域名',
      customDomainUnconfigured: '未配置',
      customDomainVerifiedHint: '当前自定义域名已验证。',
      customDomainPendingHint: '当前自定义域名已填写，但尚未完成验证。',
      customDomainPathOnlyHint: '当前主页仍使用路径路由。',
      homepagePathLabel: '共享域路径',
      homepagePathUnconfigured: '未配置',
      homepagePathHint: '该路径由租户代码和艺人代码自动生成。',
      publishedVersionLabel: '已发布版本',
      noPublishedVersion: '无',
      updatedAtPrefix: '最近更新',
      updatedAtUnknown: '未知',
    },
    ledger: {
      title: '版本历史',
      description: '查看历史版本，并在需要时恢复为新的草稿。',
      errorTitle: '主页版本历史不可用',
      columns: {
        version: '版本',
        status: '状态',
        preview: '内容预览',
        created: '创建时间',
        published: '发布时间',
        actions: '操作',
      },
      emptyTitle: '当前筛选下没有主页版本',
      emptyDescription: '当前筛选条件没有返回任何主页历史记录。',
      noPreview: '暂无预览摘要。',
      componentsSuffixSingular: '个组件',
      componentsSuffixPlural: '个组件',
      createdByPrefix: '创建者',
      createdBySystem: '系统',
      publishedByUnpublished: '未发布',
      currentDraft: '当前草稿',
    },
    filters: {
      all: '全部',
      draft: '草稿',
      published: '已发布',
      archived: '已归档',
    },
    statuses: {
      draft: '草稿',
      published: '已发布',
      archived: '已归档',
      inactive: '未启用',
    },
    common: {
      never: '从未',
      none: '无',
      unknown: '未知',
    },
  },
  ja: {
    state: {
      loading: 'ホームページ管理を読み込み中…',
      unavailableTitle: 'ホームページ管理を利用できません',
      loadWorkspaceError: 'ホームページ詳細の読み込みに失敗しました。',
      loadLedgerError: 'ホームページのバージョン履歴の読み込みに失敗しました。',
    },
    header: {
      eyebrow: 'タレント業務 / ホームページ',
      title: 'ホームページ管理',
      description: 'このタレントのホームページについて、公開状態、バージョン履歴、公開アクセスを確認します。',
    },
    actions: {
      openEditor: 'エディターを開く',
      workspaceSettings: '公開アクセス設定',
      openRoutingInSettings: '公開アドレスを管理',
      publishDraft: '下書きを公開',
      unpublish: '公開停止',
      restore: '復元',
    },
    dialogs: {
      publishTitle: '現在の下書きを公開しますか？',
      publishDescription: '公開すると、現在の下書きが本番のホームページとして反映されます。',
      publishConfirm: 'ホームページを公開',
      publishPending: '公開中…',
      publishSuccess: 'ホームページの下書きを公開しました。',
      publishError: 'ホームページの下書き公開に失敗しました。',
      unpublishTitle: 'ホームページを公開停止しますか？',
      unpublishDescription: '公開停止すると現在の公開ページは下がりますが、履歴は保持されます。',
      unpublishConfirm: 'ホームページを公開停止',
      unpublishPending: '公開停止中…',
      unpublishSuccess: 'ホームページを公開停止しました。',
      unpublishError: 'ホームページの公開停止に失敗しました。',
      restoreTitlePrefix: '復元',
      restoreDescription: '復元すると選択したバージョンから新しい下書きが作成され、再編集または再公開できます。',
      restoreConfirm: '下書きとして復元',
      restorePending: '復元中…',
      restoreSuccessPrefix: '新しい下書きとして復元しました:',
      restoreError: 'ホームページのバージョン復元に失敗しました。',
    },
    summary: {
      tenantLabel: 'テナント',
      tenantFallback: '現在のテナント',
      tenantHint: 'このホームページの現在のテナントコンテキストです。',
      publicStateLabel: '公開状態',
      publicPublishedValue: '公開中',
      publicDraftOnlyValue: '下書きのみ',
      publicPublishedHint: '現在の公開バージョンが本番で表示されています。',
      publicDraftOnlyHint: '現在公開中のホームページはありません。',
      draftVersionLabel: '下書きバージョン',
      noDraftVersion: 'なし',
      draftVersionHint: '公開は下書きバージョンが存在する場合のみ実行できます。',
      versionLedgerLabel: 'バージョン履歴',
      versionLedgerHint: '確認または復元できるバージョン一覧です。',
    },
    facts: {
      title: '公開アクセス',
      description: '公開 URL、ドメイン、公開中バージョンを公開操作と並べて確認します。',
      homepageUrlLabel: 'ホームページ URL',
      homepageUrlHint: '現在の公開 URL です。',
      customDomainLabel: 'カスタムドメイン',
      customDomainUnconfigured: '未設定',
      customDomainVerifiedHint: '現在のカスタムドメインは確認済みです。',
      customDomainPendingHint: '現在のカスタムドメインは登録済みですが、まだ確認が完了していません。',
      customDomainPathOnlyHint: '現在はパスベースのルーティングのみを使用しています。',
      homepagePathLabel: '共有ドメインルート',
      homepagePathUnconfigured: '未設定',
      homepagePathHint: 'このルートはテナントコードとタレントコードから自動生成されます。',
      publishedVersionLabel: '公開バージョン',
      noPublishedVersion: 'なし',
      updatedAtPrefix: '最終更新',
      updatedAtUnknown: '不明',
    },
    ledger: {
      title: 'バージョン履歴',
      description: '必要に応じて過去のバージョンを確認し、新しい下書きとして復元できます。',
      errorTitle: 'ホームページのバージョン履歴を利用できません',
      columns: {
        version: 'バージョン',
        status: '状態',
        preview: '内容プレビュー',
        created: '作成',
        published: '公開',
        actions: '操作',
      },
      emptyTitle: 'この条件に一致するホームページの履歴はありません',
      emptyDescription: '現在の絞り込み条件ではホームページ履歴が返っていません。',
      noPreview: 'プレビュー要約はありません。',
      componentsSuffixSingular: 'コンポーネント',
      componentsSuffixPlural: 'コンポーネント',
      createdByPrefix: '作成者',
      createdBySystem: 'システム',
      publishedByUnpublished: '未公開',
      currentDraft: '現在の下書き',
    },
    filters: {
      all: 'すべて',
      draft: '下書き',
      published: '公開済み',
      archived: 'アーカイブ済み',
    },
    statuses: {
      draft: '下書き',
      published: '公開済み',
      archived: 'アーカイブ済み',
      inactive: '停止中',
    },
    common: {
      never: '未実施',
      none: 'なし',
      unknown: '不明',
    },
  },
};

export function useHomepageManagementCopy() {
  const { currentLocale, selectedLocale } = useRuntimeLocale();

  return {
    currentLocale,
    selectedLocale,
    copy: resolveLocaleRecord(selectedLocale, COPY as Record<RuntimeLocale, HomepageManagementCopy>, currentLocale) as HomepageManagementCopy,
  };
}

export function formatHomepageManagementDateTime(
  locale: SupportedUiLocale | RuntimeLocale,
  value: string | null,
  fallback: string,
) {
  return formatLocaleDateTime(locale, value, fallback);
}

export function getHomepageVersionFilterLabel(locale: SupportedUiLocale | RuntimeLocale, filter: VersionFilter) {
  return (resolveLocaleRecord(locale, COPY as Record<RuntimeLocale, HomepageManagementCopy>) as HomepageManagementCopy).filters[filter];
}

export function getHomepageVersionStatusLabel(
  locale: SupportedUiLocale | RuntimeLocale,
  status: HomepageVersionStatus | 'inactive',
) {
  return (resolveLocaleRecord(locale, COPY as Record<RuntimeLocale, HomepageManagementCopy>) as HomepageManagementCopy).statuses[status];
}

export function formatHomepageComponentCount(locale: SupportedUiLocale | RuntimeLocale, count: number) {
  const copy = resolveLocaleRecord(locale, COPY as Record<RuntimeLocale, HomepageManagementCopy>) as HomepageManagementCopy;
  const formattedCount = formatLocaleNumber(locale, count);

  return pickLocaleText(locale, {
    en: `${formattedCount} ${count === 1 ? copy.ledger.componentsSuffixSingular : copy.ledger.componentsSuffixPlural}`,
    zh_HANS: `${formattedCount}${copy.ledger.componentsSuffixPlural}`,
    zh_HANT: `${formattedCount}${copy.ledger.componentsSuffixPlural}`,
    ja: `${formattedCount}${copy.ledger.componentsSuffixPlural}`,
    ko: `${formattedCount} ${count === 1 ? copy.ledger.componentsSuffixSingular : copy.ledger.componentsSuffixPlural}`,
    fr: `${formattedCount} ${count === 1 ? copy.ledger.componentsSuffixSingular : copy.ledger.componentsSuffixPlural}`,
  });
}
