import { describe, expect, it, vi } from 'vitest';

import type { ApiSuccessEnvelope } from '@/platform/http/api';

import { localizedFixture } from '@/domains/config-dictionary-settings/testing/localized-fixtures';
import { type ConfigEntityRecord, listAllConfigEntities, listProfileStores, type RequestEnvelopeFn } from './settings.api';

function buildConfigEntity(id: string): ConfigEntityRecord {
  return {
    id,
    ownerType: 'talent',
    ownerId: 'talent-1',
    code: id.toUpperCase(),
    name: localizedFixture(id),
    localizedName: id,
    description: null,
    localizedDescription: null,
    sortOrder: 0,
    isActive: true,
    isForceUse: false,
    isSystem: false,
    isInherited: false,
    isDisabledHere: false,
    canDisable: true,
    extraData: null,
    createdAt: '2026-04-18T00:00:00.000Z',
    updatedAt: '2026-04-18T00:00:00.000Z',
    version: 1,
  };
}

function buildEnvelope(
  data: ConfigEntityRecord[],
  page: number,
  totalPages: number,
): ApiSuccessEnvelope<ConfigEntityRecord[]> {
  return {
    success: true,
    data,
    meta: {
      pagination: {
        page,
        pageSize: 100,
        totalCount: page === 1 && totalPages > 1 ? 101 : data.length,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    },
  };
}

describe('settings.api listAllConfigEntities', () => {
  it('follows pagination metadata until all config entities are loaded', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => buildConfigEntity(`entity-${index + 1}`));
    const secondPage = [buildConfigEntity('entity-101')];
    const requestEnvelope = vi.fn(async (path: string) => {
      if (
        path ===
        '/api/v1/configuration-entity/business-segment?scopeType=talent&scopeId=talent-1&includeInherited=true&includeDisabled=true&includeInactive=true&page=1&pageSize=100&sort=sortOrder'
      ) {
        return buildEnvelope(firstPage, 1, 2);
      }

      if (
        path ===
        '/api/v1/configuration-entity/business-segment?scopeType=talent&scopeId=talent-1&includeInherited=true&includeDisabled=true&includeInactive=true&page=2&pageSize=100&sort=sortOrder'
      ) {
        return buildEnvelope(secondPage, 2, 2);
      }

      throw new Error(`Unexpected request path: ${path}`);
    });

    const result = await listAllConfigEntities(requestEnvelope as RequestEnvelopeFn, 'business-segment', {
      scopeType: 'talent',
      scopeId: 'talent-1',
      includeInherited: true,
      includeDisabled: true,
      includeInactive: true,
      sort: 'sortOrder',
    });

    expect(requestEnvelope).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(101);
    expect(result.at(-1)?.id).toBe('entity-101');
  });
});

describe('settings.api listProfileStores', () => {
  it('normalizes legacy totalItems pagination metadata into the standard footer shape', async () => {
    const request = vi.fn(async () => ({
      items: [
        {
          id: 'store-1',
          code: 'DEFAULT_STORE',
          name: localizedFixture('Default Store'),
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
          page: 2,
          pageSize: 50,
          totalItems: 51,
          totalPages: 2,
        },
      },
    }));

    const result = await listProfileStores(request as never, {
      page: 2,
      pageSize: 50,
      includeInactive: true,
      search: 'Default',
    });

    expect(request).toHaveBeenCalledWith(
      '/api/v1/profile-stores?page=2&pageSize=50&includeInactive=true&search=Default',
    );
    expect(result.meta.pagination).toEqual({
      page: 2,
      pageSize: 50,
      totalCount: 51,
      totalPages: 2,
      hasNext: false,
      hasPrev: true,
    });
  });
});
