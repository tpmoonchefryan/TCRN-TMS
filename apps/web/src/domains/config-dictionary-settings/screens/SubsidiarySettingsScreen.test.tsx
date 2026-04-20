import type { SupportedUiLocale } from '@tcrn/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ConfigEntityRecord } from '@/domains/config-dictionary-settings/api/settings.api';
import { SubsidiarySettingsScreen } from '@/domains/config-dictionary-settings/screens/SubsidiarySettingsScreen';
import type { RuntimeLocale } from '@/platform/runtime/locale/locale-provider';

const mockRequest = vi.fn();
const localeState = {
  currentLocale: 'en' as RuntimeLocale,
  selectedLocale: undefined as SupportedUiLocale | undefined,
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
      tenantTier: 'tenant',
      tenantCode: 'TENANT_TEST',
    },
  }),
}));

vi.mock('@/platform/runtime/locale/locale-provider', () => ({
  useRuntimeLocale: () => localeState,
}));

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

describe('SubsidiarySettingsScreen', () => {
  beforeEach(() => {
    mockRequest.mockReset();
    localeState.currentLocale = 'en';
    localeState.selectedLocale = undefined;
  });

  it('passes a localized settings section navigation label to the shared settings layout', async () => {
    localeState.currentLocale = 'ja';

    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/subsidiaries/sub-1') {
        return {
          id: 'sub-1',
          parentId: null,
          code: 'TOKYO',
          path: '/TOKYO/',
          depth: 1,
          nameEn: 'Tokyo',
          nameZh: '东京分部',
          nameJa: '東京拠点',
          name: '東京拠点',
          descriptionEn: 'Tokyo branch',
          descriptionZh: '东京分部说明',
          descriptionJa: null,
          sortOrder: 10,
          isActive: true,
          childrenCount: 2,
          talentCount: 5,
          createdAt: '2026-04-17T00:00:00.000Z',
          updatedAt: '2026-04-17T00:10:00.000Z',
          version: 3,
        };
      }

      if (path === '/api/v1/subsidiaries/sub-1/settings') {
        return {
          scopeType: 'subsidiary',
          scopeId: 'sub-1',
          settings: {
            defaultLanguage: 'ja',
            timezone: 'Asia/Tokyo',
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

    render(<SubsidiarySettingsScreen tenantId="tenant-1" subsidiaryId="sub-1" />);

    expect(await screen.findByRole('heading', { name: '東京拠点 配下スコープ設定' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '設定セクション' })).toBeInTheDocument();
  });

  it('loads subsidiary settings resources, creates scoped config entities, and saves updated overrides', async () => {
    const businessSegments: ConfigEntityRecord[] = [
      {
        id: 'segment-tenant',
        ownerType: 'tenant',
        ownerId: null,
        code: 'TENANT_SEGMENT',
        name: 'Tenant Segment',
        nameEn: 'Tenant Segment',
        nameZh: null,
        nameJa: null,
        translations: {
          en: 'Tenant Segment',
        },
        description: 'Inherited from tenant',
        descriptionEn: 'Inherited from tenant',
        descriptionZh: null,
        descriptionJa: null,
        descriptionTranslations: {
          en: 'Inherited from tenant',
        },
        sortOrder: 0,
        isActive: true,
        isForceUse: false,
        isSystem: false,
        isInherited: true,
        isDisabledHere: false,
        canDisable: true,
        extraData: null,
        createdAt: '2026-04-17T00:00:00.000Z',
        updatedAt: '2026-04-17T00:10:00.000Z',
        version: 1,
      },
    ];

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/subsidiaries/sub-1' && !init) {
        return {
          id: 'sub-1',
          parentId: null,
          code: 'TOKYO',
          path: '/TOKYO/',
          depth: 1,
          nameEn: 'Tokyo',
          nameZh: '东京分部',
          nameJa: '東京拠点',
          name: '东京分部',
          descriptionEn: 'Tokyo branch',
          descriptionZh: '东京分部说明',
          descriptionJa: null,
          sortOrder: 10,
          isActive: true,
          childrenCount: 2,
          talentCount: 5,
          createdAt: '2026-04-17T00:00:00.000Z',
          updatedAt: '2026-04-17T00:10:00.000Z',
          version: 3,
        };
      }

      if (path === '/api/v1/subsidiaries/sub-1/settings' && !init) {
        return {
          scopeType: 'subsidiary',
          scopeId: 'sub-1',
          settings: {
            defaultLanguage: 'zh-CN',
            timezone: 'Asia/Tokyo',
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
          '/api/v1/configuration-entity/business-segment?scopeType=subsidiary&scopeId=sub-1&includeInherited=true&includeDisabled=true&includeInactive=false&ownerOnly=false&page=1&pageSize=20&sort=sortOrder'
      ) {
        return {
          success: true,
          data: businessSegments,
          meta: {
            pagination: {
              page: 1,
              pageSize: 20,
              totalCount: businessSegments.length,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            },
          },
        };
      }

      if (path === '/api/v1/configuration-entity/business-segment' && init?.method === 'POST') {
        const payload = JSON.parse(String(init.body)) as {
          code: string;
          nameEn: string;
          ownerType: string;
          ownerId: string;
          sortOrder: number;
        };

        businessSegments.push({
          id: 'segment-local',
          ownerType: 'subsidiary',
          ownerId: 'sub-1',
          code: payload.code,
          name: payload.nameEn,
          nameEn: payload.nameEn,
          nameZh: null,
          nameJa: null,
          translations: {
            en: payload.nameEn,
          },
          description: null,
          descriptionEn: null,
          descriptionZh: null,
          descriptionJa: null,
          descriptionTranslations: {},
          sortOrder: payload.sortOrder,
          isActive: true,
          isForceUse: false,
          isSystem: false,
          isInherited: false,
          isDisabledHere: false,
          canDisable: false,
          extraData: null,
          createdAt: '2026-04-17T01:00:00.000Z',
          updatedAt: '2026-04-17T01:00:00.000Z',
          version: 1,
        });

        return businessSegments[businessSegments.length - 1];
      }

      if (path === '/api/v1/subsidiaries/sub-1/settings' && init?.method === 'PATCH') {
        return {
          scopeType: 'subsidiary',
          scopeId: 'sub-1',
          settings: {
            defaultLanguage: 'ja',
            timezone: 'Asia/Tokyo',
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

    render(<SubsidiarySettingsScreen tenantId="tenant-1" subsidiaryId="sub-1" />);

    expect(await screen.findByRole('heading', { name: '东京分部 Subsidiary Settings' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'System Dictionary' }));
    expect(screen.getAllByText('Customer Status').length).toBeGreaterThan(0);
    expect(await screen.findByText('Active customer')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Configuration Entity Management' }));
    expect((await screen.findAllByText('Business Segment')).length).toBeGreaterThan(0);
    expect(screen.getByText('TENANT_SEGMENT')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'New record' }));
    fireEvent.change(screen.getByLabelText('Code *'), {
      target: { value: 'LOCAL_SEGMENT' },
    });
    fireEvent.change(screen.getByLabelText('Name (English) *'), {
      target: { value: 'Local Segment' },
    });
    fireEvent.click(await screen.findByRole('button', { name: /Create record/i }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/configuration-entity/business-segment',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            code: 'LOCAL_SEGMENT',
            nameEn: 'Local Segment',
            translations: {
              en: 'Local Segment',
            },
            descriptionTranslations: {},
            sortOrder: 0,
            ownerType: 'subsidiary',
            ownerId: 'sub-1',
          }),
        }),
      );
    });

    expect(await screen.findByText('LOCAL_SEGMENT')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.change(screen.getByLabelText('Default language'), {
      target: { value: 'ja' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save subsidiary settings' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/subsidiaries/sub-1/settings',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            settings: {
              defaultLanguage: 'ja',
              timezone: 'Asia/Tokyo',
              allowCustomHomepage: true,
            },
            version: 3,
          }),
        }),
      );
    });

    expect(await screen.findByText('Subsidiary settings saved.')).toBeInTheDocument();
  });

  it('renders zh copy when runtime locale is zh', async () => {
    localeState.currentLocale = 'zh';

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/subsidiaries/sub-1' && !init) {
        return {
          id: 'sub-1',
          parentId: null,
          code: 'TOKYO',
          path: '/TOKYO/',
          depth: 1,
          nameEn: 'Tokyo',
          nameZh: '东京分部',
          nameJa: '東京拠点',
          name: '东京分部',
          descriptionEn: 'Tokyo branch',
          descriptionZh: '东京分部说明',
          descriptionJa: null,
          sortOrder: 10,
          isActive: true,
          childrenCount: 2,
          talentCount: 5,
          createdAt: '2026-04-17T00:00:00.000Z',
          updatedAt: '2026-04-17T00:10:00.000Z',
          version: 3,
        };
      }

      if (path === '/api/v1/subsidiaries/sub-1/settings' && !init) {
        return {
          scopeType: 'subsidiary',
          scopeId: 'sub-1',
          settings: {
            defaultLanguage: 'zh-CN',
            timezone: 'Asia/Tokyo',
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

      if (
        path ===
          '/api/v1/configuration-entity/business-segment?scopeType=subsidiary&scopeId=sub-1&includeInherited=true&includeDisabled=true&includeInactive=false&ownerOnly=false&page=1&pageSize=20&sort=sortOrder'
      ) {
        return {
          success: true,
          data: [],
          meta: {
            pagination: {
              page: 1,
              pageSize: 20,
              totalCount: 0,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            },
          },
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<SubsidiarySettingsScreen tenantId="tenant-1" subsidiaryId="sub-1" />);

    expect(await screen.findByRole('heading', { name: '东京分部 分目录设置' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '设置' }));
    expect(await screen.findByRole('button', { name: '保存分目录设置' })).toBeInTheDocument();
  });

  it('renders exact-locale copy for zh_HANT and ko without family fallback', async () => {
    const installSuccessMocks = () => {
      mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
        if (path === '/api/v1/subsidiaries/sub-1' && !init) {
          return {
            id: 'sub-1',
            parentId: null,
            code: 'TOKYO',
            path: '/TOKYO/',
            depth: 1,
            nameEn: 'Tokyo',
            nameZh: '东京分部',
            nameJa: '東京拠点',
            name: 'Tokyo',
            descriptionEn: 'Tokyo branch',
            descriptionZh: '东京分部说明',
            descriptionJa: null,
            sortOrder: 10,
            isActive: true,
            childrenCount: 2,
            talentCount: 5,
            createdAt: '2026-04-17T00:00:00.000Z',
            updatedAt: '2026-04-17T00:10:00.000Z',
            version: 3,
          };
        }

        if (path === '/api/v1/subsidiaries/sub-1/settings' && !init) {
          return {
            scopeType: 'subsidiary',
            scopeId: 'sub-1',
            settings: {
              defaultLanguage: 'en',
              timezone: 'Asia/Tokyo',
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

        if (
          path ===
            '/api/v1/configuration-entity/business-segment?scopeType=subsidiary&scopeId=sub-1&includeInherited=true&includeDisabled=true&includeInactive=false&ownerOnly=false&page=1&pageSize=20&sort=sortOrder'
        ) {
          return {
            success: true,
            data: [],
            meta: {
              pagination: {
                page: 1,
                pageSize: 20,
                totalCount: 0,
                totalPages: 1,
                hasNext: false,
                hasPrev: false,
              },
            },
          };
        }

        throw new Error(`Unhandled request: ${path}`);
      });
    };

    localeState.currentLocale = 'zh';
    localeState.selectedLocale = 'zh_HANT';
    installSuccessMocks();

    const { rerender } = render(<SubsidiarySettingsScreen tenantId="tenant-1" subsidiaryId="sub-1" />);

    expect(await screen.findByRole('heading', { name: 'Tokyo 分目錄設定' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '設定分區' })).toBeInTheDocument();

    localeState.currentLocale = 'en';
    localeState.selectedLocale = 'ko';
    installSuccessMocks();
    rerender(<SubsidiarySettingsScreen tenantId="tenant-1" subsidiaryId="sub-1" />);

    expect(await screen.findByRole('heading', { name: 'Tokyo 하위 조직 설정' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '설정 섹션' })).toBeInTheDocument();
  });
});
