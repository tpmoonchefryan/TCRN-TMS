import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PublicPresenceStudioScreen } from '@/domains/public-presence-studio/screens/PublicPresenceStudioScreen';

const mockRequest = vi.fn();
const localeState = {
  currentLocale: 'en' as 'en' | 'zh' | 'ja',
  selectedLocale: 'en',
};

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    request: mockRequest,
    session: {
      tenantName: 'Test Tenant',
    },
  }),
}));

vi.mock('@/platform/runtime/locale/locale-provider', () => ({
  useRuntimeLocale: () => localeState,
}));

vi.mock('@/domains/homepage-management/screens/HomepageManagementScreen', () => ({
  HomepageManagementScreen: ({ talentId }: { talentId: string }) => (
    <div>Legacy homepage ops for {talentId}</div>
  ),
}));

vi.mock('@/domains/public-homepage/components/PublicHomepageProjectionRenderer', () => ({
  PublicHomepageProjectionRenderer: ({
    projection,
  }: {
    projection: { metadata: { title: string | null } };
  }) => <div>Preview projection {projection.metadata.title}</div>,
}));

function buildWorkspace(overrides?: Record<string, unknown>) {
  return {
    draftVersion: {
      contentHash: 'hash-1',
      contentHashAlgorithm: 'sha256',
      createdAt: '2026-05-15T12:00:00.000Z',
      document: {
        metadata: {
          title: 'Aki Rosenthal',
        },
        personaKit: {
          accentTone: 'rose',
          campaignLabel: 'Spring launch',
          tagline: 'Official fan hub',
        },
        schemaVersion: '1.0',
        sections: [
          {
            fields: {
              displayName: {
                provenance: 'override',
                value: 'Aki Rosenthal',
              },
              headline: {
                provenance: 'publicPresence',
                value: 'Official fan hub',
              },
              primaryCtaLabel: {
                provenance: 'publicPresence',
                value: 'Watch now',
              },
              primaryCtaUrl: {
                provenance: 'publicPresence',
                value: 'https://youtube.com/@aki',
              },
            },
            id: 'first-encounter-1',
            kind: 'firstEncounter',
            title: 'First Encounter',
          },
          {
            fields: {
              actions: {
                provenance: 'publicPresence',
                value: [
                  {
                    slot: 'follow',
                    label: 'Follow',
                    url: 'https://example.com/follow',
                  },
                ],
              },
            },
            id: 'fan-actions-1',
            kind: 'fanActions',
            title: 'Fan Actions',
          },
          {
            components: [
              {
                id: 'social-1',
                props: {
                  layout: 'horizontal',
                  platforms: [
                    {
                      label: 'YouTube',
                      platformCode: 'youtube',
                      url: 'https://youtube.com/@aki',
                    },
                  ],
                  style: 'pill',
                },
                type: 'SocialLinks',
                visible: true,
              },
            ],
            id: 'official-channels-1',
            kind: 'officialChannels',
            title: 'Official Channels',
          },
          {
            components: [
              {
                id: 'compat-1',
                props: {
                  contentHtml: '<p>Legacy block</p>',
                },
                type: 'RichText',
                visible: true,
              },
            ],
            id: 'updates-feed-1',
            kind: 'officialUpdatesFeed',
            title: 'Official Updates Feed',
          },
        ],
        templateId: 'activeTalentHub',
      },
      documentSchemaVersion: '1.0',
      documentState: 'draft',
      id: 'draft-version-1',
      lastValidationSnapshotId: 'snapshot-1',
      publishedAt: null,
      scheduledFor: null,
      templateId: 'activeTalentHub',
      updatedAt: '2026-05-15T12:05:00.000Z',
      validationSnapshot: {
        acknowledgementIds: [],
        blockerIds: ['issue-missing-schedule'],
        componentRegistryVersion: '1.0.0',
        documentSchemaVersion: '1.0',
        fallbackDecisions: [],
        issueCounts: {
          blocker: 1,
          fatal: 0,
          info: 1,
          warning: 1,
        },
        issues: [
          {
            acknowledgementRequired: false,
            blocksAiPatch: true,
            blocksPublish: true,
            blocksVisualEdit: false,
            code: 'template.missingRequiredSection',
            fallbackBehavior: 'hide',
            fieldKey: 'stageSchedule',
            id: 'issue-missing-schedule',
            messageKey: 'publicPresence.validation.missingRequiredSection',
            path: ['sections'],
            policyVersion: '1.0.0',
            registryVersion: '1.0.0',
            severity: 'blocker',
            state: 'invalidRecoverable',
            templateId: 'activeTalentHub',
          },
          {
            acknowledgementRequired: false,
            blocksAiPatch: true,
            blocksPublish: false,
            blocksVisualEdit: true,
            code: 'registry.lockedComponent',
            componentId: 'compat-1',
            fallbackBehavior: 'lockedSourceOwned',
            id: 'issue-locked-feed',
            messageKey: 'publicPresence.validation.lockedComponent',
            path: ['sections', '3', 'components', '0'],
            policyVersion: '1.0.0',
            registryVersion: '1.0.0',
            sectionId: 'updates-feed-1',
            severity: 'info',
            state: 'validLocked',
            templateId: 'activeTalentHub',
          },
          {
            acknowledgementRequired: false,
            blocksAiPatch: true,
            blocksPublish: false,
            blocksVisualEdit: false,
            code: 'field.warning',
            fallbackBehavior: 'safePlaceholder',
            fieldKey: 'primaryCtaUrl',
            id: 'issue-warning-cta',
            messageKey: 'warning',
            path: ['sections', '0', 'fields', 'primaryCtaUrl'],
            policyVersion: '1.0.0',
            registryVersion: '1.0.0',
            sectionId: 'first-encounter-1',
            severity: 'warning',
            state: 'invalidRecoverable',
            templateId: 'activeTalentHub',
          },
        ],
        projectionHash: null,
        safetyPolicyVersion: '1.0.0',
        schemaVersion: '1.0',
        snapshotId: 'snapshot-1',
        templateId: 'activeTalentHub',
        templateRegistryVersion: '1.0.0',
        validationMode: 'draft',
      },
      versionNumber: 1,
    },
    liveVersion: null,
    portal: {
      createdAt: '2026-05-15T12:00:00.000Z',
      draftVersionId: 'draft-version-1',
      id: 'portal-1',
      lastValidatedAt: '2026-05-15T12:05:00.000Z',
      latestValidationState: 'validEditable',
      latestVersionNumber: 1,
      liveVersionId: null,
      talentId: 'talent-1',
      updatedAt: '2026-05-15T12:05:00.000Z',
      version: 1,
    },
    stageSections: [
      {
        allowedComponents: [],
        editabilityState: 'validEditable',
        fallbackBehavior: 'safePlaceholder',
        fieldDefinitions: [
          {
            fieldKey: 'displayName',
            provenance: ['inherited', 'override', 'publicPresence', 'locked'],
            required: 'always',
            sourceOnly: false,
            valueType: 'string',
            visualEditable: true,
          },
          {
            fieldKey: 'headline',
            provenance: ['publicPresence', 'locked'],
            required: 'optional',
            sourceOnly: false,
            valueType: 'string',
            visualEditable: true,
          },
          {
            fieldKey: 'primaryCtaLabel',
            provenance: ['publicPresence', 'locked'],
            required: 'optional',
            sourceOnly: false,
            valueType: 'string',
            visualEditable: true,
          },
          {
            fieldKey: 'primaryCtaUrl',
            provenance: ['publicPresence', 'locked'],
            required: 'optional',
            sourceOnly: false,
            valueType: 'url',
            visualEditable: true,
          },
        ],
        kind: 'firstEncounter',
        phaseVisibility: ['always'],
        purpose: 'Own the first viewport contract.',
        sourcePolicy: 'registryOwned',
      },
      {
        allowedComponents: ['LinkButton', 'LiveStatus'],
        editabilityState: 'validEditable',
        fallbackBehavior: 'safePlaceholder',
        fieldDefinitions: [],
        kind: 'currentLaunchAction',
        phaseVisibility: ['always'],
        purpose: 'Highlight the current official CTA.',
        sourcePolicy: 'registryOwned',
      },
      {
        allowedComponents: ['SocialLinks'],
        editabilityState: 'validEditable',
        fallbackBehavior: 'safePlaceholder',
        fieldDefinitions: [],
        kind: 'officialChannels',
        phaseVisibility: ['always'],
        purpose: 'Provide validated official destinations.',
        sourcePolicy: 'registryOwned',
      },
      {
        allowedComponents: ['Schedule'],
        editabilityState: 'validEditable',
        fallbackBehavior: 'safePlaceholder',
        fieldDefinitions: [],
        kind: 'stageSchedule',
        phaseVisibility: ['always'],
        purpose: 'Expose a bounded schedule.',
        sourcePolicy: 'registryOwned',
      },
      {
        allowedComponents: [],
        editabilityState: 'validEditable',
        fallbackBehavior: 'safePlaceholder',
        fieldDefinitions: [
          {
            fieldKey: 'actions',
            provenance: ['publicPresence'],
            required: 'optional',
            sourceOnly: false,
            valueType: 'objectArray',
            visualEditable: true,
          },
        ],
        kind: 'fanActions',
        phaseVisibility: ['always'],
        purpose: 'Bind typed fan action slots.',
        sourcePolicy: 'registryOwned',
      },
      {
        allowedComponents: ['BilibiliDynamic'],
        editabilityState: 'validLocked',
        fallbackBehavior: 'lockedSourceOwned',
        fieldDefinitions: [],
        kind: 'officialUpdatesFeed',
        phaseVisibility: ['always'],
        purpose: 'Locked compatibility content.',
        sourcePolicy: 'preserveLocked',
      },
    ],
    templates: [
      {
        defaultSectionOrder: [
          'firstEncounter',
          'currentLaunchAction',
          'officialChannels',
          'stageSchedule',
          'fanActions',
          'officialUpdatesFeed',
        ],
        label: 'Active Talent Hub',
        optionalSections: ['officialUpdatesFeed'],
        recommendedSections: ['fanActions'],
        requiredSections: [
          'firstEncounter',
          'currentLaunchAction',
          'officialChannels',
          'stageSchedule',
        ],
        templateId: 'activeTalentHub',
        useCase: 'Always-on official public presence.',
      },
    ],
    workflowEvents: [],
    ...overrides,
  };
}

describe('PublicPresenceStudioScreen', () => {
  beforeEach(() => {
    mockRequest.mockReset();
    localeState.currentLocale = 'en';
    localeState.selectedLocale = 'en';
  });

  it('keeps migration tools out of first-class navigation and tucks them into Advanced', async () => {
    mockRequest.mockResolvedValue(buildWorkspace());

    render(<PublicPresenceStudioScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('tab', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Legacy Ops/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Advanced' }));

    expect(await screen.findByRole('button', { name: 'Open migration tools' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open migration tools' }));
    expect(await screen.findByText('Legacy homepage ops for talent-1')).toBeInTheDocument();
  });

  it('writes fan action updates to url instead of href and keeps one editor panel open', async () => {
    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/talents/talent-1/public-presence' && !init) {
        return buildWorkspace();
      }

      if (path === '/api/v1/talents/talent-1/public-presence/draft') {
        const payload = JSON.parse(String(init?.body));
        expect(payload.document.sections.find((section: { kind: string }) => section.kind === 'fanActions').fields.actions.value[0]).toEqual({
          label: 'Join stream',
          slot: 'stream',
          url: 'https://example.com/stream',
        });
        expect(JSON.stringify(payload.document)).not.toContain('href');

        return buildWorkspace({
          draftVersion: {
            ...buildWorkspace().draftVersion,
            contentHash: 'hash-2',
            document: payload.document,
            updatedAt: '2026-05-15T12:10:00.000Z',
            versionNumber: 2,
          },
        });
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<PublicPresenceStudioScreen tenantId="tenant-1" talentId="talent-1" />);

    fireEvent.click(await screen.findByRole('tab', { name: 'Stage Sections' }));
    fireEvent.click(screen.getByRole('button', { name: /Edit Fan Actions/i }));

    expect(screen.getAllByRole('heading', { name: /Section editor/i })).toHaveLength(1);

    const editor = screen.getByTestId('stage-section-panel');
    const slotInput = within(editor).getByLabelText('Fan actions 1 Slot');
    const labelInput = within(editor).getByLabelText('Fan actions 1 Label');
    const urlInput = within(editor).getByDisplayValue('https://example.com/follow');

    fireEvent.change(slotInput, { target: { value: 'stream' } });
    fireEvent.change(labelInput, { target: { value: 'Join stream' } });
    fireEvent.change(urlInput, { target: { value: 'https://example.com/stream' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save sections' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/talents/talent-1/public-presence/draft',
        expect.objectContaining({ method: 'PATCH' }),
      );
    });
  });

  it('shows locked sections in inspect/configure flow instead of editable flat fields', async () => {
    mockRequest.mockResolvedValue(buildWorkspace());

    render(<PublicPresenceStudioScreen tenantId="tenant-1" talentId="talent-1" />);

    fireEvent.click(await screen.findByRole('tab', { name: 'Stage Sections' }));
    fireEvent.click(screen.getByRole('button', { name: /Inspect Official Updates Feed/i }));

    const panel = await screen.findByTestId('stage-section-panel');
    expect(within(panel).getByText('Locked by source')).toBeInTheDocument();
    expect(within(panel).getByText('Advanced only')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /content html/i })).not.toBeInTheDocument();
  });

  it('disables source-only component fields inside visual editors', async () => {
    mockRequest.mockResolvedValue(
      buildWorkspace({
        draftVersion: {
          ...buildWorkspace().draftVersion,
          document: {
            ...buildWorkspace().draftVersion.document,
            sections: [
              ...buildWorkspace().draftVersion.document.sections,
              {
                components: [
                  {
                    id: 'marshmallow-1',
                    props: {
                      displayMode: 'compact',
                      showRecentCount: 3,
                      showSubmitButton: true,
                    },
                    type: 'MarshmallowWidget',
                    visible: true,
                  },
                ],
                id: 'fan-interaction-1',
                kind: 'fanInteraction',
                title: 'Fan Interaction',
              },
            ],
          },
        },
        stageSections: [
          ...buildWorkspace().stageSections,
          {
            allowedComponents: ['MarshmallowWidget'],
            editabilityState: 'validEditable',
            fallbackBehavior: 'safePlaceholder',
            fieldDefinitions: [],
            kind: 'fanInteraction',
            phaseVisibility: ['always'],
            purpose: 'Offer bounded fan interaction such as Marshmallow.',
            sourcePolicy: 'registryOwned',
          },
        ],
        templates: [
          {
            ...buildWorkspace().templates[0],
            defaultSectionOrder: [
              ...buildWorkspace().templates[0].defaultSectionOrder,
              'fanInteraction',
            ],
            recommendedSections: [
              ...buildWorkspace().templates[0].recommendedSections,
              'fanInteraction',
            ],
          },
        ],
      }),
    );

    render(<PublicPresenceStudioScreen tenantId="tenant-1" talentId="talent-1" />);

    fireEvent.click(await screen.findByRole('tab', { name: 'Stage Sections' }));
    fireEvent.click(screen.getByRole('button', { name: /Edit Fan Interaction/i }));

    const panel = await screen.findByTestId('stage-section-panel');
    expect(within(panel).getByLabelText('Display mode')).toBeDisabled();
    expect(within(panel).getByLabelText('Recent message count')).toBeDisabled();
    expect(within(panel).getByLabelText('Show submit button')).toBeDisabled();
  });

  it('renders fan preview with viewport modes and saved state language instead of hash jargon', async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/talents/talent-1/public-presence') {
        return buildWorkspace();
      }

      if (path === '/api/v1/talents/talent-1/public-presence/preview') {
        return {
          projectionSchemaVersion: '1.0',
          resolvedRevealPhase: 'always',
          route: {
            canonicalPath: '/tenant-1/aki/homepage',
            legacyPath: 'aki-home',
            tenantCode: 'tenant-1',
            talentCode: 'aki',
            domainHostname: null,
          },
          metadata: {
            title: 'Aki Rosenthal',
            description: 'Official fan hub',
            canonicalPath: '/tenant-1/aki/homepage',
            ogImage: null,
            ogImageAlt: null,
            locale: null,
          },
          appearance: {
            theme: {
              preset: 'soft',
              visualStyle: 'flat',
              colors: {
                accent: '#E0A0C0',
                background: '#FAFBFC',
                primary: '#7B9EE0',
                text: '#333333',
                textSecondary: '#888888',
              },
              background: {
                type: 'gradient',
                value: 'linear-gradient(135deg, #F5F7FA 0%, #E8ECF1 100%)',
              },
              card: {
                background: '#FFFFFF',
                borderRadius: 'large',
                shadow: 'small',
              },
              typography: {
                fontFamily: 'noto-sans',
                headingWeight: 'medium',
              },
              animation: {
                enableEntrance: true,
                enableHover: true,
                intensity: 'low',
              },
              decorations: {
                type: 'none',
              },
            },
          },
          sections: [
            {
              id: 'hero',
              kind: 'firstEncounter',
              sectionType: 'hero',
              visibility: 'visible',
              fallbackBehavior: 'safePlaceholder',
              validationIssueIds: ['issue-warning-cta'],
              title: 'Aki Rosenthal',
              description: 'Official fan hub',
              timezone: null,
              avatar: null,
              primaryAction: null,
            },
          ],
          actions: [],
          media: [],
          fallbackDecisions: [],
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<PublicPresenceStudioScreen tenantId="tenant-1" talentId="talent-1" />);

    fireEvent.click(await screen.findByRole('tab', { name: 'Fan Preview' }));

    expect(await screen.findByText('Preview projection Aki Rosenthal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desktop' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mobile' })).toBeInTheDocument();
    expect(screen.getByText('Preview is showing the saved draft.')).toBeInTheDocument();
    expect(screen.queryByText(/Published proof/i)).not.toBeInTheDocument();
  });

  it('prioritizes readiness queue and keeps release actions gated by unsaved changes', async () => {
    mockRequest.mockResolvedValue(buildWorkspace());

    render(<PublicPresenceStudioScreen tenantId="tenant-1" talentId="talent-1" />);

    fireEvent.click(await screen.findByRole('tab', { name: 'Review & Publish' }));

    expect(await screen.findByRole('heading', { name: 'Readiness queue' })).toBeInTheDocument();
    expect(screen.getByText('Resolve critical and blocking issues first. Warnings stay visible for reviewer judgment.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Persona Kit' }));
    fireEvent.change(await screen.findByDisplayValue('Official fan hub'), {
      target: { value: 'Unsaved edit' },
    });

    fireEvent.click(screen.getByRole('tab', { name: 'Review & Publish' }));
    expect(await screen.findByText('Save the current draft before running release actions.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit for review' })).toBeDisabled();
  });
});
