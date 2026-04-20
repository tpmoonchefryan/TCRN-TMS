import type { SupportedUiLocale } from '@tcrn/shared';

import type {
  CaptchaMode,
  MarshmallowExportFormat,
  MarshmallowMessageStatus,
} from '@/domains/marshmallow-management/api/marshmallow.api';
import { type RuntimeLocale, useRuntimeLocale } from '@/platform/runtime/locale/locale-provider';
import {
  formatLocaleDateTime,
  formatLocaleNumber,
  resolveLocaleRecord,
} from '@/platform/runtime/locale/locale-text';

type ReplyFilter = 'all' | 'replied' | 'unreplied';
type MessageStatusFilter = 'all' | MarshmallowMessageStatus;

const COPY = {
  en: {
    state: {
      loading: 'Loading marshmallow management…',
      unavailableTitle: 'Marshmallow management unavailable',
      loadConfigError: 'Failed to load marshmallow configuration.',
      loadMessagesError: 'Failed to load marshmallow messages.',
      refreshError: 'Failed to refresh marshmallow data.',
      saveSuccess: 'Marshmallow configuration saved.',
      saveError: 'Failed to save marshmallow configuration.',
      toggleMessageError: 'Failed to update the selected marshmallow message.',
      createExportError: 'Failed to create the marshmallow export job.',
      refreshExportError: 'Failed to refresh the export job.',
      downloadSuccess: 'Marshmallow export download opened.',
      downloadError: 'Failed to prepare the marshmallow export download.',
    },
    header: {
      eyebrow: 'Marshmallow',
      title: 'Marshmallow Management',
      description: 'Manage mailbox settings, moderation, and exports for this talent.',
    },
    actions: {
      openRoutingInSettings: 'Open routing in settings',
      refreshWorkspace: 'Refresh page',
      openPublicRoutingInSettings: 'Open public routing in settings',
      saveConfig: 'Save marshmallow config',
      savePending: 'Saving config…',
      approve: 'Approve',
      reject: 'Reject',
      restore: 'Restore',
      markRead: 'Mark read',
      markUnread: 'Mark unread',
      star: 'Star',
      unstar: 'Unstar',
      createExportJob: 'Create export job',
      queueExportPending: 'Queueing export…',
      refreshExport: 'Refresh export',
      downloadExport: 'Download',
      downloadExportAria: 'Download marshmallow export',
    },
    summary: {
      tenantLabel: 'Tenant',
      tenantFallback: 'Tenant',
      tenantHint: 'Current tenant context.',
      messageVolumeLabel: 'Message Volume',
      messageVolumeHint: 'Current total across this talent mailbox.',
      unreadPendingLabel: 'Unread / Pending',
      unreadPendingHint: 'Counts from the current marshmallow config snapshot.',
      publicRouteLabel: 'Public Route',
      routeEnabled: 'Enabled',
      routeDisabled: 'Disabled',
    },
    config: {
      title: 'Configuration',
      description: 'Manage mailbox behavior, moderation, and publish rules.',
      publicRouteTitle: 'Public route settings',
      publicRouteDescription:
        'Enable or disable the public marshmallow page from Talent Settings. The live mailbox URL is shown here.',
      fields: {
        title: 'Title',
        allowedReactions: 'Allowed reactions',
        welcomeText: 'Welcome text',
        thankYouText: 'Thank-you text',
        placeholderText: 'Placeholder text',
        captchaMode: 'Captcha mode',
        minMessageLength: 'Minimum message length',
        maxMessageLength: 'Maximum message length',
        rateLimitPerIp: 'Rate limit per IP',
        rateLimitWindowHours: 'Rate limit window hours',
        allowAnonymous: 'Allow anonymous submissions',
        requireModeration: 'Require moderation',
        autoApprove: 'Auto approve when allowed',
        profanityFilter: 'Use profanity filter',
        externalBlocklist: 'Use external blocklist',
        enablePublicReactions: 'Enable public reactions',
      },
      stats: {
        versionLabel: 'Config Version',
        versionHint: 'Current configuration version.',
        updatedAtLabel: 'Updated At',
        updatedAtHint: 'Latest config write.',
        mailboxUrlLabel: 'Mailbox URL',
        mailboxUrlLive: 'Live',
        mailboxUrlDisabled: 'Disabled',
      },
    },
    moderation: {
      title: 'Moderation Queue',
      description: 'Review pending or rejected messages, mark queue hygiene flags, and keep mailbox state explicit.',
      filters: {
        keywordSearch: 'Keyword search',
        messageStatus: 'Message status filter',
        replyState: 'Reply state',
      },
      table: {
        errorTitle: 'Moderation queue unavailable',
        emptyTitle: 'No marshmallow messages found',
        emptyDescription: 'Adjust the moderation filters or wait for new public submissions.',
        columns: ['Message', 'Status', 'Flags', 'Reactions', 'Created', 'Actions'],
        anonymousSender: 'Anonymous sender',
        replyPrefix: 'Reply:',
        read: 'Read',
        unread: 'Unread',
        starred: 'Starred',
        notStarred: 'Not starred',
        hasReply: 'Has reply',
        awaitingReply: 'Awaiting reply',
        noReactions: 'No reactions',
      },
      dialogs: {
        approveTitle: 'Approve this message?',
        approveDescription:
          'Approved marshmallows can appear on the public page when public visibility allows it.',
        approveConfirm: 'Approve',
        approveSuccess: 'Marshmallow message approved.',
        approveError: 'Failed to approve the selected marshmallow message.',
        restoreTitle: 'Restore this message to pending?',
        restoreDescription: 'This returns the marshmallow to the pending moderation queue.',
        restoreConfirm: 'Restore',
        restoreSuccess: 'Marshmallow message restored to pending.',
        restoreError: 'Failed to restore the selected marshmallow message.',
        rejectTitle: 'Reject this message?',
        rejectDescription: 'This uses the manual moderation path and removes the message from public approval flow.',
        rejectConfirm: 'Reject',
        rejectSuccess: 'Marshmallow message rejected.',
        rejectError: 'Failed to reject the selected marshmallow message.',
      },
    },
    export: {
      title: 'Export',
      description:
        'Queue a marshmallow export against the current moderation status filter and refresh the latest job until it is downloadable.',
      formatLabel: 'Export format',
      includeRejected: 'Include rejected messages',
      currentScopeTitle: 'Current filter scope',
      currentScopeStatusPrefix: 'Status:',
      allVisibleStatuses: 'all visible statuses',
      latestJobTitle: 'Latest export job',
      fields: {
        status: 'Status',
        format: 'Format',
        processed: 'Processed',
        created: 'Created',
        completed: 'Completed',
        expires: 'Expires',
      },
      noJobTitle: 'No export job created in this session',
      noJobDescription: 'Create an export job here, then refresh the latest job until the download becomes available.',
    },
    options: {
      captcha: {
        auto: 'Auto',
        always: 'Always',
        never: 'Never',
      },
      messageStatus: {
        all: 'All statuses',
        pending: 'Pending',
        approved: 'Approved',
        rejected: 'Rejected',
        spam: 'Spam',
      },
      reply: {
        all: 'All messages',
        replied: 'Replied only',
        unreplied: 'Unreplied only',
      },
      exportFormat: {
        xlsx: 'Excel (.xlsx)',
        csv: 'CSV (.csv)',
        json: 'JSON (.json)',
      },
      messageState: {
        pending: 'Pending',
        approved: 'Approved',
        rejected: 'Rejected',
        spam: 'Spam',
      },
      exportStatus: {
        pending: 'Pending',
        processing: 'Processing',
        running: 'Running',
        success: 'Success',
        failed: 'Failed',
      },
    },
    common: {
      never: 'Never',
    },
  },
  zh: {
    state: {
      loading: '正在加载棉花糖管理…',
      unavailableTitle: '棉花糖管理不可用',
      loadConfigError: '加载棉花糖配置失败。',
      loadMessagesError: '加载棉花糖消息失败。',
      refreshError: '刷新棉花糖数据失败。',
      saveSuccess: '棉花糖配置已保存。',
      saveError: '保存棉花糖配置失败。',
      toggleMessageError: '更新所选棉花糖消息失败。',
      createExportError: '创建棉花糖导出任务失败。',
      refreshExportError: '刷新导出任务失败。',
      downloadSuccess: '已打开棉花糖导出下载链接。',
      downloadError: '准备棉花糖导出下载失败。',
    },
    header: {
      eyebrow: '艺人业务 / 棉花糖',
      title: '棉花糖管理',
      description: '管理该艺人的信箱设置、审核流程与导出任务。',
    },
    actions: {
      openRoutingInSettings: '在设置中打开路由配置',
      refreshWorkspace: '刷新页面',
      openPublicRoutingInSettings: '在设置中打开公开路由',
      saveConfig: '保存棉花糖配置',
      savePending: '保存配置中…',
      approve: '通过',
      reject: '拒绝',
      restore: '恢复',
      markRead: '标记已读',
      markUnread: '标记未读',
      star: '加星',
      unstar: '取消星标',
      createExportJob: '创建导出任务',
      queueExportPending: '排队导出中…',
      refreshExport: '刷新导出任务',
      downloadExport: '下载',
      downloadExportAria: '下载棉花糖导出文件',
    },
    summary: {
      tenantLabel: '租户',
      tenantFallback: '当前租户',
      tenantHint: '当前租户上下文。',
      messageVolumeLabel: '消息总量',
      messageVolumeHint: '该艺人信箱的当前消息总数。',
      unreadPendingLabel: '未读 / 待处理',
      unreadPendingHint: '来自当前棉花糖配置快照的统计。',
      publicRouteLabel: '公开路由',
      routeEnabled: '已启用',
      routeDisabled: '已停用',
    },
    config: {
      title: '配置',
      description: '管理信箱行为、审核规则与运营策略。',
      publicRouteTitle: '公开路由设置',
      publicRouteDescription: '可在艺人设置中启用或停用公开棉花糖页面，这里会显示当前线上信箱链接以便核对。',
      fields: {
        title: '标题',
        allowedReactions: '允许的反应',
        welcomeText: '欢迎语',
        thankYouText: '感谢语',
        placeholderText: '输入框占位文本',
        captchaMode: '验证码模式',
        minMessageLength: '最小消息长度',
        maxMessageLength: '最大消息长度',
        rateLimitPerIp: '每个 IP 的限流次数',
        rateLimitWindowHours: '限流时间窗口（小时）',
        allowAnonymous: '允许匿名提交',
        requireModeration: '需要审核',
        autoApprove: '符合条件时自动通过',
        profanityFilter: '启用脏词过滤',
        externalBlocklist: '启用外部拦截列表',
        enablePublicReactions: '启用公开反应',
      },
      stats: {
        versionLabel: '配置版本',
        versionHint: '当前配置版本。',
        updatedAtLabel: '更新时间',
        updatedAtHint: '最近一次配置写入。',
        mailboxUrlLabel: '信箱链接',
        mailboxUrlLive: '线上可用',
        mailboxUrlDisabled: '已停用',
      },
    },
    moderation: {
      title: '审核队列',
      description: '查看待处理或已拒绝消息，维护队列标记，并保持信箱状态清晰可见。',
      filters: {
        keywordSearch: '关键词搜索',
        messageStatus: '消息状态筛选',
        replyState: '回复状态',
      },
      table: {
        errorTitle: '审核队列不可用',
        emptyTitle: '没有找到棉花糖消息',
        emptyDescription: '请调整审核筛选条件，或等待新的公开投稿。',
        columns: ['消息', '状态', '标记', '反应', '创建时间', '操作'],
        anonymousSender: '匿名发送者',
        replyPrefix: '回复：',
        read: '已读',
        unread: '未读',
        starred: '已加星',
        notStarred: '未加星',
        hasReply: '已有回复',
        awaitingReply: '等待回复',
        noReactions: '暂无反应',
      },
      dialogs: {
        approveTitle: '通过这条消息？',
        approveDescription: '只要公开可见性允许，通过后的棉花糖消息就可能出现在公开页面。',
        approveConfirm: '通过',
        approveSuccess: '棉花糖消息已通过。',
        approveError: '通过所选棉花糖消息失败。',
        restoreTitle: '将这条消息恢复为待审核？',
        restoreDescription: '该操作会把消息退回到待审核队列。',
        restoreConfirm: '恢复',
        restoreSuccess: '棉花糖消息已恢复为待审核。',
        restoreError: '恢复所选棉花糖消息失败。',
        rejectTitle: '拒绝这条消息？',
        rejectDescription: '该操作会走人工审核路径，并将消息移出公开通过流程。',
        rejectConfirm: '拒绝',
        rejectSuccess: '棉花糖消息已拒绝。',
        rejectError: '拒绝所选棉花糖消息失败。',
      },
    },
    export: {
      title: '导出',
      description: '基于当前审核状态筛选创建棉花糖导出任务，并刷新最新任务直到可下载。',
      formatLabel: '导出格式',
      includeRejected: '包含已拒绝消息',
      currentScopeTitle: '当前筛选范围',
      currentScopeStatusPrefix: '状态：',
      allVisibleStatuses: '当前可见的全部状态',
      latestJobTitle: '最新导出任务',
      fields: {
        status: '状态',
        format: '格式',
        processed: '已处理',
        created: '创建时间',
        completed: '完成时间',
        expires: '过期时间',
      },
      noJobTitle: '本次会话尚未创建导出任务',
      noJobDescription: '可在这里创建导出任务，然后持续刷新最新任务直到下载可用。',
    },
    options: {
      captcha: {
        auto: '自动',
        always: '始终启用',
        never: '从不启用',
      },
      messageStatus: {
        all: '全部状态',
        pending: '待处理',
        approved: '已通过',
        rejected: '已拒绝',
        spam: '垃圾消息',
      },
      reply: {
        all: '全部消息',
        replied: '仅看已回复',
        unreplied: '仅看未回复',
      },
      exportFormat: {
        xlsx: 'Excel（.xlsx）',
        csv: 'CSV（.csv）',
        json: 'JSON（.json）',
      },
      messageState: {
        pending: '待处理',
        approved: '已通过',
        rejected: '已拒绝',
        spam: '垃圾消息',
      },
      exportStatus: {
        pending: '待处理',
        processing: '处理中',
        running: '运行中',
        success: '成功',
        failed: '失败',
      },
    },
    common: {
      never: '从未',
    },
  },
  ja: {
    state: {
      loading: 'マシュマロ管理を読み込み中…',
      unavailableTitle: 'マシュマロ管理を利用できません',
      loadConfigError: 'マシュマロ設定の読み込みに失敗しました。',
      loadMessagesError: 'マシュマロメッセージの読み込みに失敗しました。',
      refreshError: 'マシュマロデータの更新に失敗しました。',
      saveSuccess: 'マシュマロ設定を保存しました。',
      saveError: 'マシュマロ設定の保存に失敗しました。',
      toggleMessageError: '選択したマシュマロメッセージの更新に失敗しました。',
      createExportError: 'マシュマロエクスポートジョブの作成に失敗しました。',
      refreshExportError: 'エクスポートジョブの更新に失敗しました。',
      downloadSuccess: 'マシュマロエクスポートのダウンロードを開きました。',
      downloadError: 'マシュマロエクスポートのダウンロード準備に失敗しました。',
    },
    header: {
      eyebrow: 'タレント業務 / マシュマロ',
      title: 'マシュマロ管理',
      description: 'このタレントのメールボックス設定、モデレーション、エクスポートを管理します。',
    },
    actions: {
      openRoutingInSettings: '設定でルーティングを開く',
      refreshWorkspace: 'ページを更新',
      openPublicRoutingInSettings: '設定で公開ルートを開く',
      saveConfig: 'マシュマロ設定を保存',
      savePending: '設定を保存中…',
      approve: '承認',
      reject: '拒否',
      restore: '復元',
      markRead: '既読にする',
      markUnread: '未読に戻す',
      star: 'スターを付ける',
      unstar: 'スターを外す',
      createExportJob: 'エクスポートジョブを作成',
      queueExportPending: 'エクスポートをキュー中…',
      refreshExport: 'エクスポートを更新',
      downloadExport: 'ダウンロード',
      downloadExportAria: 'マシュマロエクスポートをダウンロード',
    },
    summary: {
      tenantLabel: 'テナント',
      tenantFallback: '現在のテナント',
      tenantHint: '現在のテナントコンテキストです。',
      messageVolumeLabel: 'メッセージ総数',
      messageVolumeHint: 'このタレントのメールボックスにある現在の総メッセージ数です。',
      unreadPendingLabel: '未読 / 保留',
      unreadPendingHint: '現在のマシュマロ設定スナップショットからの件数です。',
      publicRouteLabel: '公開ルート',
      routeEnabled: '有効',
      routeDisabled: '無効',
    },
    config: {
      title: '設定',
      description: 'メールボックスの挙動、モデレーション、運用ポリシーを管理します。',
      publicRouteTitle: '公開ルート設定',
      publicRouteDescription:
        '公開マシュマロページの有効化・無効化はタレント設定から行います。現在の公開メールボックス URL はここで確認できます。',
      fields: {
        title: 'タイトル',
        allowedReactions: '許可するリアクション',
        welcomeText: '歓迎メッセージ',
        thankYouText: 'お礼メッセージ',
        placeholderText: 'プレースホルダー文言',
        captchaMode: 'CAPTCHA モード',
        minMessageLength: '最小メッセージ長',
        maxMessageLength: '最大メッセージ長',
        rateLimitPerIp: 'IP ごとのレート制限回数',
        rateLimitWindowHours: 'レート制限ウィンドウ（時間）',
        allowAnonymous: '匿名投稿を許可',
        requireModeration: 'モデレーションを必須化',
        autoApprove: '条件に合えば自動承認',
        profanityFilter: '不適切語フィルターを使用',
        externalBlocklist: '外部ブロックリストを使用',
        enablePublicReactions: '公開リアクションを有効化',
      },
      stats: {
        versionLabel: '設定バージョン',
        versionHint: '現在の設定バージョンです。',
        updatedAtLabel: '更新日時',
        updatedAtHint: '最新の設定更新です。',
        mailboxUrlLabel: 'メールボックス URL',
        mailboxUrlLive: '公開中',
        mailboxUrlDisabled: '無効',
      },
    },
    moderation: {
      title: 'モデレーションキュー',
      description: '保留または拒否されたメッセージを確認し、キューフラグを整理しながらメールボックス状態を明確に保ちます。',
      filters: {
        keywordSearch: 'キーワード検索',
        messageStatus: 'メッセージ状態フィルター',
        replyState: '返信状態',
      },
      table: {
        errorTitle: 'モデレーションキューを利用できません',
        emptyTitle: 'マシュマロメッセージが見つかりません',
        emptyDescription: 'モデレーション条件を調整するか、新しい公開投稿を待ってください。',
        columns: ['メッセージ', '状態', 'フラグ', 'リアクション', '作成日時', '操作'],
        anonymousSender: '匿名送信者',
        replyPrefix: '返信:',
        read: '既読',
        unread: '未読',
        starred: 'スター付き',
        notStarred: 'スターなし',
        hasReply: '返信あり',
        awaitingReply: '返信待ち',
        noReactions: 'リアクションなし',
      },
      dialogs: {
        approveTitle: 'このメッセージを承認しますか？',
        approveDescription: '公開可視性が許可されていれば、承認済みマシュマロは公開ページに表示されます。',
        approveConfirm: '承認',
        approveSuccess: 'マシュマロメッセージを承認しました。',
        approveError: '選択したマシュマロメッセージの承認に失敗しました。',
        restoreTitle: 'このメッセージを保留に戻しますか？',
        restoreDescription: 'この操作でマシュマロは保留中のモデレーションキューに戻ります。',
        restoreConfirm: '復元',
        restoreSuccess: 'マシュマロメッセージを保留に戻しました。',
        restoreError: '選択したマシュマロメッセージの復元に失敗しました。',
        rejectTitle: 'このメッセージを拒否しますか？',
        rejectDescription: '手動モデレーション経路を使い、このメッセージを公開承認フローから外します。',
        rejectConfirm: '拒否',
        rejectSuccess: 'マシュマロメッセージを拒否しました。',
        rejectError: '選択したマシュマロメッセージの拒否に失敗しました。',
      },
    },
    export: {
      title: 'エクスポート',
      description:
        '現在のモデレーション状態フィルターに基づいてマシュマロエクスポートを作成し、ダウンロード可能になるまで最新ジョブを更新します。',
      formatLabel: 'エクスポート形式',
      includeRejected: '拒否済みメッセージを含める',
      currentScopeTitle: '現在のフィルター範囲',
      currentScopeStatusPrefix: '状態:',
      allVisibleStatuses: '現在表示中のすべての状態',
      latestJobTitle: '最新エクスポートジョブ',
      fields: {
        status: '状態',
        format: '形式',
        processed: '処理済み',
        created: '作成',
        completed: '完了',
        expires: '期限',
      },
      noJobTitle: 'このセッションではまだエクスポートジョブが作成されていません',
      noJobDescription: 'ここでエクスポートジョブを作成し、ダウンロード可能になるまで最新ジョブを更新してください。',
    },
    options: {
      captcha: {
        auto: '自動',
        always: '常に有効',
        never: '無効',
      },
      messageStatus: {
        all: 'すべての状態',
        pending: '保留',
        approved: '承認済み',
        rejected: '拒否済み',
        spam: 'スパム',
      },
      reply: {
        all: 'すべてのメッセージ',
        replied: '返信済みのみ',
        unreplied: '未返信のみ',
      },
      exportFormat: {
        xlsx: 'Excel (.xlsx)',
        csv: 'CSV (.csv)',
        json: 'JSON (.json)',
      },
      messageState: {
        pending: '保留',
        approved: '承認済み',
        rejected: '拒否済み',
        spam: 'スパム',
      },
      exportStatus: {
        pending: '保留',
        processing: '処理中',
        running: '実行中',
        success: '成功',
        failed: '失敗',
      },
    },
    common: {
      never: '未実施',
    },
  },
} as const satisfies Record<RuntimeLocale, unknown>;

export type MarshmallowManagementCopy = (typeof COPY)['en'];
const MARSHMALLOW_COPY_RECORD = COPY as unknown as Record<RuntimeLocale, MarshmallowManagementCopy>;

export function useMarshmallowManagementCopy() {
  const { currentLocale, selectedLocale } = useRuntimeLocale();
  const copy = resolveLocaleRecord(selectedLocale, MARSHMALLOW_COPY_RECORD, currentLocale) as MarshmallowManagementCopy;

  return {
    currentLocale,
    selectedLocale,
    copy,
    captchaOptions: [
      { value: 'auto' as CaptchaMode, label: copy.options.captcha.auto },
      { value: 'always' as CaptchaMode, label: copy.options.captcha.always },
      { value: 'never' as CaptchaMode, label: copy.options.captcha.never },
    ],
    messageStatusOptions: [
      { value: 'all' as MessageStatusFilter, label: copy.options.messageStatus.all },
      { value: 'pending' as MessageStatusFilter, label: copy.options.messageStatus.pending },
      { value: 'approved' as MessageStatusFilter, label: copy.options.messageStatus.approved },
      { value: 'rejected' as MessageStatusFilter, label: copy.options.messageStatus.rejected },
      { value: 'spam' as MessageStatusFilter, label: copy.options.messageStatus.spam },
    ],
    replyFilterOptions: [
      { value: 'all' as ReplyFilter, label: copy.options.reply.all },
      { value: 'replied' as ReplyFilter, label: copy.options.reply.replied },
      { value: 'unreplied' as ReplyFilter, label: copy.options.reply.unreplied },
    ],
    exportFormatOptions: [
      { value: 'xlsx' as MarshmallowExportFormat, label: copy.options.exportFormat.xlsx },
      { value: 'csv' as MarshmallowExportFormat, label: copy.options.exportFormat.csv },
      { value: 'json' as MarshmallowExportFormat, label: copy.options.exportFormat.json },
    ],
  };
}

export function formatMarshmallowDateTime(
  locale: SupportedUiLocale | RuntimeLocale,
  value: string | null,
  fallback: string,
) {
  return formatLocaleDateTime(locale, value, fallback);
}

export function formatMarshmallowNumber(locale: SupportedUiLocale | RuntimeLocale, value: number) {
  return formatLocaleNumber(locale, value);
}

export function getMarshmallowMessageStatusLabel(
  locale: SupportedUiLocale | RuntimeLocale,
  status: MarshmallowMessageStatus,
) {
  return (resolveLocaleRecord(locale, MARSHMALLOW_COPY_RECORD) as MarshmallowManagementCopy).options.messageState[status];
}

export function getMarshmallowExportStatusLabel(locale: SupportedUiLocale | RuntimeLocale, status: string) {
  const copy = resolveLocaleRecord(locale, MARSHMALLOW_COPY_RECORD) as MarshmallowManagementCopy;
  const normalized = status.toLowerCase();

  if (normalized in copy.options.exportStatus) {
    return copy.options.exportStatus[normalized as keyof typeof copy.options.exportStatus];
  }

  return status;
}

export function getMarshmallowActionAriaLabel(
  locale: SupportedUiLocale | RuntimeLocale,
  action: 'approve' | 'reject' | 'restore' | 'markRead' | 'markUnread' | 'star' | 'unstar',
  messageId: string,
) {
  const copy = resolveLocaleRecord(locale, MARSHMALLOW_COPY_RECORD) as MarshmallowManagementCopy;

  return `${copy.actions[action]} ${messageId}`;
}
