import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { TenantEditorScreen } from '@/domains/platform-tenant-management/screens/TenantEditorScreen';

const mockRequest = vi.fn();
const mockReplace = vi.fn();
const localeState = {
  currentLocale: 'en' as 'en' | 'zh' | 'ja',
  selectedLocale: 'en' as 'en' | 'zh_HANS' | 'ja',
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    session: {
      tenantName: 'AC Tenant',
      tenantTier: 'ac',
      user: {
        displayName: 'AC Admin',
        username: 'ac.admin',
        email: 'ac@example.com',
      },
    },
    request: mockRequest,
  }),
}));

vi.mock('@/platform/runtime/locale/locale-provider', () => ({
  useRuntimeLocale: () => localeState,
}));

describe('TenantEditorScreen', () => {
  beforeEach(() => {
    localeState.currentLocale = 'en';
    localeState.selectedLocale = 'en';
    mockRequest.mockReset();
    mockReplace.mockReset();
  });

  it('provisions a tenant from the dedicated create page and redirects to its editor', async () => {
    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/tenants' && init?.method === 'POST') {
        return {
          id: 'tenant-new',
          code: 'BETA',
          name: 'Beta Entertainment',
          schemaName: 'tenant_beta',
          tier: 'standard',
          isActive: true,
          settings: {
            maxTalents: 25,
          },
          stats: {
            subsidiaryCount: 0,
            talentCount: 0,
            userCount: 1,
          },
          createdAt: '2026-04-17T02:00:00.000Z',
          updatedAt: '2026-04-17T02:00:00.000Z',
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<TenantEditorScreen acTenantId="tenant-ac" mode="create" />);

    fireEvent.change(screen.getByLabelText('Tenant code'), {
      target: { value: 'beta' },
    });
    fireEvent.change(screen.getByLabelText('Tenant name'), {
      target: { value: 'Beta Entertainment' },
    });
    fireEvent.change(screen.getByLabelText('Max talents'), {
      target: { value: '25' },
    });
    fireEvent.change(screen.getByLabelText('Admin username'), {
      target: { value: 'beta.admin' },
    });
    fireEvent.change(screen.getByLabelText('Admin email'), {
      target: { value: 'beta@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Admin password'), {
      target: { value: 'SuperSecure1234' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create tenant' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/tenants',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });
    expect(mockReplace).toHaveBeenCalledWith('/ac/tenant-ac/tenants/tenant-new');
  });

  it('loads and updates a tenant from the dedicated edit page', async () => {
    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/tenants/tenant-1' && !init) {
        return {
          id: 'tenant-1',
          code: 'ALPHA',
          name: 'Alpha Entertainment',
          schemaName: 'tenant_alpha',
          tier: 'standard',
          isActive: true,
          settings: {
            maxTalents: 10,
            maxCustomersPerTalent: 200,
            features: ['homepage'],
          },
          stats: {
            subsidiaryCount: 1,
            talentCount: 4,
            userCount: 5,
          },
          createdAt: '2026-04-17T00:00:00.000Z',
          updatedAt: '2026-04-17T01:00:00.000Z',
        };
      }

      if (path === '/api/v1/email/tenants/tenant-1/sending-domains' && !init) {
        return {
          tenantId: 'tenant-1',
          domains: [
            {
              id: 'domain-1',
              domain: 'mail.alpha.example.com',
              status: 'pending_dns',
              dnsRecords: [
                {
                  type: 'TXT',
                  host: '_tcrn-email.mail.alpha.example.com',
                  value: 'tcrn-email-verification=alpha-token',
                },
              ],
            },
          ],
          defaultDomainId: null,
        };
      }

      if (path === '/api/v1/tenants/tenant-1' && init?.method === 'PATCH') {
        return {
          id: 'tenant-1',
          code: 'ALPHA',
          name: 'Alpha Entertainment Updated',
          schemaName: 'tenant_alpha',
          tier: 'standard',
          isActive: true,
          settings: {
            maxTalents: 12,
            maxCustomersPerTalent: 200,
            features: ['homepage'],
          },
          stats: {
            subsidiaryCount: 1,
            talentCount: 4,
            userCount: 5,
          },
          createdAt: '2026-04-17T00:00:00.000Z',
          updatedAt: '2026-04-17T02:00:00.000Z',
        };
      }

      if (path === '/api/v1/email/tenants/tenant-1/sending-domains' && init?.method === 'PATCH') {
        return {
          tenantId: 'tenant-1',
          domains: [
            {
              id: 'domain-1',
              domain: 'mail.alpha.example.com',
              status: 'verified',
              dnsRecords: [
                {
                  type: 'TXT',
                  host: '_tcrn-email.mail.alpha.example.com',
                  value: 'tcrn-email-verification=alpha-token',
                },
              ],
            },
          ],
          defaultDomainId: 'domain-1',
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<TenantEditorScreen acTenantId="tenant-ac" managedTenantId="tenant-1" mode="edit" />);

    expect(await screen.findByRole('heading', { name: 'Alpha Entertainment' })).toBeInTheDocument();
    expect(screen.getByLabelText('Tenant code')).toHaveValue('ALPHA');
    expect(screen.getByText('Tier: Standard')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Email sending domains' })).toBeInTheDocument();
    expect(screen.getByText('mail.alpha.example.com')).toBeInTheDocument();
    expect(screen.getByText('_tcrn-email.mail.alpha.example.com')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Tenant name'), {
      target: { value: 'Alpha Entertainment Updated' },
    });
    fireEvent.change(screen.getByLabelText('Max talents'), {
      target: { value: '12' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/tenants/tenant-1',
        expect.objectContaining({
          method: 'PATCH',
        }),
      );
    });

    expect(await screen.findByText('Alpha Entertainment Updated was updated.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Sending domain hostname: mail.alpha.example.com'), {
      target: { value: 'sender.alpha.example.com' },
    });
    fireEvent.change(screen.getByLabelText('Sending domain status: sender.alpha.example.com'), {
      target: { value: 'verified' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save sending domains' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/email/tenants/tenant-1/sending-domains',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('"domain":"sender.alpha.example.com"'),
        }),
      );
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/email/tenants/tenant-1/sending-domains',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('"status":"verified"'),
        }),
      );
    });
  });

  it('renders localized sending-domain copy in Chinese locale', async () => {
    localeState.currentLocale = 'zh';
    localeState.selectedLocale = 'zh_HANS';

    type SendingDomainsResponse = {
      tenantId: string;
      domains: Array<{
        id: string;
        domain: string;
        status: 'pending_dns' | 'verified' | 'disabled';
        dnsRecords: Array<{ type: string; host: string; value: string }>;
      }>;
      defaultDomainId: string | null;
    };

    let resolveSendingDomains!: (value: SendingDomainsResponse) => void;

    const sendingDomainsPromise = new Promise<SendingDomainsResponse>((resolve) => {
      resolveSendingDomains = resolve;
    });

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/tenants/tenant-1' && !init) {
        return {
          id: 'tenant-1',
          code: 'ALPHA',
          name: 'Alpha Entertainment',
          schemaName: 'tenant_alpha',
          tier: 'standard',
          isActive: true,
          settings: {
            maxTalents: 10,
            maxCustomersPerTalent: 200,
            features: ['homepage'],
          },
          stats: {
            subsidiaryCount: 1,
            talentCount: 4,
            userCount: 5,
          },
          createdAt: '2026-04-17T00:00:00.000Z',
          updatedAt: '2026-04-17T01:00:00.000Z',
        };
      }

      if (path === '/api/v1/email/tenants/tenant-1/sending-domains' && !init) {
        return sendingDomainsPromise;
      }

      if (path === '/api/v1/email/tenants/tenant-1/sending-domains' && init?.method === 'PATCH') {
        return {
          tenantId: 'tenant-1',
          domains: [
            {
              id: 'domain-1',
              domain: 'mail.alpha.example.com',
              status: 'verified',
              dnsRecords: [
                {
                  type: 'TXT',
                  host: '_tcrn-email.mail.alpha.example.com',
                  value: 'tcrn-email-verification=alpha-token',
                },
              ],
            },
          ],
          defaultDomainId: null,
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<TenantEditorScreen acTenantId="tenant-ac" managedTenantId="tenant-1" mode="edit" />);

    expect(await screen.findByRole('heading', { name: 'Alpha Entertainment' })).toBeInTheDocument();
    expect(screen.getByText('正在加载发件域名…')).toBeInTheDocument();

    resolveSendingDomains({
      tenantId: 'tenant-1',
      domains: [],
      defaultDomainId: null,
    });

    expect(await screen.findByRole('heading', { name: '发件域名' })).toBeInTheDocument();
    expect(screen.getByText('管理当前租户由客户提供的发件域名，并向客户提供 DNS 记录完成配置。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新增发件域名' })).toBeInTheDocument();
    expect(screen.getByText('当前租户还没有添加客户发件域名。')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('新增发件域名'), {
      target: { value: 'mail.alpha.example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: '新增发件域名' }));

    expect(screen.getByLabelText('发件域名主机名: mail.alpha.example.com')).toHaveValue('mail.alpha.example.com');
    expect(screen.getByLabelText('发件域名状态: mail.alpha.example.com')).toHaveDisplayValue('等待 DNS');

    fireEvent.change(screen.getByLabelText('发件域名状态: mail.alpha.example.com'), {
      target: { value: 'verified' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存发件域名' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/email/tenants/tenant-1/sending-domains',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('"status":"verified"'),
        }),
      );
    });

    expect(await screen.findByText('发件域名已保存。')).toBeInTheDocument();
  });
});
