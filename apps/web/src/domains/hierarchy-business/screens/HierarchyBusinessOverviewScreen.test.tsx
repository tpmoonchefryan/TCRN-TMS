import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SupportedUiLocale } from '@tcrn/shared';

import { HierarchyBusinessOverviewScreen } from '@/domains/hierarchy-business/screens/HierarchyBusinessOverviewScreen';

const mockRequest = vi.fn();
const replace = vi.fn();
let pathname = '/tenant/tenant-1/business';
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
    session: {
      tenantName: 'Tenant Alpha',
      tenantCode: 'ALPHA',
    },
  }),
}));

vi.mock('@/platform/runtime/locale/locale-provider', () => ({
  useUiLocale: () => localeState,
}));

describe('HierarchyBusinessOverviewScreen', () => {
  beforeEach(() => {
    localeState.locale = 'en';
    mockRequest.mockReset();
    replace.mockReset();
    pathname = '/tenant/tenant-1/business';
    currentSearch = '';
  });

  it('hydrates the talent inventory page from the URL and writes pagination changes back', async () => {
    currentSearch = 'page=2';
    mockRequest.mockImplementation((path: string) => {
      if (path === '/api/v1/organization/tree?includeInactive=true') {
        return Promise.resolve({
          tenantId: 'tenant-1',
          subsidiaries: [],
          directTalents: Array.from({ length: 21 }, (_, index) => ({
            id: `talent-${index + 1}`,
            code: `TALENT_${index + 1}`,
            displayName: `Talent ${String(index + 1).padStart(2, '0')}`,
            avatarUrl: null,
            subsidiaryId: null,
            subsidiaryName: null,
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

    render(<HierarchyBusinessOverviewScreen tenantId="tenant-1" scopeType="tenant" />);

    expect(await screen.findByRole('heading', { name: 'Tenant Alpha' })).toBeInTheDocument();
    expect(screen.getByText('Talent 21')).toBeInTheDocument();
    expect(screen.queryByText('Talent 01')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Rows per page'), {
      target: { value: '50' },
    });

    expect(replace).toHaveBeenCalledWith('/tenant/tenant-1/business?pageSize=50');
    expect(await screen.findByText('Talent 01')).toBeInTheDocument();
  });
});
