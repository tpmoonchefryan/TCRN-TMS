import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ConfigEntityRecord } from '@/domains/config-dictionary-settings/api/settings.api';
import { ScopedConfigEntityWorkspace } from '@/domains/config-dictionary-settings/components/ScopedConfigEntityWorkspace';
import { ApiRequestError } from '@/platform/http/api';
import type { RuntimeLocale } from '@/platform/runtime/locale/locale-provider';

const mockRequest = vi.fn();
const mockRequestEnvelope = vi.fn();
const mockRouterReplace = vi.fn();
let currentPathname = '/tenant/tenant-1/settings';
let currentSearch = '';
const localeState = {
  currentLocale: 'en' as RuntimeLocale,
  selectedLocale: undefined,
};

vi.mock('@/platform/runtime/locale/locale-provider', () => ({
  useRuntimeLocale: () => localeState,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => currentPathname,
  useRouter: () => ({
    replace: mockRouterReplace,
  }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

function buildConfigEntityRecord(overrides: Partial<ConfigEntityRecord> = {}): ConfigEntityRecord {
  return {
    id: 'entity-1',
    ownerType: 'tenant',
    ownerId: null,
    code: 'MUSIC',
    name: 'Music',
    nameEn: 'Music',
    nameZh: null,
    nameJa: null,
    translations: { en: 'Music' },
    description: 'Music activities',
    descriptionEn: 'Music activities',
    descriptionZh: null,
    descriptionJa: null,
    descriptionTranslations: { en: 'Music activities' },
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

function buildEnvelope(data: unknown[]) {
  return {
    success: true,
    data,
    meta: {
      pagination: {
        page: 1,
        pageSize: 20,
        totalCount: data.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    },
  };
}

describe('ScopedConfigEntityWorkspace', () => {
  beforeEach(() => {
    mockRequest.mockReset();
    mockRequestEnvelope.mockReset();
    mockRouterReplace.mockReset();
    currentPathname = '/tenant/tenant-1/settings';
    currentSearch = '';
  });


  it('hydrates config entity list state from URL and preserves unrelated query params', async () => {
    currentSearch = 'configEntitySearch=music&configEntityScopeOnly=true&configEntityInactive=true&configEntityPage=2&configEntityPageSize=50&foo=1';

    mockRequestEnvelope.mockImplementation(async (path: string) => {
      if (
        path ===
        '/api/v1/configuration-entity/business-segment?scopeType=tenant&includeInherited=false&includeDisabled=true&includeInactive=true&ownerOnly=true&search=music&page=2&pageSize=50&sort=sortOrder'
      ) {
        return {
          success: true,
          data: [buildConfigEntityRecord({ code: 'MUSIC_VIP', name: 'VIP Music' })],
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

    render(
      <ScopedConfigEntityWorkspace
        request={mockRequest}
        requestEnvelope={mockRequestEnvelope}
        scopeType="tenant"
      />,
    );

    expect(await screen.findByText('VIP Music')).toBeInTheDocument();
    expect(screen.getByLabelText('Search configuration entities')).toHaveValue('music');
    expect(screen.getByLabelText('Current scope only')).toBeChecked();
    expect(screen.getByLabelText('Include inactive records')).toBeChecked();
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Rows per page'), { target: { value: '20' } });
    });

    expect(mockRouterReplace).toHaveBeenCalledWith(
      '/tenant/tenant-1/settings?foo=1&configEntitySearch=music&configEntityScopeOnly=true&configEntityInactive=true',
    );
  });

  it('clears stale config rows while loading a newly selected entity family', async () => {
    const musicRecord = buildConfigEntityRecord();
    let resolveMembershipClass: (value: ReturnType<typeof buildEnvelope>) => void = () => {};
    const membershipClassResponse = new Promise<ReturnType<typeof buildEnvelope>>((resolve) => {
      resolveMembershipClass = resolve;
    });

    mockRequestEnvelope.mockImplementation(async (path: string) => {
      if (
        path ===
        '/api/v1/configuration-entity/business-segment?scopeType=tenant&includeInherited=true&includeDisabled=true&includeInactive=false&ownerOnly=false&page=1&pageSize=20&sort=sortOrder'
      ) {
        return buildEnvelope([musicRecord]);
      }

      if (
        path ===
        '/api/v1/configuration-entity/membership-class?scopeType=tenant&includeInherited=true&includeDisabled=true&includeInactive=false&ownerOnly=false&page=1&pageSize=20&sort=sortOrder'
      ) {
        return membershipClassResponse;
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(
      <ScopedConfigEntityWorkspace
        request={mockRequest}
        requestEnvelope={mockRequestEnvelope}
        scopeType="tenant"
      />,
    );

    expect(await screen.findByText('Music')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Membership Category/ }));

    await waitFor(() => {
      expect(mockRequestEnvelope).toHaveBeenCalledWith(
        '/api/v1/configuration-entity/membership-class?scopeType=tenant&includeInherited=true&includeDisabled=true&includeInactive=false&ownerOnly=false&page=1&pageSize=20&sort=sortOrder',
        expect.anything(),
      );
    });
    await waitFor(() => {
      expect(screen.queryByText('Music')).not.toBeInTheDocument();
    });

    resolveMembershipClass(buildEnvelope([]));

    expect(await screen.findByText('No membership category records returned')).toBeInTheDocument();
  });

  it('keeps queued config entity state changes bound to the original entity family', async () => {
    const musicRecord = buildConfigEntityRecord({ id: 'segment-1' });

    mockRequestEnvelope.mockImplementation(async (path: string) => {
      if (
        path ===
        '/api/v1/configuration-entity/business-segment?scopeType=tenant&includeInherited=true&includeDisabled=true&includeInactive=false&ownerOnly=false&page=1&pageSize=20&sort=sortOrder'
      ) {
        return buildEnvelope([musicRecord]);
      }

      if (
        path ===
        '/api/v1/configuration-entity/membership-class?scopeType=tenant&includeInherited=true&includeDisabled=true&includeInactive=false&ownerOnly=false&page=1&pageSize=20&sort=sortOrder'
      ) {
        return buildEnvelope([]);
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/configuration-entity/business-segment/segment-1/deactivate') {
        return { id: 'segment-1', isActive: false, deactivatedAt: '2026-04-17T00:20:00.000Z' };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(
      <ScopedConfigEntityWorkspace
        request={mockRequest}
        requestEnvelope={mockRequestEnvelope}
        scopeType="tenant"
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Deactivate MUSIC' }));
    expect(await screen.findByRole('dialog', { name: 'Deactivate MUSIC?' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Membership Category/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/configuration-entity/business-segment/segment-1/deactivate',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ version: 1 }),
        }),
      );
    });
    expect(mockRequest).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/configuration-entity/membership-class/segment-1/deactivate'),
      expect.anything(),
    );
    expect(await screen.findByText('Business Segment MUSIC deactivated.')).toBeInTheDocument();
  });

  it('treats membership category as a tenant-global review-only entity in subsidiary scope', async () => {
    mockRequestEnvelope.mockImplementation(async (path: string) => {
      if (
        path ===
        '/api/v1/configuration-entity/business-segment?scopeType=subsidiary&scopeId=sub-1&includeInherited=true&includeDisabled=true&includeInactive=false&ownerOnly=false&page=1&pageSize=20&sort=sortOrder'
      ) {
        return buildEnvelope([]);
      }

      if (
        path ===
        '/api/v1/configuration-entity/membership-class?scopeType=subsidiary&scopeId=sub-1&includeInherited=true&includeDisabled=true&includeInactive=false&ownerOnly=false&page=1&pageSize=20&sort=sortOrder'
      ) {
        return buildEnvelope([
          {
            id: 'class-1',
            ownerType: 'tenant',
            ownerId: null,
            code: 'FANCLUB',
            name: 'Fanclub',
            nameEn: 'Fanclub',
            nameZh: null,
            nameJa: null,
            translations: { en: 'Fanclub' },
            description: 'Tenant-wide membership category.',
            descriptionEn: 'Tenant-wide membership category.',
            descriptionZh: null,
            descriptionJa: null,
            descriptionTranslations: { en: 'Tenant-wide membership category.' },
            sortOrder: 1,
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
        ]);
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(
      <ScopedConfigEntityWorkspace
        request={mockRequest}
        requestEnvelope={mockRequestEnvelope}
        scopeType="subsidiary"
        scopeId="sub-1"
      />,
    );

    fireEvent.click(
      await screen.findByRole('button', {
        name: /^Membership Category membership-class Top-level membership categories available to this tenant\.$/i,
      }),
    );

    expect(await screen.findByText('Membership Category is managed at the tenant scope and can only be reviewed here.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Current scope only')).not.toBeInTheDocument();
    expect(await screen.findByText('FANCLUB')).toBeInTheDocument();
    expect(screen.getByText('Inherited review only')).toBeInTheDocument();
  });

  it('treats profile store as a tenant-global review-only entity in subsidiary scope', async () => {
    mockRequestEnvelope.mockImplementation(async (path: string) => {
      if (
        path ===
        '/api/v1/configuration-entity/business-segment?scopeType=subsidiary&scopeId=sub-1&includeInherited=true&includeDisabled=true&includeInactive=false&ownerOnly=false&page=1&pageSize=20&sort=sortOrder'
      ) {
        return buildEnvelope([]);
      }

      if (
        path ===
        '/api/v1/configuration-entity/profile-store?scopeType=subsidiary&scopeId=sub-1&includeInherited=true&includeDisabled=true&includeInactive=false&ownerOnly=false&page=1&pageSize=20&sort=sortOrder'
      ) {
        return buildEnvelope([
          buildConfigEntityRecord({
            id: 'store-1',
            ownerType: 'tenant',
            ownerId: null,
            code: 'DEFAULT_STORE',
            name: 'Default Store',
            nameEn: 'Default Store',
            description: 'Tenant-wide customer archive.',
            descriptionEn: 'Tenant-wide customer archive.',
            translations: { en: 'Default Store' },
            descriptionTranslations: { en: 'Tenant-wide customer archive.' },
            isInherited: true,
            canDisable: true,
          }),
        ]);
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(
      <ScopedConfigEntityWorkspace
        request={mockRequest}
        requestEnvelope={mockRequestEnvelope}
        scopeType="subsidiary"
        scopeId="sub-1"
      />,
    );

    fireEvent.click(
      await screen.findByRole('button', {
        name: /Profile Store profile-store Tenant-level customer archive boundaries/i,
      }),
    );

    expect(await screen.findByText('Profile Store is managed at the tenant scope and can only be reviewed here.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Current scope only')).not.toBeInTheDocument();
    expect(await screen.findByText('DEFAULT_STORE')).toBeInTheDocument();
    expect(screen.getByText('Inherited review only')).toBeInTheDocument();
    expect(mockRequestEnvelope).toHaveBeenCalledWith(
      '/api/v1/configuration-entity/profile-store?scopeType=subsidiary&scopeId=sub-1&includeInherited=true&includeDisabled=true&includeInactive=false&ownerOnly=false&page=1&pageSize=20&sort=sortOrder',
      expect.anything(),
    );
  });

  it('routes custom-domain entity family to the scoped custom-domain binding API with URL-backed filters', async () => {
    currentSearch = 'configEntityType=custom-domain&configEntitySearch=brand&configEntityScopeOnly=true&configEntityInactive=true&foo=1';

    mockRequest.mockImplementation(async (path: string) => {
      if (
        path ===
        '/api/v1/talents/custom-domain-bindings?scopeType=subsidiary&scopeId=sub-1&includeInherited=false&includeInactive=true&search=brand'
      ) {
        return {
          domains: [
            {
              id: 'domain-1',
              hostname: 'brand.example.com',
              ownerType: 'tenant',
              ownerId: null,
              ownerDepth: null,
              inherited: true,
              selected: false,
              customDomainVerified: true,
              customDomainVerificationToken: null,
              customDomainSslMode: 'cloudflare',
              isActive: true,
              routeMode: 'scoped_talent_path',
            },
          ],
        };
      }

      if (
        path ===
        '/api/v1/talents/custom-domain-bindings?scopeType=subsidiary&scopeId=sub-1&includeInherited=false&includeInactive=true&search=fans'
      ) {
        return { domains: [] };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(
      <ScopedConfigEntityWorkspace
        request={mockRequest}
        requestEnvelope={mockRequestEnvelope}
        scopeType="subsidiary"
        scopeId="sub-1"
      />,
    );

    expect(await screen.findByText('brand.example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New custom domain' })).toBeInTheDocument();
    expect(screen.getByLabelText('Search custom domains')).toHaveValue('brand');
    expect(screen.getByLabelText('Current scope domains only')).toBeChecked();
    expect(screen.getByLabelText('Include inactive custom domains')).toBeChecked();
    expect(screen.getByText('Review only')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
    expect(mockRequestEnvelope).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/configuration-entity/custom-domain'),
      expect.anything(),
    );

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Search custom domains'), {
        target: { value: 'fans' },
      });
    });

    expect(mockRouterReplace).toHaveBeenCalledWith(
      '/tenant/tenant-1/settings?foo=1&configEntityType=custom-domain&configEntitySearch=fans&configEntityScopeOnly=true&configEntityInactive=true',
    );

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Rows per page'), { target: { value: '50' } });
    });

    expect(mockRouterReplace).toHaveBeenCalledWith(
      '/tenant/tenant-1/settings?foo=1&configEntityType=custom-domain&configEntitySearch=fans&configEntityScopeOnly=true&configEntityInactive=true&configEntityPageSize=50',
    );
  });

  it('shows safe custom-domain unavailable copy with trace id and no raw storage internals', async () => {
    currentSearch = 'configEntityType=custom-domain';
    const rawStorageMessage =
      'PrismaClientKnownRequestError: relation "public.custom_domain_binding" does not exist in SQL';

    mockRequest.mockImplementation(async (path: string) => {
      if (
        path ===
        '/api/v1/talents/custom-domain-bindings?scopeType=tenant&includeInherited=true&includeInactive=false'
      ) {
        throw new ApiRequestError(
          rawStorageMessage,
          'SYS_CUSTOM_DOMAIN_REGISTRY_UNAVAILABLE',
          503,
          undefined,
          'req_registry_123',
          'trace_registry_123',
        );
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(
      <ScopedConfigEntityWorkspace
        request={mockRequest}
        requestEnvelope={mockRequestEnvelope}
        scopeType="tenant"
      />,
    );

    expect(await screen.findByText('Custom domains unavailable')).toBeInTheDocument();
    expect(
      screen.getByText('Custom-domain routing is temporarily unavailable. Try again later or contact an administrator.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Trace ID: trace_registry_123')).toBeInTheDocument();
    expect(screen.queryByText(/Prisma/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/public\.custom_domain_binding/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\bSQL\b/i)).not.toBeInTheDocument();
  });

  it('opens the config entity editor inside a drawer instead of expanding inline', async () => {
    mockRequestEnvelope.mockImplementation(async (path: string) => {
      if (
        path ===
        '/api/v1/configuration-entity/business-segment?scopeType=tenant&includeInherited=true&includeDisabled=true&includeInactive=false&ownerOnly=false&page=1&pageSize=20&sort=sortOrder'
      ) {
        return buildEnvelope([]);
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(
      <ScopedConfigEntityWorkspace
        request={mockRequest}
        requestEnvelope={mockRequestEnvelope}
        scopeType="tenant"
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'New record' }));

    const dialog = await screen.findByRole('dialog', { name: 'Create Business Segment' });
    expect(within(dialog).getByLabelText('Code *')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Create record' })).toBeInTheDocument();
  });
});
