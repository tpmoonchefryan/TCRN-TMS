import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SupportedUiLocale } from '@tcrn/shared';

import type { ConfigEntityRecord } from '@/domains/config-dictionary-settings/api/settings.api';
import { TenantSettingsScreen } from '@/domains/config-dictionary-settings/screens/TenantSettingsScreen';
import { localizedFixture } from '@/domains/config-dictionary-settings/testing/localized-fixtures';

const mockRequest = vi.fn();
const replace = vi.fn();
const pathname = '/tenant/tenant-1/settings';
let currentSearch = '';
const localeState = {
  locale: 'en' as SupportedUiLocale,
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
  useUiLocale: () => localeState,
}));

function buildConfigEntityRecord(overrides: Partial<ConfigEntityRecord> = {}): ConfigEntityRecord {
  return {
    id: 'entity-1',
    ownerType: 'tenant',
    ownerId: null,
    code: 'DEFAULT_STORE',
    name: localizedFixture('Default Store'),
    localizedName: 'Default Store',
    description: localizedFixture('Default profile store'),
    localizedDescription: 'Default profile store',
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
    name: localizedFixture('Active customer', { zh_HANS: '活跃客户' }),
    localizedName: 'Active customer',
    description: localizedFixture('Currently active'),
    localizedDescription: 'Currently active',
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
    localeState.locale = 'en';
  });

  it('passes a localized settings section navigation label to the shared settings layout', async () => {
    localeState.locale = 'zh_HANS';

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

      if (path === '/api/v1/email/sender-domains' && !init) {
        return {
          domains: [
            {
              id: 'domain-verified',
              domain: 'mail.alpha.example.com',
              status: 'verified',
              selectable: true,
            },
            {
              id: 'domain-pending',
              domain: 'pending.alpha.example.com',
              status: 'pending_dns',
              selectable: false,
            },
          ],
          defaultDomainId: 'domain-verified',
          fromName: 'Alpha Support',
          replyTo: 'support@alpha.example.com',
        };
      }

      if (path === '/api/v1/email/sender-domains' && init?.method === 'PATCH') {
        return {
          domains: [
            {
              id: 'domain-verified',
              domain: 'mail.alpha.example.com',
              status: 'verified',
              selectable: true,
            },
          ],
          defaultDomainId: 'domain-verified',
          fromName: 'Alpha Support',
          replyTo: 'help@alpha.example.com',
        };
      }

      if (path === '/api/v1/auth/sso/admin/providers?ownerScope=tenant_product') {
        return [
          {
            id: 'provider-1',
            tenantId: 'tenant-1',
            code: 'mock-sso',
            displayName: localizedFixture('Mock SSO'),
            providerType: 'oidc',
            ownerScope: 'tenant_product',
            issuerUrl: 'https://idp.test.tcrn.local/p3',
            authorizationUrl: null,
            tokenUrl: null,
            userinfoUrl: null,
            jwksUrl: null,
            clientId: 'tcrn-local',
            clientSecretConfigured: true,
            redirectUri: 'http://localhost:4000/api/v1/auth/sso/callback/mock-sso',
            scopes: ['openid', 'profile', 'email'],
            claimMappingPolicy: {
              subject: 'sub',
              email: 'email',
              displayName: 'name',
              emailVerified: 'email_verified',
            },
            enabled: true,
          },
        ];
      }

      if (path === '/api/v1/auth/sso/admin/providers/mock-sso' && init?.method === 'PATCH') {
        return {
          id: 'provider-1',
          tenantId: 'tenant-1',
          code: 'mock-sso',
          displayName: localizedFixture('Mock SSO Edited'),
          providerType: 'oidc',
          ownerScope: 'tenant_product',
          issuerUrl: 'https://idp.test.tcrn.local/p3',
          authorizationUrl: null,
          tokenUrl: null,
          userinfoUrl: null,
          jwksUrl: null,
          clientId: 'tcrn-local-edited',
          clientSecretConfigured: true,
          redirectUri: 'http://localhost:4000/api/v1/auth/sso/callback/mock-sso',
          scopes: ['openid', 'profile', 'email'],
          claimMappingPolicy: {
            subject: 'sub',
            email: 'email',
            displayName: 'name',
            emailVerified: 'email_verified',
          },
          enabled: true,
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

      if (
        path ===
        '/api/v1/system-dictionary/CUSTOMER_STATUS?includeInactive=false&page=1&pageSize=20'
      ) {
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
            name: localizedFixture('Default Store'),
            localizedName: 'Default Store',
          }),
        ]);
      }

      if (
        path ===
        '/api/v1/talents/custom-domain-bindings?scopeType=tenant&includeInherited=true&includeInactive=false'
      ) {
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

      if (path === '/api/v1/public-presence/assets?assetKind=template&scopeType=tenant') {
        return [];
      }

      if (path === '/api/v1/public-presence/assets?assetKind=component&scopeType=tenant') {
        return [];
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
      screen.getByText(
        'Open the tenant-level business workspace for cross-talent operations, reporting, and workspace handoff.'
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/future reporting modules|page-sprawl|configuration inventory/i)
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Configuration Entity Management' }));
    expect(
      await screen.findByRole('button', { name: /Profile Store profile-store/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Maintain tenant-owned configuration families, homepage template assets, and homepage component assets in one catalog.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Homepage Template Asset/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Homepage Component Asset/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /New profile store/i })).not.toBeInTheDocument();
    expect(mockRequest).not.toHaveBeenCalledWith(expect.stringContaining('/api/v1/profile-stores'));

    fireEvent.click(screen.getByRole('button', { name: /Profile Store profile-store/i }));
    expect(await screen.findByText('Default Store')).toBeInTheDocument();
    expect(mockRequest).toHaveBeenCalledWith(
      '/api/v1/configuration-entity/profile-store?scopeType=tenant&includeInherited=true&includeDisabled=true&includeInactive=false&ownerOnly=false&page=1&pageSize=20&sort=sortOrder',
      expect.anything()
    );
    expect(
      screen.queryByText(/future reporting modules|page-sprawl|configuration inventory/i)
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Custom Domain custom-domain/i }));
    expect(await screen.findByText('tenant.example.com')).toBeInTheDocument();
    expect(mockRequest).toHaveBeenCalledWith(
      '/api/v1/talents/custom-domain-bindings?scopeType=tenant&includeInherited=true&includeInactive=false'
    );

    fireEvent.click(screen.getByRole('button', { name: 'System Dictionary' }));
    expect((await screen.findAllByText('Customer Status')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Active customer')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('navigation', { name: 'Settings categories' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Defaults' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getAllByText('Date format').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Currency').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Customer import').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Password policy').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Email' }));
    expect(await screen.findByText('mail.alpha.example.com')).toBeInTheDocument();
    expect(screen.getByText('pending.alpha.example.com')).toBeInTheDocument();
    expect(screen.getByLabelText('Default sending domain')).toHaveValue('domain-verified');
    expect(
      screen.queryByText(/Tencent Cloud Secret|Secret ID|Secret Key|provider credentials/i)
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Single Sign-On' }));
    expect(await screen.findByText('Mock SSO')).toBeInTheDocument();
    expect(screen.getByText('mock-sso')).toBeInTheDocument();
    expect(screen.getByText('Configured (redacted)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add provider' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit provider' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Disable provider' })).toBeInTheDocument();
    expect(screen.queryByText('TEST_P3_SSO_SECRET')).not.toBeInTheDocument();
    expect(mockRequest).toHaveBeenCalledWith(
      '/api/v1/auth/sso/admin/providers?ownerScope=tenant_product'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Edit provider' }));
    expect(screen.getByLabelText('Provider code')).toHaveValue('mock-sso');
    expect(screen.getByLabelText('Provider code')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Keep secret' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Replace secret' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear secret' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Check discovery' }));
    expect(await screen.findByText(/Discovery fields are ready to save/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('English display name'), {
      target: { value: 'Mock SSO Edited' },
    });
    fireEvent.change(screen.getByLabelText('Client ID'), {
      target: { value: 'tcrn-local-edited' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save provider' }));
    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/auth/sso/admin/providers/mock-sso',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('tcrn-local-edited'),
        })
      );
    });
    expect(await screen.findByText('Mock SSO Edited')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Email' }));
    fireEvent.change(screen.getByLabelText('Reply-to address'), {
      target: { value: 'help@alpha.example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save email sender preferences' }));
    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/email/sender-domains',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('help@alpha.example.com'),
        })
      );
    });
    expect(screen.queryByLabelText('Default language')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Defaults' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit defaults' }));
    expect(
      screen.getByText('Review and adjust the defaults applied across this tenant.')
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/backend defaults contract|settings payload/i)
    ).not.toBeInTheDocument();
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
              allowMarshmallow: true,
              passwordPolicy: {
                minLength: 12,
                requireSpecial: true,
                maxAgeDays: 90,
              },
            },
            version: 3,
          }),
        })
      );
    });

    expect(await screen.findByText('Tenant defaults saved.')).toBeInTheDocument();
  });

  it('loads and saves tenant Turnstile settings without revealing the stored secret', async () => {
    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/organization/settings' && !init) {
        return {
          scopeType: 'tenant',
          scopeId: null,
          settings: {
            defaultLanguage: 'en',
            timezone: 'UTC',
            allowCustomHomepage: true,
          },
          overrides: [],
          inheritedFrom: {},
          version: 1,
        };
      }

      if (path === '/api/v1/system-dictionary') {
        return [];
      }

      if (path === '/api/v1/organization/settings/turnstile' && !init) {
        return {
          siteKey: 'tenant-site-key',
          effectiveSiteKey: 'tenant-site-key',
          source: 'tenant',
          environment: 'staging',
          siteKeyConfigured: true,
          secretKeyConfigured: true,
          providerReady: true,
          runtimeBypass: false,
          ready: true,
          secretKeyMasked: '********',
        };
      }

      if (path === '/api/v1/organization/settings/turnstile' && init?.method === 'PATCH') {
        return {
          siteKey: 'tenant-site-key-updated',
          effectiveSiteKey: 'tenant-site-key-updated',
          source: 'tenant',
          environment: 'staging',
          siteKeyConfigured: true,
          secretKeyConfigured: true,
          providerReady: true,
          runtimeBypass: false,
          ready: true,
          secretKeyMasked: '********',
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<TenantSettingsScreen tenantId="tenant-1" />);

    expect(await screen.findByRole('heading', { name: 'Tenant Settings' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'CAPTCHA' }));

    expect(await screen.findByLabelText('Cloudflare Turnstile Site Key')).toHaveValue(
      'tenant-site-key'
    );
    expect(screen.getByLabelText('Cloudflare Turnstile Secret Key')).toHaveValue('');
    expect(screen.queryByDisplayValue('tenant-secret-key')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear secret' }));
    expect(screen.getByRole('button', { name: 'Save Turnstile settings' })).toBeDisabled();
    fireEvent.click(
      screen.getByLabelText(/I understand that staging and production will be unavailable/i)
    );
    expect(screen.getByRole('button', { name: 'Save Turnstile settings' })).not.toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Replace secret' }));
    fireEvent.change(screen.getByLabelText('Cloudflare Turnstile Site Key'), {
      target: { value: 'tenant-site-key-updated' },
    });
    fireEvent.change(screen.getByLabelText('Cloudflare Turnstile Secret Key'), {
      target: { value: 'tenant-secret-key-rotated' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Turnstile settings' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/organization/settings/turnstile',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            siteKey: 'tenant-site-key-updated',
            secretKeyMutation: 'replace',
            secretKey: 'tenant-secret-key-rotated',
          }),
        })
      );
    });
    expect(await screen.findByText('Turnstile settings saved.')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('tenant-secret-key-rotated')).not.toBeInTheDocument();
  });

  it('renders zh copy when runtime locale is zh', async () => {
    localeState.locale = 'zh_HANS';

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
      '/tenant/tenant-1/business'
    );
  });

  it('keeps tenant defaults drawer copy free of backend contract wording in zh-HANS', async () => {
    localeState.locale = 'zh_HANS';

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/organization/settings' && !init) {
        return {
          scopeType: 'tenant',
          scopeId: null,
          settings: {
            defaultLanguage: 'zh_HANS',
            timezone: 'Asia/Shanghai',
            dateFormat: 'YYYY-MM-DD',
            currency: 'CNY',
            customerImportEnabled: true,
            maxImportRows: 50000,
            totpRequiredForAll: false,
            allowCustomHomepage: true,
            allowMarshmallow: true,
            passwordPolicy: {
              minLength: 12,
              requireSpecial: true,
              maxAgeDays: 90,
            },
          },
          overrides: [],
          inheritedFrom: {
            defaultLanguage: 'tenant',
            timezone: 'tenant',
            dateFormat: 'tenant',
            currency: 'tenant',
            customerImportEnabled: 'tenant',
            maxImportRows: 'tenant',
            totpRequiredForAll: 'tenant',
            allowCustomHomepage: 'tenant',
            allowMarshmallow: 'tenant',
            passwordPolicy: 'tenant',
          },
          version: 2,
        };
      }

      if (path === '/api/v1/email/sender-domains' && !init) {
        return {
          domains: [],
          defaultDomainId: null,
          fromName: '',
          replyTo: '',
        };
      }

      if (path === '/api/v1/system-dictionary') {
        return [];
      }

      if (
        path.startsWith('/api/v1/config-entity/') ||
        path.startsWith('/api/v1/system-dictionary/')
      ) {
        return emptyConfigEntityEnvelope;
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<TenantSettingsScreen tenantId="tenant-1" />);

    await screen.findByRole('heading', { name: '租户设置' });
    fireEvent.click(screen.getByRole('button', { name: '设置' }));
    fireEvent.click(screen.getByRole('button', { name: '编辑默认值' }));

    expect(screen.getByText('查看并调整整个租户范围内应用的默认设置。')).toBeInTheDocument();
    expect(screen.queryByText(/后端|契约|payload/i)).not.toBeInTheDocument();
  });
});
