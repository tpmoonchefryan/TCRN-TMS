import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TenantWorkspaceLandingScreen } from '@/domains/talent-workspace/screens/TenantWorkspaceLandingScreen';

const mockRequest = vi.fn();
const localeState = {
  currentLocale: 'en' as 'en' | 'zh' | 'ja',
};

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
  useRuntimeLocale: () => localeState,
}));

describe('TenantWorkspaceLandingScreen', () => {
  beforeEach(() => {
    localeState.currentLocale = 'en';
    mockRequest.mockReset();
  });

  it('paginates published talents at 20 cards by default and lets the user expand the page size', async () => {
    mockRequest.mockImplementation((path: string) => {
      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return Promise.resolve({
          tenantId: 'tenant-1',
          subsidiaries: [],
          directTalents: Array.from({ length: 21 }, (_, index) => ({
            id: `talent-${index + 1}`,
            code: `TALENT_${String(index + 1).padStart(2, '0')}`,
            displayName: `Talent ${String(index + 1).padStart(2, '0')}`,
            avatarUrl: null,
            subsidiaryId: null,
            subsidiaryName: null,
            path: `/TALENT_${String(index + 1).padStart(2, '0')}/`,
            homepagePath: `talent-${String(index + 1).padStart(2, '0')}`,
            lifecycleStatus: 'published' as const,
            publishedAt: '2026-04-17T12:00:00.000Z',
            isActive: true,
          })),
        });
      }

      throw new Error(`Unexpected request: ${path}`);
    });

    render(<TenantWorkspaceLandingScreen tenantId="tenant-1" />);

    expect(await screen.findByRole('heading', { name: 'Choose a published talent' })).toBeInTheDocument();
    expect(screen.getByText('Talent 01')).toBeInTheDocument();
    expect(screen.getByText('Talent 20')).toBeInTheDocument();
    expect(screen.queryByText('Talent 21')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Talent 21')).toBeInTheDocument();
    expect(screen.queryByText('Talent 01')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Rows per page'), {
      target: { value: '50' },
    });

    expect(await screen.findByText('Talent 01')).toBeInTheDocument();
    expect(screen.getByText('Talent 21')).toBeInTheDocument();
  });
});
