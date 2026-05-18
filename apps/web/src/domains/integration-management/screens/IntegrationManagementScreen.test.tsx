import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { localizedFixture } from '@/domains/config-dictionary-settings/testing/localized-fixtures';

import { IntegrationManagementScreen } from '@/domains/integration-management/screens/IntegrationManagementScreen';
import { ApiRequestError } from '@/platform/http/api';
import { SUPPORTED_UI_LOCALES, type SupportedUiLocale } from '@tcrn/shared';

const mockRequest = vi.fn();
const mockRequestEnvelope = vi.fn();
const mockReplace = vi.fn();
let searchQuery = '';
let pathname = '/tenant/tenant-1/integration-management';
const localeState = {
  locale: 'en' as SupportedUiLocale,
  copy: null,
  setLocale: vi.fn(),
  availableLocales: [...SUPPORTED_UI_LOCALES],
};
const organizationTreeResponse = {
  tenantId: 'tenant-1',
  subsidiaries: [
    {
      id: 'subsidiary-1',
      code: 'TOKYO',
      displayName: 'Tokyo Branch',
      parentId: null,
      path: '/tokyo',
      talents: [
        {
          id: 'talent-1',
          code: 'SORA',
          displayName: 'Tokino Sora',
          avatarUrl: null,
          subsidiaryId: 'subsidiary-1',
          subsidiaryName: 'Tokyo Branch',
          path: '/tokyo/sora',
          homepagePath: 'sora',
          lifecycleStatus: 'published' as const,
          publishedAt: '2026-04-17T08:00:00.000Z',
          isActive: true,
        },
      ],
      children: [],
    },
  ],
  directTalents: [
    {
      id: 'talent-root-1',
      code: 'MIKO',
      displayName: 'Sakura Miko',
      avatarUrl: null,
      subsidiaryId: null,
      subsidiaryName: null,
      path: '/miko',
      homepagePath: 'miko',
      lifecycleStatus: 'draft' as const,
      publishedAt: null,
      isActive: true,
    },
  ],
};

const aiAdapterDefinition = {
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
      defaultValue: 'OPENAI',
      options: [
        { value: 'OPENAI', label: { en: 'OpenAI', zh_HANS: 'OpenAI', zh_HANT: 'OpenAI', ja: 'OpenAI', ko: 'OpenAI', fr: 'OpenAI' } },
        { value: 'ANTHROPIC', label: { en: 'Anthropic', zh_HANS: 'Anthropic', zh_HANT: 'Anthropic', ja: 'Anthropic', ko: 'Anthropic', fr: 'Anthropic' } },
        { value: 'GEMINI', label: { en: 'Gemini', zh_HANS: 'Gemini', zh_HANT: 'Gemini', ja: 'Gemini', ko: 'Gemini', fr: 'Gemini' } },
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
      defaultValue: '/v1/responses',
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
};

const customerLifecycleWebhookDefinition = {
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
};

async function selectTenantRootScope(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: /Tenant root/i }));
}

async function selectSubsidiaryScope(user: ReturnType<typeof userEvent.setup>) {
  await user.click((await screen.findAllByRole('button', { name: /Tokyo Branch/i }))[0]);
}

async function openRowAction(
  user: ReturnType<typeof userEvent.setup>,
  rowText: string,
  actionName: string | RegExp,
) {
  const row = (await screen.findByText(rowText)).closest('tr');
  expect(row).not.toBeNull();
  await user.click(within(row as HTMLTableRowElement).getByRole('button', { name: actionName }));
}

async function openAdapterBasics(user: ReturnType<typeof userEvent.setup>, adapterCode = 'TCRN_PII_PLATFORM') {
  await openRowAction(user, adapterCode, 'Open');
  const drawer = await screen.findByRole('dialog', { name: 'Configure Adapter' });
  expect(within(drawer).getByRole('heading', { name: 'Adapter Profile' })).toBeInTheDocument();
}

async function openAdapterSecrets(user: ReturnType<typeof userEvent.setup>, adapterCode = 'TCRN_PII_PLATFORM') {
  await openRowAction(user, adapterCode, 'Configure');
  const drawer = await screen.findByRole('dialog', { name: 'Configure Adapter' });
  expect(within(drawer).getByRole('tab', { name: 'Secrets' })).toHaveAttribute('aria-selected', 'true');
}

HTMLDialogElement.prototype.showModal = vi.fn(function mockShowModal(this: HTMLDialogElement) {
  this.setAttribute('open', '');
});
HTMLDialogElement.prototype.close = vi.fn(function mockClose(this: HTMLDialogElement) {
  this.removeAttribute('open');
});

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({
    replace: mockReplace,
  }),
  useSearchParams: () => new URLSearchParams(searchQuery),
}));

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    request: mockRequest,
    requestEnvelope: mockRequestEnvelope,
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

describe('IntegrationManagementScreen', () => {
  beforeEach(() => {
    searchQuery = '';
    pathname = '/tenant/tenant-1/integration-management';
    localeState.locale = 'en';
    localeState.locale = 'en';
    mockReplace.mockReset();
    mockRequest.mockReset();
    mockRequestEnvelope.mockReset();
  });

  it('only loads the active tab on mount so hidden AC-only surfaces do not fail the workspace eagerly', async () => {
    const user = userEvent.setup();
    let emailConfigCalls = 0;
    let consumerCalls = 0;
    let webhookCalls = 0;
    let adapterCalls = 0;
    let adapterDefinitionCalls = 0;

    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return organizationTreeResponse;
      }

      if (path === '/api/v1/integration/adapter-definitions') {
        adapterDefinitionCalls += 1;
        return [aiAdapterDefinition];
      }

      if (path === '/api/v1/integration/adapters?includeInherited=true&includeDisabled=true') {
        adapterCalls += 1;
        return [
          {
            id: 'adapter-1',
            ownerType: 'tenant',
            ownerId: null,
            platformId: 'platform-1',
            platform: {
              code: 'BILIBILI',
              displayName: 'Bilibili',
              iconUrl: null,
            },
            code: 'BILI_EXPORT',
            name: localizedFixture('Bilibili Export'),
            adapterType: 'api_key',
            inherit: true,
            isActive: true,
            isInherited: false,
            configCount: 1,
            createdAt: '2026-04-17T08:00:00.000Z',
            updatedAt: '2026-04-17T09:00:00.000Z',
            version: 2,
          },
        ];
      }

      if (path === '/api/v1/integration/adapters/adapter-1') {
        return {
          id: 'adapter-1',
          ownerType: 'tenant',
          ownerId: null,
          platform: {
            id: 'platform-1',
            code: 'BILIBILI',
            displayName: 'Bilibili',
          },
          code: 'BILI_EXPORT',
          name: localizedFixture('Bilibili Export'),
          adapterType: 'api_key',
          inherit: true,
          isActive: true,
          configs: [],
          createdAt: '2026-04-17T08:00:00.000Z',
          updatedAt: '2026-04-17T09:00:00.000Z',
          createdBy: 'user-1',
          updatedBy: 'user-1',
          version: 2,
        };
      }

      if (path === '/api/v1/email/config') {
        emailConfigCalls += 1;
        throw new ApiRequestError(
          'Email configuration is only available for AC tenant administrators',
          'AC_TENANT_ONLY',
          403,
        );
      }

      if (path === '/api/v1/configuration-entity/consumer?includeInactive=true&page=1&pageSize=100') {
        consumerCalls += 1;
        return [];
      }

      if (path === '/api/v1/integration/webhooks') {
        webhookCalls += 1;
        return [];
      }

      if (path === '/api/v1/integration/webhooks/events') {
        webhookCalls += 1;
        return [];
      }

      if (path === '/api/v1/email-templates') {
        return [];
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<IntegrationManagementScreen tenantId="tenant-1" />);

    expect(await screen.findByRole('heading', { name: 'Integration Management' })).toBeInTheDocument();
    expect(await screen.findByText('Select a scope first')).toBeInTheDocument();
    expect(screen.getByText('Start with tenant root')).toBeInTheDocument();
    expect(screen.getByText('Need a scoped override?')).toBeInTheDocument();
    expect(screen.getByText('Looking for API clients?')).toBeInTheDocument();
    expect(screen.queryByText('BILI_EXPORT')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'API Keys' })).not.toBeInTheDocument();

    expect(emailConfigCalls).toBe(0);
    expect(consumerCalls).toBe(0);
    expect(webhookCalls).toBe(0);
    expect(adapterCalls).toBe(0);
    expect(adapterDefinitionCalls).toBe(0);

    await user.click(screen.getByRole('button', { name: /Start shared integration workspace/i }));

    expect(await screen.findByText('BILI_EXPORT')).toBeInTheDocument();
    expect(
      screen.getByText(
        'API clients stay in Account Center and do not appear in tenant workspaces. Use this scope for adapters, webhooks, and email.',
      ),
    ).toBeInTheDocument();
    expect(adapterCalls).toBe(1);
    expect(adapterDefinitionCalls).toBe(1);

    await user.click(screen.getByRole('tab', { name: 'Email' }));

    expect(await screen.findByRole('heading', { name: 'Email Templates' })).toBeInTheDocument();
    expect(screen.queryByText('AC-only email configuration')).not.toBeInTheDocument();
    expect(emailConfigCalls).toBe(0);
  });

  it('uses 分目录 wording in zh_HANS tenant scope copy instead of 子公司', async () => {
    localeState.locale = 'zh_HANS';
    localeState.locale = 'zh_HANS';

    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return organizationTreeResponse;
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<IntegrationManagementScreen tenantId="tenant-1" />);

    expect(await screen.findByRole('heading', { name: '集成管理' })).toBeInTheDocument();
    expect(screen.getByText('选择租户根、分目录或艺人，以切换右侧的集成工作区。')).toBeInTheDocument();
    expect(screen.queryByText(/子公司/)).not.toBeInTheDocument();
  });

  it('loads scoped adapters for subsidiary selection and hides tenant-root only tabs', async () => {
    const user = userEvent.setup();
    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return organizationTreeResponse;
      }

      if (path === '/api/v1/configuration-entity/social-platform?includeInactive=false&page=1&pageSize=100') {
        return [
          {
            id: 'platform-1',
            code: 'BILIBILI',
            name: localizedFixture('Bilibili'),
            localizedName: 'Bilibili',
            sortOrder: 0,
            isActive: true,
            version: 1,
            displayName: 'Bilibili',
          },
        ];
      }

      if (path === '/api/v1/subsidiaries/subsidiary-1/integration/adapters?includeInherited=true&includeDisabled=true') {
        return [
          {
            id: 'adapter-sub-1',
            ownerType: 'subsidiary',
            ownerId: 'subsidiary-1',
            platformId: 'platform-1',
            platform: {
              code: 'BILIBILI',
              displayName: 'Bilibili',
              iconUrl: null,
            },
            code: 'TOKYO_SYNC',
            name: localizedFixture('Tokyo Sync'),
            adapterType: 'api_key',
            inherit: true,
            isActive: true,
            isInherited: false,
            configCount: 1,
            createdAt: '2026-04-17T08:00:00.000Z',
            updatedAt: '2026-04-17T09:00:00.000Z',
            version: 2,
          },
        ];
      }

      if (path === '/api/v1/integration/adapters/adapter-sub-1') {
        return {
          id: 'adapter-sub-1',
          ownerType: 'subsidiary',
          ownerId: 'subsidiary-1',
          platform: {
            id: 'platform-1',
            code: 'BILIBILI',
            displayName: 'Bilibili',
          },
          code: 'TOKYO_SYNC',
          name: localizedFixture('Tokyo Sync'),
          adapterType: 'api_key',
          inherit: true,
          isActive: true,
          configs: [],
          createdAt: '2026-04-17T08:00:00.000Z',
          updatedAt: '2026-04-17T09:00:00.000Z',
          createdBy: 'user-1',
          updatedBy: 'user-1',
          version: 2,
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<IntegrationManagementScreen tenantId="tenant-1" />);

    await selectSubsidiaryScope(user);

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/subsidiaries/subsidiary-1/integration/adapters?includeInherited=true&includeDisabled=true',
      );
    });

    expect(await screen.findByText('TOKYO_SYNC')).toBeInTheDocument();
    expect(
      screen.getByText(
        'API clients stay in Account Center. Tokyo Branch inherits that contract, so only adapters are editable here.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Webhooks' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Email' })).not.toBeInTheDocument();
  });

  it('ignores stale adapter responses after switching integration scope', async () => {
    const user = userEvent.setup();
    let resolveTenantAdapters: (value: unknown[]) => void = () => {};
    const tenantAdapters = new Promise<unknown[]>((resolve) => {
      resolveTenantAdapters = resolve;
    });

    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return organizationTreeResponse;
      }

      if (path === '/api/v1/configuration-entity/social-platform?includeInactive=false&page=1&pageSize=100') {
        return [];
      }

      if (path === '/api/v1/integration/adapters?includeInherited=true&includeDisabled=true') {
        return tenantAdapters;
      }

      if (path === '/api/v1/subsidiaries/subsidiary-1/integration/adapters?includeInherited=true&includeDisabled=true') {
        return [
          {
            id: 'adapter-sub-1',
            ownerType: 'subsidiary',
            ownerId: 'subsidiary-1',
            platformId: 'platform-1',
            platform: {
              code: 'BILIBILI',
              displayName: 'Bilibili',
              iconUrl: null,
            },
            code: 'TOKYO_SYNC',
            name: localizedFixture('Tokyo Sync'),
            adapterType: 'api_key',
            inherit: true,
            isActive: true,
            isInherited: false,
            configCount: 1,
            createdAt: '2026-04-17T08:00:00.000Z',
            updatedAt: '2026-04-17T09:00:00.000Z',
            version: 2,
          },
        ];
      }

      if (path === '/api/v1/integration/adapters/adapter-sub-1') {
        return {
          id: 'adapter-sub-1',
          ownerType: 'subsidiary',
          ownerId: 'subsidiary-1',
          platform: {
            id: 'platform-1',
            code: 'BILIBILI',
            displayName: 'Bilibili',
          },
          code: 'TOKYO_SYNC',
          name: localizedFixture('Tokyo Sync'),
          adapterType: 'api_key',
          inherit: true,
          isActive: true,
          configs: [],
          createdAt: '2026-04-17T08:00:00.000Z',
          updatedAt: '2026-04-17T09:00:00.000Z',
          createdBy: 'user-1',
          updatedBy: 'user-1',
          version: 2,
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<IntegrationManagementScreen tenantId="tenant-1" />);

    await selectTenantRootScope(user);
    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith('/api/v1/integration/adapters?includeInherited=true&includeDisabled=true');
    });

    await selectSubsidiaryScope(user);
    expect(await screen.findByText('TOKYO_SYNC')).toBeInTheDocument();

    resolveTenantAdapters([
      {
        id: 'adapter-tenant-1',
        ownerType: 'tenant',
        ownerId: null,
        platformId: 'platform-1',
        platform: {
          code: 'BILIBILI',
          displayName: 'Bilibili',
          iconUrl: null,
        },
        code: 'TENANT_SYNC',
        name: localizedFixture('Tenant Sync'),
        adapterType: 'api_key',
        inherit: true,
        isActive: true,
        isInherited: false,
        configCount: 1,
        createdAt: '2026-04-17T08:00:00.000Z',
        updatedAt: '2026-04-17T09:00:00.000Z',
        version: 2,
      },
    ]);
    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    });

    expect(screen.getByText('TOKYO_SYNC')).toBeInTheDocument();
    expect(screen.queryByText('TENANT_SYNC')).not.toBeInTheDocument();
    expect(mockRequest).not.toHaveBeenCalledWith('/api/v1/integration/adapters/adapter-tenant-1');
  });

  it('keeps API client key lifecycle in the AC integration workspace only', async () => {
    const user = userEvent.setup();
    pathname = '/ac/tenant-ac/integration-management';
    let consumerPrefix: string | null = null;

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/configuration-entity/social-platform?includeInactive=false&page=1&pageSize=100') {
        return [
          {
            id: 'platform-1',
            code: 'BILIBILI',
            name: localizedFixture('Bilibili'),
            localizedName: 'Bilibili',
            sortOrder: 0,
            isActive: true,
            version: 1,
            displayName: 'Bilibili',
          },
        ];
      }

      if (path === '/api/v1/integration/adapters?includeInherited=true&includeDisabled=true') {
        return [
          {
            id: 'adapter-1',
            ownerType: 'tenant',
            ownerId: null,
            platformId: 'platform-1',
            platform: {
              code: 'BILIBILI',
              displayName: 'Bilibili',
              iconUrl: null,
            },
            code: 'BILI_EXPORT',
            name: localizedFixture('Bilibili Export'),
            adapterType: 'api_key',
            inherit: true,
            isActive: true,
            isInherited: false,
            configCount: 1,
            createdAt: '2026-04-17T08:00:00.000Z',
            updatedAt: '2026-04-17T09:00:00.000Z',
            version: 2,
          },
        ];
      }

      if (path === '/api/v1/integration/adapters/adapter-1') {
        return {
          id: 'adapter-1',
          ownerType: 'tenant',
          ownerId: null,
          platform: {
            id: 'platform-1',
            code: 'BILIBILI',
            displayName: 'Bilibili',
          },
          code: 'BILI_EXPORT',
          name: localizedFixture('Bilibili Export'),
          adapterType: 'api_key',
          inherit: true,
          isActive: true,
          configs: [
            {
              id: 'config-1',
              configKey: 'api_key',
              configValue: '******',
              isSecret: true,
            },
          ],
          createdAt: '2026-04-17T08:00:00.000Z',
          updatedAt: '2026-04-17T09:00:00.000Z',
          createdBy: 'user-1',
          updatedBy: 'user-1',
          version: 2,
        };
      }

      if (path === '/api/v1/integration/webhooks') {
        return [];
      }

      if (path === '/api/v1/integration/webhooks/events') {
        return [];
      }

      if (path === '/api/v1/configuration-entity/consumer?includeInactive=true&page=1&pageSize=100') {
        return [
          {
            id: 'consumer-1',
            code: 'CRM_SYNC',
            name: localizedFixture('CRM Sync'),
            localizedName: 'CRM Sync',
            sortOrder: 0,
            isActive: true,
            version: 4,
            consumerCategory: 'external',
            contactName: 'Partner Ops',
            contactEmail: 'ops@example.com',
            apiKeyPrefix: consumerPrefix,
          },
        ];
      }

      if (path === '/api/v1/email-templates') {
        return [
          {
            code: 'WELCOME_EMAIL',
            name: localizedFixture('Welcome Email'),
            subject: localizedFixture('Welcome to TCRN'),
            bodyHtml: localizedFixture('<p>Hello {{name}}</p>'),
            bodyText: localizedFixture('Hello {{name}}'),
            variables: ['name'],
            category: 'system',
            isActive: true,
          },
        ];
      }

      if (path === '/api/v1/email/config') {
        throw new ApiRequestError(
          'Email configuration is only available for AC tenant administrators',
          'AC_TENANT_ONLY',
          403,
        );
      }

      if (path === '/api/v1/configuration-entity/consumer/consumer-1/generate-key' && init?.method === 'POST') {
        consumerPrefix = 'tcrn_pk';
        return {
          message: 'API key generated successfully. Please save it securely - it will not be shown again.',
          apiKey: 'tcrn_pk_live_secret_value',
          apiKeyPrefix: 'tcrn_pk',
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<IntegrationManagementScreen tenantId="tenant-ac" workspaceKind="ac" />);

    expect(await screen.findByRole('heading', { name: 'Integration Management' })).toBeInTheDocument();
    expect(await screen.findByText('BILI_EXPORT')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'API Keys' }));

    expect(mockReplace).toHaveBeenCalledWith('/ac/tenant-ac/integration-management?tab=api-keys');
    expect(await screen.findByText('CRM_SYNC')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Generate key' })).not.toBeInTheDocument();

    await openRowAction(user, 'CRM_SYNC', 'Open');
    expect(await screen.findByRole('dialog', { name: 'API Client Detail' })).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: 'Generate key' }));
    expect(await screen.findByText('Generate API key for CRM_SYNC?')).toBeInTheDocument();

    await user.click(within(screen.getByRole('dialog', { name: 'Generate API key for CRM_SYNC?' })).getByRole('button', { name: 'Generate key' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/configuration-entity/consumer/consumer-1/generate-key',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });

    expect((await screen.findAllByText(/API key generated successfully/)).length).toBeGreaterThan(0);
    expect(await screen.findByText('tcrn_pk_live_secret_value')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Email' }));

    expect(mockReplace).toHaveBeenCalledWith('/ac/tenant-ac/integration-management?tab=email');
    expect(await screen.findByText('AC-only email configuration')).toBeInTheDocument();
    expect(await screen.findByText('WELCOME_EMAIL')).toBeInTheDocument();
  });

  it('paginates adapter inventory at 20 rows by default and lets operators widen the page size', async () => {
    const user = userEvent.setup();
    const adapters = Array.from({ length: 25 }, (_, index) => ({
      id: `adapter-${index + 1}`,
      ownerType: 'tenant' as const,
      ownerId: null,
      platformId: 'platform-1',
      platform: {
        code: 'BILIBILI',
        displayName: 'Bilibili',
        iconUrl: null,
      },
      code: `ADAPTER_${String(index + 1).padStart(2, '0')}`,
      name: localizedFixture(`Adapter ${index + 1}`),
      adapterType: 'api_key' as const,
      inherit: true,
      isActive: true,
      isInherited: false,
      configCount: 1,
      createdAt: '2026-04-17T08:00:00.000Z',
      updatedAt: '2026-04-17T09:00:00.000Z',
      version: 1,
    }));

    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return organizationTreeResponse;
      }

      if (path === '/api/v1/configuration-entity/social-platform?includeInactive=false&page=1&pageSize=100') {
        return [
          {
            id: 'platform-1',
            code: 'BILIBILI',
            name: localizedFixture('Bilibili'),
            localizedName: 'Bilibili',
            sortOrder: 0,
            isActive: true,
            version: 1,
            displayName: 'Bilibili',
          },
        ];
      }

      if (path === '/api/v1/integration/adapters?includeInherited=true&includeDisabled=true') {
        return adapters;
      }

      if (path === '/api/v1/integration/adapters/adapter-1') {
        return {
          id: 'adapter-1',
          ownerType: 'tenant',
          ownerId: null,
          platform: {
            id: 'platform-1',
            code: 'BILIBILI',
            displayName: 'Bilibili',
          },
          code: 'ADAPTER_01',
          name: localizedFixture('Adapter 1'),
          adapterType: 'api_key',
          inherit: true,
          isActive: true,
          configs: [],
          createdAt: '2026-04-17T08:00:00.000Z',
          updatedAt: '2026-04-17T09:00:00.000Z',
          createdBy: 'user-1',
          updatedBy: 'user-1',
          version: 1,
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<IntegrationManagementScreen tenantId="tenant-1" />);

    await selectTenantRootScope(user);

    expect(await screen.findByText('ADAPTER_01')).toBeInTheDocument();
    expect(screen.queryByText('ADAPTER_21')).not.toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(mockReplace).toHaveBeenCalledWith('/tenant/tenant-1/integration-management?adapterPage=2');
    expect(await screen.findByText('ADAPTER_21')).toBeInTheDocument();
    expect(screen.queryByText('ADAPTER_01')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Rows per page' }), '50');

    expect(mockReplace).toHaveBeenCalledWith('/tenant/tenant-1/integration-management?adapterPageSize=50');
    expect(await screen.findByText('ADAPTER_25')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
    expect(screen.getByText('ADAPTER_01')).toBeInTheDocument();
  });


  it('hydrates adapter pagination from URL without collapsing before scope data loads', async () => {
    const user = userEvent.setup();
    searchQuery = 'adapterPage=2&adapterPageSize=50&foo=1';
    const adapters = Array.from({ length: 55 }, (_, index) => ({
      id: `adapter-${index + 1}`,
      ownerType: 'tenant' as const,
      ownerId: null,
      platformId: 'platform-1',
      platform: {
        code: 'BILIBILI',
        displayName: 'Bilibili',
        iconUrl: null,
      },
      code: `ADAPTER_${String(index + 1).padStart(2, '0')}`,
      name: localizedFixture(`Adapter ${index + 1}`),
      adapterType: 'api_key' as const,
      inherit: true,
      isActive: true,
      isInherited: false,
      configCount: 1,
      createdAt: '2026-04-17T08:00:00.000Z',
      updatedAt: '2026-04-17T09:00:00.000Z',
      version: 1,
    }));

    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return organizationTreeResponse;
      }

      if (path === '/api/v1/configuration-entity/social-platform?includeInactive=false&page=1&pageSize=100') {
        return [
          {
            id: 'platform-1',
            code: 'BILIBILI',
            name: localizedFixture('Bilibili'),
            localizedName: 'Bilibili',
            sortOrder: 0,
            isActive: true,
            version: 1,
            displayName: 'Bilibili',
          },
        ];
      }

      if (path === '/api/v1/integration/adapters?includeInherited=true&includeDisabled=true') {
        return adapters;
      }

      if (path === '/api/v1/integration/adapters/adapter-51') {
        return {
          id: 'adapter-51',
          ownerType: 'tenant',
          ownerId: null,
          platform: {
            id: 'platform-1',
            code: 'BILIBILI',
            displayName: 'Bilibili',
          },
          code: 'ADAPTER_51',
          name: localizedFixture('Adapter 51'),
          adapterType: 'api_key',
          inherit: true,
          isActive: true,
          configs: [],
          createdAt: '2026-04-17T08:00:00.000Z',
          updatedAt: '2026-04-17T09:00:00.000Z',
          createdBy: 'user-1',
          updatedBy: 'user-1',
          version: 1,
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<IntegrationManagementScreen tenantId="tenant-1" />);

    await selectTenantRootScope(user);

    expect(await screen.findByText('ADAPTER_51')).toBeInTheDocument();
    expect(screen.queryByText('ADAPTER_01')).not.toBeInTheDocument();
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Rows per page' }), '20');

    expect(mockReplace).toHaveBeenCalledWith('/tenant/tenant-1/integration-management?foo=1');
  });

  it('reveals masked adapter secrets and submits config updates through the real adapter contract', async () => {
    const user = userEvent.setup();
    let latestBaseUrl = 'https://old.example.com';

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return organizationTreeResponse;
      }

      if (path === '/api/v1/configuration-entity/social-platform?includeInactive=false&page=1&pageSize=100') {
        return [
          {
            id: 'platform-1',
            code: 'PII_PLATFORM',
            name: localizedFixture('PII Platform'),
            localizedName: 'PII Platform',
            sortOrder: 0,
            isActive: true,
            version: 1,
            displayName: 'PII Platform',
          },
        ];
      }

      if (path === '/api/v1/integration/adapters?includeInherited=true&includeDisabled=true') {
        return [
          {
            id: 'adapter-1',
            ownerType: 'tenant',
            ownerId: null,
            platformId: 'platform-1',
            platform: {
              code: 'PII_PLATFORM',
              displayName: 'PII Platform',
              iconUrl: null,
            },
            code: 'TCRN_PII_PLATFORM',
            name: localizedFixture('PII Relay'),
            adapterType: 'api_key',
            inherit: true,
            isActive: true,
            isInherited: false,
            configCount: 2,
            createdAt: '2026-04-17T08:00:00.000Z',
            updatedAt: '2026-04-17T09:00:00.000Z',
            version: 3,
          },
        ];
      }

      if (path === '/api/v1/integration/adapters/adapter-1' && !init) {
        return {
          id: 'adapter-1',
          ownerType: 'tenant',
          ownerId: null,
          platform: {
            id: 'platform-1',
            code: 'PII_PLATFORM',
            displayName: 'PII Platform',
          },
          code: 'TCRN_PII_PLATFORM',
          name: localizedFixture('PII Relay'),
          adapterType: 'api_key',
          inherit: true,
          isActive: true,
          configs: [
            {
              id: 'config-1',
              configKey: 'api_key',
              configValue: '******',
              isSecret: true,
            },
            {
              id: 'config-2',
              configKey: 'base_url',
              configValue: latestBaseUrl,
              isSecret: false,
            },
          ],
          createdAt: '2026-04-17T08:00:00.000Z',
          updatedAt: '2026-04-17T09:00:00.000Z',
          createdBy: 'user-1',
          updatedBy: 'user-1',
          version: 3,
        };
      }

      if (path === '/api/v1/integration/webhooks') {
        return [];
      }

      if (path === '/api/v1/integration/webhooks/events') {
        return [];
      }

      if (path === '/api/v1/configuration-entity/consumer?includeInactive=true&page=1&pageSize=100') {
        return [];
      }

      if (path === '/api/v1/email-templates') {
        return [];
      }

      if (path === '/api/v1/email/config') {
        throw new ApiRequestError(
          'Email configuration is only available for AC tenant administrators',
          'AC_TENANT_ONLY',
          403,
        );
      }

      if (path === '/api/v1/integration/adapters/adapter-1/configs/api_key/reveal' && init?.method === 'POST') {
        return {
          configKey: 'api_key',
          configValue: 'revealed-secret-value',
          revealedAt: '2026-04-17T10:00:00.000Z',
          expiresInSeconds: 60,
        };
      }

      if (path === '/api/v1/integration/adapters/adapter-1/configs' && init?.method === 'PATCH') {
        expect(init.body).toBe(
          JSON.stringify({
            configs: [
              {
                configKey: 'api_key',
                mutation: 'keep',
              },
              {
                configKey: 'base_url',
                mutation: 'replace',
                configValue: 'https://new.example.com',
              },
            ],
            adapterVersion: 3,
          }),
        );

        latestBaseUrl = 'https://new.example.com';

        return {
          updatedCount: 2,
          adapterVersion: 4,
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<IntegrationManagementScreen tenantId="tenant-1" />);

    await selectTenantRootScope(user);

    expect(await screen.findByText('TCRN_PII_PLATFORM')).toBeInTheDocument();
    expect(screen.getByText('Scope capability matrix')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Adapter Profile' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Configuration & secrets' })).not.toBeInTheDocument();

    await openAdapterSecrets(user);

    expect(screen.getByRole('tab', { name: 'Basics' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Secrets' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Webhook/API Client' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Email Templates' })).toBeInTheDocument();
    expect(await screen.findByDisplayValue('******')).toBeInTheDocument();
    expect(screen.getByText(/Required masked secret stays unchanged unless you type a replacement/i)).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Basics' }));
    expect(screen.getByRole('tab', { name: 'Basics' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Name (EN)')).toHaveValue('PII Relay');

    await user.click(screen.getByRole('tab', { name: 'Secrets' }));

    await user.click(screen.getByRole('button', { name: 'Reveal' }));

    expect(await screen.findByDisplayValue('revealed-secret-value')).toBeInTheDocument();
    expect(screen.getByText(/This secret value is visible or newly typed/i)).toBeInTheDocument();

    const baseUrlInput = screen.getByDisplayValue('https://old.example.com');
    await user.clear(baseUrlInput);
    await user.type(baseUrlInput, 'https://new.example.com');

    await user.click(screen.getByRole('button', { name: /Save config changes/i }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/integration/adapters/adapter-1/configs',
        expect.objectContaining({
          method: 'PATCH',
        }),
      );
    });

    expect(await screen.findByText('TCRN_PII_PLATFORM adapter configs updated.')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('https://new.example.com')).toBeInTheDocument();
  });

  it('submits explicit clear only for optional adapter secrets', async () => {
    const user = userEvent.setup();
    let accessTokenStillPresent = true;

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return organizationTreeResponse;
      }

      if (path === '/api/v1/configuration-entity/social-platform?includeInactive=false&page=1&pageSize=100') {
        return [
          {
            id: 'platform-1',
            code: 'PII_PLATFORM',
            name: localizedFixture('PII Platform'),
            localizedName: 'PII Platform',
            sortOrder: 0,
            isActive: true,
            version: 1,
            displayName: 'PII Platform',
          },
        ];
      }

      if (path === '/api/v1/integration/adapters?includeInherited=true&includeDisabled=true') {
        return [
          {
            id: 'adapter-1',
            ownerType: 'tenant',
            ownerId: null,
            platformId: 'platform-1',
            platform: {
              code: 'PII_PLATFORM',
              displayName: 'PII Platform',
              iconUrl: null,
            },
            code: 'TCRN_PII_PLATFORM',
            name: localizedFixture('PII Relay'),
            adapterType: 'oauth',
            inherit: true,
            isActive: true,
            isInherited: false,
            configCount: accessTokenStillPresent ? 2 : 1,
            createdAt: '2026-04-17T08:00:00.000Z',
            updatedAt: '2026-04-17T09:00:00.000Z',
            version: accessTokenStillPresent ? 3 : 4,
          },
        ];
      }

      if (path === '/api/v1/integration/adapters/adapter-1' && !init) {
        return {
          id: 'adapter-1',
          ownerType: 'tenant',
          ownerId: null,
          platform: {
            id: 'platform-1',
            code: 'PII_PLATFORM',
            displayName: 'PII Platform',
          },
          code: 'TCRN_PII_PLATFORM',
          name: localizedFixture('PII Relay'),
          adapterType: 'oauth',
          inherit: true,
          isActive: true,
          configs: [
            {
              id: 'config-1',
              configKey: 'client_secret',
              configValue: '******',
              isSecret: true,
            },
            ...(accessTokenStillPresent
              ? [{
                  id: 'config-2',
                  configKey: 'access_token',
                  configValue: '******',
                  isSecret: true,
                }]
              : []),
          ],
          createdAt: '2026-04-17T08:00:00.000Z',
          updatedAt: '2026-04-17T09:00:00.000Z',
          createdBy: 'user-1',
          updatedBy: 'user-1',
          version: accessTokenStillPresent ? 3 : 4,
        };
      }

      if (path === '/api/v1/integration/webhooks') {
        return [];
      }

      if (path === '/api/v1/integration/webhooks/events') {
        return [];
      }

      if (path === '/api/v1/configuration-entity/consumer?includeInactive=true&page=1&pageSize=100') {
        return [];
      }

      if (path === '/api/v1/email-templates') {
        return [];
      }

      if (path === '/api/v1/email/config') {
        throw new ApiRequestError(
          'Email configuration is only available for AC tenant administrators',
          'AC_TENANT_ONLY',
          403,
        );
      }

      if (path === '/api/v1/integration/adapters/adapter-1/configs' && init?.method === 'PATCH') {
        expect(init.body).toBe(
          JSON.stringify({
            configs: [
              {
                configKey: 'client_secret',
                mutation: 'keep',
              },
              {
                configKey: 'access_token',
                mutation: 'clear',
              },
            ],
            adapterVersion: 3,
          }),
        );
        accessTokenStillPresent = false;
        return {
          updatedCount: 1,
          adapterVersion: 4,
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<IntegrationManagementScreen tenantId="tenant-1" />);

    await selectTenantRootScope(user);
    expect(await screen.findByText('TCRN_PII_PLATFORM')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Adapter Profile' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Configuration & secrets' })).not.toBeInTheDocument();
    await openAdapterSecrets(user);

    expect(screen.getByText(/Required masked secret stays unchanged/i)).toBeInTheDocument();
    expect(screen.getByText(/Masked optional secret stays unchanged/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear secret' })).toBeInTheDocument();
    expect(screen.getAllByText('Secret').length).toBeGreaterThan(1);

    await user.click(screen.getByRole('button', { name: 'Clear secret' }));
    expect(screen.getByText(/optional secret will be cleared on save/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep secret' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Save config changes/i }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/integration/adapters/adapter-1/configs',
        expect.objectContaining({
          method: 'PATCH',
        }),
      );
    });

    expect(await screen.findByText('TCRN_PII_PLATFORM adapter configs updated.')).toBeInTheDocument();
  });

  it('keeps related configure sections as guidance without embedding top-level editors', async () => {
    const user = userEvent.setup();

    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return organizationTreeResponse;
      }

      if (path === '/api/v1/configuration-entity/social-platform?includeInactive=false&page=1&pageSize=100') {
        return [
          {
            id: 'platform-1',
            code: 'PII_PLATFORM',
            name: localizedFixture('PII Platform'),
            localizedName: 'PII Platform',
            sortOrder: 0,
            isActive: true,
            version: 1,
            displayName: 'PII Platform',
          },
        ];
      }

      if (path === '/api/v1/integration/adapters?includeInherited=true&includeDisabled=true') {
        return [
          {
            id: 'adapter-1',
            ownerType: 'tenant',
            ownerId: null,
            platformId: 'platform-1',
            platform: {
              code: 'PII_PLATFORM',
              displayName: 'PII Platform',
              iconUrl: null,
            },
            code: 'TCRN_PII_PLATFORM',
            name: localizedFixture('PII Relay'),
            adapterType: 'api_key',
            inherit: true,
            isActive: true,
            isInherited: false,
            configCount: 1,
            createdAt: '2026-04-17T08:00:00.000Z',
            updatedAt: '2026-04-17T09:00:00.000Z',
            version: 3,
          },
        ];
      }

      if (path === '/api/v1/integration/adapters/adapter-1') {
        return {
          id: 'adapter-1',
          ownerType: 'tenant',
          ownerId: null,
          platform: {
            id: 'platform-1',
            code: 'PII_PLATFORM',
            displayName: 'PII Platform',
          },
          code: 'TCRN_PII_PLATFORM',
          name: localizedFixture('PII Relay'),
          adapterType: 'api_key',
          inherit: true,
          isActive: true,
          configs: [
            {
              id: 'config-1',
              configKey: 'api_key',
              configValue: '******',
              isSecret: true,
            },
          ],
          createdAt: '2026-04-17T08:00:00.000Z',
          updatedAt: '2026-04-17T09:00:00.000Z',
          createdBy: 'user-1',
          updatedBy: 'user-1',
          version: 3,
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<IntegrationManagementScreen tenantId="tenant-1" />);

    await selectTenantRootScope(user);
    await openAdapterSecrets(user);

    await user.click(screen.getByRole('tab', { name: 'Webhook/API Client' }));
    expect(screen.getByText('Webhooks stay list-first')).toBeInTheDocument();
    expect(screen.getByText('API clients stay in Account Center')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New webhook' })).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('******')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Email Templates' }));
    expect(screen.getByText('Email workspace owns templates')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New template' })).not.toBeInTheDocument();
  });

  it('guards dirty adapter metadata before switching adapter rows', async () => {
    const user = userEvent.setup();

    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return organizationTreeResponse;
      }

      if (path === '/api/v1/configuration-entity/social-platform?includeInactive=false&page=1&pageSize=100') {
        return [
          {
            id: 'platform-1',
            code: 'PII_PLATFORM',
            name: localizedFixture('PII Platform'),
            localizedName: 'PII Platform',
            sortOrder: 0,
            isActive: true,
            version: 1,
            displayName: 'PII Platform',
          },
        ];
      }

      if (path === '/api/v1/integration/adapters?includeInherited=true&includeDisabled=true') {
        return [
          {
            id: 'adapter-1',
            ownerType: 'tenant',
            ownerId: null,
            platformId: 'platform-1',
            platform: {
              code: 'PII_PLATFORM',
              displayName: 'PII Platform',
              iconUrl: null,
            },
            code: 'TCRN_PII_PLATFORM',
            name: localizedFixture('PII Relay'),
            adapterType: 'api_key',
            inherit: true,
            isActive: true,
            isInherited: false,
            configCount: 1,
            createdAt: '2026-04-17T08:00:00.000Z',
            updatedAt: '2026-04-17T09:00:00.000Z',
            version: 3,
          },
          {
            id: 'adapter-2',
            ownerType: 'tenant',
            ownerId: null,
            platformId: 'platform-1',
            platform: {
              code: 'PII_PLATFORM',
              displayName: 'PII Platform',
              iconUrl: null,
            },
            code: 'CHAT_EXPORT',
            name: localizedFixture('Chat Relay'),
            adapterType: 'api_key',
            inherit: true,
            isActive: true,
            isInherited: false,
            configCount: 0,
            createdAt: '2026-04-17T08:00:00.000Z',
            updatedAt: '2026-04-17T09:00:00.000Z',
            version: 1,
          },
        ];
      }

      if (path === '/api/v1/integration/adapters/adapter-1') {
        return {
          id: 'adapter-1',
          ownerType: 'tenant',
          ownerId: null,
          platform: {
            id: 'platform-1',
            code: 'PII_PLATFORM',
            displayName: 'PII Platform',
          },
          code: 'TCRN_PII_PLATFORM',
          name: localizedFixture('PII Relay'),
          adapterType: 'api_key',
          inherit: true,
          isActive: true,
          configs: [],
          createdAt: '2026-04-17T08:00:00.000Z',
          updatedAt: '2026-04-17T09:00:00.000Z',
          createdBy: 'user-1',
          updatedBy: 'user-1',
          version: 3,
        };
      }

      if (path === '/api/v1/integration/adapters/adapter-2') {
        return {
          id: 'adapter-2',
          ownerType: 'tenant',
          ownerId: null,
          platform: {
            id: 'platform-1',
            code: 'PII_PLATFORM',
            displayName: 'PII Platform',
          },
          code: 'CHAT_EXPORT',
          name: localizedFixture('Chat Relay'),
          adapterType: 'api_key',
          inherit: true,
          isActive: true,
          configs: [],
          createdAt: '2026-04-17T08:00:00.000Z',
          updatedAt: '2026-04-17T09:00:00.000Z',
          createdBy: 'user-1',
          updatedBy: 'user-1',
          version: 1,
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<IntegrationManagementScreen tenantId="tenant-1" />);

    await selectTenantRootScope(user);
    await openAdapterBasics(user);

    const adapterNameInput = await screen.findByLabelText('Name (EN)');
    await user.clear(adapterNameInput);
    await user.type(adapterNameInput, 'Changed PII Relay');

    await user.click((await screen.findAllByRole('button', { name: /Tokyo Branch/i }))[0]);
    expect(await screen.findByRole('dialog', { name: 'Discard unsaved changes?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByDisplayValue('Changed PII Relay')).toBeInTheDocument();

    const chatRow = screen.getByText('CHAT_EXPORT').closest('tr');
    expect(chatRow).not.toBeNull();
    await user.click(within(chatRow as HTMLTableRowElement).getByRole('button', { name: 'Open' }));

    expect(await screen.findByRole('dialog', { name: 'Discard unsaved changes?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByDisplayValue('Changed PII Relay')).toBeInTheDocument();

    await user.click(within(chatRow as HTMLTableRowElement).getByRole('button', { name: 'Open' }));
    await user.click(await screen.findByRole('button', { name: 'Discard changes' }));

    expect(await screen.findByDisplayValue('Chat Relay')).toBeInTheDocument();
  });

  it('does not treat reveal-only adapter config inspection as dirty but guards typed config changes', async () => {
    const user = userEvent.setup();

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return organizationTreeResponse;
      }

      if (path === '/api/v1/configuration-entity/social-platform?includeInactive=false&page=1&pageSize=100') {
        return [
          {
            id: 'platform-1',
            code: 'PII_PLATFORM',
            name: localizedFixture('PII Platform'),
            localizedName: 'PII Platform',
            sortOrder: 0,
            isActive: true,
            version: 1,
            displayName: 'PII Platform',
          },
        ];
      }

      if (path === '/api/v1/integration/adapters?includeInherited=true&includeDisabled=true') {
        return [
          {
            id: 'adapter-1',
            ownerType: 'tenant',
            ownerId: null,
            platformId: 'platform-1',
            platform: {
              code: 'PII_PLATFORM',
              displayName: 'PII Platform',
              iconUrl: null,
            },
            code: 'TCRN_PII_PLATFORM',
            name: localizedFixture('PII Relay'),
            adapterType: 'api_key',
            inherit: true,
            isActive: true,
            isInherited: false,
            configCount: 2,
            createdAt: '2026-04-17T08:00:00.000Z',
            updatedAt: '2026-04-17T09:00:00.000Z',
            version: 3,
          },
        ];
      }

      if (path === '/api/v1/integration/adapters/adapter-1') {
        return {
          id: 'adapter-1',
          ownerType: 'tenant',
          ownerId: null,
          platform: {
            id: 'platform-1',
            code: 'PII_PLATFORM',
            displayName: 'PII Platform',
          },
          code: 'TCRN_PII_PLATFORM',
          name: localizedFixture('PII Relay'),
          adapterType: 'api_key',
          inherit: true,
          isActive: true,
          configs: [
            {
              id: 'config-1',
              configKey: 'client_secret',
              configValue: '******',
              isSecret: true,
            },
            {
              id: 'config-2',
              configKey: 'base_url',
              configValue: 'https://old.example.com',
              isSecret: false,
            },
          ],
          createdAt: '2026-04-17T08:00:00.000Z',
          updatedAt: '2026-04-17T09:00:00.000Z',
          createdBy: 'user-1',
          updatedBy: 'user-1',
          version: 3,
        };
      }

      if (path === '/api/v1/integration/adapters/adapter-1/configs/client_secret/reveal' && init?.method === 'POST') {
        return {
          configKey: 'client_secret',
          configValue: 'revealed-secret-value',
          revealedAt: '2026-04-17T10:00:00.000Z',
          expiresInSeconds: 60,
        };
      }

      if (path === '/api/v1/integration/webhooks') {
        return [];
      }

      if (path === '/api/v1/integration/webhooks/events') {
        return [];
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<IntegrationManagementScreen tenantId="tenant-1" />);

    await selectTenantRootScope(user);
    expect(await screen.findByText('TCRN_PII_PLATFORM')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Adapter Profile' })).not.toBeInTheDocument();

    await openAdapterSecrets(user);
    expect(await screen.findByDisplayValue('******')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reveal' }));
    expect(await screen.findByDisplayValue('revealed-secret-value')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Webhooks' }));
    expect(await screen.findByText('Webhook Endpoints')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Discard unsaved changes?' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Adapters' }));
    await openAdapterSecrets(user);

    const baseUrlInput = await screen.findByDisplayValue('https://old.example.com');
    await user.clear(baseUrlInput);
    await user.type(baseUrlInput, 'https://new.example.com');

    await user.click(screen.getByRole('tab', { name: 'Webhooks' }));
    expect(await screen.findByRole('dialog', { name: 'Discard unsaved changes?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByDisplayValue('https://new.example.com')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Webhooks' }));
    await user.click(await screen.findByRole('button', { name: 'Discard changes' }));
    expect(await screen.findByText('Webhook Endpoints')).toBeInTheDocument();
  }, 10_000);

  it('creates adapters from supported definitions and exposes AI-specific fields only', async () => {
    const user = userEvent.setup();
    let created = false;
    let createBody: unknown = null;

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return organizationTreeResponse;
      }

      if (path === '/api/v1/integration/adapter-definitions') {
        return [aiAdapterDefinition];
      }

      if (path === '/api/v1/integration/adapters?includeInherited=true&includeDisabled=true') {
        return created
          ? [
              {
                id: 'adapter-ai',
                ownerType: 'tenant',
                ownerId: null,
                platformId: 'platform-ai-adapter',
                platform: {
                  code: 'AI_ADAPTER',
                  displayName: 'AI Adapter',
                  iconUrl: null,
                },
                definitionKey: 'ai-adapter',
                code: 'AI_ADAPTER',
                name: localizedFixture('AI Adapter'),
                adapterType: 'ai',
                inherit: true,
                isActive: true,
                isInherited: false,
                configCount: 3,
                createdAt: '2026-05-07T08:00:00.000Z',
                updatedAt: '2026-05-07T08:00:00.000Z',
                version: 1,
              },
            ]
          : [];
      }

      if (path === '/api/v1/integration/adapters' && init?.method === 'POST') {
        createBody = JSON.parse(String(init.body));
        created = true;
        return {
          id: 'adapter-ai',
          ownerType: 'tenant',
          ownerId: null,
          platform: {
            id: 'platform-ai-adapter',
            code: 'AI_ADAPTER',
            displayName: 'AI Adapter',
          },
          definitionKey: 'ai-adapter',
          code: 'AI_ADAPTER',
          name: localizedFixture('AI Adapter'),
          adapterType: 'ai',
          inherit: true,
          isActive: true,
          configs: [],
          createdAt: '2026-05-07T08:00:00.000Z',
          updatedAt: '2026-05-07T08:00:00.000Z',
          createdBy: 'user-1',
          updatedBy: 'user-1',
          version: 1,
        };
      }

      if (path === '/api/v1/integration/adapters/adapter-ai') {
        return {
          id: 'adapter-ai',
          ownerType: 'tenant',
          ownerId: null,
          platform: {
            id: 'platform-ai-adapter',
            code: 'AI_ADAPTER',
            displayName: 'AI Adapter',
          },
          definitionKey: 'ai-adapter',
          code: 'AI_ADAPTER',
          name: localizedFixture('AI Adapter'),
          adapterType: 'ai',
          inherit: true,
          isActive: true,
          configs: [],
          createdAt: '2026-05-07T08:00:00.000Z',
          updatedAt: '2026-05-07T08:00:00.000Z',
          createdBy: 'user-1',
          updatedBy: 'user-1',
          version: 1,
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<IntegrationManagementScreen tenantId="tenant-1" />);

    await selectTenantRootScope(user);
    expect(await screen.findByText('No adapters configured')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'New adapter' }));
    const drawer = await screen.findByRole('dialog', { name: 'Configure Adapter' });

    expect(within(drawer).getByRole('combobox', { name: 'Supported adapter' })).toHaveValue('ai-adapter');
    expect(within(drawer).queryByLabelText('Platform')).not.toBeInTheDocument();
    expect(within(drawer).queryByLabelText('Adapter type')).not.toBeInTheDocument();
    expect(within(drawer).getAllByText('AI Adapter').length).toBeGreaterThan(0);
    expect(within(drawer).getByText('generic-rest')).toBeInTheDocument();

    await user.click(within(drawer).getByRole('tab', { name: 'Secrets' }));
    expect(within(drawer).getByRole('combobox', { name: /Provider/ })).toHaveValue('OPENAI');
    expect(within(drawer).getByDisplayValue('/v1/responses')).toBeInTheDocument();

    await user.type(within(drawer).getByLabelText(/Model/), 'gpt-4.1-mini');
    await user.type(within(drawer).getByLabelText(/Token/), 'sk-test-token');
    await user.click(within(drawer).getByRole('button', { name: 'Create adapter' }));

    await waitFor(() => {
      expect(createBody).toEqual({
        definitionKey: 'ai-adapter',
        inherit: true,
        configs: [
          { configKey: 'provider', configValue: 'OPENAI' },
          { configKey: 'endpoint_path', configValue: '/v1/responses' },
          { configKey: 'model', configValue: 'gpt-4.1-mini' },
          { configKey: 'token', configValue: 'sk-test-token' },
        ],
      });
    });
    expect(JSON.stringify(createBody)).not.toContain('platformId');
    expect(JSON.stringify(createBody)).not.toContain('adapterType');
  });

  it('creates webhooks from supported definitions without free event-set selection', async () => {
    const user = userEvent.setup();
    let created = false;
    let createBody: unknown = null;

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return organizationTreeResponse;
      }

      if (path === '/api/v1/integration/adapter-definitions') {
        return [aiAdapterDefinition];
      }

      if (path === '/api/v1/integration/adapters?includeInherited=true&includeDisabled=true') {
        return [];
      }

      if (path === '/api/v1/integration/webhooks') {
        if (init?.method === 'POST') {
          createBody = JSON.parse(String(init.body));
          created = true;
          return {
            id: 'webhook-customer',
            code: 'CUSTOMER_LIFECYCLE',
            name: localizedFixture('Customer lifecycle webhook'),
            definitionKey: 'customer-lifecycle',
            monitoredTalentIds: ['talent-1'],
            url: 'https://example.com/webhooks/customer',
            events: ['customer.created', 'customer.updated', 'customer.deactivated'],
            isActive: true,
            lastTriggeredAt: null,
            lastStatus: null,
            consecutiveFailures: 0,
            createdAt: '2026-05-07T08:00:00.000Z',
            secret: null,
            headers: {},
            retryPolicy: { maxRetries: 3, backoffMs: 1000 },
            disabledAt: null,
            updatedAt: '2026-05-07T08:00:00.000Z',
            createdBy: 'user-1',
            updatedBy: 'user-1',
            version: 1,
          };
        }

        return created
          ? [
              {
                id: 'webhook-customer',
                code: 'CUSTOMER_LIFECYCLE',
                name: localizedFixture('Customer lifecycle webhook'),
                definitionKey: 'customer-lifecycle',
                monitoredTalentIds: ['talent-1'],
                url: 'https://example.com/webhooks/customer',
                events: ['customer.created', 'customer.updated', 'customer.deactivated'],
                isActive: true,
                lastTriggeredAt: null,
                lastStatus: null,
                consecutiveFailures: 0,
                createdAt: '2026-05-07T08:00:00.000Z',
              },
            ]
          : [];
      }

      if (path === '/api/v1/integration/webhooks/events') {
        return [
          {
            event: 'customer.created',
            name: 'Customer created',
            description: 'Customer record was created.',
            category: 'customer',
          },
          {
            event: 'customer.updated',
            name: 'Customer updated',
            description: 'Customer record was updated.',
            category: 'customer',
          },
          {
            event: 'customer.deactivated',
            name: 'Customer deactivated',
            description: 'Customer record was deactivated.',
            category: 'customer',
          },
        ];
      }

      if (path === '/api/v1/integration/webhook-definitions') {
        return [customerLifecycleWebhookDefinition];
      }

      if (path === '/api/v1/integration/webhooks/webhook-customer') {
        return {
          id: 'webhook-customer',
          code: 'CUSTOMER_LIFECYCLE',
          name: localizedFixture('Customer lifecycle webhook'),
          definitionKey: 'customer-lifecycle',
          monitoredTalentIds: ['talent-1'],
          url: 'https://example.com/webhooks/customer',
          events: ['customer.created', 'customer.updated', 'customer.deactivated'],
          isActive: true,
          lastTriggeredAt: null,
          lastStatus: null,
          consecutiveFailures: 0,
          createdAt: '2026-05-07T08:00:00.000Z',
          secret: null,
          headers: {},
          retryPolicy: { maxRetries: 3, backoffMs: 1000 },
          disabledAt: null,
          updatedAt: '2026-05-07T08:00:00.000Z',
          createdBy: 'user-1',
          updatedBy: 'user-1',
          version: 1,
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<IntegrationManagementScreen tenantId="tenant-1" />);

    await selectTenantRootScope(user);
    await user.click(screen.getByRole('tab', { name: 'Webhooks' }));
    expect(await screen.findByRole('heading', { name: 'Webhook Endpoints' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'New webhook' }));
    const drawer = await screen.findByRole('dialog', { name: 'New Webhook' });

    expect(within(drawer).getByRole('combobox', { name: 'Supported webhook' })).toHaveValue('customer-lifecycle');
    expect(within(drawer).queryByLabelText('Webhook code')).not.toBeInTheDocument();
    expect(within(drawer).queryByLabelText('Name (EN)')).not.toBeInTheDocument();
    expect(within(drawer).getByText('Monitored talents')).toBeInTheDocument();
    expect(within(drawer).getByText('Customer lifecycle webhook')).toBeInTheDocument();

    await user.type(
      within(drawer).getByLabelText('Endpoint URL'),
      'https://example.com/webhooks/customer',
    );
    await user.click(within(drawer).getByRole('checkbox', { name: /Tokino Sora/ }));
    await user.click(within(drawer).getByRole('button', { name: 'Create webhook' }));

    await waitFor(() => {
      expect(createBody).toEqual({
        definitionKey: 'customer-lifecycle',
        url: 'https://example.com/webhooks/customer',
        headers: {},
        monitoredTalentIds: ['talent-1'],
        retryPolicy: {
          maxRetries: 3,
          backoffMs: 1000,
        },
      });
    });
    expect(JSON.stringify(createBody)).not.toContain('CUSTOMER_LIFECYCLE');
    expect(JSON.stringify(createBody)).not.toContain('customer.created');
    expect(await screen.findByText('1 talent')).toBeInTheDocument();
  });

  it('uses the dedicated webhook surface without the scope tree and keeps tenant-root targeting explicit', async () => {
    pathname = '/tenant/tenant-1/webhook-management';

    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return organizationTreeResponse;
      }

      if (path === '/api/v1/integration/webhooks') {
        return [
          {
            id: 'webhook-tenant-root',
            code: 'TENANT_ROOT_WEBHOOK',
            name: localizedFixture('Tenant root webhook'),
            definitionKey: 'customer-lifecycle',
            monitoredTalentIds: [],
            url: 'https://example.com/webhooks/tenant-root',
            events: ['customer.created'],
            isActive: true,
            lastTriggeredAt: null,
            lastStatus: null,
            consecutiveFailures: 0,
            createdAt: '2026-05-07T08:00:00.000Z',
          },
        ];
      }

      if (path === '/api/v1/integration/webhooks/events') {
        return [];
      }

      if (path === '/api/v1/integration/webhook-definitions') {
        return [customerLifecycleWebhookDefinition];
      }

      if (path === '/api/v1/integration/webhooks/webhook-tenant-root') {
        return {
          id: 'webhook-tenant-root',
          code: 'TENANT_ROOT_WEBHOOK',
          name: localizedFixture('Tenant root webhook'),
          definitionKey: 'customer-lifecycle',
          monitoredTalentIds: [],
          url: 'https://example.com/webhooks/tenant-root',
          events: ['customer.created'],
          isActive: true,
          lastTriggeredAt: null,
          lastStatus: null,
          consecutiveFailures: 0,
          createdAt: '2026-05-07T08:00:00.000Z',
          secret: null,
          headers: {},
          retryPolicy: { maxRetries: 3, backoffMs: 1000 },
          disabledAt: null,
          updatedAt: '2026-05-07T08:00:00.000Z',
          createdBy: 'user-1',
          updatedBy: 'user-1',
          version: 1,
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<IntegrationManagementScreen tenantId="tenant-1" surface="webhooks" />);

    expect(screen.queryByText('Scope Tree')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Tenant root/i })).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Webhook Endpoints' })).toBeInTheDocument();
    expect(await screen.findByText('All talents', { selector: 'td' })).toBeInTheDocument();
  });

  it('renders localized integration management copy for zh locale', async () => {
    const user = userEvent.setup();
    localeState.locale = 'zh_HANS';

    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return organizationTreeResponse;
      }

      if (path === '/api/v1/configuration-entity/social-platform?includeInactive=false&page=1&pageSize=100') {
        return [];
      }

      if (path === '/api/v1/integration/adapters?includeInherited=true&includeDisabled=true') {
        return [];
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<IntegrationManagementScreen tenantId="tenant-1" />);

    expect(await screen.findByRole('heading', { name: '集成管理' })).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /租户根/i }));
    expect(await screen.findByText('租户适配器')).toBeInTheDocument();
    expect(await screen.findByText('尚未配置适配器')).toBeInTheDocument();
  });
});
