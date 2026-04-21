import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IntegrationManagementScreen } from '@/domains/integration-management/screens/IntegrationManagementScreen';
import { ApiRequestError } from '@/platform/http/api';
import { type RuntimeLocale } from '@/platform/runtime/locale/locale-provider';

const mockRequest = vi.fn();
const mockRequestEnvelope = vi.fn();
const mockReplace = vi.fn();
let searchQuery = '';
let pathname = '/tenant/tenant-1/integration-management';
const localeState = {
  currentLocale: 'en' as RuntimeLocale,
  selectedLocale: 'en' as string,
  copy: null,
  setLocale: vi.fn(),
  availableLocales: ['en', 'zh', 'ja'] as RuntimeLocale[],
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

async function selectTenantRootScope(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: /Tenant root/i }));
}

async function selectSubsidiaryScope(user: ReturnType<typeof userEvent.setup>) {
  await user.click((await screen.findAllByRole('button', { name: /Tokyo Branch/i }))[0]);
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
  useRuntimeLocale: () => localeState,
}));

describe('IntegrationManagementScreen', () => {
  beforeEach(() => {
    searchQuery = '';
    pathname = '/tenant/tenant-1/integration-management';
    localeState.currentLocale = 'en';
    localeState.selectedLocale = 'en';
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
    let platformCalls = 0;

    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return organizationTreeResponse;
      }

      if (path === '/api/v1/configuration-entity/social-platform?includeInactive=false&page=1&pageSize=100') {
        platformCalls += 1;
        return [
          {
            id: 'platform-1',
            code: 'BILIBILI',
            name: 'Bilibili',
            nameEn: 'Bilibili',
            sortOrder: 0,
            isActive: true,
            version: 1,
            displayName: 'Bilibili',
          },
        ];
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
            nameEn: 'Bilibili Export',
            nameZh: null,
            nameJa: null,
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
          nameEn: 'Bilibili Export',
          nameZh: null,
          nameJa: null,
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
    expect(screen.queryByText('BILI_EXPORT')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'API Keys' })).not.toBeInTheDocument();

    expect(emailConfigCalls).toBe(0);
    expect(consumerCalls).toBe(0);
    expect(webhookCalls).toBe(0);
    expect(adapterCalls).toBe(0);
    expect(platformCalls).toBe(0);

    await selectTenantRootScope(user);

    expect(await screen.findByText('BILI_EXPORT')).toBeInTheDocument();
    expect(
      screen.getByText(
        'API clients stay in Account Center and do not appear in tenant workspaces. Use this scope for adapters, webhooks, and email.',
      ),
    ).toBeInTheDocument();
    expect(adapterCalls).toBe(1);
    expect(platformCalls).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Email' }));

    expect(await screen.findByRole('heading', { name: 'Email Templates' })).toBeInTheDocument();
    expect(screen.queryByText('AC-only email configuration')).not.toBeInTheDocument();
    expect(emailConfigCalls).toBe(0);
  });

  it('uses 分目录 wording in zh_HANS tenant scope copy instead of 子公司', async () => {
    localeState.currentLocale = 'zh';
    localeState.selectedLocale = 'zh_HANS';

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
            name: 'Bilibili',
            nameEn: 'Bilibili',
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
            nameEn: 'Tokyo Sync',
            nameZh: null,
            nameJa: null,
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
          nameEn: 'Tokyo Sync',
          nameZh: null,
          nameJa: null,
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
    expect(screen.queryByRole('button', { name: 'Webhooks' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Email' })).not.toBeInTheDocument();
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
            name: 'Bilibili',
            nameEn: 'Bilibili',
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
            nameEn: 'Bilibili Export',
            nameZh: null,
            nameJa: null,
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
          nameEn: 'Bilibili Export',
          nameZh: null,
          nameJa: null,
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
            name: 'CRM Sync',
            nameEn: 'CRM Sync',
            nameZh: null,
            nameJa: null,
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
            nameEn: 'Welcome Email',
            nameZh: null,
            nameJa: null,
            subjectEn: 'Welcome to TCRN',
            subjectZh: null,
            subjectJa: null,
            bodyHtmlEn: '<p>Hello {{name}}</p>',
            bodyHtmlZh: null,
            bodyHtmlJa: null,
            bodyTextEn: 'Hello {{name}}',
            bodyTextZh: null,
            bodyTextJa: null,
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

    await user.click(screen.getByRole('button', { name: 'API Keys' }));

    expect(mockReplace).toHaveBeenCalledWith('/ac/tenant-ac/integration-management?tab=api-keys');
    expect(await screen.findByText('CRM_SYNC')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Generate key' }));
    expect(await screen.findByText('Generate API key for CRM_SYNC?')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Generate key' })[1]);

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

    await user.click(screen.getByRole('button', { name: 'Email' }));

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
      nameEn: `Adapter ${index + 1}`,
      nameZh: null,
      nameJa: null,
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
            name: 'Bilibili',
            nameEn: 'Bilibili',
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
          nameEn: 'Adapter 1',
          nameZh: null,
          nameJa: null,
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

    expect(await screen.findByText('ADAPTER_21')).toBeInTheDocument();
    expect(screen.queryByText('ADAPTER_01')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Rows per page' }), '50');

    expect(await screen.findByText('ADAPTER_25')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
    expect(screen.getByText('ADAPTER_01')).toBeInTheDocument();
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
            name: 'PII Platform',
            nameEn: 'PII Platform',
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
            nameEn: 'PII Relay',
            nameZh: null,
            nameJa: null,
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
          nameEn: 'PII Relay',
          nameZh: null,
          nameJa: null,
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

      if (path === '/api/v1/integration/adapters/adapter-1/configs/client_secret/reveal' && init?.method === 'POST') {
        return {
          configKey: 'client_secret',
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
                configKey: 'client_secret',
                configValue: 'revealed-secret-value',
              },
              {
                configKey: 'base_url',
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
    expect(await screen.findByDisplayValue('******')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reveal' }));

    expect(await screen.findByDisplayValue('revealed-secret-value')).toBeInTheDocument();

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

  it('renders localized integration management copy for zh locale', async () => {
    const user = userEvent.setup();
    localeState.currentLocale = 'zh';

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
