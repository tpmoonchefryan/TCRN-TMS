import { describe, expect, it } from 'vitest';

import {
  HOMEPAGE_PUCK_SIDEBAR_MIN_WIDTH,
  sanitizeHomepagePuckSidebarStorageValue,
  sanitizeHomepagePuckSidebarUi,
  serializeHomepagePuckSidebarWidths,
} from '@/domains/homepage-management/editor/puck/homepage-puck-ui';

describe('homepage Puck sidebar helpers', () => {
  it('clamps persisted sidebar widths to a safe viewport-aware bound', () => {
    expect(
      sanitizeHomepagePuckSidebarStorageValue('{"left":1200,"right":900}', 1200),
    ).toEqual({
      left: 360,
      right: 360,
    });
  });

  it('falls back to safe defaults when persisted widths are invalid', () => {
    expect(
      sanitizeHomepagePuckSidebarStorageValue('{"left":"wide","right":null}', 900),
    ).toEqual({
      left: 224,
      right: 280,
    });
  });

  it('clamps live ui widths after resize and keeps the Puck minimum width', () => {
    expect(
      sanitizeHomepagePuckSidebarUi(
        {
          leftSideBarWidth: 120,
          rightSideBarWidth: 999,
        },
        800,
      ),
    ).toEqual({
      leftSideBarWidth: HOMEPAGE_PUCK_SIDEBAR_MIN_WIDTH,
      rightSideBarWidth: 256,
    });
  });

  it('serializes sanitized widths back into the shared storage format', () => {
    expect(
      serializeHomepagePuckSidebarWidths({
        left: 240,
        right: 320,
      }),
    ).toBe('{"left":240,"right":320}');
  });
});
