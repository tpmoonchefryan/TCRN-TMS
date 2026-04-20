import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  DictionaryItemRecord,
  DictionaryTypeSummary,
} from '@/domains/config-dictionary-settings/api/system-dictionary.api';
import { SystemDictionaryScreen } from '@/domains/config-dictionary-settings/screens/SystemDictionaryScreen';
import { type RuntimeLocale } from '@/platform/runtime/locale/locale-provider';

const mockRequest = vi.fn();
const localeState = {
  currentLocale: 'en' as RuntimeLocale,
  selectedLocale: 'en',
  copy: null,
  setLocale: vi.fn(),
  availableLocales: ['en', 'zh', 'ja'] as RuntimeLocale[],
  localeOptions: [
    { code: 'en', label: 'English' },
    { code: 'zh_HANS', label: '简体中文' },
    { code: 'zh_HANT', label: '繁體中文' },
    { code: 'ja', label: '日本語' },
    { code: 'ko', label: '한국어' },
    { code: 'fr', label: 'Français' },
  ],
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
      tenantName: 'AC Tenant',
      tenantTier: 'ac',
      tenantCode: 'AC',
    },
  }),
}));

vi.mock('@/platform/runtime/locale/locale-provider', () => ({
  useRuntimeLocale: () => localeState,
}));

function cloneItems(items: DictionaryItemRecord[]) {
  return items.map((item) => ({
    ...item,
    extraData: item.extraData ? { ...item.extraData } : null,
  }));
}

describe('SystemDictionaryScreen', () => {
  beforeEach(() => {
    mockRequest.mockReset();
    localeState.currentLocale = 'en';
    localeState.selectedLocale = 'en';
  });

  it('passes localized close labels to dictionary drawers', async () => {
    localeState.currentLocale = 'ja';
    localeState.selectedLocale = 'ja';

    mockRequest.mockImplementation(async (path: string) => {
      const url = new URL(path, 'https://tcrn.local');

      if (url.pathname === '/api/v1/system-dictionary') {
        return [
          {
            type: 'CUSTOMER_STATUS',
            name: 'Customer Status',
            description: 'Customer lifecycle flags',
            count: 1,
          },
        ];
      }

      if (url.pathname === '/api/v1/system-dictionary/CUSTOMER_STATUS') {
        return {
          success: true,
          data: [
            {
              id: 'item-1',
              dictionaryCode: 'CUSTOMER_STATUS',
              code: 'ACTIVE',
              nameEn: 'Active customer',
              nameZh: '活跃客户',
              nameJa: '有効顧客',
              name: '有効顧客',
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

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<SystemDictionaryScreen />);

    expect(await screen.findByRole('heading', { name: 'システム辞書' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '新しい辞書タイプ' }));
    fireEvent.click(await screen.findByRole('button', { name: '辞書タイプドロワーを閉じる' }));

    fireEvent.click(screen.getByRole('button', { name: '編集' }));
    expect(await screen.findByRole('button', { name: '辞書項目ドロワーを閉じる' })).toBeInTheDocument();
  });

  it('creates dictionary types and manages dictionary item lifecycle in the AC-owned workspace', async () => {
    let types: DictionaryTypeSummary[] = [
      {
        type: 'CUSTOMER_STATUS',
        name: 'Customer Status',
        description: 'Customer lifecycle flags',
        count: 1,
      },
    ];
    let items: DictionaryItemRecord[] = [
      {
        id: 'item-1',
        dictionaryCode: 'CUSTOMER_STATUS',
        code: 'ACTIVE',
        nameEn: 'Active customer',
        nameZh: '活跃客户',
        nameJa: null,
        translations: {
          en: 'Active customer',
          zh_HANS: '活跃客户',
        },
        name: 'Active customer',
        descriptionEn: 'Currently active',
        descriptionZh: null,
        descriptionJa: null,
        descriptionTranslations: {
          en: 'Currently active',
        },
        sortOrder: 0,
        isActive: true,
        extraData: null,
        createdAt: '2026-04-17T00:00:00.000Z',
        updatedAt: '2026-04-17T00:10:00.000Z',
        version: 1,
      },
    ];

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      const url = new URL(path, 'https://tcrn.local');

      if (url.pathname === '/api/v1/system-dictionary' && init?.method !== 'POST') {
        return types;
      }

      if (url.pathname === '/api/v1/system-dictionary' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as {
          code: string;
          nameEn: string;
          descriptionEn?: string;
          sortOrder?: number;
        };

        const createdType = {
          type: body.code,
          name: body.nameEn,
          description: body.descriptionEn ?? null,
          count: 0,
        };

        types = [...types, createdType];

        return {
          id: 'type-2',
          code: body.code,
          nameEn: body.nameEn,
          nameZh: null,
          nameJa: null,
          descriptionEn: body.descriptionEn ?? null,
          descriptionZh: null,
          descriptionJa: null,
          sortOrder: body.sortOrder ?? 0,
          isActive: true,
          createdAt: '2026-04-17T00:20:00.000Z',
          updatedAt: '2026-04-17T00:20:00.000Z',
          version: 1,
        };
      }

      if (url.pathname === '/api/v1/system-dictionary/CUSTOMER_STATUS') {
        const includeInactive = url.searchParams.get('includeInactive') === 'true';
        const visibleItems = cloneItems(includeInactive ? items : items.filter((item) => item.isActive));

        return {
          success: true,
          data: visibleItems,
          meta: {
            pagination: {
              page: 1,
              pageSize: 20,
              totalCount: visibleItems.length,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            },
          },
        };
      }

      if (url.pathname === '/api/v1/system-dictionary/CUSTOMER_STATUS/items' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as {
          code: string;
          nameEn: string;
          sortOrder?: number;
        };

        const createdItem: DictionaryItemRecord = {
          id: 'item-2',
          dictionaryCode: 'CUSTOMER_STATUS',
          code: body.code,
          nameEn: body.nameEn,
          nameZh: null,
          nameJa: null,
          translations: {
            en: body.nameEn,
          },
          name: body.nameEn,
          descriptionEn: null,
          descriptionZh: null,
          descriptionJa: null,
          descriptionTranslations: {},
          sortOrder: body.sortOrder ?? 0,
          isActive: true,
          extraData: null,
          createdAt: '2026-04-17T00:30:00.000Z',
          updatedAt: '2026-04-17T00:30:00.000Z',
          version: 1,
        };

        items = [...items, createdItem];
        types = types.map((entry) =>
          entry.type === 'CUSTOMER_STATUS'
            ? {
                ...entry,
                count: items.length,
              }
            : entry,
        );

        return createdItem;
      }

      if (url.pathname === '/api/v1/system-dictionary/CUSTOMER_STATUS/items/item-1' && init?.method === 'PATCH') {
        const body = JSON.parse(String(init.body)) as {
          nameEn: string;
          sortOrder?: number;
          version: number;
        };

        items = items.map((item) =>
          item.id === 'item-1'
            ? {
                ...item,
                nameEn: body.nameEn,
                name: body.nameEn,
                sortOrder: body.sortOrder ?? item.sortOrder,
                updatedAt: '2026-04-17T00:40:00.000Z',
                version: body.version + 1,
              }
            : item,
        );

        return items.find((item) => item.id === 'item-1');
      }

      if (url.pathname === '/api/v1/system-dictionary/CUSTOMER_STATUS/items/item-1' && init?.method === 'DELETE') {
        const body = JSON.parse(String(init.body)) as {
          version: number;
        };

        items = items.map((item) =>
          item.id === 'item-1'
            ? {
                ...item,
                isActive: false,
                updatedAt: '2026-04-17T00:50:00.000Z',
                version: body.version + 1,
              }
            : item,
        );

        return items.find((item) => item.id === 'item-1');
      }

      if (url.pathname === '/api/v1/system-dictionary/CUSTOMER_STATUS/items/item-1/reactivate' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as {
          version: number;
        };

        items = items.map((item) =>
          item.id === 'item-1'
            ? {
                ...item,
                isActive: true,
                updatedAt: '2026-04-17T01:00:00.000Z',
                version: body.version + 1,
              }
            : item,
        );

        return items.find((item) => item.id === 'item-1');
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<SystemDictionaryScreen />);

    expect(await screen.findByRole('heading', { name: 'System Dictionary' })).toBeInTheDocument();
    expect(await screen.findByText('Active customer')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'New dictionary type' }));
    fireEvent.change(screen.getByLabelText('Dictionary type code'), {
      target: { value: 'membership_level' },
    });
    fireEvent.change(screen.getByLabelText('Dictionary type English name'), {
      target: { value: 'Membership Level' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create dictionary type' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/system-dictionary',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            code: 'MEMBERSHIP_LEVEL',
            nameEn: 'Membership Level',
            translations: {
              en: 'Membership Level',
            },
            descriptionTranslations: {},
            sortOrder: 0,
          }),
        }),
      );
    });

    expect(await screen.findByText('MEMBERSHIP_LEVEL dictionary type created.')).toBeInTheDocument();
    expect((await screen.findAllByText('Membership Level')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'New item' }));
    fireEvent.change(screen.getByLabelText('Dictionary item code'), {
      target: { value: 'INACTIVE' },
    });
    fireEvent.change(screen.getByLabelText('Dictionary item English name'), {
      target: { value: 'Inactive customer' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create item' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/system-dictionary/CUSTOMER_STATUS/items',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            code: 'INACTIVE',
            nameEn: 'Inactive customer',
            translations: {
              en: 'Inactive customer',
            },
            descriptionTranslations: {},
            sortOrder: 0,
          }),
        }),
      );
    });

    expect(await screen.findByText('INACTIVE item created under CUSTOMER_STATUS.')).toBeInTheDocument();
    expect((await screen.findAllByText('Inactive customer')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    fireEvent.change(screen.getByLabelText('Dictionary item English name'), {
      target: { value: 'Currently active' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save item' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/system-dictionary/CUSTOMER_STATUS/items/item-1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            nameEn: 'Currently active',
            nameZh: '活跃客户',
            descriptionEn: 'Currently active',
            translations: {
              en: 'Currently active',
              zh_HANS: '活跃客户',
            },
            descriptionTranslations: {
              en: 'Currently active',
            },
            sortOrder: 0,
            version: 1,
          }),
        }),
      );
    });

    expect(await screen.findByText('ACTIVE item updated.')).toBeInTheDocument();
    expect((await screen.findAllByText('Currently active')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: 'Deactivate' })[0]);
    const deactivateDialog = screen.getByText('Deactivate dictionary item').closest('dialog');
    expect(deactivateDialog).not.toBeNull();
    fireEvent.click(within(deactivateDialog as HTMLDialogElement).getByRole('button', { name: 'Deactivate' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/system-dictionary/CUSTOMER_STATUS/items/item-1',
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify({
            version: 2,
          }),
        }),
      );
    });

    expect(await screen.findByText('ACTIVE deactivated.')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Include inactive dictionary items'));
    expect(await screen.findByRole('button', { name: 'Reactivate' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reactivate' }));
    const reactivateDialog = screen.getByText('Reactivate dictionary item').closest('dialog');
    expect(reactivateDialog).not.toBeNull();
    fireEvent.click(within(reactivateDialog as HTMLDialogElement).getByRole('button', { name: 'Reactivate' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/system-dictionary/CUSTOMER_STATUS/items/item-1/reactivate',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            version: 3,
          }),
        }),
      );
    });

    expect(await screen.findByText('ACTIVE reactivated.')).toBeInTheDocument();
  });

  it('renders localized system dictionary copy for zh locale', async () => {
    localeState.currentLocale = 'zh';
    localeState.selectedLocale = 'zh_HANS';

    const types: DictionaryTypeSummary[] = [
      {
        type: 'CUSTOMER_STATUS',
        name: '客户状态',
        description: '客户生命周期标记',
        count: 0,
      },
    ];

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      const url = new URL(path, 'https://tcrn.local');

      if (url.pathname === '/api/v1/system-dictionary' && init?.method !== 'POST') {
        return types;
      }

      if (url.pathname === '/api/v1/system-dictionary/CUSTOMER_STATUS') {
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

    render(<SystemDictionaryScreen />);

    expect(await screen.findByRole('heading', { name: '系统词典' })).toBeInTheDocument();
    expect(await screen.findByText('词典管理')).toBeInTheDocument();
    expect((await screen.findAllByText('客户状态')).length).toBeGreaterThan(0);
    expect(await screen.findByText('该词典类型当前没有可见词条。')).toBeInTheDocument();
  });
});
