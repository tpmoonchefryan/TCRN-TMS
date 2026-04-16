// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/settings/UnifiedCustomDomainCard', () => ({
  UnifiedCustomDomainCard: () => <div data-testid="custom-domain-card" />,
}));

import { TalentDetailsTab } from './TalentDetailsTab';
import type { TalentData, TalentReadiness } from './types';

const createTalent = (overrides?: Partial<TalentData>): TalentData => ({
  id: 'talent-1',
  code: 'TALENT_1',
  displayName: 'Talent 1',
  avatarUrl: null,
  path: '/talents/talent-1',
  subsidiaryId: null,
  profileStoreId: null,
  profileStore: null,
  homepagePath: 'talent-1',
  timezone: 'UTC',
  lifecycleStatus: 'draft',
  publishedAt: null,
  isActive: false,
  createdAt: '2026-04-11T00:00:00.000Z',
  customerCount: 0,
  version: 1,
  settings: {
    inheritTimezone: false,
    homepageEnabled: false,
    marshmallowEnabled: false,
  },
  externalPagesDomain: {
    homepage: null,
    marshmallow: null,
  },
  ...overrides,
});

const createReadiness = (
  overrides?: Partial<TalentReadiness>
): TalentReadiness => ({
  id: 'talent-1',
  lifecycleStatus: 'draft',
  targetState: 'published',
  recommendedAction: 'publish',
  canEnterPublishedState: true,
  blockers: [],
  warnings: [],
  version: 1,
  ...overrides,
});

const translate = (key: string) => key;

const renderTalentDetailsTab = (overrides?: Partial<ComponentProps<typeof TalentDetailsTab>>) => {
  return render(
    <TalentDetailsTab
      talentId="talent-1"
      talent={createTalent()}
      publishReadiness={createReadiness()}
      notice={null}
      from={null}
      isLoadingReadiness={false}
      isLifecycleMutating={false}
      isDeletingDraft={false}
      isSaving={false}
      onTalentChange={vi.fn()}
      onPublish={vi.fn().mockResolvedValue(true)}
      onDisable={vi.fn().mockResolvedValue(true)}
      onReEnable={vi.fn().mockResolvedValue(true)}
      onDeleteDraft={vi.fn().mockResolvedValue(true)}
      onSave={vi.fn()}
      onDomainChange={vi.fn().mockResolvedValue(undefined)}
      t={translate}
      tc={translate}
      tTalent={translate}
      tForms={translate}
      {...overrides}
    />
  );
};

describe('TalentDetailsTab', () => {
  it('shows the hard-delete action only while the talent is still draft', () => {
    renderTalentDetailsTab();

    expect(
      screen.getByRole('button', { name: 'deleteDraftTalent' }),
    ).toBeInTheDocument();
    expect(screen.getByText('deleteDraftTalentDesc')).toBeInTheDocument();
  });

  it('renders the draft blocked notice with the original route', () => {
    renderTalentDetailsTab({
      notice: 'publish-required',
      from: '/homepage?tab=domain',
    });

    expect(screen.getByText('publishRequiredTitle')).toBeInTheDocument();
    expect(screen.getByText('publishRequiredBody')).toBeInTheDocument();
    expect(screen.getByText('blockedRoutePrefix: /homepage?tab=domain')).toBeInTheDocument();
  });

  it('renders the disabled blocked notice when the talent is disabled', () => {
    renderTalentDetailsTab({
      talent: createTalent({
        lifecycleStatus: 'disabled',
        publishedAt: '2026-04-11T08:00:00.000Z',
        isActive: true,
      }),
      publishReadiness: createReadiness({
        lifecycleStatus: 'disabled',
        recommendedAction: 're-enable',
      }),
      notice: 're-enable-required',
      from: '/reports',
    });

    expect(screen.getByText('reEnableRequiredTitle')).toBeInTheDocument();
    expect(screen.getByText('reEnableRequiredBody')).toBeInTheDocument();
    expect(screen.getByText('blockedRoutePrefix: /reports')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'deleteDraftTalent' }),
    ).not.toBeInTheDocument();
  });

  it('hides stale blocked notices after the talent becomes published', () => {
    renderTalentDetailsTab({
      talent: createTalent({
        lifecycleStatus: 'published',
        publishedAt: '2026-04-11T08:00:00.000Z',
        isActive: true,
      }),
      publishReadiness: createReadiness({
        lifecycleStatus: 'published',
      }),
      notice: 'publish-required',
      from: '/customers',
    });

    expect(screen.queryByText('publishRequiredTitle')).not.toBeInTheDocument();
    expect(screen.queryByText('publishRequiredBody')).not.toBeInTheDocument();
    expect(screen.queryByText('blockedRoutePrefix: /customers')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'deleteDraftTalent' }),
    ).not.toBeInTheDocument();
  });
});
