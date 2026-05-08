import { DEFAULT_THEME, normalizeTheme } from '@tcrn/shared';
import { describe, expect, it } from 'vitest';

import {
  canSwitchFromAdvancedSourceToVisual,
  createLowCodeSnapshot,
  isAdvancedSourceContent,
  markAdvancedSourceContent,
  restoreLowCodeSnapshot,
} from '@/domains/homepage-management/editor/source/homepage-advanced-eject';

const lowCodeContent = {
  version: '1.0',
  components: [
    {
      id: 'profile-1',
      type: 'ProfileCard',
      visible: true,
      order: 1,
      props: {
        displayName: 'Tokino Sora',
      },
    },
  ],
};

describe('homepage advanced source eject', () => {
  it('marks visual content as advanced source once', () => {
    const advanced = markAdvancedSourceContent(lowCodeContent);

    expect(advanced.version).toBe('1.0+advanced-source');
    expect(isAdvancedSourceContent(advanced)).toBe(true);
    expect(markAdvancedSourceContent(advanced).version).toBe('1.0+advanced-source');
  });

  it('blocks direct visual switching after advanced eject', () => {
    expect(canSwitchFromAdvancedSourceToVisual(false)).toBe(true);
    expect(canSwitchFromAdvancedSourceToVisual(true)).toBe(false);
  });

  it('preserves and restores a low-code snapshot as a low-code document', () => {
    const theme = normalizeTheme(DEFAULT_THEME);
    const snapshot = createLowCodeSnapshot(markAdvancedSourceContent(lowCodeContent), theme, '2026-05-09T00:00:00.000Z');

    expect(snapshot).toMatchObject({
      createdAt: '2026-05-09T00:00:00.000Z',
      content: {
        version: '1.0',
      },
      theme,
    });

    const restored = restoreLowCodeSnapshot(snapshot);

    expect(restored.content.version).toBe('1.0');
    expect(isAdvancedSourceContent(restored.content)).toBe(false);
    expect(restored.content.components).toEqual(lowCodeContent.components);
  });
});
