import type { SupportedUiLocale } from '@tcrn/shared';

import { type ObservabilityTab } from '@/domains/observability/api/observability.api';
import { type RuntimeLocale, useRuntimeLocale } from '@/platform/runtime/locale/locale-provider';
import {
  formatLocaleDateTime,
  resolveLocaleRecord,
} from '@/platform/runtime/locale/locale-text';

const COPY = {
  en: {
    state: {
      loadChangeLogsError: 'Failed to load change logs.',
      loadTechEventsError: 'Failed to load technical events.',
      loadIntegrationLogsError: 'Failed to load integration logs.',
      loadLogSearchError: 'Failed to search logs.',
    },
    header: {
      eyebrowPrefix: 'Operations',
      title: 'Observability',
      description: 'Review recent changes, system events, integration traffic, and logs.',
    },
    summary: {
      tenantLabel: 'Tenant',
      tenantHint: 'Current observability tenant.',
      activeTabLabel: 'Active Tab',
      activeTabHint: 'Current log view.',
      visibleRowsLabel: 'Visible Rows',
      visibleRowsHint: 'Rows returned by the current lane.',
      scopeLabel: 'Scope',
      platformScopeHint: 'Platform observability scope.',
      tenantScopeHint: 'Tenant observability scope.',
    },
    tabs: {
      changeLogs: 'Change Logs',
      techEvents: 'Tech Events',
      integrationLogs: 'Integration Logs',
      logSearch: 'Log Search',
    },
    changeFilters: {
      title: 'Change Log Filters',
      description: 'Filter change history by object family, action, or request ID before drilling into diff summaries.',
      refresh: 'Refresh change logs',
      pending: 'Loading…',
      objectType: 'Object type',
      objectTypePlaceholder: 'talent',
      action: 'Action',
      requestId: 'Request ID',
      requestIdPlaceholder: 'req_123',
    },
    changeTable: {
      title: 'Change Logs',
      description: 'Review changed objects, actions, requests, and summaries in one table.',
      unavailableTitle: 'Change logs unavailable',
      emptyTitle: 'No change logs returned',
      emptyDescription: 'The current tenant did not return any change history for these filters.',
      columns: ['Object', 'Action', 'Operator', 'Diff', 'Request', 'Occurred'],
    },
    techFilters: {
      title: 'Tech Event Filters',
      description: 'Filter technical events by severity, scope, event type, or trace ID.',
      refresh: 'Refresh tech events',
      pending: 'Loading…',
      severity: 'Severity',
      eventType: 'Event type',
      eventTypePlaceholder: 'LOGIN_SUCCESS',
      scope: 'Scope',
      scopePlaceholder: 'security',
      traceId: 'Trace ID',
      traceIdPlaceholder: 'trace-123',
    },
    techTable: {
      title: 'Tech Events',
      description: 'Review severity, scope, message, and trace context in one table.',
      unavailableTitle: 'Tech events unavailable',
      emptyTitle: 'No technical events returned',
      emptyDescription: 'The current filters did not return any technical events.',
      columns: ['Event', 'Severity', 'Scope', 'Message', 'Trace', 'Occurred'],
    },
    integrationFilters: {
      title: 'Integration Log Filters',
      description:
        'Filter inbound and outbound traffic by consumer, direction, status, or trace, and toggle into failed-only mode.',
      refresh: 'Refresh integration logs',
      pending: 'Loading…',
      consumerCode: 'Consumer code',
      consumerCodePlaceholder: 'PUBLIC_API',
      direction: 'Direction',
      responseStatus: 'Response status',
      responseStatusPlaceholder: '500',
      traceId: 'Trace ID',
      traceIdPlaceholder: 'trace-123',
      failedOnly: 'Show failed requests only',
    },
    integrationTable: {
      title: 'Integration Logs',
      description: 'Integration observability keeps direction, endpoint, latency, and trace context in one table.',
      unavailableTitle: 'Integration logs unavailable',
      emptyTitle: 'No integration logs returned',
      emptyDescription: 'The current filters did not return any integration traffic.',
      columns: ['Consumer', 'Direction', 'Endpoint', 'Status', 'Latency', 'Trace', 'Occurred'],
    },
    searchFilters: {
      title: 'Log Search',
      description: 'Search logs by keyword, stream, severity, and relative time range.',
      search: 'Search logs',
      pending: 'Searching…',
      keyword: 'Keyword',
      keywordPlaceholder: 'webhook',
      keywordAriaLabel: 'Log keyword',
      stream: 'Stream',
      streamPlaceholder: 'integration_log',
      severity: 'Severity',
      timeRange: 'Time range',
    },
    searchTable: {
      title: 'Search Results',
      description: 'Search logs directly from this page.',
      unavailableTitle: 'Log search unavailable',
      emptyTitle: 'No search results',
      emptyDescription: 'The current log query did not return any matching entries.',
      columns: ['Timestamp', 'Stream', 'Severity', 'Message'],
    },
    cards: {
      changeTitle: 'Change History',
      changeDescription: 'Review who changed what, when it changed, and which request carried the update.',
      integrationTitle: 'Integration Traffic',
      integrationDescription: 'Track inbound and outbound requests together with status, latency, and trace context.',
      searchTitle: 'Log Search',
      searchDescription: 'Search logs here. If search is unavailable, show a clear unavailable state instead of an empty table.',
    },
    options: {
      actions: {
        all: 'All actions',
        create: 'Create',
        update: 'Update',
        delete: 'Delete',
        enable: 'Enable',
        disable: 'Disable',
        publish: 'Publish',
        unpublish: 'Unpublish',
      },
      severity: {
        all: 'All severities',
        info: 'Info',
        warn: 'Warn',
        error: 'Error',
      },
      direction: {
        all: 'Inbound + outbound',
        inbound: 'Inbound',
        outbound: 'Outbound',
      },
    },
    common: {
      noMessage: 'No message',
      noRequest: 'n/a',
      structuredLogEntry: 'Structured log entry',
      system: 'System',
      unattributed: 'Unattributed',
      unknown: 'unknown',
      timeNever: 'Unavailable',
      latencyUnknown: 'n/a',
    },
  },
  zh: {
    state: {
      loadChangeLogsError: '加载变更日志失败。',
      loadTechEventsError: '加载技术事件失败。',
      loadIntegrationLogsError: '加载集成日志失败。',
      loadLogSearchError: '日志搜索失败。',
    },
    header: {
      eyebrowPrefix: '运维',
      title: '可观测性',
      description: '在同一页查看近期变更、系统事件、集成流量与日志。',
    },
    summary: {
      tenantLabel: '租户',
      tenantHint: '当前可观测性租户。',
      activeTabLabel: '当前页签',
      activeTabHint: '当前日志视图。',
      visibleRowsLabel: '可见行数',
      visibleRowsHint: '当前通道返回的行数。',
      scopeLabel: '范围',
      platformScopeHint: '平台级可观测范围。',
      tenantScopeHint: '租户级可观测范围。',
    },
    tabs: {
      changeLogs: '变更日志',
      techEvents: '技术事件',
      integrationLogs: '集成日志',
      logSearch: '日志搜索',
    },
    changeFilters: {
      title: '变更日志筛选',
      description: '按对象类型、动作或请求 ID 筛选变更历史，再进一步查看差异摘要。',
      refresh: '刷新变更日志',
      pending: '加载中…',
      objectType: '对象类型',
      objectTypePlaceholder: 'talent',
      action: '动作',
      requestId: '请求 ID',
      requestIdPlaceholder: 'req_123',
    },
    changeTable: {
      title: '变更日志',
      description: '在同一张表中查看对象、动作、请求与差异摘要。',
      unavailableTitle: '变更日志不可用',
      emptyTitle: '没有返回变更日志',
      emptyDescription: '当前租户在这些筛选条件下没有返回变更历史。',
      columns: ['对象', '动作', '操作人', '差异', '请求', '发生时间'],
    },
    techFilters: {
      title: '技术事件筛选',
      description: '按严重级别、范围、事件类型或追踪 ID 筛选技术事件。',
      refresh: '刷新技术事件',
      pending: '加载中…',
      severity: '严重级别',
      eventType: '事件类型',
      eventTypePlaceholder: 'LOGIN_SUCCESS',
      scope: '范围',
      scopePlaceholder: 'security',
      traceId: '追踪 ID',
      traceIdPlaceholder: 'trace-123',
    },
    techTable: {
      title: '技术事件',
      description: '在一张表中查看严重级别、范围、消息与追踪上下文。',
      unavailableTitle: '技术事件不可用',
      emptyTitle: '没有返回技术事件',
      emptyDescription: '当前筛选条件没有返回任何技术事件。',
      columns: ['事件', '严重级别', '范围', '消息', '追踪', '发生时间'],
    },
    integrationFilters: {
      title: '集成日志筛选',
      description: '按消费者、方向、状态或追踪筛选入站与出站流量，也可切换为仅失败模式。',
      refresh: '刷新集成日志',
      pending: '加载中…',
      consumerCode: '消费者代码',
      consumerCodePlaceholder: 'PUBLIC_API',
      direction: '方向',
      responseStatus: '响应状态',
      responseStatusPlaceholder: '500',
      traceId: '追踪 ID',
      traceIdPlaceholder: 'trace-123',
      failedOnly: '仅显示失败请求',
    },
    integrationTable: {
      title: '集成日志',
      description: '集成可观测性会在一张表中保留方向、端点、延迟与追踪上下文。',
      unavailableTitle: '集成日志不可用',
      emptyTitle: '没有返回集成日志',
      emptyDescription: '当前筛选条件没有返回任何集成流量。',
      columns: ['消费者', '方向', '端点', '状态', '延迟', '追踪', '发生时间'],
    },
    searchFilters: {
      title: '日志搜索',
      description: '按关键词、流、严重级别和相对时间范围搜索日志。',
      search: '搜索日志',
      pending: '搜索中…',
      keyword: '关键词',
      keywordPlaceholder: 'webhook',
      keywordAriaLabel: '日志关键词',
      stream: '流',
      streamPlaceholder: 'integration_log',
      severity: '严重级别',
      timeRange: '时间范围',
    },
    searchTable: {
      title: '搜索结果',
      description: '可直接在此搜索日志。',
      unavailableTitle: '日志搜索不可用',
      emptyTitle: '没有搜索结果',
      emptyDescription: '当前日志查询没有返回任何匹配记录。',
      columns: ['时间戳', '流', '严重级别', '消息'],
    },
    cards: {
      changeTitle: '变更历史',
      changeDescription: '查看是谁做了变更、何时变更，以及由哪个请求提交了这次更新。',
      integrationTitle: '集成流量',
      integrationDescription: '统一查看入站和出站请求的状态、耗时与追踪上下文。',
      searchTitle: '日志搜索',
      searchDescription: '在这里搜索日志；如果搜索不可用，应明确显示不可用状态，而不是空表。',
    },
    options: {
      actions: {
        all: '全部动作',
        create: '创建',
        update: '更新',
        delete: '删除',
        enable: '启用',
        disable: '停用',
        publish: '发布',
        unpublish: '下线',
      },
      severity: {
        all: '全部级别',
        info: '信息',
        warn: '警告',
        error: '错误',
      },
      direction: {
        all: '入站 + 出站',
        inbound: '入站',
        outbound: '出站',
      },
    },
    common: {
      noMessage: '无消息',
      noRequest: '无',
      structuredLogEntry: '结构化日志记录',
      system: '系统',
      unattributed: '未归属',
      unknown: '未知',
      timeNever: '不可用',
      latencyUnknown: '无',
    },
  },
  ja: {
    state: {
      loadChangeLogsError: '変更ログの読み込みに失敗しました。',
      loadTechEventsError: '技術イベントの読み込みに失敗しました。',
      loadIntegrationLogsError: '連携ログの読み込みに失敗しました。',
      loadLogSearchError: 'ログ検索に失敗しました。',
    },
    header: {
      eyebrowPrefix: '運用',
      title: 'オブザーバビリティ',
      description: '同じ画面で変更履歴、技術イベント、連携トラフィック、ログ検索を確認します。',
    },
    summary: {
      tenantLabel: 'テナント',
      tenantHint: '現在のオブザーバビリティ対象テナント。',
      activeTabLabel: '現在のタブ',
      activeTabHint: '現在の運用向けログレーン。',
      visibleRowsLabel: '表示行数',
      visibleRowsHint: '現在のレーンが返した行数。',
      scopeLabel: 'スコープ',
      platformScopeHint: 'プラットフォームのオブザーバビリティ範囲。',
      tenantScopeHint: 'テナントのオブザーバビリティ範囲。',
    },
    tabs: {
      changeLogs: '変更ログ',
      techEvents: '技術イベント',
      integrationLogs: '連携ログ',
      logSearch: 'ログ検索',
    },
    changeFilters: {
      title: '変更ログの絞り込み',
      description: 'オブジェクト種別、操作、またはリクエスト ID で変更履歴を絞り込みます。',
      refresh: '変更ログを更新',
      pending: '読み込み中…',
      objectType: 'オブジェクト種別',
      objectTypePlaceholder: 'talent',
      action: '操作',
      requestId: 'リクエスト ID',
      requestIdPlaceholder: 'req_123',
    },
    changeTable: {
      title: '変更ログ',
      description: '構造化された変更履歴は、オブジェクト、操作者、リクエスト ID、差分概要を同じ表で保持します。',
      unavailableTitle: '変更ログを利用できません',
      emptyTitle: '変更ログはありません',
      emptyDescription: '現在のフィルターでは変更履歴が返されませんでした。',
      columns: ['オブジェクト', '操作', '操作者', '差分', 'リクエスト', '発生時刻'],
    },
    techFilters: {
      title: '技術イベントの絞り込み',
      description: '重大度、スコープ、イベント種別、またはトレース ID で技術イベントを絞り込みます。',
      refresh: '技術イベントを更新',
      pending: '読み込み中…',
      severity: '重大度',
      eventType: 'イベント種別',
      eventTypePlaceholder: 'LOGIN_SUCCESS',
      scope: 'スコープ',
      scopePlaceholder: 'security',
      traceId: 'トレース ID',
      traceIdPlaceholder: 'trace-123',
    },
    techTable: {
      title: '技術イベント',
      description: '重大度、スコープ、メッセージ、トレース文脈を一つの表で確認できます。',
      unavailableTitle: '技術イベントを利用できません',
      emptyTitle: '技術イベントはありません',
      emptyDescription: '現在のフィルターでは技術イベントが返されませんでした。',
      columns: ['イベント', '重大度', 'スコープ', 'メッセージ', 'トレース', '発生時刻'],
    },
    integrationFilters: {
      title: '連携ログの絞り込み',
      description: 'コンシューマー、方向、ステータス、またはトレースで入出力トラフィックを絞り込み、失敗のみ表示にも切り替えられます。',
      refresh: '連携ログを更新',
      pending: '読み込み中…',
      consumerCode: 'コンシューマーコード',
      consumerCodePlaceholder: 'PUBLIC_API',
      direction: '方向',
      responseStatus: '応答ステータス',
      responseStatusPlaceholder: '500',
      traceId: 'トレース ID',
      traceIdPlaceholder: 'trace-123',
      failedOnly: '失敗したリクエストのみ表示',
    },
    integrationTable: {
      title: '連携ログ',
      description: '連携の可観測性では方向、エンドポイント、レイテンシ、トレース文脈を一つの表で確認できます。',
      unavailableTitle: '連携ログを利用できません',
      emptyTitle: '連携ログはありません',
      emptyDescription: '現在のフィルターでは連携トラフィックが返されませんでした。',
      columns: ['コンシューマー', '方向', 'エンドポイント', 'ステータス', 'レイテンシ', 'トレース', '発生時刻'],
    },
    searchFilters: {
      title: 'ログ検索',
      description: 'キーワード、ストリーム、重大度、相対時間範囲でログを検索します。',
      search: 'ログを検索',
      pending: '検索中…',
      keyword: 'キーワード',
      keywordPlaceholder: 'webhook',
      keywordAriaLabel: 'ログキーワード',
      stream: 'ストリーム',
      streamPlaceholder: 'integration_log',
      severity: '重大度',
      timeRange: '時間範囲',
    },
    searchTable: {
      title: '検索結果',
      description: 'この画面から直接ログを検索できます。',
      unavailableTitle: 'ログ検索を利用できません',
      emptyTitle: '検索結果はありません',
      emptyDescription: '現在のログクエリに一致する結果はありませんでした。',
      columns: ['時刻', 'ストリーム', '重大度', 'メッセージ'],
    },
    cards: {
      changeTitle: '変更履歴',
      changeDescription: '誰が何を変更したか、いつ変更したか、どのリクエストで更新したかを確認できます。',
      integrationTitle: '連携トラフィック',
      integrationDescription: '入出力リクエストの状態、遅延、トレース情報をまとめて確認します。',
      searchTitle: 'ログ検索',
      searchDescription: 'ここでログを検索します。検索が利用できない場合は、空画面ではなく利用不可状態を明示します。',
    },
    options: {
      actions: {
        all: 'すべての操作',
        create: '作成',
        update: '更新',
        delete: '削除',
        enable: '有効化',
        disable: '無効化',
        publish: '公開',
        unpublish: '非公開',
      },
      severity: {
        all: 'すべての重大度',
        info: '情報',
        warn: '警告',
        error: 'エラー',
      },
      direction: {
        all: '受信 + 送信',
        inbound: '受信',
        outbound: '送信',
      },
    },
    common: {
      noMessage: 'メッセージなし',
      noRequest: 'なし',
      structuredLogEntry: '構造化ログ',
      system: 'システム',
      unattributed: '未割当',
      unknown: '不明',
      timeNever: '利用不可',
      latencyUnknown: 'なし',
    },
  },
} as const;

export type ObservabilityCopy = (typeof COPY)['en'];
const OBSERVABILITY_COPY_RECORD = COPY as unknown as Record<RuntimeLocale, ObservabilityCopy>;

export function useObservabilityCopy() {
  const { currentLocale, selectedLocale } = useRuntimeLocale();
  const copy = resolveLocaleRecord(selectedLocale, OBSERVABILITY_COPY_RECORD, currentLocale) as ObservabilityCopy;

  return {
    currentLocale,
    selectedLocale,
    copy,
    changeActionOptions: [
      { value: '', label: copy.options.actions.all },
      { value: 'create', label: copy.options.actions.create },
      { value: 'update', label: copy.options.actions.update },
      { value: 'delete', label: copy.options.actions.delete },
      { value: 'enable', label: copy.options.actions.enable },
      { value: 'disable', label: copy.options.actions.disable },
      { value: 'publish', label: copy.options.actions.publish },
      { value: 'unpublish', label: copy.options.actions.unpublish },
    ],
    severityOptions: [
      { value: '', label: copy.options.severity.all },
      { value: 'info', label: copy.options.severity.info },
      { value: 'warn', label: copy.options.severity.warn },
      { value: 'error', label: copy.options.severity.error },
    ],
    directionOptions: [
      { value: '', label: copy.options.direction.all },
      { value: 'inbound', label: copy.options.direction.inbound },
      { value: 'outbound', label: copy.options.direction.outbound },
    ],
  };
}

export function formatObservabilityDateTime(
  locale: SupportedUiLocale | RuntimeLocale,
  value: string | null | undefined,
  fallback: string,
) {
  return formatLocaleDateTime(locale, value ?? null, fallback);
}

export function getObservabilityTabLabel(locale: SupportedUiLocale | RuntimeLocale, tab: ObservabilityTab) {
  return (resolveLocaleRecord(locale, OBSERVABILITY_COPY_RECORD) as ObservabilityCopy).tabs[camelCaseTabKey(tab)];
}

export function getObservabilityActionLabel(locale: SupportedUiLocale | RuntimeLocale, action: string) {
  const copy = resolveLocaleRecord(locale, OBSERVABILITY_COPY_RECORD) as ObservabilityCopy;

  if (action in copy.options.actions) {
    return copy.options.actions[action as keyof typeof copy.options.actions];
  }

  return action;
}

export function getObservabilitySeverityLabel(locale: SupportedUiLocale | RuntimeLocale, severity: string) {
  const copy = resolveLocaleRecord(locale, OBSERVABILITY_COPY_RECORD) as ObservabilityCopy;

  if (severity in copy.options.severity) {
    return copy.options.severity[severity as keyof typeof copy.options.severity];
  }

  return severity;
}

export function getObservabilityDirectionLabel(locale: SupportedUiLocale | RuntimeLocale, direction: string) {
  const copy = resolveLocaleRecord(locale, OBSERVABILITY_COPY_RECORD) as ObservabilityCopy;

  if (direction in copy.options.direction) {
    return copy.options.direction[direction as keyof typeof copy.options.direction];
  }

  return direction;
}

function camelCaseTabKey(tab: ObservabilityTab) {
  return tab.replace(/-([a-z])/g, (_, group: string) => group.toUpperCase()) as keyof ObservabilityCopy['tabs'];
}
