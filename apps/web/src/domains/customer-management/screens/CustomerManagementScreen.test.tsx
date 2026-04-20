import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CustomerManagementScreen } from '@/domains/customer-management/screens/CustomerManagementScreen';

function buildCustomerCopy(overrides: Partial<Record<string, string>> = {}) {
  return {
    actionsColumn: 'Actions',
    activeProfilesHint: 'Lifecycle operations only change active vs inactive visibility.',
    activeProfilesLabel: 'Active Profiles',
    activityActive: 'active',
    activityAll: 'all',
    activityInactive: 'inactive',
    badge: 'Customers',
    customerColumn: 'Customer',
    customerLedgerUnavailableTitle: 'Customer records unavailable',
    currentTenantFallback: 'Current Tenant',
    deactivateConfirm: 'Deactivate customer',
    deactivateDescription:
      'This customer will be hidden from active customer lists until reactivated.',
    deactivateLabel: 'Deactivate',
    deactivateLoadFallback: 'Failed to load customer details for deactivation.',
    deactivatePending: 'Preparing…',
    deactivateRequestFallback: 'Failed to deactivate customer.',
    description:
      'Review customers, membership visibility, and lifecycle status for this talent.',
    directCustomerRecord: 'Direct customer record',
    emptyDescription: 'Change the current search or membership filters to widen the visible customer set.',
    emptyTitle: 'No customers match this filter',
    languageUnset: 'language unset',
    loadLedgerFallback: 'Failed to load customer records.',
    loading: 'Loading customer management…',
    membershipAll: 'all memberships',
    membershipColumn: 'Membership',
    membershipNone: 'No membership records',
    membershipOnlyMembers: 'members',
    membershipOnlyNonMembers: 'non-members',
    membershipRecordsLabel: 'Membership Records',
    membershipVisibleHint: 'visible profiles currently resolve to company customers.',
    profileTypeColumn: 'Profile Type',
    profileTypeCompany: 'company',
    profileTypeIndividual: 'individual',
    reactivateConfirm: 'Reactivate customer',
    reactivateDescription:
      'Reactivating returns this customer to active customer lists and keeps membership history intact.',
    reactivateLabel: 'Reactivate',
    reactivatePending: 'Reactivating…',
    reactivateRequestFallback: 'Failed to reactivate customer.',
    searchPlaceholder: 'Search nickname or customer tags',
    statusActive: 'Active',
    statusColumn: 'Status',
    statusInactive: 'Inactive',
    tenantHint: 'Customer records are managed here.',
    tenantLabel: 'Tenant',
    title: 'Customer Management',
    updatedColumn: 'Updated',
    visibleCustomersHint: 'This reflects the currently loaded page under the active search and filter state.',
    visibleCustomersLabel: 'Visible Customers',
    workspaceSettingsLink: 'Settings',
    ...overrides,
  };
}

const mockRequest = vi.fn();
const replace = vi.fn();
let pathname = '/tenant/tenant-1/talent/talent-1/customers';
let currentSearch = '';

const localeState = {
  currentLocale: 'en',
  copy: {
    common: {
      currentTenant: 'Current Tenant',
    },
    customerManagement: buildCustomerCopy(),
  },
};

HTMLDialogElement.prototype.showModal = vi.fn(function mockShowModal(this: HTMLDialogElement) {
  this.setAttribute('open', '');
});
HTMLDialogElement.prototype.close = vi.fn(function mockClose(this: HTMLDialogElement) {
  this.removeAttribute('open');
});

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    request: mockRequest,
    requestEnvelope: mockRequest,
    session: {
      tenantName: 'Test Tenant',
    },
  }),
}));

vi.mock('@/platform/runtime/locale/locale-provider', () => ({
  useRuntimeLocale: () => localeState,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({
    replace,
  }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

describe('CustomerManagementScreen', () => {
  beforeEach(() => {
    localeState.currentLocale = 'en';
    localeState.copy.common.currentTenant = 'Current Tenant';
    localeState.copy.customerManagement = buildCustomerCopy();
    mockRequest.mockReset();
    replace.mockReset();
    pathname = '/tenant/tenant-1/talent/talent-1/customers';
    currentSearch = '';
    replace.mockImplementation((href: string) => {
      const resolved = new URL(href, 'https://tcrn.local');
      pathname = resolved.pathname;
      currentSearch = resolved.search.startsWith('?') ? resolved.search.slice(1) : resolved.search;
    });
  });

  it('renders localized copy and locale-aware timestamps', async () => {
    localeState.currentLocale = 'zh';
    localeState.copy.common.currentTenant = '当前租户';
    localeState.copy.customerManagement = buildCustomerCopy({
      activeProfilesLabel: '活跃档案',
      badge: '客户',
      customerColumn: '客户',
      currentTenantFallback: '当前租户',
      description: '查看该艺人的客户列表。',
      membershipVisibleHint: '当前可见档案中属于公司客户。',
      membershipRecordsLabel: '会员记录',
      tenantHint: '客户档案统一在这里管理。',
      tenantLabel: '租户',
      title: '客户管理',
      updatedColumn: '更新时间',
      visibleCustomersHint: '这里反映的是当前搜索与筛选条件下已加载的页面结果。',
      visibleCustomersLabel: '当前可见客户',
      workspaceSettingsLink: '设置',
    });

    mockRequest.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 'customer-1',
          profileType: 'individual',
          nickname: 'Aki',
          primaryLanguage: 'ja',
          status: {
            id: 'status-1',
            code: 'active',
            name: 'Active',
            color: '#16a34a',
          },
          tags: [],
          isActive: true,
          companyShortName: null,
          originTalent: null,
          membershipSummary: null,
          createdAt: '2026-04-17T09:00:00.000Z',
          updatedAt: '2026-04-17T10:00:00.000Z',
        },
      ],
      meta: {
        pagination: {
          page: 1,
          pageSize: 20,
          totalCount: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      },
    });

    render(<CustomerManagementScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: '客户管理' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '客户' })).toBeInTheDocument();
    expect(screen.getByText('查看该艺人的客户列表。')).toBeInTheDocument();
    expect(screen.getByText('客户档案统一在这里管理。')).toBeInTheDocument();
    expect(screen.getByText('这里反映的是当前搜索与筛选条件下已加载的页面结果。')).toBeInTheDocument();

    const expectedUpdatedAt = new Intl.DateTimeFormat('zh', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date('2026-04-17T10:00:00.000Z'));

    expect(await screen.findByText(expectedUpdatedAt)).toBeInTheDocument();
  });

  it('hydrates search and filters from the URL and keeps subsequent filter changes shareable', async () => {
    currentSearch = 'search=vip&membership=members&page=2&pageSize=50';

    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/talents/talent-1/customers?page=2&pageSize=50&search=vip&hasMembership=true') {
        return {
          success: true,
          data: [
            {
              id: 'customer-1',
              profileType: 'individual',
              nickname: 'Aki',
              primaryLanguage: 'ja',
              status: {
                id: 'status-1',
                code: 'active',
                name: 'Active',
                color: '#16a34a',
              },
              tags: ['VIP'],
              isActive: true,
              companyShortName: null,
              originTalent: null,
              membershipSummary: {
                highestLevel: {
                  platformCode: 'youtube',
                  platformName: 'YouTube',
                  levelCode: 'GOLD',
                  levelName: 'Gold',
                  color: '#f59e0b',
                },
                activeCount: 1,
                totalCount: 1,
              },
              createdAt: '2026-04-17T09:00:00.000Z',
              updatedAt: '2026-04-17T10:00:00.000Z',
            },
          ],
          meta: {
            pagination: {
              page: 2,
              pageSize: 50,
              totalCount: 51,
              totalPages: 2,
              hasNext: false,
              hasPrev: true,
            },
          },
        };
      }

      if (path === '/api/v1/talents/talent-1/customers?page=1&pageSize=50&search=vip&isActive=false&hasMembership=true') {
        return {
          success: true,
          data: [
            {
              id: 'customer-2',
              profileType: 'company',
              nickname: 'Acme Fans',
              primaryLanguage: 'en',
              status: {
                id: 'status-2',
                code: 'inactive',
                name: 'Inactive',
                color: '#dc2626',
              },
              tags: [],
              isActive: false,
              companyShortName: 'ACME',
              originTalent: {
                id: 'talent-1',
                displayName: 'Talent Prime',
              },
              membershipSummary: null,
              createdAt: '2026-04-17T08:00:00.000Z',
              updatedAt: '2026-04-17T09:30:00.000Z',
            },
          ],
          meta: {
            pagination: {
              page: 1,
              pageSize: 50,
              totalCount: 1,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            },
          },
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<CustomerManagementScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: 'Customer Management' })).toBeInTheDocument();
    expect(await screen.findByText('Aki')).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toHaveValue('vip');

    fireEvent.click(screen.getByRole('button', { name: 'inactive' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/talents/talent-1/customers?page=1&pageSize=50&search=vip&isActive=false&hasMembership=true',
      );
      expect(replace).toHaveBeenCalledWith(
        '/tenant/tenant-1/talent/talent-1/customers?search=vip&activity=inactive&membership=members&pageSize=50',
      );
    });

    expect(await screen.findByText('Acme Fans')).toBeInTheDocument();
    expect(screen.queryByText('Aki')).not.toBeInTheDocument();
  });

  it('deactivates a customer after loading the detail version and refreshes the list', async () => {
    let isActive = true;

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/talents/talent-1/customers?page=1&pageSize=20') {
        return {
          success: true,
          data: [
            {
              id: 'customer-1',
              profileType: 'individual',
              nickname: 'Aki',
              primaryLanguage: 'ja',
              status: {
                id: 'status-1',
                code: isActive ? 'active' : 'inactive',
                name: isActive ? 'Active' : 'Inactive',
                color: isActive ? '#16a34a' : '#dc2626',
              },
              tags: ['VIP'],
              isActive,
              companyShortName: null,
              originTalent: null,
              membershipSummary: null,
              createdAt: '2026-04-17T09:00:00.000Z',
              updatedAt: '2026-04-17T10:00:00.000Z',
            },
          ],
          meta: {
            pagination: {
              page: 1,
              pageSize: 20,
              totalCount: 1,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            },
          },
        };
      }

      if (path === '/api/v1/talents/talent-1/customers/customer-1') {
        return {
          id: 'customer-1',
          profileType: 'individual',
          nickname: 'Aki',
          isActive: true,
          version: 7,
        };
      }

      if (path === '/api/v1/talents/talent-1/customers/customer-1/deactivate' && init?.method === 'POST') {
        isActive = false;
        return {
          id: 'customer-1',
          isActive: false,
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<CustomerManagementScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByText('Aki')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));

    expect(await screen.findByText('Deactivate Aki?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate customer' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/talents/talent-1/customers/customer-1/deactivate',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            version: 7,
          }),
        }),
      );
    });

    expect(await screen.findByText('Aki was deactivated.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Reactivate' })).toBeInTheDocument();
  });
});
