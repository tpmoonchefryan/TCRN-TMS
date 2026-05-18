import { SUPPORTED_UI_LOCALES, type IntegrationAdapterDefinition } from '@tcrn/shared';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InterfaceAddAdapterScreen } from '@/domains/interface-management/screens/InterfaceAddAdapterScreen';
import type { SupportedUiLocale } from '@tcrn/shared';

const mockRequest = vi.fn();
const mockReplace = vi.fn();
let searchQuery = 'ownerType=subsidiary&ownerId=sub-1';
const localeState = {
  locale: 'en' as SupportedUiLocale,
  copy: null,
  setLocale: vi.fn(),
  availableLocales: [...SUPPORTED_UI_LOCALES],
};

const localizedText = {
  en: 'AI Adapter',
  zh_HANS: 'AI 适配器',
  zh_HANT: 'AI 適配器',
  ja: 'AI アダプター',
  ko: 'AI 어댑터',
  fr: 'Adaptateur IA',
};

const aiAdapterDefinition: IntegrationAdapterDefinition = {
  key: 'ai-adapter',
  code: 'AI_ADAPTER',
  adapterType: 'ai',
  name: localizedText,
  description: {
    en: 'Generic token-only AI provider configuration.',
    zh_HANS: '通用 Token-only AI 提供商配置。',
    zh_HANT: '通用 Token-only AI 供應商設定。',
    ja: 'トークン専用の汎用 AI プロバイダー設定です。',
    ko: '토큰 전용 일반 AI 제공자 설정입니다.',
    fr: 'Configuration générique de fournisseur IA par jeton uniquement.',
  },
  platform: {
    code: 'AI_ADAPTER',
    displayName: 'AI Adapter',
    name: localizedText,
  },
  configFields: [
    {
      key: 'provider',
      label: {
        en: 'Provider',
        zh_HANS: '提供商',
        zh_HANT: '供應商',
        ja: 'プロバイダー',
        ko: '제공자',
        fr: 'Fournisseur',
      },
      input: 'select',
      required: true,
      secret: false,
      options: [
        { value: 'OPENAI', label: { ...localizedText, en: 'OpenAI' } },
        { value: 'ANTHROPIC', label: { ...localizedText, en: 'Anthropic' } },
        { value: 'GEMINI', label: { ...localizedText, en: 'Gemini' } },
      ],
    },
    {
      key: 'endpoint_path',
      label: {
        en: 'Endpoint path',
        zh_HANS: 'Endpoint 路径',
        zh_HANT: 'Endpoint 路徑',
        ja: 'エンドポイントパス',
        ko: '엔드포인트 경로',
        fr: 'Chemin endpoint',
      },
      input: 'text',
      required: true,
      secret: false,
    },
    {
      key: 'model',
      label: {
        en: 'Model',
        zh_HANS: '模型',
        zh_HANT: '模型',
        ja: 'モデル',
        ko: '모델',
        fr: 'Modèle',
      },
      input: 'text',
      required: true,
      secret: false,
    },
    {
      key: 'token',
      label: {
        en: 'Token',
        zh_HANS: 'Token',
        zh_HANT: 'Token',
        ja: 'トークン',
        ko: '토큰',
        fr: 'Jeton',
      },
      input: 'password',
      required: true,
      secret: true,
    },
  ],
  protocol: {
    family: 'generic-rest',
    payloadFormat: 'official-provider-protocol',
    invocationRuntime: 'not_implemented',
    notes: {
      en: 'Provider configuration only.',
      zh_HANS: '仅提供商配置。',
      zh_HANT: '僅供應商設定。',
      ja: 'プロバイダー設定のみ。',
      ko: '제공자 설정만.',
      fr: 'Configuration fournisseur uniquement.',
    },
  },
  capabilities: ['ai_provider_config'],
  aiProviders: [
    {
      provider: 'OPENAI',
      label: { ...localizedText, en: 'OpenAI' },
      endpointPathDefault: '/v1/responses',
      modelPlaceholder: 'gpt-example',
      protocol: {
        family: 'openai-responses',
        payloadFormat: 'official-provider-protocol',
        invocationRuntime: 'not_implemented',
        notes: {
          en: 'Provider configuration only.',
          zh_HANS: '仅提供商配置。',
          zh_HANT: '僅供應商設定。',
          ja: 'プロバイダー設定のみ。',
          ko: '제공자 설정만.',
          fr: 'Configuration fournisseur uniquement.',
        },
      },
    },
    {
      provider: 'ANTHROPIC',
      label: { ...localizedText, en: 'Anthropic' },
      endpointPathDefault: '/v1/messages',
      modelPlaceholder: 'claude-example',
      protocol: {
        family: 'anthropic-messages',
        payloadFormat: 'official-provider-protocol',
        invocationRuntime: 'not_implemented',
        notes: {
          en: 'Provider configuration only.',
          zh_HANS: '仅提供商配置。',
          zh_HANT: '僅供應商設定。',
          ja: 'プロバイダー設定のみ。',
          ko: '제공자 설정만.',
          fr: 'Configuration fournisseur uniquement.',
        },
      },
    },
    {
      provider: 'GEMINI',
      label: { ...localizedText, en: 'Gemini' },
      endpointPathDefault: '/v1beta/models/{model}:generateContent',
      modelPlaceholder: 'gemini-example',
      protocol: {
        family: 'gemini-generate-content',
        payloadFormat: 'official-provider-protocol',
        invocationRuntime: 'not_implemented',
        notes: {
          en: 'Provider configuration only.',
          zh_HANS: '仅提供商配置。',
          zh_HANT: '僅供應商設定。',
          ja: 'プロバイダー設定のみ。',
          ko: '제공자 설정만.',
          fr: 'Configuration fournisseur uniquement.',
        },
      },
    },
  ],
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
  useSearchParams: () => new URLSearchParams(searchQuery),
}));

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    request: mockRequest,
    session: {
      tenantName: 'Test Tenant',
      tenantTier: 'tenant',
      tenantCode: 'TENANT_TEST',
      user: {
        displayName: 'Operator Alice',
        username: 'alice',
        email: 'alice@example.com',
      },
    },
  }),
}));

vi.mock('@/platform/runtime/locale/locale-provider', () => ({
  useUiLocale: () => localeState,
}));

describe('InterfaceAddAdapterScreen', () => {
  beforeEach(() => {
    searchQuery = 'ownerType=subsidiary&ownerId=sub-1';
    mockRequest.mockReset();
    mockReplace.mockReset();
  });

  it('renders a vertical AI Adapter add form and submits provider inside the payload', async () => {
    const user = userEvent.setup();
    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/integration/adapter-definitions' && !init) {
        return [aiAdapterDefinition];
      }

      if (path === '/api/v1/subsidiaries/sub-1/integration/adapters' && init?.method === 'POST') {
        return {
          id: 'adapter-ai-1',
          code: 'AI_ADAPTER',
        };
      }

      throw new Error(`Unexpected request: ${path}`);
    });

    render(<InterfaceAddAdapterScreen tenantId="tenant-1" />);

    expect(await screen.findByRole('heading', { name: 'Add Adapter' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Add adapter sections' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Adapter type' })).toHaveValue('ai-adapter');
    expect(screen.getByRole('combobox', { name: 'Provider' })).toHaveValue('OPENAI');
    expect(screen.getByLabelText('Endpoint path')).toHaveValue('/v1/responses');
    expect(screen.getByLabelText('Model')).toHaveValue('gpt-example');
    expect(screen.queryByText(/Bilibili/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/YouTube/i)).not.toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Provider' }), 'ANTHROPIC');
    expect(screen.getByLabelText('Endpoint path')).toHaveValue('/v1/messages');
    expect(screen.getByLabelText('Model')).toHaveValue('claude-example');

    await user.type(screen.getByLabelText('Token secret'), 'provider-token');
    await user.click(screen.getByRole('button', { name: /Create adapter/i }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/subsidiaries/sub-1/integration/adapters',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            definitionKey: 'ai-adapter',
            inherit: true,
            configs: [
              { configKey: 'provider', configValue: 'ANTHROPIC' },
              { configKey: 'endpoint_path', configValue: '/v1/messages' },
              { configKey: 'model', configValue: 'claude-example' },
              { configKey: 'token', configValue: 'provider-token' },
            ],
          }),
        }),
      );
    });
    expect(mockReplace).toHaveBeenCalledWith(
      '/tenant/tenant-1/interface-management?ownerType=subsidiary&ownerId=sub-1',
    );
  });
});
