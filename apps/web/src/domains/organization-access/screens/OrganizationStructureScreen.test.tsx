import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { OrganizationStructureScreen } from '@/domains/organization-access/screens/OrganizationStructureScreen';

const mockRequest = vi.fn();
const localeState = {
  currentLocale: 'en' as 'en' | 'zh' | 'ja',
};

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    request: mockRequest,
    requestEnvelope: mockRequest,
    session: {
      tenantName: 'Tenant Alpha',
      tenantCode: 'ALPHA',
    },
  }),
}));

vi.mock('@/platform/runtime/locale/locale-provider', () => ({
  useRuntimeLocale: () => localeState,
}));

const profileStoresResponse = {
  items: [
    {
      id: 'store-1',
      code: 'DEFAULT_STORE',
      name: 'Default Store',
      nameEn: 'Default Store',
      nameZh: null,
      nameJa: null,
      talentCount: 0,
      customerCount: 0,
      isDefault: true,
      isActive: true,
      createdAt: '2026-04-17T00:00:00.000Z',
      version: 1,
    },
  ],
  meta: {
    pagination: {
      page: 1,
      pageSize: 8,
      totalCount: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  },
};

function getTreeCallCount() {
  return mockRequest.mock.calls.filter(([path]) => String(path).startsWith('/api/v1/organization/tree?')).length;
}

describe('OrganizationStructureScreen', () => {
  beforeEach(() => {
    localeState.currentLocale = 'en';
    mockRequest.mockReset();
  });

  it('passes localized close labels to create drawers', async () => {
    localeState.currentLocale = 'zh';

    mockRequest.mockImplementation((path: string) => {
      if (path === '/api/v1/profile-stores?page=1&pageSize=20') {
        return Promise.resolve(profileStoresResponse);
      }

      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return Promise.resolve({
          tenantId: 'tenant-1',
          subsidiaries: [],
          directTalents: [],
        });
      }

      throw new Error(`Unexpected request: ${path}`);
    });

    render(<OrganizationStructureScreen tenantId="tenant-1" />);

    expect(await screen.findByRole('heading', { name: 'Tenant Alpha' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '创建艺人' }));
    fireEvent.click(await screen.findByRole('button', { name: '关闭创建艺人抽屉' }));

    fireEvent.click(screen.getByRole('button', { name: '创建分目录' }));
    expect(await screen.findByRole('button', { name: '关闭创建分目录抽屉' })).toBeInTheDocument();
  });

  it('shows all tenant talents by default and narrows the inventory when a subsidiary scope is selected', async () => {
    mockRequest.mockImplementation((path: string) => {
      if (path === '/api/v1/profile-stores?page=1&pageSize=20') {
        return Promise.resolve(profileStoresResponse);
      }

      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return Promise.resolve({
          tenantId: 'tenant-1',
          subsidiaries: [
            {
              id: 'subsidiary-1',
              code: 'TOKYO',
              displayName: 'Tokyo Branch',
              parentId: null,
              path: '/TOKYO/',
              talents: [
                {
                  id: 'talent-1',
                  code: 'SORA',
                  name: 'Tokino Sora',
                  displayName: 'Sora',
                  avatarUrl: null,
                  subsidiaryId: 'subsidiary-1',
                  subsidiaryName: 'Tokyo Branch',
                  path: '/TOKYO/SORA/',
                  homepagePath: 'sora',
                  lifecycleStatus: 'draft',
                  publishedAt: null,
                  isActive: false,
                },
              ],
              children: [
                {
                  id: 'subsidiary-2',
                  code: 'OSAKA',
                  displayName: 'Osaka Branch',
                  parentId: 'subsidiary-1',
                  path: '/TOKYO/OSAKA/',
                  talents: [
                    {
                      id: 'talent-3',
                      code: 'MIO',
                      name: 'Ookami Mio',
                      displayName: 'Mio',
                      avatarUrl: null,
                      subsidiaryId: 'subsidiary-2',
                      subsidiaryName: 'Osaka Branch',
                      path: '/TOKYO/OSAKA/MIO/',
                      homepagePath: 'mio',
                      lifecycleStatus: 'published',
                      publishedAt: '2026-04-17T12:00:00.000Z',
                      isActive: true,
                    },
                  ],
                  children: [],
                },
              ],
            },
          ],
          directTalents: [
            {
              id: 'talent-2',
              code: 'ROOT',
              name: 'Root Talent',
              displayName: 'Root Talent',
              avatarUrl: null,
              subsidiaryId: null,
              path: '/ROOT/',
              homepagePath: 'root',
              lifecycleStatus: 'published',
              publishedAt: '2026-04-17T12:00:00.000Z',
              isActive: true,
            },
          ],
        });
      }

      throw new Error(`Unexpected request: ${path}`);
    });

    render(<OrganizationStructureScreen tenantId="tenant-1" />);

    expect(await screen.findByRole('heading', { name: 'Tenant Alpha' })).toBeInTheDocument();
    expect(screen.getByText('Talent list')).toBeInTheDocument();
    expect(screen.getByText('Root Talent')).toBeInTheDocument();
    expect(screen.getByText('Sora')).toBeInTheDocument();
    expect(screen.getByText('Mio')).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('link', { name: 'Edit tenant settings' })
        .some((element) => element.getAttribute('href') === '/tenant/tenant-1/settings'),
    ).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: /Tokyo Branch/i }));

    expect(await screen.findByRole('heading', { name: 'Tokyo Branch' })).toBeInTheDocument();
    expect(screen.getByText('Sora')).toBeInTheDocument();
    expect(screen.getByText('Mio')).toBeInTheDocument();
    expect(screen.queryByText('Root Talent')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit subsidiary settings: Tokyo Branch' })).toHaveAttribute(
      'href',
      '/tenant/tenant-1/subsidiary/subsidiary-1/settings',
    );
  });

  it('reloads the tree when the refresh action is pressed so newly added talents become visible', async () => {
    let treeCalls = 0;

    mockRequest.mockImplementation((path: string) => {
      if (path === '/api/v1/profile-stores?page=1&pageSize=20') {
        return Promise.resolve(profileStoresResponse);
      }

      if (path === '/api/v1/organization/tree?includeInactive=false') {
        treeCalls += 1;

        if (treeCalls === 1) {
          return Promise.resolve({
            tenantId: 'tenant-1',
            subsidiaries: [
              {
                id: 'subsidiary-1',
                code: 'TOKYO',
                displayName: 'Tokyo Branch',
                parentId: null,
                path: '/TOKYO/',
                talents: [],
                children: [],
              },
            ],
            directTalents: [],
          });
        }

        return Promise.resolve({
          tenantId: 'tenant-1',
          subsidiaries: [
            {
              id: 'subsidiary-1',
              code: 'TOKYO',
              displayName: 'Tokyo Branch',
              parentId: null,
              path: '/TOKYO/',
              talents: [
                {
                  id: 'talent-3',
                  code: 'MIO',
                  name: 'Ookami Mio',
                  displayName: 'Mio',
                  avatarUrl: null,
                  subsidiaryId: 'subsidiary-1',
                  subsidiaryName: 'Tokyo Branch',
                  path: '/TOKYO/MIO/',
                  homepagePath: 'mio',
                  lifecycleStatus: 'draft',
                  publishedAt: null,
                  isActive: false,
                },
              ],
              children: [],
            },
          ],
          directTalents: [],
        });
      }

      throw new Error(`Unexpected request: ${path}`);
    });

    render(<OrganizationStructureScreen tenantId="tenant-1" />);

    expect(await screen.findByText('Tokyo Branch')).toBeInTheDocument();
    expect(screen.queryByText('Mio')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh structure' }));

    await waitFor(() => {
      expect(getTreeCallCount()).toBe(2);
    });

    expect(await screen.findByText('Mio')).toBeInTheDocument();
  });

  it('uses compact single-line action controls in the structure header', async () => {
    mockRequest.mockImplementation((path: string) => {
      if (path === '/api/v1/profile-stores?page=1&pageSize=20') {
        return Promise.resolve(profileStoresResponse);
      }

      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return Promise.resolve({
          tenantId: 'tenant-1',
          subsidiaries: [],
          directTalents: [],
        });
      }

      throw new Error(`Unexpected request: ${path}`);
    });

    render(<OrganizationStructureScreen tenantId="tenant-1" />);

    expect(await screen.findByRole('heading', { name: 'Tenant Alpha' })).toBeInTheDocument();

    const refreshButton = screen.getByRole('button', { name: 'Refresh structure' });
    const openWorkspaceLink = screen.getByRole('link', { name: /Open business/i });
    const createSubsidiaryButton = screen.getByRole('button', { name: 'Create subsidiary' });
    const createTalentButton = screen.getByRole('button', { name: 'Create talent' });

    expect(refreshButton).toHaveClass('rounded-full');
    expect(refreshButton.className).not.toContain('min-w-[10rem]');
    expect(openWorkspaceLink).toHaveClass('rounded-full');
    expect(createSubsidiaryButton).toHaveClass('rounded-full');
    expect(createTalentButton).toHaveClass('rounded-full');
  });

  it('queries the organization tree with the search term so the left tree can narrow to matching scopes', async () => {
    let searchTreeServed = false;

    mockRequest.mockImplementation((path: string) => {
      if (path === '/api/v1/profile-stores?page=1&pageSize=20') {
        return Promise.resolve(profileStoresResponse);
      }

      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return Promise.resolve({
          tenantId: 'tenant-1',
          subsidiaries: [
            {
              id: 'subsidiary-1',
              code: 'TOKYO',
              displayName: 'Tokyo Branch',
              parentId: null,
              path: '/TOKYO/',
              talents: [],
              children: [],
            },
          ],
          directTalents: [],
        });
      }

      if (path === '/api/v1/organization/tree?includeInactive=false&search=osaka') {
        searchTreeServed = true;
        return Promise.resolve({
          tenantId: 'tenant-1',
          subsidiaries: [
            {
              id: 'subsidiary-2',
              code: 'OSAKA',
              displayName: 'Osaka Branch',
              parentId: null,
              path: '/OSAKA/',
              talents: [],
              children: [],
            },
          ],
          directTalents: [],
        });
      }

      throw new Error(`Unexpected request: ${path}`);
    });

    render(<OrganizationStructureScreen tenantId="tenant-1" />);

    expect(await screen.findByRole('heading', { name: 'Tenant Alpha' })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search subsidiaries'), {
      target: { value: 'osaka' },
    });

    await waitFor(() => {
      expect(searchTreeServed).toBe(true);
    });

    expect(await screen.findByText('Osaka Branch')).toBeInTheDocument();
  });

  it('opens the create flow on demand instead of rendering the form inline and refreshes after create', async () => {
    let treeCalls = 0;
    let createPayload: Record<string, unknown> | null = null;

    mockRequest.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/api/v1/profile-stores?page=1&pageSize=20') {
        return Promise.resolve(profileStoresResponse);
      }

      if (path === '/api/v1/organization/tree?includeInactive=false') {
        treeCalls += 1;

        if (treeCalls === 1) {
          return Promise.resolve({
            tenantId: 'tenant-1',
            subsidiaries: [],
            directTalents: [],
          });
        }

        return Promise.resolve({
          tenantId: 'tenant-1',
          subsidiaries: [],
          directTalents: [
            {
              id: 'talent-4',
              code: 'MIO',
              name: 'Ookami Mio',
              displayName: 'Mio',
              avatarUrl: null,
              subsidiaryId: null,
              path: '/MIO/',
              homepagePath: 'mio',
              lifecycleStatus: 'draft',
              publishedAt: null,
              isActive: false,
            },
          ],
        });
      }

      if (path === '/api/v1/talents' && init?.method === 'POST') {
        createPayload = JSON.parse(String(init.body)) as Record<string, unknown>;
        return Promise.resolve({
          id: 'talent-4',
          subsidiaryId: null,
          code: 'MIO',
          path: '/MIO/',
          nameEn: 'Ookami Mio',
          name: 'Ookami Mio',
          displayName: 'Mio',
          avatarUrl: null,
          homepagePath: 'mio',
          timezone: 'Asia/Shanghai',
          lifecycleStatus: 'draft',
          publishedAt: null,
          publishedBy: null,
          isActive: false,
          createdAt: '2026-04-17T12:00:00.000Z',
          version: 1,
        });
      }

      throw new Error(`Unexpected request: ${path}`);
    });

    render(<OrganizationStructureScreen tenantId="tenant-1" />);

    expect(await screen.findByRole('heading', { name: 'Tenant Alpha' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Talent code')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create talent' }));

    await waitFor(() => {
      expect((screen.getByLabelText('Profile store') as HTMLSelectElement).value).toBe('store-1');
    });

    fireEvent.change(screen.getByLabelText('Talent code'), {
      target: { value: 'mio' },
    });
    fireEvent.change(screen.getByLabelText('Display name'), {
      target: { value: 'Mio' },
    });
    fireEvent.change(screen.getByLabelText('Legal / English name'), {
      target: { value: 'Ookami Mio' },
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Create talent' })[1]);

    await waitFor(() => {
      expect(createPayload).toEqual({
        subsidiaryId: null,
        profileStoreId: 'store-1',
        code: 'MIO',
        displayName: 'Mio',
        nameEn: 'Ookami Mio',
        translations: {
          en: 'Ookami Mio',
        },
        timezone: 'Asia/Shanghai',
      });
    });

    expect(await screen.findByText('Mio')).toBeInTheDocument();
    expect(screen.queryByLabelText('Talent code')).not.toBeInTheDocument();
  });

  it('can disable and re-enable a talent when inactive workspaces are shown', async () => {
    let lifecycleState: 'active' | 'disabled' | 'reenabled' = 'active';
    let detailVersion = 1;

    mockRequest.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/api/v1/profile-stores?page=1&pageSize=20') {
        return Promise.resolve(profileStoresResponse);
      }

      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return Promise.resolve({
          tenantId: 'tenant-1',
          subsidiaries: [],
          directTalents:
            lifecycleState === 'disabled'
              ? []
              : [
                  {
                    id: 'talent-1',
                    code: 'SORA',
                    name: 'Tokino Sora',
                    displayName: 'Sora',
                    avatarUrl: null,
                    subsidiaryId: null,
                    path: '/SORA/',
                    homepagePath: 'sora',
                    lifecycleStatus: lifecycleState === 'reenabled' ? 'published' : 'draft',
                    publishedAt: lifecycleState === 'reenabled' ? '2026-04-17T12:00:00.000Z' : null,
                    isActive: lifecycleState === 'reenabled',
                  },
                ],
        });
      }

      if (path === '/api/v1/organization/tree?includeInactive=true') {
        return Promise.resolve({
          tenantId: 'tenant-1',
          subsidiaries: [],
          directTalents: [
            {
              id: 'talent-1',
              code: 'SORA',
              name: 'Tokino Sora',
              displayName: 'Sora',
              avatarUrl: null,
              subsidiaryId: null,
              path: '/SORA/',
              homepagePath: 'sora',
              lifecycleStatus:
                lifecycleState === 'disabled'
                  ? 'disabled'
                  : lifecycleState === 'reenabled'
                    ? 'published'
                    : 'draft',
              publishedAt: lifecycleState === 'reenabled' ? '2026-04-17T12:00:00.000Z' : null,
              isActive: lifecycleState === 'reenabled',
            },
          ],
        });
      }

      if (path === '/api/v1/talents/talent-1') {
        return Promise.resolve({
          id: 'talent-1',
          subsidiaryId: null,
          profileStoreId: 'store-1',
          profileStore: {
            id: 'store-1',
            code: 'DEFAULT_STORE',
            nameEn: 'Default Store',
            nameZh: null,
            nameJa: null,
            isDefault: true,
            piiProxyUrl: null,
          },
          code: 'SORA',
          path: '/SORA/',
          nameEn: 'Tokino Sora',
          nameZh: null,
          nameJa: null,
          name: 'Tokino Sora',
          displayName: 'Sora',
          descriptionEn: null,
          descriptionZh: null,
          descriptionJa: null,
          avatarUrl: null,
          homepagePath: 'sora',
          timezone: 'Asia/Tokyo',
          lifecycleStatus:
            lifecycleState === 'disabled'
              ? 'disabled'
              : lifecycleState === 'reenabled'
                ? 'published'
                : 'draft',
          publishedAt: lifecycleState === 'reenabled' ? '2026-04-17T12:00:00.000Z' : null,
          publishedBy: null,
          isActive: lifecycleState === 'reenabled',
          settings: {},
          stats: {
            customerCount: 0,
            homepageVersionCount: 0,
            marshmallowMessageCount: 0,
          },
          externalPagesDomain: {},
          createdAt: '2026-04-17T00:00:00.000Z',
          updatedAt: '2026-04-17T00:00:00.000Z',
          version: detailVersion,
        });
      }

      if (path === '/api/v1/talents/talent-1/disable' && init?.method === 'POST') {
        expect(JSON.parse(String(init.body))).toEqual({ version: 1 });
        lifecycleState = 'disabled';
        detailVersion = 2;
        return Promise.resolve({
          id: 'talent-1',
          lifecycleStatus: 'disabled',
          publishedAt: null,
          publishedBy: null,
          isActive: false,
          version: 2,
        });
      }

      if (path === '/api/v1/talents/talent-1/re-enable' && init?.method === 'POST') {
        expect(JSON.parse(String(init.body))).toEqual({ version: 2 });
        lifecycleState = 'reenabled';
        detailVersion = 3;
        return Promise.resolve({
          id: 'talent-1',
          lifecycleStatus: 'published',
          publishedAt: '2026-04-17T12:00:00.000Z',
          publishedBy: null,
          isActive: true,
          version: 3,
        });
      }

      throw new Error(`Unexpected request: ${path}`);
    });

    render(<OrganizationStructureScreen tenantId="tenant-1" />);

    expect(await screen.findByText('Sora')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show inactive' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith('/api/v1/organization/tree?includeInactive=true');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Disable talent' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Disable talent' }));

    await screen.findByText('Disabled');
    fireEvent.click(screen.getByRole('button', { name: 'Re-enable talent' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Re-enable talent' }));

    await waitFor(() => {
      expect(screen.getByText('Published')).toBeInTheDocument();
    });
  });

  it('switches structural controls and inventory copy to zh at runtime', async () => {
    localeState.currentLocale = 'zh';

    mockRequest.mockImplementation((path: string) => {
      if (path === '/api/v1/profile-stores?page=1&pageSize=20') {
        return Promise.resolve(profileStoresResponse);
      }

      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return Promise.resolve({
          tenantId: 'tenant-1',
          subsidiaries: [],
          directTalents: [
            {
              id: 'talent-2',
              code: 'ROOT',
              name: '根级艺人',
              displayName: '根级艺人',
              avatarUrl: null,
              subsidiaryId: null,
              path: '/ROOT/',
              homepagePath: 'root',
              lifecycleStatus: 'draft',
              publishedAt: null,
              isActive: false,
            },
          ],
        });
      }

      throw new Error(`Unexpected request: ${path}`);
    });

    render(<OrganizationStructureScreen tenantId="tenant-1" />);

    expect(await screen.findByRole('heading', { name: 'Tenant Alpha' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('搜索分目录')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '创建艺人' })).toBeInTheDocument();
    expect(screen.getByText('艺人列表')).toBeInTheDocument();
    expect(screen.getByText('草稿')).toBeInTheDocument();
    expect(screen.getByText('租户根级艺人')).toBeInTheDocument();
  });

  it('paginates the scoped talent inventory at 20 rows by default and allows advancing pages', async () => {
    localeState.currentLocale = 'en';

    mockRequest.mockImplementation((path: string) => {
      if (path === '/api/v1/profile-stores?page=1&pageSize=20') {
        return Promise.resolve(profileStoresResponse);
      }

      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return Promise.resolve({
          tenantId: 'tenant-1',
          subsidiaries: [],
          directTalents: Array.from({ length: 21 }, (_, index) => ({
            id: `talent-${index + 1}`,
            code: `TALENT_${index + 1}`,
            name: `Talent ${String(index + 1).padStart(2, '0')}`,
            displayName: `Talent ${String(index + 1).padStart(2, '0')}`,
            avatarUrl: null,
            subsidiaryId: null,
            path: `/TALENT_${index + 1}/`,
            homepagePath: `talent-${index + 1}`,
            lifecycleStatus: 'published' as const,
            publishedAt: '2026-04-17T12:00:00.000Z',
            isActive: true,
          })),
        });
      }

      throw new Error(`Unexpected request: ${path}`);
    });

    render(<OrganizationStructureScreen tenantId="tenant-1" />);

    expect(await screen.findByRole('heading', { name: 'Tenant Alpha' })).toBeInTheDocument();
    expect(screen.getByText('Talent 01')).toBeInTheDocument();
    expect(screen.getByText('Talent 20')).toBeInTheDocument();
    expect(screen.queryByText('Talent 21')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Talent 21')).toBeInTheDocument();
    expect(screen.queryByText('Talent 01')).not.toBeInTheDocument();
  });
});
