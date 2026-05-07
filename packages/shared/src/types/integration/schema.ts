// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

// --- Enums ---
export type AdapterType = 'oauth' | 'api_key' | 'webhook' | 'ai';
export type OwnerType = 'tenant' | 'subsidiary' | 'talent';
export type AiProvider = 'OPENAI' | 'ANTHROPIC' | 'GEMINI';

export interface IntegrationLocalizedText {
  en: string;
  zh_HANS: string;
  zh_HANT: string;
  ja: string;
  ko: string;
  fr: string;
}

export type IntegrationAdapterConfigFieldInput =
  | 'text'
  | 'password'
  | 'url'
  | 'textarea';

export interface IntegrationAdapterConfigFieldDefinition {
  key: string;
  label: IntegrationLocalizedText;
  description?: IntegrationLocalizedText;
  input: IntegrationAdapterConfigFieldInput;
  required: boolean;
  secret: boolean;
  placeholder?: string;
  defaultValue?: string;
}

export interface IntegrationAdapterPlatformBindingDefinition {
  code: string;
  displayName: string;
  nameEn: string;
  nameZh?: string;
  nameJa?: string;
  baseUrl?: string | null;
  iconUrl?: string | null;
  color?: string | null;
}

export interface IntegrationAdapterProtocolDefinition {
  family:
    | 'generic-rest'
    | 'oauth2'
    | 'outbound-webhook'
    | 'openai-responses'
    | 'anthropic-messages'
    | 'gemini-generate-content';
  payloadFormat: 'generic-rest' | 'oauth2' | 'official-provider-protocol';
  invocationRuntime: 'not_implemented';
  notes: IntegrationLocalizedText;
}

export interface IntegrationAdapterDefinition {
  key: string;
  code: string;
  adapterType: AdapterType;
  name: IntegrationLocalizedText;
  description: IntegrationLocalizedText;
  platform: IntegrationAdapterPlatformBindingDefinition;
  aiProvider?: AiProvider;
  configFields: IntegrationAdapterConfigFieldDefinition[];
  protocol: IntegrationAdapterProtocolDefinition;
  capabilities: Array<'outbound_api' | 'oauth_login' | 'webhook_delivery' | 'ai_provider_config'>;
}

export interface IntegrationWebhookDefinition {
  key: string;
  code: string;
  name: IntegrationLocalizedText;
  description: IntegrationLocalizedText;
  events: string[];
  defaultHeaders?: Record<string, string>;
  defaultRetryPolicy?: {
    maxRetries: number;
    backoffMs: number;
  };
}

// --- Adapter ---
export interface IntegrationAdapter {
  id: string;
  owner_type: OwnerType;
  owner_id: string | null;
  owner_name?: string;
  platform: {
    id: string;
    code: string;
    name: string;
    icon_url?: string;
  };
  definition_key?: string;
  code: string;
  name: string;
  adapter_type: AdapterType;
  inherit: boolean;
  is_active: boolean;
  is_inherited: boolean;
  is_disabled_here: boolean;
  can_disable: boolean;
  config_count: number;
  configs?: AdapterConfig[];
  updated_at: string;
}

export interface AdapterConfig {
  id: string;
  config_key: string;
  config_value: string;
  is_secret: boolean;
}

export type AdapterConfigMutation = 'keep' | 'replace' | 'clear';

export interface AdapterConfigMutationInput {
  configKey: string;
  mutation?: AdapterConfigMutation;
  configValue?: string;
}

// --- Webhook ---
export interface Webhook {
  id: string;
  code: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  last_triggered_at?: string;
  last_status?: number; // 200, 500, etc.
  consecutive_failures: number;
  definition_key?: string;
  created_at: string;
}

export interface WebhookEventDefinition {
  event: string;
  name: string;
  description: string;
  category: string;
}

// --- Consumer ---
export interface Consumer {
  id: string;
  code: string;
  name: string;
  api_key_prefix: string;
  is_active: boolean;
  allowed_ips?: string[];
  created_at: string;
}

// --- Config Definitions ---
export const ADAPTER_CONFIG_KEYS = {
  oauth: [
    { key: 'client_id', label: 'Client ID', required: true, secret: false },
    { key: 'client_secret', label: 'Client Secret', required: true, secret: true },
    { key: 'scopes', label: 'Scopes', required: false, secret: false },
    { key: 'redirect_uri', label: 'Redirect URI', required: false, secret: false },
  ],
  api_key: [
    { key: 'api_key', label: 'API Key', required: true, secret: true },
    { key: 'endpoint_url', label: 'Endpoint URL', required: false, secret: false },
  ],
  ai: [
    { key: 'endpoint_path', label: 'Endpoint Path', required: true, secret: false },
    { key: 'model', label: 'Model', required: true, secret: false },
    { key: 'token', label: 'Token', required: true, secret: true },
  ],
};

const notImplementedProtocolNotes: IntegrationLocalizedText = {
  en: 'This definition stores provider configuration only. AI invocation is intentionally not implemented in this package.',
  zh_HANS: '此定义只存储提供商配置。本包不会实现 AI 调用能力。',
  zh_HANT: '此定義只儲存供應商設定。本包不會實作 AI 呼叫能力。',
  ja: 'この定義はプロバイダー設定のみを保存します。このパッケージでは AI 呼び出しは実装しません。',
  ko: '이 정의는 제공자 설정만 저장합니다. 이 패키지에서는 AI 호출을 구현하지 않습니다.',
  fr: "Cette définition stocke seulement la configuration du fournisseur. L'appel IA n'est pas implémenté dans ce package.",
};

const tokenFieldLabel: IntegrationLocalizedText = {
  en: 'Token',
  zh_HANS: 'Token',
  zh_HANT: 'Token',
  ja: 'トークン',
  ko: '토큰',
  fr: 'Jeton',
};

const tokenFieldDescription: IntegrationLocalizedText = {
  en: 'Provider API token. It is stored as a secret and is never used for provider calls in this slice.',
  zh_HANS: '提供商 API Token。它会作为密钥存储，本切片不会用它调用提供商。',
  zh_HANT: '供應商 API Token。它會作為密鑰儲存，本切片不會用它呼叫供應商。',
  ja: 'プロバイダー API トークンです。シークレットとして保存され、このスライスではプロバイダー呼び出しには使いません。',
  ko: '제공자 API 토큰입니다. 시크릿으로 저장되며 이 슬라이스에서는 제공자 호출에 사용하지 않습니다.',
  fr: "Jeton API du fournisseur. Il est stocké comme secret et n'est jamais utilisé pour appeler le fournisseur dans cette tranche.",
};

const endpointPathField: IntegrationAdapterConfigFieldDefinition = {
  key: 'endpoint_path',
  label: {
    en: 'Endpoint path',
    zh_HANS: 'Endpoint 路径',
    zh_HANT: 'Endpoint 路徑',
    ja: 'エンドポイントパス',
    ko: '엔드포인트 경로',
    fr: 'Chemin endpoint',
  },
  description: {
    en: 'Editable provider endpoint path. Keep the official protocol family semantics.',
    zh_HANS: '可编辑的提供商 endpoint 路径。保留官方协议族语义。',
    zh_HANT: '可編輯的供應商 endpoint 路徑。保留官方協議族語意。',
    ja: '編集可能なプロバイダーエンドポイントパスです。公式プロトコルファミリーの意味を維持します。',
    ko: '편집 가능한 제공자 엔드포인트 경로입니다. 공식 프로토콜 계열 의미를 유지합니다.',
    fr: 'Chemin endpoint fournisseur modifiable. Conserve la sémantique de la famille de protocole officielle.',
  },
  input: 'text',
  required: true,
  secret: false,
};

const modelField: IntegrationAdapterConfigFieldDefinition = {
  key: 'model',
  label: {
    en: 'Model',
    zh_HANS: '模型',
    zh_HANT: '模型',
    ja: 'モデル',
    ko: '모델',
    fr: 'Modèle',
  },
  description: {
    en: 'Default model identifier for future use. It is not invoked by this package yet.',
    zh_HANS: '预留给未来使用的默认模型标识。本包暂不调用它。',
    zh_HANT: '預留給未來使用的預設模型識別。本包暫不呼叫它。',
    ja: '将来利用するための既定モデル ID です。このパッケージではまだ呼び出しません。',
    ko: '향후 사용을 위한 기본 모델 식별자입니다. 이 패키지는 아직 호출하지 않습니다.',
    fr: "Identifiant de modèle par défaut pour un usage futur. Ce package ne l'appelle pas encore.",
  },
  input: 'text',
  required: true,
  secret: false,
};

const tokenField: IntegrationAdapterConfigFieldDefinition = {
  key: 'token',
  label: tokenFieldLabel,
  description: tokenFieldDescription,
  input: 'password',
  required: true,
  secret: true,
};

export const INTEGRATION_ADAPTER_DEFINITIONS: IntegrationAdapterDefinition[] = [
  {
    key: 'bilibili-api-key',
    code: 'BILIBILI_API',
    adapterType: 'api_key',
    name: {
      en: 'Bilibili API adapter',
      zh_HANS: 'Bilibili API 适配器',
      zh_HANT: 'Bilibili API 適配器',
      ja: 'Bilibili API アダプター',
      ko: 'Bilibili API 어댑터',
      fr: 'Adaptateur API Bilibili',
    },
    description: {
      en: 'Developer-supported outbound API key adapter for Bilibili integrations.',
      zh_HANS: '开发者支持的 Bilibili 出站 API Key 适配器。',
      zh_HANT: '開發者支援的 Bilibili 出站 API Key 適配器。',
      ja: '開発者がサポートする Bilibili 連携向けアウトバウンド API キーアダプターです。',
      ko: '개발자가 지원하는 Bilibili 통합용 아웃바운드 API Key 어댑터입니다.',
      fr: 'Adaptateur API key sortant Bilibili pris en charge par les développeurs.',
    },
    platform: {
      code: 'BILIBILI',
      displayName: 'Bilibili',
      nameEn: 'Bilibili',
      nameZh: '哔哩哔哩',
      nameJa: 'ビリビリ',
      baseUrl: 'https://www.bilibili.com',
      iconUrl: '/icons/platforms/bilibili.svg',
      color: '#00A1D6',
    },
    configFields: [
      {
        key: 'api_key',
        label: {
          en: 'API key',
          zh_HANS: 'API Key',
          zh_HANT: 'API Key',
          ja: 'API キー',
          ko: 'API 키',
          fr: 'Clé API',
        },
        input: 'password',
        required: true,
        secret: true,
      },
      {
        key: 'endpoint_url',
        label: {
          en: 'Endpoint URL',
          zh_HANS: 'Endpoint URL',
          zh_HANT: 'Endpoint URL',
          ja: 'エンドポイント URL',
          ko: '엔드포인트 URL',
          fr: 'URL endpoint',
        },
        input: 'url',
        required: false,
        secret: false,
        defaultValue: 'https://api.bilibili.com',
      },
    ],
    protocol: {
      family: 'generic-rest',
      payloadFormat: 'generic-rest',
      invocationRuntime: 'not_implemented',
      notes: notImplementedProtocolNotes,
    },
    capabilities: ['outbound_api'],
  },
  {
    key: 'youtube-oauth',
    code: 'YOUTUBE_OAUTH',
    adapterType: 'oauth',
    name: {
      en: 'YouTube OAuth adapter',
      zh_HANS: 'YouTube OAuth 适配器',
      zh_HANT: 'YouTube OAuth 適配器',
      ja: 'YouTube OAuth アダプター',
      ko: 'YouTube OAuth 어댑터',
      fr: 'Adaptateur OAuth YouTube',
    },
    description: {
      en: 'Developer-supported OAuth client adapter for YouTube integrations.',
      zh_HANS: '开发者支持的 YouTube OAuth Client 适配器。',
      zh_HANT: '開發者支援的 YouTube OAuth Client 適配器。',
      ja: '開発者がサポートする YouTube 連携向け OAuth クライアントアダプターです。',
      ko: '개발자가 지원하는 YouTube 통합용 OAuth 클라이언트 어댑터입니다.',
      fr: 'Adaptateur client OAuth YouTube pris en charge par les développeurs.',
    },
    platform: {
      code: 'YOUTUBE',
      displayName: 'YouTube',
      nameEn: 'YouTube',
      nameZh: 'YouTube',
      nameJa: 'YouTube',
      baseUrl: 'https://www.youtube.com',
      iconUrl: '/icons/platforms/youtube.svg',
      color: '#FF0000',
    },
    configFields: [
      {
        key: 'client_id',
        label: {
          en: 'Client ID',
          zh_HANS: 'Client ID',
          zh_HANT: 'Client ID',
          ja: 'クライアント ID',
          ko: '클라이언트 ID',
          fr: 'Client ID',
        },
        input: 'text',
        required: true,
        secret: false,
      },
      {
        key: 'client_secret',
        label: {
          en: 'Client Secret',
          zh_HANS: 'Client Secret',
          zh_HANT: 'Client Secret',
          ja: 'クライアントシークレット',
          ko: '클라이언트 시크릿',
          fr: 'Secret client',
        },
        input: 'password',
        required: true,
        secret: true,
      },
      {
        key: 'scopes',
        label: {
          en: 'Scopes',
          zh_HANS: 'Scopes',
          zh_HANT: 'Scopes',
          ja: 'スコープ',
          ko: '스코프',
          fr: 'Scopes',
        },
        input: 'text',
        required: false,
        secret: false,
      },
      {
        key: 'redirect_uri',
        label: {
          en: 'Redirect URI',
          zh_HANS: 'Redirect URI',
          zh_HANT: 'Redirect URI',
          ja: 'リダイレクト URI',
          ko: '리디렉션 URI',
          fr: 'URI de redirection',
        },
        input: 'url',
        required: false,
        secret: false,
      },
    ],
    protocol: {
      family: 'oauth2',
      payloadFormat: 'oauth2',
      invocationRuntime: 'not_implemented',
      notes: notImplementedProtocolNotes,
    },
    capabilities: ['oauth_login'],
  },
  {
    key: 'openai-ai',
    code: 'OPENAI_AI',
    adapterType: 'ai',
    aiProvider: 'OPENAI',
    name: {
      en: 'OpenAI AI Adapter',
      zh_HANS: 'OpenAI AI 适配器',
      zh_HANT: 'OpenAI AI 適配器',
      ja: 'OpenAI AI アダプター',
      ko: 'OpenAI AI 어댑터',
      fr: 'Adaptateur IA OpenAI',
    },
    description: {
      en: 'Generic OpenAI provider configuration using token authentication. No AI calls are executed yet.',
      zh_HANS: '使用 Token 认证的通用 OpenAI 提供商配置。当前不会执行 AI 调用。',
      zh_HANT: '使用 Token 認證的通用 OpenAI 供應商設定。目前不會執行 AI 呼叫。',
      ja: 'トークン認証を使う汎用 OpenAI プロバイダー設定です。AI 呼び出しはまだ実行しません。',
      ko: '토큰 인증을 사용하는 일반 OpenAI 제공자 설정입니다. 아직 AI 호출은 실행하지 않습니다.',
      fr: "Configuration fournisseur OpenAI générique avec authentification par jeton. Aucun appel IA n'est exécuté pour l'instant.",
    },
    platform: {
      code: 'OPENAI',
      displayName: 'OpenAI',
      nameEn: 'OpenAI',
      baseUrl: 'https://api.openai.com',
      iconUrl: null,
      color: '#10A37F',
    },
    configFields: [
      { ...endpointPathField, defaultValue: '/v1/responses' },
      modelField,
      tokenField,
    ],
    protocol: {
      family: 'openai-responses',
      payloadFormat: 'official-provider-protocol',
      invocationRuntime: 'not_implemented',
      notes: notImplementedProtocolNotes,
    },
    capabilities: ['ai_provider_config'],
  },
  {
    key: 'anthropic-ai',
    code: 'ANTHROPIC_AI',
    adapterType: 'ai',
    aiProvider: 'ANTHROPIC',
    name: {
      en: 'Anthropic AI Adapter',
      zh_HANS: 'Anthropic AI 适配器',
      zh_HANT: 'Anthropic AI 適配器',
      ja: 'Anthropic AI アダプター',
      ko: 'Anthropic AI 어댑터',
      fr: 'Adaptateur IA Anthropic',
    },
    description: {
      en: 'Generic Anthropic provider configuration using token authentication. No AI calls are executed yet.',
      zh_HANS: '使用 Token 认证的通用 Anthropic 提供商配置。当前不会执行 AI 调用。',
      zh_HANT: '使用 Token 認證的通用 Anthropic 供應商設定。目前不會執行 AI 呼叫。',
      ja: 'トークン認証を使う汎用 Anthropic プロバイダー設定です。AI 呼び出しはまだ実行しません。',
      ko: '토큰 인증을 사용하는 일반 Anthropic 제공자 설정입니다. 아직 AI 호출은 실행하지 않습니다.',
      fr: "Configuration fournisseur Anthropic générique avec authentification par jeton. Aucun appel IA n'est exécuté pour l'instant.",
    },
    platform: {
      code: 'ANTHROPIC',
      displayName: 'Anthropic',
      nameEn: 'Anthropic',
      baseUrl: 'https://api.anthropic.com',
      iconUrl: null,
      color: '#D97757',
    },
    configFields: [
      { ...endpointPathField, defaultValue: '/v1/messages' },
      modelField,
      tokenField,
    ],
    protocol: {
      family: 'anthropic-messages',
      payloadFormat: 'official-provider-protocol',
      invocationRuntime: 'not_implemented',
      notes: notImplementedProtocolNotes,
    },
    capabilities: ['ai_provider_config'],
  },
  {
    key: 'gemini-ai',
    code: 'GEMINI_AI',
    adapterType: 'ai',
    aiProvider: 'GEMINI',
    name: {
      en: 'Gemini AI Adapter',
      zh_HANS: 'Gemini AI 适配器',
      zh_HANT: 'Gemini AI 適配器',
      ja: 'Gemini AI アダプター',
      ko: 'Gemini AI 어댑터',
      fr: 'Adaptateur IA Gemini',
    },
    description: {
      en: 'Generic Gemini provider configuration using token authentication. No AI calls are executed yet.',
      zh_HANS: '使用 Token 认证的通用 Gemini 提供商配置。当前不会执行 AI 调用。',
      zh_HANT: '使用 Token 認證的通用 Gemini 供應商設定。目前不會執行 AI 呼叫。',
      ja: 'トークン認証を使う汎用 Gemini プロバイダー設定です。AI 呼び出しはまだ実行しません。',
      ko: '토큰 인증을 사용하는 일반 Gemini 제공자 설정입니다. 아직 AI 호출은 실행하지 않습니다.',
      fr: "Configuration fournisseur Gemini générique avec authentification par jeton. Aucun appel IA n'est exécuté pour l'instant.",
    },
    platform: {
      code: 'GEMINI',
      displayName: 'Gemini',
      nameEn: 'Gemini',
      baseUrl: 'https://generativelanguage.googleapis.com',
      iconUrl: null,
      color: '#4285F4',
    },
    configFields: [
      { ...endpointPathField, defaultValue: '/v1beta/models/{model}:generateContent' },
      modelField,
      tokenField,
    ],
    protocol: {
      family: 'gemini-generate-content',
      payloadFormat: 'official-provider-protocol',
      invocationRuntime: 'not_implemented',
      notes: notImplementedProtocolNotes,
    },
    capabilities: ['ai_provider_config'],
  },
];

export const INTEGRATION_WEBHOOK_DEFINITIONS: IntegrationWebhookDefinition[] = [
  {
    key: 'customer-lifecycle',
    code: 'CUSTOMER_LIFECYCLE',
    name: {
      en: 'Customer lifecycle webhook',
      zh_HANS: '客户生命周期 Webhook',
      zh_HANT: '客戶生命週期 Webhook',
      ja: '顧客ライフサイクル Webhook',
      ko: '고객 라이프사이클 Webhook',
      fr: 'Webhook cycle de vie client',
    },
    description: {
      en: 'Receives customer create, update, and deactivate events.',
      zh_HANS: '接收客户创建、更新与停用事件。',
      zh_HANT: '接收客戶建立、更新與停用事件。',
      ja: '顧客の作成、更新、停止イベントを受信します。',
      ko: '고객 생성, 업데이트, 비활성화 이벤트를 수신합니다.',
      fr: 'Reçoit les événements de création, mise à jour et désactivation client.',
    },
    events: ['customer.created', 'customer.updated', 'customer.deactivated'],
    defaultRetryPolicy: { maxRetries: 3, backoffMs: 1000 },
  },
  {
    key: 'membership-lifecycle',
    code: 'MEMBERSHIP_LIFECYCLE',
    name: {
      en: 'Membership lifecycle webhook',
      zh_HANS: '会员生命周期 Webhook',
      zh_HANT: '會員生命週期 Webhook',
      ja: 'メンバーシップライフサイクル Webhook',
      ko: '멤버십 라이프사이클 Webhook',
      fr: 'Webhook cycle de vie adhésion',
    },
    description: {
      en: 'Receives membership create, renew, and expire events.',
      zh_HANS: '接收会员创建、续期与过期事件。',
      zh_HANT: '接收會員建立、續期與過期事件。',
      ja: 'メンバーシップの作成、更新、期限切れイベントを受信します。',
      ko: '멤버십 생성, 갱신, 만료 이벤트를 수신합니다.',
      fr: "Reçoit les événements de création, renouvellement et expiration d'adhésion.",
    },
    events: ['membership.created', 'membership.renewed', 'membership.expired'],
    defaultRetryPolicy: { maxRetries: 3, backoffMs: 1000 },
  },
  {
    key: 'marshmallow-moderation',
    code: 'MARSHMALLOW_MODERATION',
    name: {
      en: 'Marshmallow moderation webhook',
      zh_HANS: '棉花糖审核 Webhook',
      zh_HANT: '棉花糖審核 Webhook',
      ja: 'マシュマロモデレーション Webhook',
      ko: '마시멜로 검토 Webhook',
      fr: 'Webhook modération Marshmallow',
    },
    description: {
      en: 'Receives public marshmallow received and approved events.',
      zh_HANS: '接收公开棉花糖收到与审核通过事件。',
      zh_HANT: '接收公開棉花糖收到與審核通過事件。',
      ja: '公開マシュマロの受信および承認イベントを受信します。',
      ko: '공개 마시멜로 수신 및 승인 이벤트를 수신합니다.',
      fr: 'Reçoit les événements Marshmallow reçu et approuvé.',
    },
    events: ['marshmallow.received', 'marshmallow.approved'],
    defaultRetryPolicy: { maxRetries: 3, backoffMs: 1000 },
  },
  {
    key: 'async-job-status',
    code: 'ASYNC_JOB_STATUS',
    name: {
      en: 'Async job status webhook',
      zh_HANS: '异步任务状态 Webhook',
      zh_HANT: '非同步任務狀態 Webhook',
      ja: '非同期ジョブ状態 Webhook',
      ko: '비동기 작업 상태 Webhook',
      fr: 'Webhook statut des tâches asynchrones',
    },
    description: {
      en: 'Receives report and import completion/failure events.',
      zh_HANS: '接收报表与导入完成/失败事件。',
      zh_HANT: '接收報表與匯入完成/失敗事件。',
      ja: 'レポートとインポートの完了・失敗イベントを受信します。',
      ko: '보고서 및 가져오기 완료/실패 이벤트를 수신합니다.',
      fr: "Reçoit les événements de fin ou d'échec des rapports et imports.",
    },
    events: ['report.completed', 'report.failed', 'import.completed', 'import.failed'],
    defaultRetryPolicy: { maxRetries: 3, backoffMs: 1000 },
  },
];

export function getIntegrationAdapterDefinition(key: string | undefined) {
  return INTEGRATION_ADAPTER_DEFINITIONS.find((definition) => definition.key === key);
}

export function getIntegrationWebhookDefinition(key: string | undefined) {
  return INTEGRATION_WEBHOOK_DEFINITIONS.find((definition) => definition.key === key);
}
