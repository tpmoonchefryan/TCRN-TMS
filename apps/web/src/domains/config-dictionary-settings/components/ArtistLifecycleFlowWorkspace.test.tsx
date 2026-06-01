import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ConfigEntityRecord } from '@/domains/config-dictionary-settings/api/settings.api';
import { ArtistLifecycleFlowWorkspace } from '@/domains/config-dictionary-settings/components/ArtistLifecycleFlowWorkspace';
import { localizedFixture } from '@/domains/config-dictionary-settings/testing/localized-fixtures';

const mockRequest = vi.fn();
const mockRequestEnvelope = vi.fn();

function buildEnvelope(data: unknown[]) {
  return {
    success: true,
    data,
    meta: {
      pagination: {
        page: 1,
        pageSize: 100,
        totalCount: data.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    },
  };
}

function buildStage(overrides: Partial<ConfigEntityRecord>): ConfigEntityRecord {
  const code = overrides.code ?? 'pre-debut';
  const name = overrides.localizedName ?? code;

  return {
    id: overrides.id ?? `stage-${code}`,
    ownerType: 'tenant',
    ownerId: null,
    code,
    name: localizedFixture(name),
    localizedName: name,
    description: localizedFixture(`${name} stage`),
    localizedDescription: `${name} stage`,
    sortOrder: overrides.sortOrder ?? 1,
    isActive: true,
    isForceUse: false,
    isSystem: false,
    isInherited: false,
    isDisabledHere: false,
    canDisable: false,
    extraData: null,
    createdAt: '2026-04-17T00:00:00.000Z',
    updatedAt: '2026-04-17T00:10:00.000Z',
    version: 1,
    ...overrides,
  };
}

const stages = [
  buildStage({
    id: 'stage-draft',
    code: 'pre-debut',
    localizedName: 'Pre-Debut',
    artistStatusCode: 'draft',
    homepageTemplateTypeCode: 'pending-reveal',
    sortOrder: 1,
  }),
  buildStage({
    id: 'stage-active',
    code: 'active',
    localizedName: 'Active',
    artistStatusCode: 'published',
    homepageTemplateTypeCode: 'operating',
    sortOrder: 2,
  }),
  buildStage({
    id: 'stage-graduated',
    code: 'graduated',
    localizedName: 'Graduated',
    artistStatusCode: 'disabled',
    homepageTemplateTypeCode: 'graduated',
    sortOrder: 3,
  }),
];

const dictionaryItems = [
  {
    id: 'template-type-pending',
    dictionaryCode: 'homepage-template-type',
    code: 'pending-reveal',
    name: localizedFixture('Pending Reveal'),
    localizedName: 'Pending Reveal',
    description: localizedFixture('Pending template type'),
    localizedDescription: 'Pending template type',
    sortOrder: 1,
    isActive: true,
    extraData: null,
    createdAt: '2026-04-17T00:00:00.000Z',
    updatedAt: '2026-04-17T00:10:00.000Z',
    version: 1,
  },
  {
    id: 'template-type-operating',
    dictionaryCode: 'homepage-template-type',
    code: 'operating',
    name: localizedFixture('Operating Site'),
    localizedName: 'Operating Site',
    description: localizedFixture('Operating template type'),
    localizedDescription: 'Operating template type',
    sortOrder: 2,
    isActive: true,
    extraData: null,
    createdAt: '2026-04-17T00:00:00.000Z',
    updatedAt: '2026-04-17T00:10:00.000Z',
    version: 1,
  },
  {
    id: 'template-type-graduated',
    dictionaryCode: 'homepage-template-type',
    code: 'graduated',
    name: localizedFixture('Graduated Archive'),
    localizedName: 'Graduated Archive',
    description: localizedFixture('Graduated template type'),
    localizedDescription: 'Graduated template type',
    sortOrder: 3,
    isActive: true,
    extraData: null,
    createdAt: '2026-04-17T00:00:00.000Z',
    updatedAt: '2026-04-17T00:10:00.000Z',
    version: 1,
  },
];

const baseFlow = {
  nodes: stages.map((stage) => ({
    stageId: stage.id,
    stageCode: stage.code ?? stage.id,
  })),
  transitions: [
    {
      id: 'transition-draft-active',
      fromStageId: 'stage-draft',
      toStageId: 'stage-active',
      label: 'Pre-Debut -> Active',
      reason: null,
    },
    {
      id: 'transition-active-draft',
      fromStageId: 'stage-active',
      toStageId: 'stage-draft',
      label: 'Active -> Pre-Debut',
      reason: null,
    },
  ],
  homepagePolicyByStage: [
    {
      stageId: 'stage-active',
      allowedTemplateTypeCodes: ['operating'],
    },
  ],
};

describe('ArtistLifecycleFlowWorkspace', () => {
  beforeEach(() => {
    mockRequest.mockReset();
    mockRequestEnvelope.mockReset();
  });

  it('saves tenant Flow with Homepage Template Type dictionary codes', async () => {
    let savedPayload: Record<string, unknown> | null = null;

    mockRequestEnvelope.mockImplementation(async (path: string) => {
      if (path.startsWith('/api/v1/configuration-entity/artist-stage?')) {
        return buildEnvelope(stages);
      }

      if (path.startsWith('/api/v1/system-dictionary/homepage-template-type?')) {
        return buildEnvelope(dictionaryItems);
      }

      throw new Error(`Unhandled request: ${path}`);
    });
    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/organization/settings/artist-lifecycle-flow' && !init) {
        return {
          flow: baseFlow,
          inheritedFrom: 'tenant',
          scopeId: null,
          scopeType: 'tenant',
          validationIssues: [],
          version: 1,
          writable: true,
        };
      }

      if (
        path === '/api/v1/organization/settings/artist-lifecycle-flow' &&
        init?.method === 'PATCH'
      ) {
        savedPayload = JSON.parse(String(init.body)) as Record<string, unknown>;
        return {
          flow: savedPayload.flow,
          inheritedFrom: 'tenant',
          scopeId: null,
          scopeType: 'tenant',
          validationIssues: [],
          version: 2,
          writable: true,
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(
      <ArtistLifecycleFlowWorkspace
        request={mockRequest}
        requestEnvelope={mockRequestEnvelope}
        scopeType="tenant"
      />
    );

    expect(await screen.findByText('Tenant editable')).toBeInTheDocument();
    const stageCards = await screen.findAllByTestId('artist-lifecycle-flow-stage');
    const activeStage = stageCards.find((stageCard) =>
      within(stageCard).queryByText('published')
    ) as HTMLElement;
    expect(within(activeStage).getByLabelText('Operating Site')).toBeChecked();
    expect(within(activeStage).getByLabelText('Graduated Archive')).not.toBeChecked();

    fireEvent.click(screen.getByTestId('artist-lifecycle-flow-save'));

    await waitFor(() => {
      expect(savedPayload).not.toBeNull();
    });

    expect(JSON.stringify(savedPayload)).not.toContain('allowedTemplateIds');
    expect(savedPayload).toMatchObject({
      flow: {
        homepagePolicyByStage: expect.arrayContaining([
          {
            stageId: 'stage-active',
            allowedTemplateTypeCodes: ['operating'],
          },
        ]),
        transitions: expect.arrayContaining([
          expect.objectContaining({
            fromStageId: 'stage-active',
            toStageId: 'stage-draft',
          }),
        ]),
      },
    });
  });

  it('renders lower-scope Flow as read-only and does not issue tenant Flow writes', async () => {
    mockRequestEnvelope.mockImplementation(async (path: string) => {
      if (path.startsWith('/api/v1/configuration-entity/artist-stage?')) {
        return buildEnvelope(stages);
      }

      if (path.startsWith('/api/v1/system-dictionary/homepage-template-type?')) {
        return buildEnvelope(dictionaryItems);
      }

      throw new Error(`Unhandled request: ${path}`);
    });
    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/subsidiaries/sub-1/settings/artist-lifecycle-flow') {
        return {
          flow: baseFlow,
          inheritedFrom: 'tenant',
          scopeId: 'sub-1',
          scopeType: 'subsidiary',
          validationIssues: [],
          version: 1,
          writable: false,
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(
      <ArtistLifecycleFlowWorkspace
        request={mockRequest}
        requestEnvelope={mockRequestEnvelope}
        scopeType="subsidiary"
        scopeId="sub-1"
      />
    );

    expect(await screen.findByText('Read-only inherited')).toBeInTheDocument();
    expect(screen.getByTestId('artist-lifecycle-flow-save')).toBeDisabled();

    const firstStage = (await screen.findAllByTestId('artist-lifecycle-flow-stage'))[0];
    expect(within(firstStage).getByLabelText('Operating Site')).toBeDisabled();
    expect(mockRequest).not.toHaveBeenCalledWith(
      '/api/v1/organization/settings/artist-lifecycle-flow',
      expect.objectContaining({ method: 'PATCH' })
    );
  });
});
