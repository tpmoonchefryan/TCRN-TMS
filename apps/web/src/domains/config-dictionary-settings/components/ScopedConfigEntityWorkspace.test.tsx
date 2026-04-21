import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ScopedConfigEntityWorkspace } from '@/domains/config-dictionary-settings/components/ScopedConfigEntityWorkspace';
import type { RuntimeLocale } from '@/platform/runtime/locale/locale-provider';

const mockRequest = vi.fn();
const mockRequestEnvelope = vi.fn();
const localeState = {
  currentLocale: 'en' as RuntimeLocale,
  selectedLocale: undefined,
};

vi.mock('@/platform/runtime/locale/locale-provider', () => ({
  useRuntimeLocale: () => localeState,
}));

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
