import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SUPPORTED_UI_LOCALES, type SupportedUiLocale } from '@tcrn/shared';

import type {
  DictionaryItemRecord,
  DictionaryTypeSummary,
} from '@/domains/config-dictionary-settings/api/system-dictionary.api';
import { SystemDictionaryScreen } from '@/domains/config-dictionary-settings/screens/SystemDictionaryScreen';
import { localizedFixture } from '@/domains/config-dictionary-settings/testing/localized-fixtures';

const mockRequest = vi.fn();
const mockRouterReplace = vi.fn();
let currentPathname = '/ac/ac-tenant/system-dictionary';
let currentSearch = '';
const localeState = {
  locale: 'en' as SupportedUiLocale,
  copy: null,
  setLocale: vi.fn(),
  availableLocales: [...SUPPORTED_UI_LOCALES],
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
  useUiLocale: () => localeState,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => currentPathname,
  useRouter: () => ({
    replace: mockRouterReplace,
  }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

function cloneItems(items: DictionaryItemRecord[]) {
  return items.map((item) => ({
    ...item,
    extraData: item.extraData ? { ...item.extraData } : null,
  }));
}

function getTableRowByText(text: string) {
  const element = screen.getByText(text);
  const tableRow = element.closest('tr');

  if (!tableRow) {
    throw new Error(`No table row found for text: ${text}`);
  }

  return tableRow;
}

describe('SystemDictionaryScreen', () => {
  beforeEach(() => {
    mockRequest.mockReset();
    mockRouterReplace.mockReset();
    currentSearch = '';
    currentPathname = '/ac/ac-tenant/system-dictionary';
    localeState.locale = 'en';
    localeState.locale = 'en';
  });

  it('passes localized close labels to dictionary drawers', async () => {
    localeState.locale = 'ja';
    localeState.locale = 'ja';

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
              name: localizedFixture('Active customer', { zh_HANS: '活跃客户', ja: '有効顧客' }),
              localizedName: '有効顧客',
              description: localizedFixture('Currently active'),
              localizedDescription: 'Currently active',
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
    expect(
      await screen.findByRole('button', { name: '辞書項目ドロワーを閉じる' })
    ).toBeInTheDocument();
  });

  it('clears stale dictionary rows while loading a newly selected type', async () => {
    const types: DictionaryTypeSummary[] = [
      {
        type: 'CUSTOMER_STATUS',
        name: 'Customer Status',
        description: 'Customer lifecycle flags',
        count: 1,
      },
      {
        type: 'MEMBERSHIP_LEVEL',
        name: 'Membership Level',
        description: 'Customer tier labels',
        count: 0,
      },
    ];

    let resolveMembershipItems: (value: {
      success: true;
      data: DictionaryItemRecord[];
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
    }) => void = () => {};

    const membershipItems = new Promise<Parameters<typeof resolveMembershipItems>[0]>((resolve) => {
      resolveMembershipItems = resolve;
    });

    mockRequest.mockImplementation(async (path: string) => {
      const url = new URL(path, 'https://tcrn.local');

      if (url.pathname === '/api/v1/system-dictionary') {
        return types;
      }

      if (url.pathname === '/api/v1/system-dictionary/CUSTOMER_STATUS') {
        return {
          success: true,
          data: [
            {
              id: 'item-1',
              dictionaryCode: 'CUSTOMER_STATUS',
              code: 'ACTIVE',
              name: localizedFixture('Active customer'),
              localizedName: 'Active customer',
              description: localizedFixture(''),
              localizedDescription: null,
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

      if (url.pathname === '/api/v1/system-dictionary/MEMBERSHIP_LEVEL') {
        return membershipItems;
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<SystemDictionaryScreen />);

    expect((await screen.findAllByText('Active customer')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Membership Level/ }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/system-dictionary/MEMBERSHIP_LEVEL'),
        expect.anything()
      );
    });
    await waitFor(() => {
      expect(screen.queryAllByText('Active customer')).toHaveLength(0);
    });

    resolveMembershipItems({
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
    });

    expect(
      await screen.findByText('This dictionary type does not contain any visible items yet.')
    ).toBeInTheDocument();
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

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      const url = new URL(path, 'https://tcrn.local');

      if (url.pathname === '/api/v1/system-dictionary' && init?.method !== 'POST') {
        return types;
      }

      if (url.pathname === '/api/v1/system-dictionary' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as {
          code: string;
          name: ReturnType<typeof localizedFixture>;
          description?: ReturnType<typeof localizedFixture>;
          sortOrder?: number;
        };

        const createdType = {
          type: body.code,
          name: body.name.en,
          description: body.description?.en ?? null,
          count: 0,
        };

        types = [...types, createdType];

        return {
          id: 'type-2',
          code: body.code,
          name: body.name,
          localizedName: body.name.en,
          description: body.description ?? localizedFixture(''),
          localizedDescription: body.description?.en ?? null,
          sortOrder: body.sortOrder ?? 0,
          isActive: true,
          createdAt: '2026-04-17T00:20:00.000Z',
          updatedAt: '2026-04-17T00:20:00.000Z',
          version: 1,
        };
      }

      if (url.pathname === '/api/v1/system-dictionary/CUSTOMER_STATUS') {
        const includeInactive = url.searchParams.get('includeInactive') === 'true';
        const visibleItems = cloneItems(
          includeInactive ? items : items.filter((item) => item.isActive)
        );

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

      if (url.pathname === '/api/v1/system-dictionary/MEMBERSHIP_LEVEL') {
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

      if (
        url.pathname === '/api/v1/system-dictionary/CUSTOMER_STATUS/items' &&
        init?.method === 'POST'
      ) {
        const body = JSON.parse(String(init.body)) as {
          code: string;
          name: ReturnType<typeof localizedFixture>;
          description?: ReturnType<typeof localizedFixture>;
          sortOrder?: number;
        };

        const createdItem: DictionaryItemRecord = {
          id: 'item-2',
          dictionaryCode: 'CUSTOMER_STATUS',
          code: body.code,
          name: body.name,
          localizedName: body.name.en,
          description: body.description ?? localizedFixture(''),
          localizedDescription: body.description?.en ?? null,
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
            : entry
        );

        return createdItem;
      }

      if (
        url.pathname === '/api/v1/system-dictionary/CUSTOMER_STATUS/items/item-1' &&
        init?.method === 'PATCH'
      ) {
        const body = JSON.parse(String(init.body)) as {
          name: ReturnType<typeof localizedFixture>;
          description?: ReturnType<typeof localizedFixture>;
          sortOrder?: number;
          version: number;
        };

        items = items.map((item) =>
          item.id === 'item-1'
            ? {
                ...item,
                name: body.name,
                localizedName: body.name.en,
                description: body.description ?? item.description,
                localizedDescription: body.description?.en ?? item.localizedDescription,
                sortOrder: body.sortOrder ?? item.sortOrder,
                updatedAt: '2026-04-17T00:40:00.000Z',
                version: body.version + 1,
              }
            : item
        );

        return items.find((item) => item.id === 'item-1');
      }

      if (
        url.pathname === '/api/v1/system-dictionary/CUSTOMER_STATUS/items/item-1' &&
        init?.method === 'DELETE'
      ) {
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
            : item
        );

        return items.find((item) => item.id === 'item-1');
      }

      if (
        url.pathname === '/api/v1/system-dictionary/CUSTOMER_STATUS/items/item-1/reactivate' &&
        init?.method === 'POST'
      ) {
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
            : item
        );

        return items.find((item) => item.id === 'item-1');
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<SystemDictionaryScreen />);

    expect(await screen.findByRole('heading', { name: 'System Dictionary' })).toBeInTheDocument();
    expect((await screen.findAllByText('Active customer')).length).toBeGreaterThan(0);

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
            name: localizedFixture('Membership Level'),
            description: localizedFixture(''),
            sortOrder: 0,
          }),
        })
      );
    });

    expect(
      await screen.findByText('MEMBERSHIP_LEVEL dictionary type created.')
    ).toBeInTheDocument();
    expect((await screen.findAllByText('Membership Level')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'New item' }));
    fireEvent.change(screen.getByLabelText('Dictionary item code'), {
      target: { value: 'INACTIVE' },
    });
    fireEvent.change(screen.getByLabelText('Dictionary item English name'), {
      target: { value: 'Inactive customer' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Membership Level/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Create item' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/system-dictionary/CUSTOMER_STATUS/items',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            code: 'INACTIVE',
            name: localizedFixture('Inactive customer'),
            description: localizedFixture(''),
            sortOrder: 0,
          }),
        })
      );
    });

    expect(
      await screen.findByText('INACTIVE item created under CUSTOMER_STATUS.')
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Customer Status/ }));
    expect((await screen.findAllByText('Inactive customer')).length).toBeGreaterThan(0);

    fireEvent.click(within(getTableRowByText('ACTIVE')).getByRole('button', { name: 'Edit' }));
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
            name: localizedFixture('Currently active', {
              zh_HANS: '活跃客户',
              zh_HANT: '活跃客户',
              ja: 'Active customer',
              ko: 'Active customer',
              fr: 'Active customer',
            }),
            description: localizedFixture('Currently active'),
            sortOrder: 0,
            version: 1,
          }),
        })
      );
    });

    expect(await screen.findByText('ACTIVE item updated.')).toBeInTheDocument();
    await waitFor(() => {
      expect(within(getTableRowByText('ACTIVE')).getByText('v2')).toBeInTheDocument();
    });

    fireEvent.click(
      within(getTableRowByText('ACTIVE')).getByRole('button', { name: 'Deactivate' })
    );
    const deactivateDialog = await screen.findByRole('dialog');
    expect(within(deactivateDialog).getByText('Deactivate dictionary item')).toBeInTheDocument();
    fireEvent.click(within(deactivateDialog).getByRole('button', { name: 'Deactivate' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/system-dictionary/CUSTOMER_STATUS/items/item-1',
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify({
            version: 2,
          }),
        })
      );
    });

    expect(await screen.findByText('ACTIVE deactivated.')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Include inactive dictionary items'));
    await waitFor(() => {
      const activeRow = getTableRowByText('ACTIVE');

      expect(within(activeRow).getByText('v3')).toBeInTheDocument();
      expect(within(activeRow).getByText('Inactive')).toBeInTheDocument();
      expect(within(activeRow).getByRole('button', { name: 'Reactivate' })).toBeInTheDocument();
    });

    fireEvent.click(
      within(getTableRowByText('ACTIVE')).getByRole('button', { name: 'Reactivate' })
    );
    const reactivateDialog = await screen.findByRole('dialog');
    expect(within(reactivateDialog).getByText('Reactivate dictionary item')).toBeInTheDocument();
    fireEvent.click(within(reactivateDialog).getByRole('button', { name: 'Reactivate' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/system-dictionary/CUSTOMER_STATUS/items/item-1/reactivate',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            version: 3,
          }),
        })
      );
    });

    expect(await screen.findByText('ACTIVE reactivated.')).toBeInTheDocument();
  });

  it('hydrates dictionary explorer state from URL and preserves unrelated query params', async () => {
    currentSearch =
      'dictionaryType=MEMBERSHIP_LEVEL&dictionarySearch=vip&dictionaryInactive=true&dictionaryPage=2&dictionaryPageSize=50&foo=1';
    const types: DictionaryTypeSummary[] = [
      {
        type: 'CUSTOMER_STATUS',
        name: 'Customer Status',
        description: 'Customer lifecycle flags',
        count: 1,
      },
      {
        type: 'MEMBERSHIP_LEVEL',
        name: 'Membership Level',
        description: 'Customer tier labels',
        count: 1,
      },
    ];

    mockRequest.mockImplementation(async (path: string) => {
      const url = new URL(path, 'https://tcrn.local');

      if (url.pathname === '/api/v1/system-dictionary') {
        return types;
      }

      if (url.pathname === '/api/v1/system-dictionary/MEMBERSHIP_LEVEL') {
        expect(url.searchParams.get('search')).toBe('vip');
        expect(url.searchParams.get('includeInactive')).toBe('true');
        expect(url.searchParams.get('page')).toBe('2');
        expect(url.searchParams.get('pageSize')).toBe('50');

        return {
          success: true,
          data: [
            {
              id: 'item-vip',
              dictionaryCode: 'MEMBERSHIP_LEVEL',
              code: 'VIP',
              name: localizedFixture('VIP member'),
              localizedName: 'VIP member',
              description: localizedFixture('High-value customer tier'),
              localizedDescription: 'High-value customer tier',
              sortOrder: 10,
              isActive: false,
              extraData: null,
              createdAt: '2026-04-17T00:00:00.000Z',
              updatedAt: '2026-04-17T00:10:00.000Z',
              version: 3,
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

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<SystemDictionaryScreen />);

    expect((await screen.findAllByText('VIP member')).length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Search dictionary items')).toHaveValue('vip');
    expect(screen.getByLabelText('Include inactive dictionary items')).toBeChecked();
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Rows per page'), { target: { value: '20' } });
    });

    expect(mockRouterReplace).toHaveBeenCalledWith(
      '/ac/ac-tenant/system-dictionary?foo=1&dictionaryType=MEMBERSHIP_LEVEL&dictionarySearch=vip&dictionaryInactive=true'
    );
  });

  it('renders localized system dictionary copy for zh locale', async () => {
    localeState.locale = 'zh_HANS';
    localeState.locale = 'zh_HANS';

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
