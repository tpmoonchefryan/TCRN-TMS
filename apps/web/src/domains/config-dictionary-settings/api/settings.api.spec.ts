import { describe, expect, it, vi } from 'vitest';

import type { ApiSuccessEnvelope } from '@/platform/http/api';

import { type ConfigEntityRecord, listAllConfigEntities, type RequestEnvelopeFn } from './settings.api';

function buildConfigEntity(id: string): ConfigEntityRecord {
  return {
    id,
    ownerType: 'talent',
    ownerId: 'talent-1',
    code: id.toUpperCase(),
    name: id,
    nameEn: id,
    nameZh: null,
    nameJa: null,
    translations: {
      en: id,
    },
    description: null,
    descriptionEn: null,
    descriptionZh: null,
    descriptionJa: null,
    descriptionTranslations: {},
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
