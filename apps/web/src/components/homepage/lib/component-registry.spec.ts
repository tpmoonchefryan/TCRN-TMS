// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { HOMEPAGE_COMPONENT_TYPES } from '@tcrn/shared';
import { describe, expect, it } from 'vitest';

import { COMPONENT_REGISTRY } from './component-registry';

describe('homepage component registry contract', () => {
  it('matches the shared homepage component type catalog', () => {
    expect(Object.keys(COMPONENT_REGISTRY).sort()).toEqual([...HOMEPAGE_COMPONENT_TYPES].sort());
  });
});
