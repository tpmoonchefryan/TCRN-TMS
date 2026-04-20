import {
  resolveTrilingualLocaleFamily,
  type SupportedUiLocale,
} from '@tcrn/shared';

import type {
  BlocklistAction,
  BlocklistPatternType,
  BlocklistSeverity,
  BlocklistTestResult,
  ExternalPatternType,
  IpAccessCheckResult,
  IpRuleScope,
  IpRuleType,
  SecurityScopeType,
  SecurityTab,
} from '@/domains/security-management/api/security-management.api';
import { type RuntimeLocale, useRuntimeLocale } from '@/platform/runtime/locale/locale-provider';
import {
  formatLocaleDateTime,
  resolveLocaleRecord,
} from '@/platform/runtime/locale/locale-text';
import { resolveLocalizedLabel } from '@/platform/runtime/translations/managed-translations';

type SecurityLocale = SupportedUiLocale | RuntimeLocale;

const COPY = {
  en: {
    common: {
      confirmAction: 'Confirm action',
      confirm: 'Confirm',
      never: 'Never',
      noReason: 'No reason recorded',
      all: 'all',
      active: 'active',
      inactive: 'inactive',
      inherited: 'inherited',
      disabledHere: 'disabled here',
      blocked: 'blocked',
      allowed: 'allowed',
      loading: 'Loading…',
    },
    header: {
      eyebrowPrefix: 'Workspace',
      title: 'Security',
      descriptionPrefix: 'Manage security rules, IP access, and activity for',
      descriptionSuffix: '.',
    },
    summary: {
      scopeLensLabel: 'Current view',
      scopeLensHint: 'The level currently shown on this page.',
      blocklistLabel: 'Blocklist',
      blocklistHint: 'Editable content blocklist entries in view.',
      externalLabel: 'External',
      externalHint: 'External URL/domain patterns currently visible.',
      blockedIpsLabel: 'Blocked IPs',
      blockedIpsHint: 'Current rate-limit block count.',
    },
    tabs: {
      blocklist: 'Blocklist',
      externalBlocklist: 'External Blocklist',
      ipAccess: 'IP Access',
      runtimeSignals: 'Security Activity',
    },
    scopeLens: {
      scopeType: 'Level',
      scopeTypeAriaLabel: 'Security level',
      scopeId: 'Organization entry',
      scopeIdAriaLabel: 'Organization entry',
      tenantHint: 'Tenant-wide rules do not need an extra selection.',
      scopedHint: 'Choose the subsidiary or talent you want to review.',
      tenantPlaceholder: 'Tenant-wide',
      scopedPlaceholder: 'Select an entry',
      chooseOption: 'Choose an entry',
      loadingOptions: 'Loading organization entries…',
      emptyOptions: 'No entries available',
      unresolvedSelection: 'Unavailable entry',
    },
    sections: {
      blocklistList: {
        title: 'Protected Content Blocklist',
        description:
          'Review content blocklist rules for the current level and adjust local overrides.',
        unavailable: 'Blocklist unavailable',
        emptyTitle: 'No blocklist entries in this scope',
        emptyDescription: 'Change the current view or create the first rule.',
        columns: ['Entry', 'Owner', 'Severity', 'Usage', 'State', 'Actions'],
      },
      blocklistEditor: {
        createTitle: 'Create Blocklist Rule',
        updateTitle: 'Update Blocklist Rule',
        description: 'Edit the selected rule or create a new one for this scope.',
        newRule: 'New rule',
        createRule: 'Create rule',
        saveChanges: 'Save changes',
        creating: 'Creating…',
        saving: 'Saving…',
        loadingTitle: 'Loading blocklist detail',
        loadingDescription: 'Fetching the selected rule before the editor becomes writable.',
        translationManagement: {
          trigger: 'Translation management',
          title: 'Blocklist rule translations',
          baseValueLabel: 'Base rule name (English)',
          save: 'Save',
          cancel: 'Cancel',
          closeButtonAriaLabel: 'Close blocklist rule translations drawer',
          empty: 'No additional translations configured yet.',
          summary: (count: number) => `${count} additional locale ${count === 1 ? 'value' : 'values'} configured.`,
          languageLoadError: 'Language options are temporarily unavailable. Supported UI locales are shown instead.',
        },
      },
      blocklistTest: {
        title: 'Rule Test Bench',
        description: 'Test sample text against the current rule set before saving changes.',
        run: 'Test rule',
        pending: 'Testing…',
        sampleText: 'Sample text',
        placeholder: 'Paste the content you want to test.',
      },
      externalList: {
        title: 'Scoped External Blocklist',
        description:
          'Review external link rules for the selected level, including inherited entries.',
        unavailable: 'External blocklist unavailable',
        emptyTitle: 'No external blocklist patterns',
        emptyDescription: 'This scope does not currently expose any external blocklist entries.',
        batchDeactivate: 'Batch deactivate',
        batchDeactivateTitle: 'Deactivate all visible external patterns?',
        batchDeactivateDescription: 'Disable every visible external rule for the selected level.',
        batchDeactivateConfirm: 'Deactivate visible rules',
        batchDeactivatePending: 'Deactivating…',
        batchDeactivateSuccess: 'Visible external patterns were deactivated.',
        columns: ['Pattern', 'Owner', 'Severity', 'State', 'Actions'],
      },
      externalEditor: {
        createTitle: 'Create External Pattern',
        updateTitle: 'Update External Pattern',
        description: 'Create or update external blocklist rules for the selected level.',
        create: 'Create pattern',
        update: 'Save changes',
        creating: 'Creating…',
        saving: 'Saving…',
        loadingTitle: 'Loading external blocklist detail',
        loadingDescription: 'Fetching the selected external rule before the editor becomes writable.',
        translationManagement: {
          trigger: 'Translation management',
          title: 'External pattern translations',
          baseValueLabel: 'Base pattern name (English)',
          save: 'Save',
          cancel: 'Cancel',
          closeButtonAriaLabel: 'Close external pattern translations drawer',
          empty: 'No additional translations configured yet.',
          summary: (count: number) => `${count} additional locale ${count === 1 ? 'value' : 'values'} configured.`,
          languageLoadError: 'Language options are temporarily unavailable. Supported UI locales are shown instead.',
        },
      },
      ipRules: {
        listTitle: 'IP Access Rules',
        listDescription: 'Review, create, and remove tenant IP access rules on one page.',
        unavailable: 'IP access rules unavailable',
        emptyTitle: 'No IP rules configured',
        emptyDescription: 'Create the first whitelist or blacklist rule for this tenant.',
        columns: ['Pattern', 'Type', 'Scope', 'Hits', 'State', 'Actions'],
        createTitle: 'Create IP Rule',
        createDescription: 'Create an explicit allow or deny rule.',
        create: 'Create IP rule',
        creating: 'Creating…',
        probeTitle: 'Policy check',
        probeDescription: 'Check a candidate IP against the current policy before updating your response steps.',
        probe: 'Check access',
        probing: 'Checking…',
      },
      runtimeSignals: {
        title: 'Security activity',
        description: 'Review device fingerprint, traffic throttling, and archive visibility for the current view.',
        fingerprintTitle: 'Device fingerprint',
        fingerprintHint: 'Authenticated-only signal',
        fingerprintLoading: 'Loading fingerprint…',
        fingerprintShort: 'Short',
        fingerprintFull: 'Full',
        fingerprintGenerated: 'Generated',
        rateLimitTitle: 'Traffic throttling',
        rateLimitHint: 'Recent traffic pressure',
        rateLimitLoading: 'Loading rate-limit stats…',
        requests24h: 'Requests 24h',
        requests24hHint: 'Observed rate-limited traffic volume.',
        blocked24h: 'Blocked 24h',
        blocked24hHint: 'Requests blocked by current policies.',
        complianceTitle: 'Archive visibility',
        complianceHint: 'Visible customer archive stores',
        complianceLoading: 'Loading archive summary…',
        visibleStores: 'Visible stores',
        visibleStoresHint: 'Archive stores currently visible in this view.',
        endpointsTitle: 'Busiest endpoints',
        endpointsDescription: 'Use these counters to tie request pressure back to concrete endpoints.',
        endpointsUnavailable: 'Rate-limit stats unavailable',
        endpointsEmptyTitle: 'No endpoint telemetry',
        endpointsEmptyDescription: 'No active endpoint counters were returned from Redis.',
        endpointsColumns: ['Endpoint', 'Method', 'Current', 'Limit', 'Reset In'],
        topIpsTitle: 'Top IPs & archive stores',
        topIpsDescription: 'Compare recent IP pressure with the archive stores visible in this view.',
        topIpsEmptyTitle: 'No IP telemetry',
        topIpsEmptyDescription: 'Redis did not return any ranked IP traffic samples.',
        topIpsColumns: ['IP', 'Requests', 'Blocked', 'Last Seen'],
        profileStoresUnavailable: 'Archive summary unavailable',
        profileStoresEmptyTitle: 'No archive stores returned',
        profileStoresEmptyDescription: 'No archive store records were returned for this view.',
        profileStoresTalents: 'Talents',
        profileStoresTalentsHint: 'Talent bindings using this store.',
        profileStoresCustomers: 'Customers',
        profileStoresCustomersHint: 'Customer archives isolated here.',
      },
    },
    fields: {
      ownerType: 'Applies to',
      ownerId: 'Organization entry',
      ruleName: 'Rule name',
      category: 'Category',
      pattern: 'Pattern',
      patternType: 'Pattern type',
      severity: 'Severity',
      action: 'Action',
      replacement: 'Replacement',
      scopes: 'Scopes',
      scopesHint: 'Comma-separated usage scopes such as `marshmallow, customer`',
      sortOrder: 'Sort order',
      description: 'Description',
      inherit: 'Inherit into child scopes',
      forceUse: 'Force use for child scopes',
      ipRuleType: 'Rule type',
      ipRuleScope: 'Traffic surface',
      ipPattern: 'IP / CIDR',
      expiresAt: 'Expires at',
      reason: 'Reason',
      probeIp: 'IP',
      probeScope: 'Traffic surface',
      sampleText: 'Sample text',
    },
    placeholders: {
      scopeUuid: 'Select an organization entry',
      ruleName: 'Profanity rejection',
      category: 'profanity',
      pattern: 'badword',
      replacement: '***',
      scopes: 'marshmallow',
      externalRuleName: 'Discord invite filter',
      externalCategory: 'spam',
      externalPattern: 'discord\\.gg/',
      externalReplacement: '[filtered]',
      ipPattern: '192.168.1.10 or 10.0.0.0/8',
      ipReason: 'Why this IP restriction exists.',
      probeIp: '203.0.113.10',
      sampleText: 'Paste the content you want to test.',
    },
    actions: {
      edit: 'Edit',
      disableHere: 'Disable here',
      reEnable: 'Re-enable',
      deleteRule: 'Delete rule',
      deletePattern: 'Delete pattern',
      delete: 'Delete',
    },
    dialogs: {
      disableInheritedTitlePrefix: 'Disable inherited rule',
      disableInheritedDescription: 'The upstream rule will stay intact, but this scope will stop enforcing it.',
      disabling: 'Disabling…',
      reEnableTitlePrefix: 'Re-enable',
      reEnableDescription: 'This restores the inherited rule for the selected level.',
      reEnabling: 'Re-enabling…',
      deleteTitlePrefix: 'Delete',
      deleteRuleDescription: 'This permanently removes the rule from the selected level.',
      deletePatternDescription: 'This permanently removes the external pattern from the selected level.',
      deleting: 'Deleting…',
      deleteIpDescription: 'This deactivates the IP access rule and clears it from the in-memory cache.',
    },
    options: {
      scopeType: {
        tenant: 'Tenant',
        subsidiary: 'Subsidiary',
        talent: 'Talent',
      },
      blocklistPatternType: {
        keyword: 'Keyword',
        regex: 'Regex',
        wildcard: 'Wildcard',
      },
      externalPatternType: {
        domain: 'Domain',
        url_regex: 'URL regex',
        keyword: 'Keyword',
      },
      severity: {
        low: 'Low',
        medium: 'Medium',
        high: 'High',
      },
      action: {
        reject: 'Reject',
        flag: 'Flag',
        replace: 'Replace',
      },
      ipRuleType: {
        blacklist: 'Blacklist',
        whitelist: 'Whitelist',
      },
      ipRuleScope: {
        admin: 'Admin',
        api: 'API',
        public: 'Public',
        global: 'Global',
      },
    },
  },
  zh: {
    common: {
      confirmAction: '确认操作',
      confirm: '确认',
      never: '从未',
      noReason: '未记录原因',
      all: '全部',
      active: '启用',
      inactive: '停用',
      inherited: '继承',
      disabledHere: '在此停用',
      blocked: '已阻止',
      allowed: '已允许',
      loading: '加载中…',
    },
    header: {
      eyebrowPrefix: '工作区',
      title: '安全',
      descriptionPrefix: '管理',
      descriptionSuffix: '的安全规则、IP 访问与安全活动。',
    },
    summary: {
      scopeLensLabel: '当前视图',
      scopeLensHint: '当前页面展示的规则层级。',
      blocklistLabel: '内容拦截',
      blocklistHint: '当前可编辑的内容拦截规则数量。',
      externalLabel: '外链拦截',
      externalHint: '当前可见的外部 URL/域名模式。',
      blockedIpsLabel: '被阻止 IP',
      blockedIpsHint: '当前限流阻止数量。',
    },
    tabs: {
      blocklist: '内容拦截',
      externalBlocklist: '外链拦截',
      ipAccess: 'IP 访问',
      runtimeSignals: '安全活动',
    },
    scopeLens: {
      scopeType: '层级',
      scopeTypeAriaLabel: '安全层级',
      scopeId: '组织对象',
      scopeIdAriaLabel: '组织对象',
      tenantHint: '租户级规则不需要额外选择对象。',
      scopedHint: '选择需要查看的分目录或艺人。',
      tenantPlaceholder: '租户级',
      scopedPlaceholder: '选择对象',
      chooseOption: '选择对象',
      loadingOptions: '正在加载组织对象…',
      emptyOptions: '暂无可选对象',
      unresolvedSelection: '对象不可用',
    },
    sections: {
      blocklistList: {
        title: '受保护内容拦截',
        description: '查看当前层级的内容拦截规则，并按需调整本层覆盖规则。',
        unavailable: '内容拦截不可用',
        emptyTitle: '当前范围没有内容拦截规则',
        emptyDescription: '切换当前视图，或创建第一条规则。',
        columns: ['条目', '归属', '严重级别', '用途', '状态', '操作'],
      },
      blocklistEditor: {
        createTitle: '创建内容拦截规则',
        updateTitle: '更新内容拦截规则',
        description: '编辑当前选中规则，或在此范围创建新规则。',
        newRule: '新建规则',
        createRule: '创建规则',
        saveChanges: '保存修改',
        creating: '创建中…',
        saving: '保存中…',
        loadingTitle: '正在加载规则详情',
        loadingDescription: '正在获取所选规则，随后编辑器会变为可编辑。',
        translationManagement: {
          trigger: '翻译管理',
          title: '内容拦截规则翻译',
          baseValueLabel: '基础规则名称（英文）',
          save: '保存',
          cancel: '取消',
          closeButtonAriaLabel: '关闭内容拦截规则翻译抽屉',
          empty: '当前尚未配置额外语言翻译。',
          summary: (count: number) => `已配置 ${count} 个额外语言值。`,
          languageLoadError: '暂时无法加载语言选项，已回退为受支持的界面语言。',
        },
      },
      blocklistTest: {
        title: '规则测试台',
        description: '在保存修改前，用当前规则集测试示例文本。',
        run: '测试规则',
        pending: '测试中…',
        sampleText: '示例文本',
        placeholder: '粘贴要测试的内容。',
      },
      externalList: {
        title: '分范围外链拦截',
        description: '查看当前层级的外链规则，并保持继承覆盖可见。',
        unavailable: '外链拦截不可用',
        emptyTitle: '没有外链拦截模式',
        emptyDescription: '当前范围暂未暴露任何外链拦截条目。',
        batchDeactivate: '批量停用',
        batchDeactivateTitle: '停用所有当前可见的外链模式？',
        batchDeactivateDescription: '这会对当前范围内所有可见的外链规则写入停用状态。',
        batchDeactivateConfirm: '停用可见规则',
        batchDeactivatePending: '停用中…',
        batchDeactivateSuccess: '已停用当前可见的外链模式。',
        columns: ['模式', '归属', '严重级别', '状态', '操作'],
      },
      externalEditor: {
        createTitle: '创建外链模式',
        updateTitle: '更新外链模式',
        description: '在同一处管理继承与本地外链拦截规则。',
        create: '创建模式',
        update: '保存修改',
        creating: '创建中…',
        saving: '保存中…',
        loadingTitle: '正在加载外链规则详情',
        loadingDescription: '正在获取所选外链规则，随后编辑器会变为可编辑。',
        translationManagement: {
          trigger: '翻译管理',
          title: '外链模式翻译',
          baseValueLabel: '基础模式名称（英文）',
          save: '保存',
          cancel: '取消',
          closeButtonAriaLabel: '关闭外链模式翻译抽屉',
          empty: '当前尚未配置额外语言翻译。',
          summary: (count: number) => `已配置 ${count} 个额外语言值。`,
          languageLoadError: '暂时无法加载语言选项，已回退为受支持的界面语言。',
        },
      },
      ipRules: {
        listTitle: 'IP 访问规则',
        listDescription: '在同一页查看、创建和移除租户 IP 访问规则。',
        unavailable: 'IP 访问规则不可用',
        emptyTitle: '尚未配置 IP 规则',
        emptyDescription: '为当前租户创建第一条白名单或黑名单规则。',
        columns: ['模式', '类型', '范围', '命中', '状态', '操作'],
        createTitle: '创建 IP 规则',
        createDescription: '创建明确的允许或拒绝规则。',
        create: '创建 IP 规则',
        creating: '创建中…',
        probeTitle: '策略检查',
        probeDescription: '在更新处理流程前，用当前策略检查候选 IP。',
        probe: '检查访问',
        probing: '检查中…',
      },
      runtimeSignals: {
        title: '安全活动',
        description: '查看当前视图中的设备指纹、限流情况与档案库可见性。',
        fingerprintTitle: '设备指纹',
        fingerprintHint: '仅登录后可见',
        fingerprintLoading: '正在加载指纹…',
        fingerprintShort: '短指纹',
        fingerprintFull: '完整指纹',
        fingerprintGenerated: '生成时间',
        rateLimitTitle: '限流情况',
        rateLimitHint: '近期流量压力',
        rateLimitLoading: '正在加载限流统计…',
        requests24h: '24 小时请求数',
        requests24hHint: '当前观察到的受限流影响流量。',
        blocked24h: '24 小时阻止数',
        blocked24hHint: '被当前策略阻止的请求数。',
        complianceTitle: '档案库可见性',
        complianceHint: '当前可见的客户档案库',
        complianceLoading: '正在加载档案库摘要…',
        visibleStores: '可见档案库',
        visibleStoresHint: '当前视图中可见的档案库数量。',
        endpointsTitle: '高压端点',
        endpointsDescription: '用这些计数器把请求压力定位到具体端点。',
        endpointsUnavailable: '限流统计不可用',
        endpointsEmptyTitle: '没有端点遥测',
        endpointsEmptyDescription: 'Redis 没有返回任何活跃端点计数。',
        endpointsColumns: ['端点', '方法', '当前值', '限制', '重置倒计时'],
        topIpsTitle: '高压 IP 与档案库',
        topIpsDescription: '对照查看近期 IP 压力和当前视图可见的档案库。',
        topIpsEmptyTitle: '没有 IP 遥测',
        topIpsEmptyDescription: 'Redis 没有返回任何排序后的 IP 流量样本。',
        topIpsColumns: ['IP', '请求数', '阻止', '最近出现'],
        profileStoresUnavailable: '档案库摘要不可用',
        profileStoresEmptyTitle: '未返回档案库',
        profileStoresEmptyDescription: '当前视图没有返回任何档案库记录。',
        profileStoresTalents: '艺人',
        profileStoresTalentsHint: '绑定到该档案库的艺人数量。',
        profileStoresCustomers: '客户',
        profileStoresCustomersHint: '隔离在此的客户档案数量。',
      },
    },
    fields: {
      ownerType: '生效层级',
      ownerId: '组织对象',
      ruleName: '规则名称',
      category: '分类',
      pattern: '模式',
      patternType: '模式类型',
      severity: '严重级别',
      action: '动作',
      replacement: '替换文本',
      scopes: '用途范围',
      scopesHint: '用逗号分隔用途范围，例如 `marshmallow, customer`',
      sortOrder: '排序',
      description: '说明',
      inherit: '向子范围继承',
      forceUse: '对子范围强制使用',
      ipRuleType: '规则类型',
      ipRuleScope: '流量入口',
      ipPattern: 'IP / CIDR',
      expiresAt: '过期时间',
      reason: '原因',
      probeIp: 'IP',
      probeScope: '流量入口',
      sampleText: '示例文本',
    },
    placeholders: {
      scopeUuid: '选择组织对象',
      ruleName: '敏感词拦截',
      category: 'profanity',
      pattern: 'badword',
      replacement: '***',
      scopes: 'marshmallow',
      externalRuleName: 'Discord 邀请拦截',
      externalCategory: 'spam',
      externalPattern: 'discord\\.gg/',
      externalReplacement: '[filtered]',
      ipPattern: '192.168.1.10 或 10.0.0.0/8',
      ipReason: '填写此 IP 限制存在的原因。',
      probeIp: '203.0.113.10',
      sampleText: '粘贴要测试的内容。',
    },
    actions: {
      edit: '编辑',
      disableHere: '在此停用',
      reEnable: '重新启用',
      deleteRule: '删除规则',
      deletePattern: '删除模式',
      delete: '删除',
    },
    dialogs: {
      disableInheritedTitlePrefix: '停用继承规则',
      disableInheritedDescription: '上游规则会保持不变，但当前范围将停止执行它。',
      disabling: '停用中…',
      reEnableTitlePrefix: '重新启用',
      reEnableDescription: '这会在当前范围恢复继承规则。',
      reEnabling: '重新启用中…',
      deleteTitlePrefix: '删除',
      deleteRuleDescription: '这会从当前范围永久移除该规则。',
      deletePatternDescription: '这会从当前范围永久移除该外链模式。',
      deleting: '删除中…',
      deleteIpDescription: '这会停用 IP 访问规则，并从内存缓存中清除。',
    },
    options: {
      scopeType: {
        tenant: '租户',
        subsidiary: '分目录',
        talent: '艺人',
      },
      blocklistPatternType: {
        keyword: '关键词',
        regex: '正则',
        wildcard: '通配符',
      },
      externalPatternType: {
        domain: '域名',
        url_regex: 'URL 正则',
        keyword: '关键词',
      },
      severity: {
        low: '低',
        medium: '中',
        high: '高',
      },
      action: {
        reject: '拒绝',
        flag: '标记',
        replace: '替换',
      },
      ipRuleType: {
        blacklist: '黑名单',
        whitelist: '白名单',
      },
      ipRuleScope: {
        admin: '管理后台',
        api: 'API',
        public: '公开域',
        global: '全局',
      },
    },
  },
  ja: {
    common: {
      confirmAction: '操作を確認',
      confirm: '確認',
      never: 'なし',
      noReason: '理由は未記録',
      all: 'すべて',
      active: '有効',
      inactive: '無効',
      inherited: '継承',
      disabledHere: 'この階層で無効',
      blocked: '遮断',
      allowed: '許可',
      loading: '読み込み中…',
    },
    header: {
      eyebrowPrefix: 'ワークスペース',
      title: 'セキュリティ',
      descriptionPrefix: '',
      descriptionSuffix: 'のセキュリティルール、IP アクセス、セキュリティ活動をこの画面で管理します。',
    },
    summary: {
      scopeLensLabel: '現在の表示範囲',
      scopeLensHint: 'この画面で表示しているルール階層です。',
      blocklistLabel: 'コンテンツ遮断',
      blocklistHint: '現在表示中の編集可能な遮断ルール数。',
      externalLabel: '外部遮断',
      externalHint: '現在表示中の外部 URL / ドメインパターン。',
      blockedIpsLabel: '遮断中 IP',
      blockedIpsHint: '現在のレート制限遮断件数。',
    },
    tabs: {
      blocklist: 'コンテンツ遮断',
      externalBlocklist: '外部遮断',
      ipAccess: 'IP アクセス',
      runtimeSignals: 'セキュリティ活動',
    },
    scopeLens: {
      scopeType: '階層',
      scopeTypeAriaLabel: 'セキュリティ階層',
      scopeId: '組織項目',
      scopeIdAriaLabel: '組織項目',
      tenantHint: 'テナント全体のルールでは追加の選択は不要です。',
      scopedHint: '確認したい子組織またはタレントを選択してください。',
      tenantPlaceholder: 'テナント全体',
      scopedPlaceholder: '項目を選択',
      chooseOption: '項目を選択',
      loadingOptions: '組織項目を読み込み中…',
      emptyOptions: '選択できる項目はありません',
      unresolvedSelection: '利用できない項目',
    },
    sections: {
      blocklistList: {
        title: '保護コンテンツ遮断',
        description:
          '現在の階層で有効なコンテンツ遮断ルールを確認し、この階層の上書きを調整します。',
        unavailable: 'コンテンツ遮断を利用できません',
        emptyTitle: 'このスコープに遮断ルールはありません',
        emptyDescription: '表示階層を切り替えるか、最初のルールを作成してください。',
        columns: ['項目', '所有者', '重大度', '用途', '状態', '操作'],
      },
      blocklistEditor: {
        createTitle: '遮断ルールを作成',
        updateTitle: '遮断ルールを更新',
        description: '選択中のルールを編集するか、このスコープで新しいルールを作成します。',
        newRule: '新規ルール',
        createRule: 'ルールを作成',
        saveChanges: '変更を保存',
        creating: '作成中…',
        saving: '保存中…',
        loadingTitle: 'ルール詳細を読み込み中',
        loadingDescription: '選択したルールを取得した後、エディターを編集可能にします。',
        translationManagement: {
          trigger: '翻訳管理',
          title: '遮断ルールの翻訳',
          baseValueLabel: '基本ルール名（英語）',
          save: '保存',
          cancel: 'キャンセル',
          closeButtonAriaLabel: '遮断ルール翻訳ドロワーを閉じる',
          empty: '追加翻訳はまだ設定されていません。',
          summary: (count: number) => `${count} 件の追加ロケール値を設定済みです。`,
          languageLoadError: '言語オプションを読み込めないため、対応 UI ロケールを表示しています。',
        },
      },
      blocklistTest: {
        title: 'ルール検証',
        description: '変更を保存する前に、現在のルールセットでサンプルテキストを検証します。',
        run: 'ルールを検証',
        pending: '検証中…',
        sampleText: 'サンプルテキスト',
        placeholder: '検証したい内容を貼り付けてください。',
      },
      externalList: {
        title: 'スコープ別外部遮断',
        description:
          '現在の階層で有効な外部リンクルールを確認し、継承上書きを見失わないようにします。',
        unavailable: '外部遮断を利用できません',
        emptyTitle: '外部遮断パターンはありません',
        emptyDescription: 'このスコープには外部遮断エントリがありません。',
        batchDeactivate: '一括無効化',
        batchDeactivateTitle: '表示中の外部パターンをすべて無効化しますか？',
        batchDeactivateDescription: '現在のスコープで表示中のすべての外部ルールに無効化を書き込みます。',
        batchDeactivateConfirm: '表示中ルールを無効化',
        batchDeactivatePending: '無効化中…',
        batchDeactivateSuccess: '表示中の外部パターンを無効化しました。',
        columns: ['パターン', '所有者', '重大度', '状態', '操作'],
      },
      externalEditor: {
        createTitle: '外部パターンを作成',
        updateTitle: '外部パターンを更新',
        description: '継承ルールとローカルルールを一か所で管理します。',
        create: 'パターンを作成',
        update: '変更を保存',
        creating: '作成中…',
        saving: '保存中…',
        loadingTitle: '外部ルール詳細を読み込み中',
        loadingDescription: '選択した外部ルールを取得した後、エディターを編集可能にします。',
        translationManagement: {
          trigger: '翻訳管理',
          title: '外部パターンの翻訳',
          baseValueLabel: '基本パターン名（英語）',
          save: '保存',
          cancel: 'キャンセル',
          closeButtonAriaLabel: '外部パターン翻訳ドロワーを閉じる',
          empty: '追加翻訳はまだ設定されていません。',
          summary: (count: number) => `${count} 件の追加ロケール値を設定済みです。`,
          languageLoadError: '言語オプションを読み込めないため、対応 UI ロケールを表示しています。',
        },
      },
      ipRules: {
        listTitle: 'IP アクセスルール',
        listDescription: 'テナントの IP アクセスルールをこの画面で確認・作成・削除します。',
        unavailable: 'IP アクセスルールを利用できません',
        emptyTitle: 'IP ルールは未設定です',
        emptyDescription: 'このテナントで最初のホワイトリストまたはブラックリストルールを作成してください。',
        columns: ['パターン', '種別', 'スコープ', 'ヒット', '状態', '操作'],
        createTitle: 'IP ルールを作成',
        createDescription: '明示的な許可または拒否ルールを作成します。',
        create: 'IP ルールを作成',
        creating: '作成中…',
        probeTitle: 'ポリシー確認',
        probeDescription: '運用手順を更新する前に、候補 IP を現在のポリシーで確認します。',
        probe: 'アクセス確認',
        probing: '確認中…',
      },
      runtimeSignals: {
        title: 'セキュリティ活動',
        description: '現在の表示範囲におけるデバイス指紋、トラフィック制御、アーカイブ可視性を確認します。',
        fingerprintTitle: 'デバイス指紋',
        fingerprintHint: '認証済みユーザーのみ',
        fingerprintLoading: 'フィンガープリントを読み込み中…',
        fingerprintShort: '短縮',
        fingerprintFull: '完全',
        fingerprintGenerated: '生成時刻',
        rateLimitTitle: 'トラフィック制御',
        rateLimitHint: '直近のトラフィック圧力',
        rateLimitLoading: 'レート制限統計を読み込み中…',
        requests24h: '24時間リクエスト',
        requests24hHint: '観測されたレート制限対象トラフィック量。',
        blocked24h: '24時間遮断数',
        blocked24hHint: '現在のポリシーで遮断されたリクエスト数。',
        complianceTitle: 'アーカイブ可視性',
        complianceHint: '現在見えている顧客アーカイブストア',
        complianceLoading: 'アーカイブ概要を読み込み中…',
        visibleStores: '表示ストア数',
        visibleStoresHint: 'この表示範囲で見えているアーカイブストア数です。',
        endpointsTitle: '混雑しているエンドポイント',
        endpointsDescription: 'これらのカウンターでリクエスト圧力を具体的なエンドポイントへ結び付けます。',
        endpointsUnavailable: 'レート制限統計を利用できません',
        endpointsEmptyTitle: 'エンドポイントテレメトリなし',
        endpointsEmptyDescription: 'Redis から有効なエンドポイントカウンターが返されませんでした。',
        endpointsColumns: ['エンドポイント', 'メソッド', '現在値', '上限', 'リセットまで'],
        topIpsTitle: '上位 IP とアーカイブストア',
        topIpsDescription: '直近の IP 圧力と、この表示範囲で見えているアーカイブストアを並べて確認します。',
        topIpsEmptyTitle: 'IP テレメトリなし',
        topIpsEmptyDescription: 'Redis から順位付き IP トラフィックサンプルが返されませんでした。',
        topIpsColumns: ['IP', 'リクエスト', '遮断', '最終観測'],
        profileStoresUnavailable: 'アーカイブ概要を利用できません',
        profileStoresEmptyTitle: 'アーカイブストアはありません',
        profileStoresEmptyDescription: 'この表示範囲ではアーカイブストア記録が返されませんでした。',
        profileStoresTalents: 'タレント',
        profileStoresTalentsHint: 'このストアを使うタレント数。',
        profileStoresCustomers: '顧客',
        profileStoresCustomersHint: 'ここに隔離された顧客アーカイブ数。',
      },
    },
    fields: {
      ownerType: '適用先',
      ownerId: '組織項目',
      ruleName: 'ルール名',
      category: 'カテゴリ',
      pattern: 'パターン',
      patternType: 'パターン種別',
      severity: '重大度',
      action: '動作',
      replacement: '置換文字列',
      scopes: '用途スコープ',
      scopesHint: '`marshmallow, customer` のようにカンマ区切りで入力します',
      sortOrder: '並び順',
      description: '説明',
      inherit: '子スコープへ継承',
      forceUse: '子スコープで強制使用',
      ipRuleType: 'ルール種別',
      ipRuleScope: 'アクセス面',
      ipPattern: 'IP / CIDR',
      expiresAt: '失効日時',
      reason: '理由',
      probeIp: 'IP',
      probeScope: 'アクセス面',
      sampleText: 'サンプルテキスト',
    },
    placeholders: {
      scopeUuid: '組織項目を選択',
      ruleName: '不適切語句の拒否',
      category: 'profanity',
      pattern: 'badword',
      replacement: '***',
      scopes: 'marshmallow',
      externalRuleName: 'Discord 招待遮断',
      externalCategory: 'spam',
      externalPattern: 'discord\\.gg/',
      externalReplacement: '[filtered]',
      ipPattern: '192.168.1.10 または 10.0.0.0/8',
      ipReason: 'この IP 制限が必要な理由を入力します。',
      probeIp: '203.0.113.10',
      sampleText: '検証したい内容を貼り付けてください。',
    },
    actions: {
      edit: '編集',
      disableHere: 'ここで無効化',
      reEnable: '再有効化',
      deleteRule: 'ルール削除',
      deletePattern: 'パターン削除',
      delete: '削除',
    },
    dialogs: {
      disableInheritedTitlePrefix: '継承ルールを無効化',
      disableInheritedDescription: '上位ルールはそのまま残りますが、このスコープでは適用を停止します。',
      disabling: '無効化中…',
      reEnableTitlePrefix: '再有効化',
      reEnableDescription: '現在のスコープで継承ルールを復元します。',
      reEnabling: '再有効化中…',
      deleteTitlePrefix: '削除',
      deleteRuleDescription: 'このスコープからルールを完全に削除します。',
      deletePatternDescription: 'このスコープから外部パターンを完全に削除します。',
      deleting: '削除中…',
      deleteIpDescription: 'IP アクセスルールを無効化し、メモリキャッシュから削除します。',
    },
    options: {
      scopeType: {
        tenant: 'テナント',
        subsidiary: '子組織',
        talent: 'タレント',
      },
      blocklistPatternType: {
        keyword: 'キーワード',
        regex: '正規表現',
        wildcard: 'ワイルドカード',
      },
      externalPatternType: {
        domain: 'ドメイン',
        url_regex: 'URL 正規表現',
        keyword: 'キーワード',
      },
      severity: {
        low: '低',
        medium: '中',
        high: '高',
      },
      action: {
        reject: '拒否',
        flag: 'フラグ',
        replace: '置換',
      },
      ipRuleType: {
        blacklist: 'ブラックリスト',
        whitelist: 'ホワイトリスト',
      },
      ipRuleScope: {
        admin: '管理画面',
        api: 'API',
        public: '公開',
        global: '全体',
      },
    },
  },
} as const;

export type SecurityManagementCopy = (typeof COPY)['en'];
const SECURITY_COPY_RECORD = COPY as unknown as Record<RuntimeLocale, SecurityManagementCopy>;

function resolveSecurityLocaleFamily(locale: SecurityLocale) {
  return resolveTrilingualLocaleFamily(locale);
}

function resolveSecurityCopy(locale: SecurityLocale, familyFallback?: RuntimeLocale) {
  return resolveLocaleRecord(locale, SECURITY_COPY_RECORD, familyFallback) as SecurityManagementCopy;
}

function getEffectiveSelectedLocale(
  currentLocale: RuntimeLocale,
  selectedLocale: SupportedUiLocale | undefined,
): SupportedUiLocale {
  if (selectedLocale && resolveSecurityLocaleFamily(selectedLocale) === currentLocale) {
    return selectedLocale;
  }

  return currentLocale === 'zh' ? 'zh_HANS' : currentLocale;
}

export function useSecurityManagementCopy() {
  const { currentLocale, selectedLocale } = useRuntimeLocale();
  const effectiveSelectedLocale = getEffectiveSelectedLocale(currentLocale, selectedLocale);
  const copy = resolveSecurityCopy(effectiveSelectedLocale, currentLocale);

  return { currentLocale, selectedLocale: effectiveSelectedLocale, copy };
}

export function formatSecurityDateTime(locale: SecurityLocale, value: string | null | undefined, fallback: string) {
  return formatLocaleDateTime(locale, value ?? null, fallback);
}

interface SecurityLocalizedNameLike {
  nameEn?: string | null;
  nameZh?: string | null;
  nameJa?: string | null;
  translations?: Record<string, string> | null;
  code?: string | null;
}

function resolveSecurityAction(action: string | undefined): BlocklistAction {
  if (action === 'reject' || action === 'replace') {
    return action;
  }

  return 'flag';
}

export function formatSecurityHeaderDescription(locale: SecurityLocale, workspaceName: string) {
  const copy = resolveSecurityCopy(locale);
  const localeFamily = resolveSecurityLocaleFamily(locale);

  if (localeFamily === 'zh') {
    return `${copy.header.descriptionPrefix}${workspaceName}${copy.header.descriptionSuffix}`;
  }

  if (localeFamily === 'ja') {
    return `${workspaceName}${copy.header.descriptionSuffix}`;
  }

  return `${copy.header.descriptionPrefix} ${workspaceName}${copy.header.descriptionSuffix}`;
}

export function formatSecurityScopeLabel(locale: SecurityLocale, scopeType: SecurityScopeType, _scopeId?: string) {
  const label = resolveSecurityCopy(locale).options.scopeType[scopeType];
  return label;
}

export function pickSecurityLocalizedName(
  locale: SecurityLocale | string,
  value: SecurityLocalizedNameLike,
  fallback = '',
) {
  const baseFallback = value.nameEn || value.nameZh || value.nameJa || value.code || fallback;
  const localeFamily = resolveTrilingualLocaleFamily(locale);
  const normalizedLocale = localeFamily === 'zh' ? (locale === 'zh_HANT' ? 'zh_HANT' : 'zh_HANS') : locale;

  if (value.translations && Object.keys(value.translations).length > 0) {
    return resolveLocalizedLabel(value.translations, normalizedLocale, baseFallback);
  }

  if (localeFamily === 'zh') {
    return value.nameZh || value.nameEn || value.nameJa || value.code || fallback;
  }

  if (localeFamily === 'ja') {
    return value.nameJa || value.nameEn || value.nameZh || value.code || fallback;
  }

  return baseFallback;
}

export function getSecuritySeverityLabel(locale: SecurityLocale, severity: BlocklistSeverity) {
  return resolveSecurityCopy(locale).options.severity[severity];
}

export function getSecurityActionLabel(locale: SecurityLocale, action: BlocklistAction) {
  return resolveSecurityCopy(locale).options.action[action];
}

export function getSecurityBlocklistPatternTypeLabel(locale: SecurityLocale, patternType: BlocklistPatternType) {
  return resolveSecurityCopy(locale).options.blocklistPatternType[patternType];
}

export function getSecurityExternalPatternTypeLabel(locale: SecurityLocale, patternType: ExternalPatternType) {
  return resolveSecurityCopy(locale).options.externalPatternType[patternType];
}

export function getSecurityIpRuleTypeLabel(locale: SecurityLocale, ruleType: IpRuleType) {
  return resolveSecurityCopy(locale).options.ipRuleType[ruleType];
}

export function getSecurityIpRuleScopeLabel(locale: SecurityLocale, scope: IpRuleScope) {
  return resolveSecurityCopy(locale).options.ipRuleScope[scope];
}

export function getSecurityTabLabel(locale: SecurityLocale, tab: SecurityTab) {
  const copy = resolveSecurityCopy(locale);

  if (tab === 'external-blocklist') {
    return copy.tabs.externalBlocklist;
  }

  if (tab === 'ip-access') {
    return copy.tabs.ipAccess;
  }

  if (tab === 'runtime-signals') {
    return copy.tabs.runtimeSignals;
  }

  return copy.tabs.blocklist;
}

export function formatSecurityBlocklistSaveSuccess(locale: SecurityLocale, mode: 'create' | 'edit') {
  const localeFamily = resolveSecurityLocaleFamily(locale);

  if (localeFamily === 'zh') {
    return mode === 'create' ? '已创建内容拦截规则。' : '已更新内容拦截规则。';
  }

  if (localeFamily === 'ja') {
    return mode === 'create' ? '遮断ルールを作成しました。' : '遮断ルールを更新しました。';
  }

  return mode === 'create' ? 'Blocklist entry created.' : 'Blocklist entry updated.';
}

export function getSecurityBlocklistSaveError(locale: SecurityLocale) {
  const localeFamily = resolveSecurityLocaleFamily(locale);

  if (localeFamily === 'zh') {
    return '保存内容拦截规则失败。';
  }

  if (localeFamily === 'ja') {
    return '遮断ルールの保存に失敗しました。';
  }

  return 'Failed to save blocklist entry.';
}

export function formatSecurityExternalSaveSuccess(locale: SecurityLocale, mode: 'create' | 'edit') {
  const localeFamily = resolveSecurityLocaleFamily(locale);

  if (localeFamily === 'zh') {
    return mode === 'create' ? '已创建外链拦截规则。' : '已更新外链拦截规则。';
  }

  if (localeFamily === 'ja') {
    return mode === 'create' ? '外部遮断ルールを作成しました。' : '外部遮断ルールを更新しました。';
  }

  return mode === 'create' ? 'External blocklist entry created.' : 'External blocklist entry updated.';
}

export function getSecurityExternalSaveError(locale: SecurityLocale) {
  const localeFamily = resolveSecurityLocaleFamily(locale);

  if (localeFamily === 'zh') {
    return '保存外链拦截规则失败。';
  }

  if (localeFamily === 'ja') {
    return '外部遮断ルールの保存に失敗しました。';
  }

  return 'Failed to save external blocklist entry.';
}

export function formatSecurityDisableSuccess(locale: SecurityLocale, name: string) {
  const localeFamily = resolveSecurityLocaleFamily(locale);

  if (localeFamily === 'zh') {
    return `已在当前层级隐藏 ${name}。`;
  }

  if (localeFamily === 'ja') {
    return `${name} をこの階層で非表示にしました。`;
  }

  return `${name} was hidden at this level.`;
}

export function formatSecurityReEnableSuccess(locale: SecurityLocale, name: string) {
  const localeFamily = resolveSecurityLocaleFamily(locale);

  if (localeFamily === 'zh') {
    return `已在当前层级恢复显示 ${name}。`;
  }

  if (localeFamily === 'ja') {
    return `${name} をこの階層で再表示しました。`;
  }

  return `${name} was restored at this level.`;
}

export function formatSecurityDeleteSuccess(locale: SecurityLocale, name: string) {
  const localeFamily = resolveSecurityLocaleFamily(locale);

  if (localeFamily === 'zh') {
    return `已删除 ${name}。`;
  }

  if (localeFamily === 'ja') {
    return `${name} を削除しました。`;
  }

  return `${name} was deleted.`;
}

export function formatSecurityBlocklistTestResult(locale: SecurityLocale, result: BlocklistTestResult) {
  const localeFamily = resolveSecurityLocaleFamily(locale);

  if (!result.matched) {
    if (localeFamily === 'zh') {
      return '当前示例未命中任何规则。';
    }

    if (localeFamily === 'ja') {
      return '現在のサンプルに一致するルールはありませんでした。';
    }

    return 'No patterns matched the current sample.';
  }

  const action = getSecurityActionLabel(
    locale,
    resolveSecurityAction(result.action || result.matches[0]?.action),
  );

  if (localeFamily === 'zh') {
    return `检测到 ${result.matches.length} 条匹配，生效动作：${action}。`;
  }

  if (localeFamily === 'ja') {
    return `${result.matches.length} 件の一致を検出しました。適用動作: ${action}。`;
  }

  return `${result.matches.length} match(es) detected. Effective action: ${action}.`;
}

export function getSecurityBlocklistTestError(locale: SecurityLocale) {
  const localeFamily = resolveSecurityLocaleFamily(locale);

  if (localeFamily === 'zh') {
    return '测试当前示例与拦截规则失败。';
  }

  if (localeFamily === 'ja') {
    return '現在のサンプルと遮断ルールの照合に失敗しました。';
  }

  return 'Failed to test the current sample against the blocklist.';
}

export function formatSecurityIpRuleCreateSuccess(locale: SecurityLocale) {
  const localeFamily = resolveSecurityLocaleFamily(locale);

  if (localeFamily === 'zh') {
    return '已创建 IP 访问规则。';
  }

  if (localeFamily === 'ja') {
    return 'IP アクセスルールを作成しました。';
  }

  return 'IP access rule created.';
}

export function getSecurityIpRuleCreateError(locale: SecurityLocale) {
  const localeFamily = resolveSecurityLocaleFamily(locale);

  if (localeFamily === 'zh') {
    return '创建 IP 访问规则失败。';
  }

  if (localeFamily === 'ja') {
    return 'IP アクセスルールの作成に失敗しました。';
  }

  return 'Failed to create IP access rule.';
}

export function formatSecurityIpRuleDeleteSuccess(locale: SecurityLocale, pattern: string) {
  const localeFamily = resolveSecurityLocaleFamily(locale);

  if (localeFamily === 'zh') {
    return `已将 ${pattern} 从 IP 访问控制中移除。`;
  }

  if (localeFamily === 'ja') {
    return `${pattern} を IP アクセス制御から削除しました。`;
  }

  return `${pattern} was removed from IP access control.`;
}

export function formatSecurityIpCheckResult(locale: SecurityLocale, result: IpAccessCheckResult) {
  const localeFamily = resolveSecurityLocaleFamily(locale);
  const matchedRuleType = result.matchedRule
    ? getSecurityIpRuleTypeLabel(locale, result.matchedRule.ruleType)
    : null;

  if (result.allowed) {
    if (result.matchedRule && matchedRuleType) {
      if (localeFamily === 'zh') {
        return `已允许，命中 ${matchedRuleType} 规则 ${result.matchedRule.ipPattern}。`;
      }

      if (localeFamily === 'ja') {
        return `許可されました。${matchedRuleType} ルール ${result.matchedRule.ipPattern} が適用されました。`;
      }

      return `Allowed by ${matchedRuleType} rule ${result.matchedRule.ipPattern}.`;
    }

    if (localeFamily === 'zh') {
      return '已允许，未命中任何阻止规则。';
    }

    if (localeFamily === 'ja') {
      return '許可されました。遮断ルールに一致しませんでした。';
    }

    return 'Allowed because no blocking rule matched.';
  }

  if (result.reason) {
    if (localeFamily === 'zh') {
      return `已阻止，原因：${result.reason}。`;
    }

    if (localeFamily === 'ja') {
      return `遮断されました。理由: ${result.reason}。`;
    }

    return `Blocked because ${result.reason}.`;
  }

  if (localeFamily === 'zh') {
    return '已阻止。';
  }

  if (localeFamily === 'ja') {
    return '遮断されました。';
  }

  return 'Blocked.';
}

export function getSecurityIpCheckError(locale: SecurityLocale) {
  const localeFamily = resolveSecurityLocaleFamily(locale);

  if (localeFamily === 'zh') {
    return '评估 IP 访问失败。';
  }

  if (localeFamily === 'ja') {
    return 'IP アクセスの評価に失敗しました。';
  }

  return 'Failed to evaluate IP access.';
}

export function getSecurityMutationError(locale: SecurityLocale) {
  const localeFamily = resolveSecurityLocaleFamily(locale);

  if (localeFamily === 'zh') {
    return '安全修改失败。';
  }

  if (localeFamily === 'ja') {
    return 'セキュリティ変更に失敗しました。';
  }

  return 'Security mutation failed.';
}

export function formatSecurityRuleHits(
  locale: SecurityLocale,
  hitCount: number,
  lastHitAt: string | null | undefined,
) {
  const localeFamily = resolveSecurityLocaleFamily(locale);
  const lastHit = formatSecurityDateTime(locale, lastHitAt, resolveSecurityCopy(locale).common.never);

  if (localeFamily === 'zh') {
    return `${hitCount} 次命中 · 上次命中 ${lastHit}`;
  }

  if (localeFamily === 'ja') {
    return `${hitCount} 件ヒット · 最終ヒット ${lastHit}`;
  }

  return `${hitCount} hits · last hit ${lastHit}`;
}

export function formatSecurityResetIn(locale: SecurityLocale, seconds: number) {
  const localeFamily = resolveSecurityLocaleFamily(locale);

  if (localeFamily === 'zh' || localeFamily === 'ja') {
    return `${seconds} 秒`;
  }

  return `${seconds}s`;
}
