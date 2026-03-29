import { describe, expect, it } from 'vitest';

import {
  hasExplicitGridPosition,
  resolveComponentColSpan,
  resolveComponentGridPosition,
  resolveComponentRowSpan,
} from './layout-props';

describe('layout-props', () => {
  it('prefers explicit colSpan and falls back to legacy w/defaults', () => {
    expect(resolveComponentColSpan({ colSpan: 3 })).toBe(3);
    expect(resolveComponentColSpan({ w: 4 })).toBe(4);
    expect(resolveComponentColSpan({}, { colSpan: 5 })).toBe(5);
    expect(resolveComponentColSpan({})).toBe(6);
  });

  it('resolves rowSpan from explicit values, defaults, and height mode', () => {
    expect(resolveComponentRowSpan('RichText', { rowSpan: 2 })).toBe(2);
    expect(resolveComponentRowSpan('RichText', { h: 5 })).toBe(5);
    expect(resolveComponentRowSpan('RichText', {}, { rowSpan: 6 })).toBe(6);
    expect(resolveComponentRowSpan('RichText', { heightMode: 'small' })).toBe(2);
    expect(resolveComponentRowSpan('RichText', {})).toBe(4);
    expect(resolveComponentRowSpan('ProfileCard', {})).toBe(6);
  });

  it('detects explicit grid positions and resolves auto fallbacks', () => {
    expect(hasExplicitGridPosition({ x: 2, y: 3 })).toBe(true);
    expect(hasExplicitGridPosition({ x: 2 })).toBe(false);
    expect(resolveComponentGridPosition({ x: 2, y: 3 })).toEqual({
      gridColumnStart: 2,
      gridRowStart: 3,
    });
    expect(resolveComponentGridPosition({})).toEqual({
      gridColumnStart: 'auto',
      gridRowStart: 'auto',
    });
  });
});
