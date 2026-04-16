// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, expect, it } from 'vitest';

import type { TalentInfo } from '@/stores/talent-store';

import {
  buildTalentDetailsUrl,
  buildTalentSettingsUrl,
  classifyTalentWorkspaceRoute,
  getBusinessSelectableTalents,
  resolveBusinessWorkspaceEntry,
  resolveTalentHomeRedirect,
} from '../talent-lifecycle-routing';

const createTalent = (overrides?: Partial<TalentInfo>): TalentInfo => ({
  id: 'talent-1',
  code: 'TALENT_1',
  displayName: 'Talent 1',
  path: '/talents/talent-1',
  lifecycleStatus: 'published',
  publishedAt: '2026-04-11T00:00:00.000Z',
  ...overrides,
});

describe('talent-lifecycle-routing', () => {
  it('filters business selectable talents to published only', () => {
    const talents = [
      createTalent({ id: 'draft-talent', lifecycleStatus: 'draft', publishedAt: null }),
      createTalent({ id: 'published-talent' }),
    ];

    expect(getBusinessSelectableTalents(talents)).toEqual([talents[1]]);
  });

  it('classifies publish-gated and utility routes correctly', () => {
    expect(classifyTalentWorkspaceRoute('/customers')).toBe('publish-gated');
    expect(classifyTalentWorkspaceRoute('/homepage/editor')).toBe('publish-gated');
    expect(classifyTalentWorkspaceRoute('/logs/events')).toBe('utility');
    expect(classifyTalentWorkspaceRoute('/profile')).toBe('utility');
    expect(classifyTalentWorkspaceRoute('/tenant/tenant-1/settings')).toBe('other');
  });

  it('builds talent management URLs with query parameters', () => {
    expect(
      buildTalentDetailsUrl({
        tenantId: 'tenant-1',
        talentId: 'talent-1',
        subsidiaryId: 'subsidiary-1',
        notice: 'publish-required',
        from: '/customers/import?step=upload',
      })
    ).toBe(
      '/tenant/tenant-1/subsidiary/subsidiary-1/talent/talent-1/details?notice=publish-required&from=%2Fcustomers%2Fimport%3Fstep%3Dupload'
    );

    expect(
      buildTalentSettingsUrl({
        tenantId: 'tenant-1',
        talentId: 'talent-1',
      })
    ).toBe('/tenant/tenant-1/talent/talent-1/settings');
  });

  it('routes home to customers when at least one published talent exists', () => {
    expect(
      resolveTalentHomeRedirect({
        tenantId: 'tenant-1',
        accessibleTalents: [
          createTalent({ id: 'draft-talent', lifecycleStatus: 'draft', publishedAt: null }),
          createTalent({ id: 'published-talent' }),
        ],
      })
    ).toBe('/customers');
  });

  it('routes home to draft talent details when there is exactly one management-only talent', () => {
    expect(
      resolveTalentHomeRedirect({
        tenantId: 'tenant-1',
        accessibleTalents: [
          createTalent({ id: 'draft-talent', lifecycleStatus: 'draft', publishedAt: null }),
        ],
      })
    ).toBe('/tenant/tenant-1/talent/draft-talent/details?notice=publish-required');
  });

  it('routes home to disabled talent details when there is exactly one management-only talent', () => {
    expect(
      resolveTalentHomeRedirect({
        tenantId: 'tenant-1',
        accessibleTalents: [
          createTalent({
            id: 'disabled-talent',
            lifecycleStatus: 'disabled',
            publishedAt: '2026-04-11T00:00:00.000Z',
          }),
        ],
      })
    ).toBe('/tenant/tenant-1/talent/disabled-talent/details?notice=re-enable-required');
  });

  it('routes home to organization structure when there are multiple non-published talents', () => {
    expect(
      resolveTalentHomeRedirect({
        tenantId: 'tenant-1',
        accessibleTalents: [
          createTalent({ id: 'draft-a', lifecycleStatus: 'draft', publishedAt: null }),
          createTalent({ id: 'draft-b', lifecycleStatus: 'draft', publishedAt: null }),
        ],
      })
    ).toBe('/tenant/tenant-1/organization-structure');
  });

  it('allows utility routes without published talent selection', () => {
    expect(
      resolveBusinessWorkspaceEntry({
        tenantId: 'tenant-1',
        pathname: '/logs/events',
        accessibleTalents: [
          createTalent({ id: 'draft-talent', lifecycleStatus: 'draft', publishedAt: null }),
        ],
        currentTalent: null,
      })
    ).toEqual({ type: 'allow' });
  });

  it('redirects publish-gated routes to draft talent details when current talent is blocked', () => {
    expect(
      resolveBusinessWorkspaceEntry({
        tenantId: 'tenant-1',
        pathname: '/homepage',
        search: 'tab=domain',
        accessibleTalents: [
          createTalent({ id: 'draft-talent', lifecycleStatus: 'draft', publishedAt: null }),
        ],
        currentTalent: createTalent({
          id: 'draft-talent',
          lifecycleStatus: 'draft',
          publishedAt: null,
        }),
      })
    ).toEqual({
      type: 'redirect',
      href: '/tenant/tenant-1/talent/draft-talent/details?notice=publish-required&from=%2Fhomepage%3Ftab%3Ddomain',
    });
  });

  it('redirects publish-gated routes to disabled talent details when current talent is blocked', () => {
    expect(
      resolveBusinessWorkspaceEntry({
        tenantId: 'tenant-1',
        pathname: '/reports',
        accessibleTalents: [
          createTalent({
            id: 'disabled-talent',
            lifecycleStatus: 'disabled',
            publishedAt: '2026-04-11T00:00:00.000Z',
          }),
        ],
        currentTalent: createTalent({
          id: 'disabled-talent',
          lifecycleStatus: 'disabled',
          publishedAt: '2026-04-11T00:00:00.000Z',
        }),
      })
    ).toEqual({
      type: 'redirect',
      href: '/tenant/tenant-1/talent/disabled-talent/details?notice=re-enable-required&from=%2Freports',
    });
  });

  it('auto-selects the only published talent for publish-gated routes', () => {
    const publishedTalent = createTalent({ id: 'published-talent' });

    expect(
      resolveBusinessWorkspaceEntry({
        tenantId: 'tenant-1',
        pathname: '/customers',
        accessibleTalents: [publishedTalent],
        currentTalent: null,
      })
    ).toEqual({
      type: 'auto-select',
      talent: publishedTalent,
    });
  });

  it('shows the modal when multiple published talents exist', () => {
    const publishedTalentA = createTalent({ id: 'published-a' });
    const publishedTalentB = createTalent({ id: 'published-b' });

    expect(
      resolveBusinessWorkspaceEntry({
        tenantId: 'tenant-1',
        pathname: '/reports',
        accessibleTalents: [publishedTalentA, publishedTalentB],
        currentTalent: null,
      })
    ).toEqual({
      type: 'show-modal',
      talents: [publishedTalentA, publishedTalentB],
    });
  });

  it('redirects publish-gated routes to organization structure when no published talent exists', () => {
    expect(
      resolveBusinessWorkspaceEntry({
        tenantId: 'tenant-1',
        pathname: '/customers/new',
        accessibleTalents: [
          createTalent({ id: 'draft-a', lifecycleStatus: 'draft', publishedAt: null }),
          createTalent({ id: 'draft-b', lifecycleStatus: 'draft', publishedAt: null }),
        ],
        currentTalent: null,
      })
    ).toEqual({
      type: 'redirect',
      href: '/tenant/tenant-1/organization-structure',
    });
  });
});
