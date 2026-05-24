import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import type { SupportedUiLocale } from '@tcrn/shared';

import { localizedFixture } from '@/domains/config-dictionary-settings/testing/localized-fixtures';
import { OrganizationStructureScreen } from '@/domains/organization-access/screens/OrganizationStructureScreen';

const mockRequest = vi.fn();
const replace = vi.fn();
let pathname = '/tenant/tenant-1/organization-structure';
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
      tenantName: 'Tenant Alpha',
      tenantCode: 'ALPHA',
    },
  }),
}));

vi.mock('@/platform/runtime/locale/locale-provider', () => ({
  useUiLocale: () => localeState,
}));

const profileStoresResponse = {
  items: [
    {
      id: 'store-1',
      code: 'DEFAULT_STORE',
      name: localizedFixture('Default Store'),
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

const artistStageListPath =
  '/api/v1/configuration-entity/artist-stage?scopeType=tenant&includeInherited=true&includeDisabled=false&includeInactive=false&ownerOnly=false&page=1&pageSize=100&sort=sortOrder';

const artistStagesResponse = [
  {
    id: 'stage-draft',
    ownerType: 'tenant',
    ownerId: null,
    code: 'PRE_DEBUT',
    name: localizedFixture('Pre-Debut'),
    localizedName: 'Pre-Debut',
    description: null,
    localizedDescription: null,
    sortOrder: 0,
    isActive: true,
    isForceUse: false,
    isSystem: false,
    isInherited: false,
    isDisabledHere: false,
    canDisable: false,
    extraData: null,
    color: '#F97316',
    lifecycleStatusMapping: 'draft',
    homepagePolicyKey: 'debut-reveal',
    createdAt: '2026-04-17T00:00:00.000Z',
    updatedAt: '2026-04-17T00:00:00.000Z',
    version: 1,
  },
];

const manageableLifecycleMaintenance = { canManage: true } as const;
const unavailableLifecycleMaintenance = { canManage: false } as const;

function getTreeCallCount() {
  return mockRequest.mock.calls.filter(([path]) =>
    String(path).startsWith('/api/v1/organization/tree?')
  ).length;
}

describe('OrganizationStructureScreen', () => {
  beforeEach(() => {
    localeState.locale = 'en';
    mockRequest.mockReset();
    replace.mockReset();
    pathname = '/tenant/tenant-1/organization-structure';
    currentSearch = '';
  });

  it('passes localized close labels to create drawers', async () => {
    localeState.locale = 'zh_HANS';

    mockRequest.mockImplementation((path: string) => {
      if (path === '/api/v1/profile-stores?page=1&pageSize=20') {
        return Promise.resolve(profileStoresResponse);
      }

      if (path === artistStageListPath) {
        return Promise.resolve(artistStagesResponse);
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
                  lifecycleMaintenance: manageableLifecycleMaintenance,
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
                      lifecycleMaintenance: manageableLifecycleMaintenance,
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
              lifecycleMaintenance: manageableLifecycleMaintenance,
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
        .some((element) => element.getAttribute('href') === '/tenant/tenant-1/settings')
    ).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: /Tokyo Branch/i }));

    expect(await screen.findByRole('heading', { name: 'Tokyo Branch' })).toBeInTheDocument();
    expect(screen.getByText('Sora')).toBeInTheDocument();
    expect(screen.getByText('Mio')).toBeInTheDocument();
    expect(screen.queryByText('Root Talent')).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Edit subsidiary settings: Tokyo Branch' })
    ).toHaveAttribute('href', '/tenant/tenant-1/subsidiary/subsidiary-1/settings');
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
                  lifecycleMaintenance: manageableLifecycleMaintenance,
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

      if (path === artistStageListPath) {
        return Promise.resolve(artistStagesResponse);
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
              lifecycleMaintenance: manageableLifecycleMaintenance,
            },
          ],
        });
      }

      if (path === '/api/v1/talents' && init?.method === 'POST') {
        createPayload = JSON.parse(String(init.body)) as Record<string, unknown>;
        return Promise.resolve({
          id: 'talent-4',
          subsidiaryId: null,
          artistStageId: 'stage-draft',
          code: 'MIO',
          path: '/MIO/',
          name: localizedFixture('Ookami Mio'),
          localizedName: undefined,
          displayName: 'Mio',
          avatarUrl: null,
          homepagePath: 'mio',
          timezone: 'Asia/Shanghai',
          lifecycleStatus: 'draft',
          publishedAt: null,
          publishedBy: null,
          isActive: false,
          lifecycleMaintenance: manageableLifecycleMaintenance,
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
        artistStageId: 'stage-draft',
        code: 'MIO',
        displayName: 'Mio',
        name: localizedFixture('Ookami Mio'),
        timezone: 'Asia/Shanghai',
      });
    });

    await waitFor(() => {
      expect(getTreeCallCount()).toBe(2);
    });

    expect(await screen.findByText('Mio was created in tenant root.')).toBeInTheDocument();
    expect(screen.queryByText(/undefined was created/i)).not.toBeInTheDocument();

    const spotlight = await screen.findByTestId('organization-created-talent-spotlight');

    await waitFor(() => {
      expect(spotlight).toHaveFocus();
    });

    expect(within(spotlight).getByRole('link', { name: 'Homepage Management' })).toHaveAttribute(
      'href',
      '/tenant/tenant-1/talent/talent-4/homepage'
    );
    expect(within(spotlight).getByRole('link', { name: 'Open Studio' })).toHaveAttribute(
      'href',
      '/studio/public-presence/tenant-1/talent-4'
    );

    expect(await screen.findByText('/MIO/')).toBeInTheDocument();
    expect(screen.queryByLabelText('Talent code')).not.toBeInTheDocument();
  });

  it('keeps the created talent discoverable even when the refreshed inventory still has not surfaced it', async () => {
    let treeCalls = 0;

    mockRequest.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/api/v1/profile-stores?page=1&pageSize=20') {
        return Promise.resolve(profileStoresResponse);
      }

      if (path === artistStageListPath) {
        return Promise.resolve(artistStagesResponse);
      }

      if (path === '/api/v1/organization/tree?includeInactive=false') {
        treeCalls += 1;

        return Promise.resolve({
          tenantId: 'tenant-1',
          subsidiaries: [],
          directTalents: [],
        });
      }

      if (path === '/api/v1/talents' && init?.method === 'POST') {
        return Promise.resolve({
          id: 'talent-5',
          subsidiaryId: null,
          artistStageId: 'stage-draft',
          code: 'SUZU',
          path: '/SUZU/',
          name: localizedFixture('Suzu'),
          localizedName: undefined,
          displayName: 'Suzu',
          avatarUrl: null,
          homepagePath: 'suzu',
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

    fireEvent.click(screen.getByRole('button', { name: 'Create talent' }));

    await waitFor(() => {
      expect((screen.getByLabelText('Profile store') as HTMLSelectElement).value).toBe('store-1');
    });

    fireEvent.change(screen.getByLabelText('Talent code'), {
      target: { value: 'suzu' },
    });
    fireEvent.change(screen.getByLabelText('Display name'), {
      target: { value: 'Suzu' },
    });
    fireEvent.change(screen.getByLabelText('Legal / English name'), {
      target: { value: 'Suzu' },
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Create talent' })[1]);

    await waitFor(() => {
      expect(treeCalls).toBe(2);
    });

    expect(await screen.findByText('Suzu was created in tenant root.')).toBeInTheDocument();
    expect(screen.queryByText(/undefined was created/i)).not.toBeInTheDocument();
    expect(screen.getByText('No talents in this branch')).toBeInTheDocument();

    const spotlight = await screen.findByTestId('organization-created-talent-spotlight');

    await waitFor(() => {
      expect(spotlight).toHaveFocus();
    });

    expect(within(spotlight).getByText('Suzu')).toBeInTheDocument();
    expect(within(spotlight).getByText('SUZU')).toBeInTheDocument();
    expect(within(spotlight).getByRole('link', { name: 'Homepage Management' })).toHaveAttribute(
      'href',
      '/tenant/tenant-1/talent/talent-5/homepage'
    );
    expect(within(spotlight).getByRole('link', { name: 'Open Studio' })).toHaveAttribute(
      'href',
      '/studio/public-presence/tenant-1/talent-5'
    );
  });

  it('blocks talent creation when no active artist stages are available', async () => {
    mockRequest.mockImplementation((path: string) => {
      if (path === '/api/v1/profile-stores?page=1&pageSize=20') {
        return Promise.resolve(profileStoresResponse);
      }

      if (path === artistStageListPath) {
        return Promise.resolve([]);
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

    fireEvent.click(screen.getByRole('button', { name: 'Create talent' }));

    expect(
      await screen.findByText(
        'No active artist stages are available yet. Add one in tenant settings before creating a talent.'
      )
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Create talent' })[1]).toBeDisabled();
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
                    lifecycleMaintenance: manageableLifecycleMaintenance,
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
              lifecycleMaintenance: manageableLifecycleMaintenance,
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
            name: localizedFixture('Default Store'),
            isDefault: true,
          },
          code: 'SORA',
          path: '/SORA/',
          name: localizedFixture('Tokino Sora'),
          localizedName: 'Tokino Sora',
          displayName: 'Sora',
          description: localizedFixture(''),
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
          lifecycleMaintenance: manageableLifecycleMaintenance,
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

    fireEvent.click(screen.getByRole('button', { name: 'Disable workspace' }));
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Disable workspace' })
    );

    await screen.findByText('Disabled');
    fireEvent.click(screen.getByRole('button', { name: 'Re-enable workspace' }));
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Re-enable workspace' })
    );

    await waitFor(() => {
      expect(screen.getByText('Published')).toBeInTheDocument();
    });
  });

  it('renders lifecycle maintenance actions only when the tree grants workspace access', async () => {
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
              id: 'talent-1',
              code: 'SORA',
              name: 'Tokino Sora',
              displayName: 'Sora',
              avatarUrl: null,
              subsidiaryId: null,
              path: '/SORA/',
              homepagePath: 'sora',
              lifecycleStatus: 'published',
              publishedAt: '2026-04-17T12:00:00.000Z',
              isActive: true,
              lifecycleMaintenance: unavailableLifecycleMaintenance,
            },
          ],
        });
      }

      throw new Error(`Unexpected request: ${path}`);
    });

    render(<OrganizationStructureScreen tenantId="tenant-1" />);

    expect(await screen.findByText('Sora')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Disable workspace' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Re-enable workspace' })).not.toBeInTheDocument();
  });

  it('uses workspace wording for zh lifecycle controls', async () => {
    localeState.locale = 'zh_HANS';

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
              id: 'talent-1',
              code: 'SORA',
              name: '时乃空',
              displayName: '空',
              avatarUrl: null,
              subsidiaryId: null,
              path: '/SORA/',
              homepagePath: 'sora',
              lifecycleStatus: 'published',
              publishedAt: '2026-04-17T12:00:00.000Z',
              isActive: true,
              lifecycleMaintenance: manageableLifecycleMaintenance,
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
            name: localizedFixture('Default Store'),
            isDefault: true,
          },
          code: 'SORA',
          path: '/SORA/',
          name: localizedFixture('时乃空'),
          localizedName: '时乃空',
          displayName: '空',
          description: localizedFixture(''),
          avatarUrl: null,
          homepagePath: 'sora',
          timezone: 'Asia/Shanghai',
          lifecycleStatus: 'published',
          publishedAt: '2026-04-17T12:00:00.000Z',
          publishedBy: null,
          isActive: true,
          settings: {},
          stats: {
            customerCount: 0,
            homepageVersionCount: 0,
            marshmallowMessageCount: 0,
          },
          externalPagesDomain: {},
          createdAt: '2026-04-17T00:00:00.000Z',
          updatedAt: '2026-04-17T00:00:00.000Z',
          version: 1,
        });
      }

      throw new Error(`Unexpected request: ${path}`);
    });

    render(<OrganizationStructureScreen tenantId="tenant-1" />);

    expect(await screen.findByRole('button', { name: '停用工作区' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '停用工作区' }));

    expect(
      within(await screen.findByRole('dialog')).getByRole('button', { name: '停用工作区' })
    ).toBeInTheDocument();
  });

  it('switches structural controls and inventory copy to zh at runtime', async () => {
    localeState.locale = 'zh_HANS';

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
              lifecycleMaintenance: manageableLifecycleMaintenance,
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
    localeState.locale = 'en';

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
            lifecycleMaintenance: manageableLifecycleMaintenance,
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

    expect(replace).toHaveBeenCalledWith('/tenant/tenant-1/organization-structure?page=2');
    expect(await screen.findByText('Talent 21')).toBeInTheDocument();
    expect(screen.queryByText('Talent 01')).not.toBeInTheDocument();
  });

  it('hydrates organization scope, filters, and inventory pagination from the URL', async () => {
    currentSearch = 'scopeId=subsidiary-1&inactive=true&page=2';

    mockRequest.mockImplementation((path: string) => {
      if (path === '/api/v1/profile-stores?page=1&pageSize=20') {
        return Promise.resolve(profileStoresResponse);
      }

      if (path === '/api/v1/organization/tree?includeInactive=true') {
        return Promise.resolve({
          tenantId: 'tenant-1',
          subsidiaries: [
            {
              id: 'subsidiary-1',
              code: 'TOKYO',
              displayName: 'Tokyo Branch',
              parentId: null,
              path: '/TOKYO/',
              depth: 1,
              sortOrder: 1,
              isActive: true,
              version: 1,
              children: [],
              talents: Array.from({ length: 21 }, (_, index) => ({
                id: `talent-${index + 1}`,
                code: `TALENT_${index + 1}`,
                name: `Talent ${String(index + 1).padStart(2, '0')}`,
                displayName: `Talent ${String(index + 1).padStart(2, '0')}`,
                avatarUrl: null,
                subsidiaryId: 'subsidiary-1',
                path: `/TOKYO/TALENT_${index + 1}/`,
                homepagePath: `talent-${index + 1}`,
                lifecycleStatus: 'published' as const,
                publishedAt: '2026-04-17T12:00:00.000Z',
                isActive: true,
                lifecycleMaintenance: manageableLifecycleMaintenance,
              })),
            },
          ],
          directTalents: [],
        });
      }

      throw new Error(`Unexpected request: ${path}`);
    });

    render(<OrganizationStructureScreen tenantId="tenant-1" />);

    expect(await screen.findByRole('heading', { name: 'Tokyo Branch' })).toBeInTheDocument();
    expect(mockRequest).toHaveBeenCalledWith('/api/v1/organization/tree?includeInactive=true');
    expect(screen.getByText('Talent 21')).toBeInTheDocument();
    expect(screen.queryByText('Talent 01')).not.toBeInTheDocument();
  });
});
