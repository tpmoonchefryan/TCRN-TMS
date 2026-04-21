import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TenantSettingsScreen } from '@/domains/config-dictionary-settings/screens/TenantSettingsScreen';
import type { RuntimeLocale } from '@/platform/runtime/locale/locale-provider';

const mockRequest = vi.fn();
const localeState = {
  currentLocale: 'en' as RuntimeLocale,
};

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

interface ProfileStoreListItemFixture {
  id: string;
  code: string;
  name: string;
  nameZh: string | null;
  nameJa: string | null;
  translations: Record<string, string>;
  talentCount: number;
  customerCount: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  version: number;
}

interface ProfileStoreListFixture {
  items: ProfileStoreListItemFixture[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

const profileStoreListResponse: ProfileStoreListFixture = {
  items: [
    {
      id: 'store-1',
      code: 'DEFAULT_STORE',
      name: 'Default Store',
      nameZh: null,
      nameJa: null,
      translations: {
        en: 'Default Store',
      },
      talentCount: 2,
      customerCount: 18,
      isDefault: true,
      isActive: true,
      createdAt: '2026-04-17T00:00:00.000Z',
      version: 1,
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

const languageDictionaryResponse = {
  success: true,
  data: [
    {
      id: 'lang-1',
      dictionaryCode: 'language',
      code: 'zh_HANS',
      nameEn: 'Simplified Chinese',
      nameZh: '简体中文',
      nameJa: null,
      translations: {
        en: 'Simplified Chinese',
        zh_HANS: '简体中文',
      },
      name: 'Simplified Chinese',
      descriptionEn: null,
      descriptionZh: null,
      descriptionJa: null,
      descriptionTranslations: {},
      sortOrder: 0,
      isActive: true,
      extraData: null,
      createdAt: '2026-04-20T10:00:00.000Z',
      updatedAt: '2026-04-20T10:00:00.000Z',
      version: 1,
    },
    {
      id: 'lang-2',
      dictionaryCode: 'language',
      code: 'ko',
      nameEn: 'Korean',
      nameZh: '韩语',
      nameJa: null,
      translations: {
        en: 'Korean',
        zh_HANS: '韩语',
      },
      name: 'Korean',
      descriptionEn: null,
      descriptionZh: null,
      descriptionJa: null,
      descriptionTranslations: {},
      sortOrder: 1,
      isActive: true,
      extraData: null,
      createdAt: '2026-04-20T10:00:00.000Z',
      updatedAt: '2026-04-20T10:00:00.000Z',
      version: 1,
    },
  ],
  meta: {
    pagination: {
      page: 1,
      pageSize: 100,
      totalCount: 2,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  },
};

describe('TenantSettingsScreen', () => {
  beforeEach(() => {
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

      if (path === '/api/v1/profile-stores?page=1&pageSize=20&includeInactive=true') {
        return profileStoreListResponse;
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

      if (path.includes('/api/v1/system-dictionary/') && path.includes('page=1') && path.includes('pageSize=100')) {
        return languageDictionaryResponse;
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

      if (path === '/api/v1/profile-stores?page=1&pageSize=20&includeInactive=true') {
        return profileStoreListResponse;
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

    fireEvent.click(screen.getByRole('button', { name: 'Configuration Entity Management' }));
    expect(await screen.findByText('Default Store')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'System Dictionary' }));
    expect((await screen.findAllByText('Customer Status')).length).toBeGreaterThan(0);
    expect(await screen.findByText('Active customer')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.change(screen.getByLabelText('Default language'), {
      target: { value: 'ja' },
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
              allowCustomHomepage: true,
            },
            version: 3,
          }),
        }),
      );
    });

    expect(await screen.findByText('Tenant defaults saved.')).toBeInTheDocument();
  });

  it('creates, edits, and deactivates profile stores from the tenant settings workspace', async () => {
    let listResponse: ProfileStoreListFixture = {
      ...profileStoreListResponse,
      items: [...profileStoreListResponse.items],
    };
    let lastCreatedBody: Record<string, unknown> | null = null;
    let lastUpdatedBody: Record<string, unknown> | null = null;

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

      if (path === '/api/v1/profile-stores?page=1&pageSize=20&includeInactive=true') {
        return listResponse;
      }

      if (path === '/api/v1/system-dictionary') {
        return [];
      }

      if (path === '/api/v1/profile-stores' && init?.method === 'POST') {
        lastCreatedBody = JSON.parse(String(init.body)) as Record<string, unknown>;
        listResponse = {
          ...listResponse,
          items: [
            ...listResponse.items,
            {
              id: 'store-2',
              code: 'ARCHIVE_STORE',
              name: 'Archive Store',
              nameZh: '归档档案库',
              nameJa: null,
              translations: {
                en: 'Archive Store',
                zh_HANS: '归档档案库',
                ko: '보관 스토어',
              },
              talentCount: 0,
              customerCount: 0,
              isDefault: false,
              isActive: true,
              createdAt: '2026-04-17T01:00:00.000Z',
              version: 1,
            },
          ],
          meta: {
            pagination: {
              ...listResponse.meta.pagination,
              totalCount: 2,
              totalPages: 1,
            },
          },
        };

        return {
          id: 'store-2',
          code: 'ARCHIVE_STORE',
          name: 'Archive Store',
          isDefault: false,
          createdAt: '2026-04-17T01:00:00.000Z',
        };
      }

      if (path === '/api/v1/profile-stores/store-2' && !init) {
        return {
          id: 'store-2',
          code: 'ARCHIVE_STORE',
          name: 'Archive Store',
          nameZh: '归档档案库',
          nameJa: null,
          translations: {
            en: 'Archive Store',
            zh_HANS: '归档档案库',
            ko: '보관 스토어',
          },
          description: 'Cold customer archive',
          descriptionZh: null,
          descriptionJa: null,
          descriptionTranslations: {
            en: 'Cold customer archive',
            ko: '보관 고객 아카이브',
          },
          talentCount: 0,
          customerCount: 0,
          isDefault: false,
          isActive: true,
          createdAt: '2026-04-17T01:00:00.000Z',
          updatedAt: '2026-04-17T01:00:00.000Z',
          version: 1,
        };
      }

      if (path === '/api/v1/profile-stores/store-2' && init?.method === 'PATCH') {
        lastUpdatedBody = JSON.parse(String(init.body)) as Record<string, unknown>;

        if ((lastUpdatedBody.isActive as boolean | undefined) === false) {
          listResponse = {
            ...listResponse,
            items: listResponse.items.map((item) =>
              item.id === 'store-2'
                ? {
                    ...item,
                    isActive: false,
                    version: 3,
                  }
                : item,
            ),
          };

          return {
            id: 'store-2',
            code: 'ARCHIVE_STORE',
            version: 3,
            updatedAt: '2026-04-17T03:00:00.000Z',
          };
        }

        listResponse = {
          ...listResponse,
          items: listResponse.items.map((item) =>
            item.id === 'store-2'
              ? {
                  ...item,
                  name: 'Archive Store Updated',
                  nameZh: '更新后的归档档案库',
                  translations: {
                    en: 'Archive Store Updated',
                    zh_HANS: '更新后的归档档案库',
                    ko: '보관 스토어',
                  },
                  version: 2,
                }
              : item,
          ),
        };

        return {
          id: 'store-2',
          code: 'ARCHIVE_STORE',
          version: 2,
          updatedAt: '2026-04-17T02:00:00.000Z',
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<TenantSettingsScreen tenantId="tenant-1" />);

    expect(await screen.findByRole('heading', { name: 'Tenant Settings' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Configuration Entity Management' }));
    expect(await screen.findByRole('button', { name: /New profile store/i })).toBeInTheDocument();
    expect(screen.queryByLabelText('Store code')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /New profile store/i }));
    const createDrawer = await screen.findByRole('dialog', { name: 'Create Profile Store' });
    fireEvent.change(within(createDrawer).getByLabelText('Store code'), {
      target: { value: 'archive_store' },
    });
    fireEvent.change(within(createDrawer).getByLabelText('Name English'), {
      target: { value: 'Archive Store' },
    });
    fireEvent.change(within(createDrawer).getByLabelText('Description English'), {
      target: { value: 'Cold customer archive' },
    });
    fireEvent.click(within(createDrawer).getByRole('button', { name: 'Translation management' }));
    const createTranslationDrawer = await screen.findByRole('dialog', { name: 'Profile store translations' });
    expect(within(createTranslationDrawer).getByText('Profile store translations')).toBeInTheDocument();
    fireEvent.click(
      await within(createTranslationDrawer).findByRole('button', {
        name: /Simplified Chinese|简体中文/,
      }),
    );
    fireEvent.click(
      await within(createTranslationDrawer).findByRole('button', {
        name: /Korean|한국어/,
      }),
    );
    const createNameInputs = within(createTranslationDrawer).getAllByLabelText('Store name');
    const createDescriptionInputs = within(createTranslationDrawer).getAllByLabelText('Store description');
    fireEvent.change(createNameInputs[0], {
      target: { value: '归档档案库' },
    });
    fireEvent.change(createNameInputs[1], {
      target: { value: '보관 스토어' },
    });
    fireEvent.change(createDescriptionInputs[1], {
      target: { value: '보관 고객 아카이브' },
    });
    fireEvent.click(within(createTranslationDrawer).getByRole('button', { name: 'Save' }));

    fireEvent.click(within(createDrawer).getByRole('button', { name: /Create profile store/i }));

    await waitFor(() => {
      expect(lastCreatedBody).toEqual({
        code: 'ARCHIVE_STORE',
        nameEn: 'Archive Store',
        nameZh: '归档档案库',
        translations: {
          en: 'Archive Store',
          zh_HANS: '归档档案库',
          ko: '보관 스토어',
        },
        descriptionEn: 'Cold customer archive',
        descriptionTranslations: {
          en: 'Cold customer archive',
          ko: '보관 고객 아카이브',
        },
        isDefault: false,
      });
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Create Profile Store' })).not.toBeInTheDocument();
    });
    expect(await screen.findByText('Profile store created.')).toBeInTheDocument();
    expect(await screen.findByText('Archive Store')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(2);
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[1]);
    const editDrawer = await screen.findByRole('dialog', { name: 'Edit Profile Store' });

    await waitFor(() => {
      expect((within(editDrawer).getByLabelText('Store code') as HTMLInputElement).value).toBe('ARCHIVE_STORE');
    });

    fireEvent.change(within(editDrawer).getByLabelText('Name English'), {
      target: { value: 'Archive Store Updated' },
    });
    fireEvent.click(within(editDrawer).getByRole('button', { name: 'Translation management' }));
    const editTranslationDrawer = await screen.findByRole('dialog', { name: 'Profile store translations' });
    expect(within(editTranslationDrawer).getByText('Profile store translations')).toBeInTheDocument();
    const editNameInputs = within(editTranslationDrawer).getAllByLabelText('Store name');
    const editDescriptionInputs = within(editTranslationDrawer).getAllByLabelText('Store description');
    fireEvent.change(editNameInputs[0], {
      target: { value: '更新后的归档档案库' },
    });
    fireEvent.change(editDescriptionInputs[1], {
      target: { value: '업데이트된 보관 고객 아카이브' },
    });
    fireEvent.click(within(editTranslationDrawer).getByRole('button', { name: 'Save' }));

    fireEvent.click(within(editDrawer).getByRole('button', { name: /Save profile store/i }));

    await waitFor(() => {
      expect(lastUpdatedBody).toEqual({
        nameEn: 'Archive Store Updated',
        nameZh: '更新后的归档档案库',
        translations: {
          en: 'Archive Store Updated',
          zh_HANS: '更新后的归档档案库',
          ko: '보관 스토어',
        },
        descriptionEn: 'Cold customer archive',
        descriptionTranslations: {
          en: 'Cold customer archive',
          ko: '업데이트된 보관 고객 아카이브',
        },
        isDefault: false,
        isActive: true,
        version: 1,
      });
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Edit Profile Store' })).not.toBeInTheDocument();
    });
    expect(await screen.findByText('Profile store updated.')).toBeInTheDocument();
    expect((await screen.findAllByText('Archive Store Updated')).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Deactivate' })).toHaveLength(2);
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Deactivate' })[1]);
    expect(await screen.findByRole('button', { name: 'Deactivate store' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate store' }));

    await waitFor(() => {
      expect(lastUpdatedBody).toEqual({
        isActive: false,
        version: 2,
      });
    });
    expect(await screen.findByText('Archive Store Updated was deactivated.')).toBeInTheDocument();
    expect(screen.getAllByText('Inactive').length).toBeGreaterThan(0);
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

      if (path === '/api/v1/profile-stores?page=1&pageSize=20&includeInactive=true') {
        return profileStoreListResponse;
      }

      if (path === '/api/v1/system-dictionary') {
        return [];
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<TenantSettingsScreen tenantId="tenant-1" />);

    expect(await screen.findByRole('heading', { name: '租户设置' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '设置' }));
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

      if (path === '/api/v1/profile-stores?page=1&pageSize=20&includeInactive=true') {
        return profileStoreListResponse;
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
