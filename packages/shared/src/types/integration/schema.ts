// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import type { LocalizedText } from '../../constants/locale';

// --- Enums ---
export type AdapterType = 'oauth' | 'api_key' | 'webhook' | 'ai';
export type OwnerType = 'tenant' | 'subsidiary' | 'talent';
export type AiProvider = 'OPENAI' | 'ANTHROPIC' | 'GEMINI';

export type IntegrationLocalizedText = LocalizedText;

export type IntegrationAdapterConfigFieldInput =
  | 'text'
  | 'password'
  | 'url'
  | 'textarea'
  | 'select';

export interface IntegrationAdapterConfigFieldOptionDefinition {
  value: string;
  label: IntegrationLocalizedText;
  description?: IntegrationLocalizedText;
}

export interface IntegrationAdapterConfigFieldDefinition {
  key: string;
  label: IntegrationLocalizedText;
  description?: IntegrationLocalizedText;
  input: IntegrationAdapterConfigFieldInput;
  required: boolean;
  secret: boolean;
  placeholder?: string;
  defaultValue?: string;
  options?: IntegrationAdapterConfigFieldOptionDefinition[];
}

export interface IntegrationAdapterPlatformBindingDefinition {
  code: string;
  displayName: string;
  name: IntegrationLocalizedText;
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
  aiProviders?: IntegrationAdapterAiProviderDefinition[];
}

export interface IntegrationAdapterAiProviderDefinition {
  provider: AiProvider;
  label: IntegrationLocalizedText;
  endpointPathDefault: string;
  modelPlaceholder: string;
  protocol: IntegrationAdapterProtocolDefinition;
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

export type WebhookPiiClass = 'none' | 'reference' | 'limited_pii';

export interface WebhookPayloadEnvelopeDefinition {
  payloadVersion: string;
  producer: string;
  piiClass: WebhookPiiClass;
  retention: string;
  schemaRef: string;
  redactionPolicy: string;
}

export interface WebhookEventCatalogItem {
  event: string;
  eventCode: string;
  name: string;
  label: IntegrationLocalizedText;
  description: string;
  descriptionText: IntegrationLocalizedText;
  category: string;
  definitionKey: string;
  payloadVersion: string;
  producer: string;
  piiClass: WebhookPiiClass;
  retention: string;
  subscriptionEligible: boolean;
  deprecated: boolean;
  schemaRef: string;
  redactionPolicy: string;
}

export interface WebhookDeliveryAdapterCatalogItem {
  code:
    | 'tcrn_webhook_outbox'
    | 'tcrn_local_webhook_dispatcher'
    | 'svix_delivery_provider'
    | 'nats_jetstream_backbone'
    | 'webhook_signature_policy';
  label: string;
  kind: 'built_in_store' | 'built_in_dispatcher' | 'external_provider' | 'stream_readiness' | 'policy';
  phase4Family: 'config_only' | 'webhook_delivery' | 'event_backbone';
  defaultState: 'active_when_feature_enabled' | 'disabled_readiness_only' | 'active_policy';
  ownerPhase: 'phase_7';
  humanUi: boolean;
  ssoRequired: boolean;
  deliveryCapability: string;
  localDevModes: string[];
  noProviderBehavior: string;
  authorityBoundary: string;
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
    { key: 'provider', label: 'Provider', required: true, secret: false },
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

const aiProviderDefinitions: IntegrationAdapterAiProviderDefinition[] = [
  {
    provider: 'OPENAI',
    label: {
      en: 'OpenAI',
      zh_HANS: 'OpenAI',
      zh_HANT: 'OpenAI',
      ja: 'OpenAI',
      ko: 'OpenAI',
      fr: 'OpenAI',
    },
    endpointPathDefault: '/v1/responses',
    modelPlaceholder: 'gpt-example',
    protocol: {
      family: 'openai-responses',
      payloadFormat: 'official-provider-protocol',
      invocationRuntime: 'not_implemented',
      notes: notImplementedProtocolNotes,
    },
  },
  {
    provider: 'ANTHROPIC',
    label: {
      en: 'Anthropic',
      zh_HANS: 'Anthropic',
      zh_HANT: 'Anthropic',
      ja: 'Anthropic',
      ko: 'Anthropic',
      fr: 'Anthropic',
    },
    endpointPathDefault: '/v1/messages',
    modelPlaceholder: 'claude-example',
    protocol: {
      family: 'anthropic-messages',
      payloadFormat: 'official-provider-protocol',
      invocationRuntime: 'not_implemented',
      notes: notImplementedProtocolNotes,
    },
  },
  {
    provider: 'GEMINI',
    label: {
      en: 'Gemini',
      zh_HANS: 'Gemini',
      zh_HANT: 'Gemini',
      ja: 'Gemini',
      ko: 'Gemini',
      fr: 'Gemini',
    },
    endpointPathDefault: '/v1beta/models/{model}:generateContent',
    modelPlaceholder: 'gemini-example',
    protocol: {
      family: 'gemini-generate-content',
      payloadFormat: 'official-provider-protocol',
      invocationRuntime: 'not_implemented',
      notes: notImplementedProtocolNotes,
    },
  },
];

const providerField: IntegrationAdapterConfigFieldDefinition = {
  key: 'provider',
  label: {
    en: 'Provider',
    zh_HANS: '提供商',
    zh_HANT: '供應商',
    ja: 'プロバイダー',
    ko: '제공자',
    fr: 'Fournisseur',
  },
  description: {
    en: 'AI provider selected inside the adapter form. The first version supports token-only connection setup.',
    zh_HANS: '在适配器表单内选择 AI 提供商。第一版仅支持 Token 连接。',
    zh_HANT: '在適配器表單內選擇 AI 供應商。第一版僅支援 Token 連線。',
    ja: 'アダプターフォーム内で選択する AI プロバイダーです。初版はトークン接続のみをサポートします。',
    ko: '어댑터 양식 안에서 선택하는 AI 제공자입니다. 첫 버전은 토큰 연결만 지원합니다.',
    fr: "Fournisseur IA sélectionné dans le formulaire d'adaptateur. La première version prend uniquement en charge la connexion par jeton.",
  },
  input: 'select',
  required: true,
  secret: false,
  defaultValue: 'OPENAI',
  options: aiProviderDefinitions.map((provider) => ({
    value: provider.provider,
    label: provider.label,
  })),
};

const aiAdapterCreateDefinition: IntegrationAdapterDefinition = {
  key: 'ai-adapter',
  code: 'AI_ADAPTER',
  adapterType: 'ai',
  name: {
    en: 'AI Adapter',
    zh_HANS: 'AI 适配器',
    zh_HANT: 'AI 適配器',
    ja: 'AI アダプター',
    ko: 'AI 어댑터',
    fr: 'Adaptateur IA',
  },
  description: {
    en: 'Generic token-only AI provider configuration. Choose OpenAI, Anthropic, or Gemini inside the form. AI invocation is not implemented yet.',
    zh_HANS:
      '通用 Token-only AI 提供商配置。在表单内选择 OpenAI、Anthropic 或 Gemini。当前尚未实现 AI 调用。',
    zh_HANT:
      '通用 Token-only AI 供應商設定。在表單內選擇 OpenAI、Anthropic 或 Gemini。目前尚未實作 AI 呼叫。',
    ja: 'トークン専用の汎用 AI プロバイダー設定です。フォーム内で OpenAI、Anthropic、Gemini を選びます。AI 呼び出しはまだ実装されていません。',
    ko: '토큰 전용 일반 AI 제공자 설정입니다. 양식 안에서 OpenAI, Anthropic 또는 Gemini를 선택합니다. AI 호출은 아직 구현되지 않았습니다.',
    fr: "Configuration générique de fournisseur IA par jeton uniquement. Choisissez OpenAI, Anthropic ou Gemini dans le formulaire. L'appel IA n'est pas encore implémenté.",
  },
  platform: {
    code: 'AI_ADAPTER',
    displayName: 'AI Adapter',
    name: {
      en: 'AI Adapter',
      zh_HANS: 'AI 适配器',
      zh_HANT: 'AI 適配器',
      ja: 'AI アダプター',
      ko: 'AI 어댑터',
      fr: 'Adaptateur IA',
    },
    baseUrl: null,
    iconUrl: null,
    color: '#6366F1',
  },
  configFields: [providerField, endpointPathField, modelField, tokenField],
  protocol: {
    family: 'generic-rest',
    payloadFormat: 'official-provider-protocol',
    invocationRuntime: 'not_implemented',
    notes: notImplementedProtocolNotes,
  },
  capabilities: ['ai_provider_config'],
  aiProviders: aiProviderDefinitions,
};

const LEGACY_INTEGRATION_ADAPTER_DEFINITIONS: IntegrationAdapterDefinition[] = [
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
      name: {
        en: 'Bilibili',
        zh_HANS: '哔哩哔哩',
        zh_HANT: '嗶哩嗶哩',
        ja: 'ビリビリ',
        ko: 'Bilibili',
        fr: 'Bilibili',
      },
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
      name: {
        en: 'YouTube',
        zh_HANS: 'YouTube',
        zh_HANT: 'YouTube',
        ja: 'YouTube',
        ko: 'YouTube',
        fr: 'YouTube',
      },
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
      name: {
        en: 'OpenAI',
        zh_HANS: 'OpenAI',
        zh_HANT: 'OpenAI',
        ja: 'OpenAI',
        ko: 'OpenAI',
        fr: 'OpenAI',
      },
      baseUrl: 'https://api.openai.com',
      iconUrl: null,
      color: '#10A37F',
    },
    configFields: [{ ...endpointPathField, defaultValue: '/v1/responses' }, modelField, tokenField],
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
      name: {
        en: 'Anthropic',
        zh_HANS: 'Anthropic',
        zh_HANT: 'Anthropic',
        ja: 'Anthropic',
        ko: 'Anthropic',
        fr: 'Anthropic',
      },
      baseUrl: 'https://api.anthropic.com',
      iconUrl: null,
      color: '#D97757',
    },
    configFields: [{ ...endpointPathField, defaultValue: '/v1/messages' }, modelField, tokenField],
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
      name: {
        en: 'Gemini',
        zh_HANS: 'Gemini',
        zh_HANT: 'Gemini',
        ja: 'Gemini',
        ko: 'Gemini',
        fr: 'Gemini',
      },
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

export const INTEGRATION_ADAPTER_CREATE_DEFINITIONS: IntegrationAdapterDefinition[] = [
  aiAdapterCreateDefinition,
];

export const INTEGRATION_ADAPTER_DEFINITIONS: IntegrationAdapterDefinition[] = [
  ...INTEGRATION_ADAPTER_CREATE_DEFINITIONS,
  ...LEGACY_INTEGRATION_ADAPTER_DEFINITIONS,
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

const WEBHOOK_PAYLOAD_ENVELOPES: Record<
  string,
  Pick<WebhookPayloadEnvelopeDefinition, 'producer' | 'piiClass' | 'redactionPolicy'>
> = {
  'customer.created': {
    producer: 'customer-profile',
    piiClass: 'reference',
    redactionPolicy: 'customer_reference_only',
  },
  'customer.updated': {
    producer: 'customer-profile',
    piiClass: 'limited_pii',
    redactionPolicy: 'customer_change_summary_only',
  },
  'customer.deactivated': {
    producer: 'customer-profile',
    piiClass: 'reference',
    redactionPolicy: 'customer_reference_only',
  },
  'membership.created': {
    producer: 'membership',
    piiClass: 'reference',
    redactionPolicy: 'membership_reference_only',
  },
  'membership.renewed': {
    producer: 'membership',
    piiClass: 'reference',
    redactionPolicy: 'membership_reference_only',
  },
  'membership.expired': {
    producer: 'membership',
    piiClass: 'reference',
    redactionPolicy: 'membership_reference_only',
  },
  'marshmallow.received': {
    producer: 'marshmallow-moderation',
    piiClass: 'none',
    redactionPolicy: 'public_moderation_safe_payload',
  },
  'marshmallow.approved': {
    producer: 'marshmallow-moderation',
    piiClass: 'none',
    redactionPolicy: 'approved_public_payload_only',
  },
  'report.completed': {
    producer: 'async-job',
    piiClass: 'reference',
    redactionPolicy: 'report_job_reference_only',
  },
  'report.failed': {
    producer: 'async-job',
    piiClass: 'none',
    redactionPolicy: 'error_code_without_stacktrace',
  },
  'import.completed': {
    producer: 'async-job',
    piiClass: 'reference',
    redactionPolicy: 'import_job_reference_only',
  },
  'import.failed': {
    producer: 'async-job',
    piiClass: 'none',
    redactionPolicy: 'error_code_without_row_data',
  },
};

const WEBHOOK_EVENT_LABELS: Record<
  string,
  { label: IntegrationLocalizedText; description: IntegrationLocalizedText }
> = {
  'customer.created': {
    label: {
      en: 'Customer created',
      zh_HANS: '客户已创建',
      zh_HANT: '客戶已建立',
      ja: '顧客が作成されました',
      ko: '고객이 생성됨',
      fr: 'Client créé',
    },
    description: {
      en: 'A customer profile reference was created.',
      zh_HANS: '客户档案引用已创建。',
      zh_HANT: '客戶檔案參照已建立。',
      ja: '顧客プロフィール参照が作成されました。',
      ko: '고객 프로필 참조가 생성되었습니다.',
      fr: 'Une référence de profil client a été créée.',
    },
  },
  'customer.updated': {
    label: {
      en: 'Customer updated',
      zh_HANS: '客户已更新',
      zh_HANT: '客戶已更新',
      ja: '顧客が更新されました',
      ko: '고객이 업데이트됨',
      fr: 'Client mis à jour',
    },
    description: {
      en: 'A customer profile reference or change summary was updated.',
      zh_HANS: '客户档案引用或变更摘要已更新。',
      zh_HANT: '客戶檔案參照或變更摘要已更新。',
      ja: '顧客プロフィール参照または変更概要が更新されました。',
      ko: '고객 프로필 참조 또는 변경 요약이 업데이트되었습니다.',
      fr: 'Une référence de profil client ou un résumé de changement a été mis à jour.',
    },
  },
  'customer.deactivated': {
    label: {
      en: 'Customer deactivated',
      zh_HANS: '客户已停用',
      zh_HANT: '客戶已停用',
      ja: '顧客が停止されました',
      ko: '고객이 비활성화됨',
      fr: 'Client désactivé',
    },
    description: {
      en: 'A customer profile reference was deactivated.',
      zh_HANS: '客户档案引用已停用。',
      zh_HANT: '客戶檔案參照已停用。',
      ja: '顧客プロフィール参照が停止されました。',
      ko: '고객 프로필 참조가 비활성화되었습니다.',
      fr: 'Une référence de profil client a été désactivée.',
    },
  },
  'membership.created': {
    label: {
      en: 'Membership created',
      zh_HANS: '会员已创建',
      zh_HANT: '會員已建立',
      ja: 'メンバーシップが作成されました',
      ko: '멤버십이 생성됨',
      fr: 'Adhésion créée',
    },
    description: {
      en: 'A membership reference was created.',
      zh_HANS: '会员引用已创建。',
      zh_HANT: '會員參照已建立。',
      ja: 'メンバーシップ参照が作成されました。',
      ko: '멤버십 참조가 생성되었습니다.',
      fr: "Une référence d'adhésion a été créée.",
    },
  },
  'membership.renewed': {
    label: {
      en: 'Membership renewed',
      zh_HANS: '会员已续期',
      zh_HANT: '會員已續期',
      ja: 'メンバーシップが更新されました',
      ko: '멤버십이 갱신됨',
      fr: 'Adhésion renouvelée',
    },
    description: {
      en: 'A membership renewal reference was recorded.',
      zh_HANS: '会员续期引用已记录。',
      zh_HANT: '會員續期參照已記錄。',
      ja: 'メンバーシップ更新参照が記録されました。',
      ko: '멤버십 갱신 참조가 기록되었습니다.',
      fr: "Une référence de renouvellement d'adhésion a été enregistrée.",
    },
  },
  'membership.expired': {
    label: {
      en: 'Membership expired',
      zh_HANS: '会员已过期',
      zh_HANT: '會員已過期',
      ja: 'メンバーシップが期限切れになりました',
      ko: '멤버십이 만료됨',
      fr: 'Adhésion expirée',
    },
    description: {
      en: 'A membership expiry reference was recorded.',
      zh_HANS: '会员过期引用已记录。',
      zh_HANT: '會員過期參照已記錄。',
      ja: 'メンバーシップ期限切れ参照が記録されました。',
      ko: '멤버십 만료 참조가 기록되었습니다.',
      fr: "Une référence d'expiration d'adhésion a été enregistrée.",
    },
  },
  'marshmallow.received': {
    label: {
      en: 'Marshmallow received',
      zh_HANS: '棉花糖已收到',
      zh_HANT: '棉花糖已收到',
      ja: 'マシュマロを受信しました',
      ko: '마시멜로 수신됨',
      fr: 'Marshmallow reçu',
    },
    description: {
      en: 'A public moderation-safe marshmallow message was received.',
      zh_HANS: '已收到公开且可安全审核的棉花糖消息。',
      zh_HANT: '已收到公開且可安全審核的棉花糖訊息。',
      ja: '公開かつモデレーション安全なマシュマロメッセージを受信しました。',
      ko: '공개 검토에 안전한 마시멜로 메시지를 수신했습니다.',
      fr: 'Un message Marshmallow public et sûr pour la modération a été reçu.',
    },
  },
  'marshmallow.approved': {
    label: {
      en: 'Marshmallow approved',
      zh_HANS: '棉花糖已通过审核',
      zh_HANT: '棉花糖已通過審核',
      ja: 'マシュマロが承認されました',
      ko: '마시멜로가 승인됨',
      fr: 'Marshmallow approuvé',
    },
    description: {
      en: 'A public marshmallow message was approved.',
      zh_HANS: '公开棉花糖消息已通过审核。',
      zh_HANT: '公開棉花糖訊息已通過審核。',
      ja: '公開マシュマロメッセージが承認されました。',
      ko: '공개 마시멜로 메시지가 승인되었습니다.',
      fr: 'Un message Marshmallow public a été approuvé.',
    },
  },
  'report.completed': {
    label: {
      en: 'Report completed',
      zh_HANS: '报表已完成',
      zh_HANT: '報表已完成',
      ja: 'レポートが完了しました',
      ko: '보고서 완료됨',
      fr: 'Rapport terminé',
    },
    description: {
      en: 'A report job completed; the payload carries a job reference only.',
      zh_HANS: '报表任务已完成；payload 仅包含任务引用。',
      zh_HANT: '報表任務已完成；payload 僅包含任務參照。',
      ja: 'レポートジョブが完了しました。ペイロードにはジョブ参照のみが含まれます。',
      ko: '보고서 작업이 완료되었으며 payload에는 작업 참조만 포함됩니다.',
      fr: 'Une tâche de rapport est terminée ; le payload contient seulement une référence.',
    },
  },
  'report.failed': {
    label: {
      en: 'Report failed',
      zh_HANS: '报表失败',
      zh_HANT: '報表失敗',
      ja: 'レポートが失敗しました',
      ko: '보고서 실패',
      fr: 'Rapport échoué',
    },
    description: {
      en: 'A report job failed; the payload carries status and error code only.',
      zh_HANS: '报表任务失败；payload 仅包含状态和错误代码。',
      zh_HANT: '報表任務失敗；payload 僅包含狀態和錯誤代碼。',
      ja: 'レポートジョブが失敗しました。ペイロードには状態とエラーコードのみが含まれます。',
      ko: '보고서 작업이 실패했으며 payload에는 상태와 오류 코드만 포함됩니다.',
      fr: "Une tâche de rapport a échoué ; le payload contient seulement l'état et le code d'erreur.",
    },
  },
  'import.completed': {
    label: {
      en: 'Import completed',
      zh_HANS: '导入已完成',
      zh_HANT: '匯入已完成',
      ja: 'インポートが完了しました',
      ko: '가져오기 완료됨',
      fr: 'Import terminé',
    },
    description: {
      en: 'An import job completed; the payload carries a job reference only.',
      zh_HANS: '导入任务已完成；payload 仅包含任务引用。',
      zh_HANT: '匯入任務已完成；payload 僅包含任務參照。',
      ja: 'インポートジョブが完了しました。ペイロードにはジョブ参照のみが含まれます。',
      ko: '가져오기 작업이 완료되었으며 payload에는 작업 참조만 포함됩니다.',
      fr: "Une tâche d'import est terminée ; le payload contient seulement une référence.",
    },
  },
  'import.failed': {
    label: {
      en: 'Import failed',
      zh_HANS: '导入失败',
      zh_HANT: '匯入失敗',
      ja: 'インポートが失敗しました',
      ko: '가져오기 실패',
      fr: 'Import échoué',
    },
    description: {
      en: 'An import job failed; the payload carries status and error code only.',
      zh_HANS: '导入任务失败；payload 仅包含状态和错误代码。',
      zh_HANT: '匯入任務失敗；payload 僅包含狀態和錯誤代碼。',
      ja: 'インポートジョブが失敗しました。ペイロードには状態とエラーコードのみが含まれます。',
      ko: '가져오기 작업이 실패했으며 payload에는 상태와 오류 코드만 포함됩니다.',
      fr: "Une tâche d'import a échoué ; le payload contient seulement l'état et le code d'erreur.",
    },
  },
};

export const WEBHOOK_EVENT_CATALOG: WebhookEventCatalogItem[] =
  INTEGRATION_WEBHOOK_DEFINITIONS.flatMap((definition) =>
    definition.events.map((event) => {
      const envelope = WEBHOOK_PAYLOAD_ENVELOPES[event];
      const text = WEBHOOK_EVENT_LABELS[event];

      if (!envelope || !text) {
        throw new Error(`Webhook event '${event}' is missing TCRN-owned catalog metadata`);
      }

      return {
        event,
        eventCode: event,
        name: text.label.en,
        label: text.label,
        description: text.description.en,
        descriptionText: text.description,
        category: event.split('.')[0],
        definitionKey: definition.key,
        payloadVersion: 'v1',
        producer: envelope.producer,
        piiClass: envelope.piiClass,
        retention: 'delivery_log_redacted_30d',
        subscriptionEligible: true,
        deprecated: false,
        schemaRef: `webhook.payload.${event}.v1`,
        redactionPolicy: envelope.redactionPolicy,
      };
    })
  );

export function getWebhookEventCatalogItem(eventCode: string | undefined) {
  return WEBHOOK_EVENT_CATALOG.find((item) => item.eventCode === eventCode);
}

export const WEBHOOK_DELIVERY_ADAPTER_CATALOG: WebhookDeliveryAdapterCatalogItem[] = [
  {
    code: 'tcrn_webhook_outbox',
    label: 'TCRN Webhook Outbox',
    kind: 'built_in_store',
    phase4Family: 'config_only',
    defaultState: 'active_when_feature_enabled',
    ownerPhase: 'phase_7',
    humanUi: false,
    ssoRequired: false,
    deliveryCapability: 'Durable event enqueue, idempotency, delivery state, DLQ, and replay source.',
    localDevModes: ['disabled', 'local-stub', 'test-fixture', 'local-dispatch'],
    noProviderBehavior: 'Stores outbox and attempt state without outbound HTTP by default.',
    authorityBoundary:
      'Owns TCRN delivery state, idempotency, replay source, and audit without creating business events.',
  },
  {
    code: 'tcrn_local_webhook_dispatcher',
    label: 'TCRN Local Webhook Dispatcher',
    kind: 'built_in_dispatcher',
    phase4Family: 'config_only',
    defaultState: 'disabled_readiness_only',
    ownerPhase: 'phase_7',
    humanUi: false,
    ssoRequired: false,
    deliveryCapability: 'Executes HTTP delivery from TCRN outbox in explicit local or self-hosted modes.',
    localDevModes: ['disabled', 'local-stub', 'local-dispatch', 'test-fixture'],
    noProviderBehavior: 'No outbound HTTP unless the dispatch mode explicitly enables it.',
    authorityBoundary:
      'Executes mechanics only; TCRN event catalog and subscriptions remain authoritative.',
  },
  {
    code: 'svix_delivery_provider',
    label: 'Svix-like Webhook Delivery Provider',
    kind: 'external_provider',
    phase4Family: 'webhook_delivery',
    defaultState: 'disabled_readiness_only',
    ownerPhase: 'phase_7',
    humanUi: true,
    ssoRequired: true,
    deliveryCapability: 'Optional provider-backed HTTP delivery, retries, signing, replay, and status mirroring.',
    localDevModes: ['disabled', 'stubbed', 'external-provided'],
    noProviderBehavior: 'No remote calls; TCRN outbox remains pending or locally stubbed.',
    authorityBoundary:
      'Provider endpoint apps may mirror TCRN subscriptions only and cannot authorize events or tenants.',
  },
  {
    code: 'nats_jetstream_backbone',
    label: 'NATS JetStream Event Backbone',
    kind: 'stream_readiness',
    phase4Family: 'event_backbone',
    defaultState: 'disabled_readiness_only',
    ownerPhase: 'phase_7',
    humanUi: false,
    ssoRequired: false,
    deliveryCapability:
      'Readiness and classification only in Phase 7; stream bridge delivery is deferred to Phase 8.',
    localDevModes: ['disabled', 'local-stub', 'external-provided'],
    noProviderBehavior: 'No stream dependency; event producers write TCRN outbox or fixture no-op only.',
    authorityBoundary:
      'NATS subjects, streams, and consumers cannot define business events or subscription authorization in Phase 7.',
  },
  {
    code: 'webhook_signature_policy',
    label: 'Webhook Signature Policy',
    kind: 'policy',
    phase4Family: 'config_only',
    defaultState: 'active_policy',
    ownerPhase: 'phase_7',
    humanUi: false,
    ssoRequired: false,
    deliveryCapability: 'HMAC timestamp, payload hash, replay-window, and rotation policy.',
    localDevModes: ['always-available'],
    noProviderBehavior: 'Delivery fails closed when signing material is required but missing.',
    authorityBoundary:
      'TCRN owns signing and replay rules; provider tokens and secrets are never exposed to ordinary tenants.',
  },
];

export function getIntegrationAdapterDefinition(key: string | undefined) {
  return INTEGRATION_ADAPTER_DEFINITIONS.find((definition) => definition.key === key);
}

export function getIntegrationAdapterCreateDefinition(key: string | undefined) {
  return INTEGRATION_ADAPTER_CREATE_DEFINITIONS.find((definition) => definition.key === key);
}

export function getIntegrationWebhookDefinition(key: string | undefined) {
  return INTEGRATION_WEBHOOK_DEFINITIONS.find((definition) => definition.key === key);
}
