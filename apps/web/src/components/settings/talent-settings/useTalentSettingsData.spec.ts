// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTalentGet = vi.fn();
const mockTalentGetPublishReadiness = vi.fn();
const mockTalentPublish = vi.fn();
const mockTalentUpdate = vi.fn();
const mockConfigList = vi.fn();
const mockDictionaryGetByType = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('@/lib/api/modules/talent', () => ({
  talentApi: {
    get: (...args: unknown[]) => mockTalentGet(...args),
    getPublishReadiness: (...args: unknown[]) => mockTalentGetPublishReadiness(...args),
    publish: (...args: unknown[]) => mockTalentPublish(...args),
    update: (...args: unknown[]) => mockTalentUpdate(...args),
  },
}));

vi.mock('@/lib/api/modules/configuration', () => ({
  configEntityApi: {
    list: (...args: unknown[]) => mockConfigList(...args),
  },
  dictionaryApi: {
    getByType: (...args: unknown[]) => mockDictionaryGetByType(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

import { useTalentSettingsData } from './useTalentSettingsData';

describe('useTalentSettingsData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTalentGetPublishReadiness.mockResolvedValue({
      success: true,
      data: {
        id: 'talent-1',
        lifecycleStatus: 'draft',
        targetState: 'published',
        recommendedAction: 'publish',
        canEnterPublishedState: true,
        blockers: [],
        warnings: [],
        version: 1,
      },
    });
  });

  it('sends nested talent settings when saving feature toggles', async () => {
    const translate = (key: string) => key;

    mockTalentGet.mockResolvedValue({
      success: true,
      data: {
        id: 'talent-1',
        code: 'AC',
        displayName: 'Aqua',
        homepagePath: 'ac',
        timezone: 'UTC',
        lifecycleStatus: 'draft',
        publishedAt: null,
        publishedBy: null,
        isActive: false,
        createdAt: '2026-03-29T00:00:00.000Z',
        updatedAt: '2026-03-29T00:00:00.000Z',
        version: 1,
        settings: {
          inheritTimezone: false,
          homepageEnabled: false,
          marshmallowEnabled: true,
        },
        stats: {
          customerCount: 0,
          pendingMessagesCount: 0,
        },
        externalPagesDomain: {
          homepage: null,
          marshmallow: null,
        },
      },
    });
    mockTalentUpdate.mockResolvedValue({ success: true });

    const { result } = renderHook(() =>
      useTalentSettingsData({
        talentId: 'talent-1',
        tc: translate,
        te: translate,
      })
    );

    await waitFor(() => {
      expect(result.current.talent).not.toBeNull();
    });

    act(() => {
      result.current.setTalent((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          settings: {
            ...current.settings,
            homepageEnabled: true,
          },
        };
      });
    });

    await act(async () => {
      await result.current.saveTalent();
    });

    await waitFor(() => {
      expect(mockTalentUpdate).toHaveBeenCalledWith('talent-1', {
        displayName: 'Aqua',
        avatarUrl: undefined,
        homepagePath: 'ac',
        timezone: 'UTC',
        settings: {
          inheritTimezone: false,
          homepageEnabled: true,
          marshmallowEnabled: true,
        },
        version: 1,
      });
    });

    expect(mockToastSuccess).toHaveBeenCalledWith('success');
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it('publishes a draft talent and refreshes lifecycle state', async () => {
    const translate = (key: string) => key;

    mockTalentGet
      .mockResolvedValueOnce({
        success: true,
        data: {
          id: 'talent-1',
          code: 'AC',
          displayName: 'Aqua',
          homepagePath: 'ac',
          timezone: 'UTC',
          lifecycleStatus: 'draft',
          publishedAt: null,
          publishedBy: null,
          isActive: false,
          createdAt: '2026-03-29T00:00:00.000Z',
          updatedAt: '2026-03-29T00:00:00.000Z',
          version: 1,
          settings: {
            inheritTimezone: false,
            homepageEnabled: false,
            marshmallowEnabled: true,
          },
          externalPagesDomain: {
            homepage: null,
            marshmallow: null,
          },
          stats: { customerCount: 0, pendingMessagesCount: 0 },
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          id: 'talent-1',
          code: 'AC',
          displayName: 'Aqua',
          homepagePath: 'ac',
          timezone: 'UTC',
          lifecycleStatus: 'published',
          publishedAt: '2026-04-11T08:00:00.000Z',
          publishedBy: 'user-1',
          isActive: true,
          createdAt: '2026-03-29T00:00:00.000Z',
          updatedAt: '2026-04-11T08:00:00.000Z',
          version: 2,
          settings: {
            inheritTimezone: false,
            homepageEnabled: false,
            marshmallowEnabled: true,
          },
          externalPagesDomain: {
            homepage: null,
            marshmallow: null,
          },
          stats: { customerCount: 0, pendingMessagesCount: 0 },
        },
      });
    mockTalentGetPublishReadiness
      .mockResolvedValueOnce({
        success: true,
        data: {
          id: 'talent-1',
          lifecycleStatus: 'draft',
          targetState: 'published',
          recommendedAction: 'publish',
          canEnterPublishedState: true,
          blockers: [],
          warnings: [],
          version: 1,
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          id: 'talent-1',
          lifecycleStatus: 'published',
          targetState: 'published',
          recommendedAction: null,
          canEnterPublishedState: true,
          blockers: [],
          warnings: [],
          version: 2,
        },
      });
    mockTalentPublish.mockResolvedValue({
      success: true,
      data: {
        id: 'talent-1',
        lifecycleStatus: 'published',
        publishedAt: '2026-04-11T08:00:00.000Z',
        publishedBy: 'user-1',
        isActive: true,
        version: 2,
      },
    });

    const { result } = renderHook(() =>
      useTalentSettingsData({
        talentId: 'talent-1',
        tc: translate,
        te: translate,
      })
    );

    await waitFor(() => {
      expect(result.current.talent?.lifecycleStatus).toBe('draft');
    });

    await act(async () => {
      await result.current.publishTalent();
    });

    await waitFor(() => {
      expect(result.current.talent?.lifecycleStatus).toBe('published');
    });

    expect(mockTalentPublish).toHaveBeenCalledWith('talent-1', { version: 1 });
    expect(mockToastSuccess).toHaveBeenCalledWith('success');
  });
});
