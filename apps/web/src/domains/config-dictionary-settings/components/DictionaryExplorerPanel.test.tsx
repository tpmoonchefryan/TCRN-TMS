import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DictionaryExplorerPanel } from '@/domains/config-dictionary-settings/components/DictionaryExplorerPanel';
import { localizedFixture } from '@/domains/config-dictionary-settings/testing/localized-fixtures';

const mockRequest = vi.fn();
const mockRequestEnvelope = vi.fn();
const mockRouterReplace = vi.fn();
let currentPathname = '/tenant/tenant-1/settings';
let currentSearch = '';

vi.mock('next/navigation', () => ({
  usePathname: () => currentPathname,
  useRouter: () => ({
    replace: mockRouterReplace,
  }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

describe('DictionaryExplorerPanel', () => {
  beforeEach(() => {
    mockRequest.mockReset();
    mockRequestEnvelope.mockReset();
    mockRouterReplace.mockReset();
    currentPathname = '/tenant/tenant-1/settings';
    currentSearch = '';
  });

  it('retains explicit default dictionary query params when requested by the tenant settings route', async () => {
    currentSearch =
      'dictionaryType=customer-status&dictionarySearch=active&dictionaryInactive=true&dictionaryPage=2&dictionaryPageSize=20&foo=1';

    mockRequestEnvelope.mockImplementation(async (path: string) => {
      if (
        path ===
        '/api/v1/system-dictionary/customer-status?search=active&includeInactive=true&page=2&pageSize=20'
      ) {
        return {
          success: true,
          data: [
            {
              id: 'dictionary-item-1',
              dictionaryCode: 'customer-status',
              code: 'ACTIVE',
              name: localizedFixture('Active customer'),
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

    render(
      <DictionaryExplorerPanel
        request={mockRequest}
        requestEnvelope={mockRequestEnvelope}
        types={[
          {
            type: 'customer-status',
            name: 'Customer Status',
            description: 'Customer lifecycle labels.',
            count: 1,
          },
        ]}
        allowIncludeInactiveToggle
        retainDefaultQueryState
      />
    );

    expect(await screen.findByText('Currently active')).toBeInTheDocument();
    expect(mockRequestEnvelope).toHaveBeenCalledWith(
      '/api/v1/system-dictionary/customer-status?search=active&includeInactive=true&page=2&pageSize=20',
      expect.anything()
    );
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });
});
