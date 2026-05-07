import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ConfigEntityRecord } from '@/domains/config-dictionary-settings/api/settings.api';
import { TenantSettingsScreen } from '@/domains/config-dictionary-settings/screens/TenantSettingsScreen';
import type { RuntimeLocale } from '@/platform/runtime/locale/locale-provider';

const mockRequest = vi.fn();
const replace = vi.fn();
const pathname = '/tenant/tenant-1/settings';
let currentSearch = '';
const localeState = {
  currentLocale: 'en' as RuntimeLocale,
};


vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({
    replace,
  }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    request: mockRequest,
    requestEnvelope: mockRequest,
    session: {
      tenantName: 'Test Tenant',
      tenantTier: 'tenant',
      tenantCode: 'TENANT_TEST',
    },
  }),
}));

vi.mock('@/platform/runtime/locale/locale-provider', () => ({
  useRuntimeLocale: () => localeState,
}));

function buildConfigEntityRecord(overrides: Partial<ConfigEntityRecord> = {}): ConfigEntityRecord {
  return {
    id: 'entity-1',
    ownerType: 'tenant',
    ownerId: null,
    code: 'DEFAULT_STORE',
    name: 'Default Store',
    nameEn: 'Default Store',
    nameZh: null,
    nameJa: null,
    translations: { en: 'Default Store' },
    description: 'Default profile store',
    descriptionEn: 'Default profile store',
    descriptionZh: null,
    descriptionJa: null,
    descriptionTranslations: { en: 'Default profile store' },
    sortOrder: 1,
    isActive: true,
    isForceUse: false,
    isSystem: false,
    isInherited: false,
    isDisabledHere: false,
    canDisable: false,
    extraData: null,
    createdAt: '2026-04-17T00:00:00.000Z',
    updatedAt: '2026-04-17T00:10:00.000Z',
    version: 1,
    ...overrides,
  };
}

function buildConfigEntityEnvelope(items: ConfigEntityRecord[]) {
  return {
    success: true,
    data: items,
    meta: {
      pagination: {
        page: 1,
        pageSize: 20,
        totalCount: items.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    },
  };
}

const emptyConfigEntityEnvelope = buildConfigEntityEnvelope([]);

const dictionaryItemsResponse = [
  {
    id: 'dictionary-item-1',
    dictionaryCode: 'CUSTOMER_STATUS',
    code: 'ACTIVE',
    nameEn: 'Active customer',
    nameZh: '活跃客户',
    nameJa: null,
    name: 'Active customer',
    descriptionEn: 'Currently active',
    descriptionZh: null,
    descriptionJa: null,
    sortOrder: 0,
    isActive: true,
    extraData: null,
    createdAt: '2026-04-17T00:00:00.000Z',
    updatedAt: '2026-04-17T00:10:00.000Z',
    version: 1,
  },
];

describe('TenantSettingsScreen', () => {
  beforeEach(() => {
    currentSearch = '';
    mockRequest.mockReset();
    localeState.currentLocale = 'en';
  });

  it('passes a localized settings section navigation label to the shared settings layout', async () => {
    localeState.currentLocale = 'zh';

    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/organization/settings') {
        return {
          scopeType: 'tenant',
          scopeId: null,
          settings: {
            defaultLanguage: 'zh-CN',
            timezone: 'Asia/Shanghai',
            allowCustomHomepage: true,
          },
          overrides: [],
          inheritedFrom: {
            defaultLanguage: 'tenant',
            timezone: 'tenant',
            allowCustomHomepage: 'tenant',
          },
          version: 1,
        };
      }

      if (path === '/api/v1/system-dictionary') {
        return [
          {
            type: 'language',
            name: 'Language',
            description: null,
            count: 2,
          },
        ];
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<TenantSettingsScreen tenantId="tenant-1" />);

    expect(await screen.findByRole('heading', { name: '租户设置' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '设置分区' })).toBeInTheDocument();
  });

  it('loads tenant settings resources and saves updated defaults', async () => {
    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/organization/settings' && !init) {
        return {
          scopeType: 'tenant',
          scopeId: null,
          settings: {
            defaultLanguage: 'zh-CN',
            timezone: 'Asia/Shanghai',
            allowCustomHomepage: true,
          },
          overrides: ['timezone'],
          inheritedFrom: {
            defaultLanguage: 'tenant',
            timezone: 'tenant',
            allowCustomHomepage: 'tenant',
          },
          version: 3,
        };
      }

      if (path === '/api/v1/system-dictionary') {
        return [
          {
            type: 'CUSTOMER_STATUS',
            name: 'Customer Status',
            description: 'Customer lifecycle flags',
            count: 4,
          },
        ];
      }

      if (path === '/api/v1/system-dictionary/CUSTOMER_STATUS?includeInactive=false&page=1&pageSize=20') {
        return {
          success: true,
          data: dictionaryItemsResponse,
          meta: {
            pagination: {
              page: 1,
              pageSize: 20,
              totalCount: dictionaryItemsResponse.length,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            },
          },
        };
      }

      if (
        path ===
        '/api/v1/configuration-entity/business-segment?scopeType=tenant&includeInherited=true&includeDisabled=true&includeInactive=false&ownerOnly=false&page=1&pageSize=20&sort=sortOrder'
      ) {
        return emptyConfigEntityEnvelope;
      }

      if (
        path ===
        '/api/v1/configuration-entity/profile-store?scopeType=tenant&includeInherited=true&includeDisabled=true&includeInactive=false&ownerOnly=false&page=1&pageSize=20&sort=sortOrder'
      ) {
        return buildConfigEntityEnvelope([
          buildConfigEntityRecord({
            id: 'store-1',
            code: 'DEFAULT_STORE',
            name: 'Default Store',
          }),
        ]);
      }

      if (path === '/api/v1/talents/custom-domain-bindings?scopeType=tenant&includeInherited=true&includeInactive=false') {
        return {
          domains: [
            {
              id: 'tenant-domain',
              hostname: 'tenant.example.com',
              ownerType: 'tenant',
              ownerId: null,
              ownerDepth: null,
              inherited: false,
              selected: true,
              customDomainVerified: true,
              customDomainVerificationToken: null,
              customDomainSslMode: 'cloudflare',
              isActive: true,
              routeMode: 'scoped_talent_path',
            },
          ],
        };
      }

      if (path === '/api/v1/organization/settings' && init?.method === 'PATCH') {
        return {
          scopeType: 'tenant',
          scopeId: null,
          settings: {
            defaultLanguage: 'ja',
            timezone: 'Asia/Shanghai',
            allowCustomHomepage: true,
          },
          overrides: ['defaultLanguage', 'timezone'],
          inheritedFrom: {
            defaultLanguage: 'tenant',
            timezone: 'tenant',
            allowCustomHomepage: 'tenant',
          },
          version: 4,
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<TenantSettingsScreen tenantId="tenant-1" />);

    expect(await screen.findByRole('heading', { name: 'Tenant Settings' })).toBeInTheDocument();
    expect(
      screen.getByText('Open the tenant-level business workspace for cross-talent operations, reporting, and workspace handoff.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/future reporting modules|page-sprawl|configuration inventory/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Configuration Entity Management' }));
    expect(await screen.findByRole('button', { name: /Profile Store profile-store/i })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Maintain tenant-owned configuration families, including Profile Store, in one scoped workspace inherited by subsidiary and talent scopes.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /New profile store/i })).not.toBeInTheDocument();
    expect(mockRequest).not.toHaveBeenCalledWith(expect.stringContaining('/api/v1/profile-stores'));

    fireEvent.click(screen.getByRole('button', { name: /Profile Store profile-store/i }));
    expect(await screen.findByText('Default Store')).toBeInTheDocument();
    expect(mockRequest).toHaveBeenCalledWith(
      '/api/v1/configuration-entity/profile-store?scopeType=tenant&includeInherited=true&includeDisabled=true&includeInactive=false&ownerOnly=false&page=1&pageSize=20&sort=sortOrder',
      expect.anything(),
    );
    expect(screen.queryByText(/future reporting modules|page-sprawl|configuration inventory/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Custom Domain custom-domain/i }));
    expect(await screen.findByText('tenant.example.com')).toBeInTheDocument();
    expect(mockRequest).toHaveBeenCalledWith(
      '/api/v1/talents/custom-domain-bindings?scopeType=tenant&includeInherited=true&includeInactive=false',
    );

    fireEvent.click(screen.getByRole('button', { name: 'System Dictionary' }));
    expect((await screen.findAllByText('Customer Status')).length).toBeGreaterThan(0);
    expect(await screen.findByText('Active customer')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getAllByText('Date format').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Currency').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Customer import').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Password policy').length).toBeGreaterThan(0);
    expect(screen.queryByLabelText('Default language')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit defaults' }));
    expect(screen.getByText('Localization')).toBeInTheDocument();
    expect(screen.getByText('Public surfaces')).toBeInTheDocument();
    expect(screen.getAllByText('Customer import').length).toBeGreaterThan(0);
    expect(screen.getByText('Security')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Default language'), {
      target: { value: 'ja' },
    });
    fireEvent.change(screen.getByLabelText('Currency'), {
      target: { value: 'JPY' },
    });
    fireEvent.change(screen.getByLabelText('Max import rows'), {
      target: { value: '25000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save tenant defaults' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/organization/settings',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            settings: {
              defaultLanguage: 'ja',
              timezone: 'Asia/Shanghai',
              dateFormat: 'YYYY-MM-DD',
              currency: 'JPY',
              customerImportEnabled: true,
              maxImportRows: 25000,
              totpRequiredForAll: false,
              allowCustomHomepage: true,
              allowMarshmallow: true,
              passwordPolicy: {
                minLength: 12,
                requireSpecial: true,
                maxAgeDays: 90,
              },
            },
            version: 3,
          }),
        }),
      );
    });

    expect(await screen.findByText('Tenant defaults saved.')).toBeInTheDocument();
  });


  it('renders zh copy when runtime locale is zh', async () => {
    localeState.currentLocale = 'zh';

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/organization/settings' && !init) {
        return {
          scopeType: 'tenant',
          scopeId: null,
          settings: {
            defaultLanguage: 'zh-CN',
            timezone: 'Asia/Shanghai',
            allowCustomHomepage: true,
          },
          overrides: ['timezone'],
          inheritedFrom: {
            defaultLanguage: 'tenant',
            timezone: 'tenant',
            allowCustomHomepage: 'tenant',
          },
          version: 3,
        };
      }

      if (path === '/api/v1/system-dictionary') {
        return [];
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<TenantSettingsScreen tenantId="tenant-1" />);

    expect(await screen.findByRole('heading', { name: '租户设置' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '设置' }));
    expect(screen.queryByRole('button', { name: '保存租户默认值' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '编辑默认值' }));
    expect(await screen.findByRole('button', { name: '保存租户默认值' })).toBeInTheDocument();
  });


  it('includes a tenant business workspace shortcut in the details section', async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/organization/settings') {
        return {
          scopeType: 'tenant',
          scopeId: null,
          settings: {
            defaultLanguage: 'en',
            timezone: 'UTC',
            allowCustomHomepage: true,
          },
          overrides: [],
          inheritedFrom: {
            defaultLanguage: 'tenant',
            timezone: 'tenant',
            allowCustomHomepage: 'tenant',
          },
          version: 1,
        };
      }

      if (path === '/api/v1/system-dictionary') {
        return [];
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<TenantSettingsScreen tenantId="tenant-1" />);

    expect(await screen.findByRole('heading', { name: 'Tenant Settings' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open business workspace' })).toHaveAttribute(
      'href',
      '/tenant/tenant-1/business',
    );
  });
});
