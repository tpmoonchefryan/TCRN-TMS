// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTalentGet = vi.fn();
const mockTalentUpdate = vi.fn();
const mockConfigList = vi.fn();
const mockDictionaryGetByType = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('@/lib/api/modules/talent', () => ({
  talentApi: {
    get: (...args: unknown[]) => mockTalentGet(...args),
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
        createdAt: '2026-03-29T00:00:00.000Z',
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
      },
    });
    mockTalentUpdate.mockResolvedValue({ success: true });

    const { result } = renderHook(() =>
      useTalentSettingsData({
        talentId: 'talent-1',
        tc: translate,
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
});
