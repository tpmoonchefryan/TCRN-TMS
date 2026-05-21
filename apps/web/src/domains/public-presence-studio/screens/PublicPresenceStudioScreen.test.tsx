import type { SupportedUiLocale } from '@tcrn/shared';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicPresenceProjection } from '@tcrn/shared';

import { resetPublicHomepageProjectionMediaPreloadCache } from '@/domains/public-homepage/components/public-homepage-projection-media';
import { PublicPresenceStudioScreen } from '@/domains/public-presence-studio/screens/PublicPresenceStudioScreen';

const mockRequest = vi.fn();
const replace = vi.fn();
let pathname = '/studio/public-presence/tenant-1/talent-1';
let currentSearch = '';
const localeState = {
  locale: 'en' as SupportedUiLocale,
};
const STUDIO_RENDER_TIMEOUT = 15_000;
const STUDIO_TEST_TIMEOUT = 20_000;
const ORDINARY_COPY_BOUNDARY_PATTERN =
  /\bcanvas\b|admin chrome|topbar compact|first work surface|first surface|\bfallback\b/i;

vi.setConfig({
  testTimeout: STUDIO_TEST_TIMEOUT,
});

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    request: mockRequest,
    session: {
      tenantName: 'Test Tenant',
    },
  }),
}));

vi.mock('@/platform/runtime/locale/locale-provider', () => ({
  useUiLocale: () => localeState,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({
    replace,
  }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

vi.mock('@/domains/public-homepage/components/PublicHomepageProjectionRenderer', () => ({
  PublicHomepageProjectionRenderer: ({
    projection,
    responsiveMode,
  }: {
    projection: { metadata: { title: string | null } };
    responsiveMode?: string;
  }) => (
    <div data-responsive-mode={responsiveMode ?? 'auto'} data-testid="mock-public-preview">
      Preview projection {projection.metadata.title}
    </div>
  ),
}));

function buildPreview() {
  return {
    projectionSchemaVersion: '1.0',
    projectionId: 'preview-1',
    projectionVersion: 1,
    portalId: 'portal-1',
    documentVersionId: 'draft-version-1',
    contentHash: 'hash-preview-1',
    validationSnapshotId: 'snapshot-1',
    registryVersion: '1.0.0',
    safetyPolicyVersion: '1.0.0',
    projectionHash: 'projection-hash-1',
    resolvedRevealPhase: 'always',
    route: {
      canonicalPath: '/tenant-1/aki/homepage',
      legacyPath: null,
      tenantCode: 'tenant-1',
      talentCode: 'aki',
      domainHostname: null,
      cacheKeys: [],
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
    createdAt: '2026-05-15T12:05:00.000Z',
    rebuiltAt: '2026-05-15T12:05:00.000Z',
  };
}

function buildWorkspace(overrides?: Record<string, unknown>) {
  return {
    draftVersion: {
      contentHash: 'hash-1',
      contentHashAlgorithm: 'sha256',
      createdAt: '2026-05-15T12:00:00.000Z',
      document: {
        metadata: {
          title: 'Aki Rosenthal',
          canonicalPath: '/tenant-1/aki/homepage',
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
    publicRoute: {
      canonicalPath: '/tenant-1/aki/homepage',
      domainHostname: null,
      legacyPath: null,
      talentCode: 'aki',
      tenantCode: 'tenant-1',
    },
    releaseReadiness: {
      blockingDependencyCount: 0,
      dependencies: [],
    },
    selectedTemplateId: 'activeTalentHub',
    stageSections: [
      {
        allowedComponents: [],
        collectionOperations: [],
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
        allowedComponents: ['SocialLinks'],
        collectionOperations: [
          {
            addLabel: 'addChannel',
            canAdd: true,
            canRemove: true,
            canReorder: true,
            collectionKey: 'platforms',
            itemLabel: 'channel',
            minItems: 0,
            removeLabel: 'removeChannel',
            reorderLabel: 'reorderChannels',
          },
        ],
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
        collectionOperations: [
          {
            addLabel: 'addEvent',
            canAdd: true,
            canRemove: true,
            canReorder: true,
            collectionKey: 'events',
            itemLabel: 'scheduleEntry',
            minItems: 0,
            removeLabel: 'removeEvent',
            reorderLabel: 'reorderEvents',
          },
        ],
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
        collectionOperations: [
          {
            addLabel: 'addAction',
            canAdd: true,
            canRemove: true,
            canReorder: true,
            collectionKey: 'actions',
            itemLabel: 'fanAction',
            minItems: 0,
            removeLabel: 'removeAction',
            reorderLabel: 'reorderActions',
          },
        ],
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
        collectionOperations: [],
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

function isWorkspaceRequest(path: string) {
  return path === '/api/v1/talents/talent-1/public-presence'
    || path.startsWith('/api/v1/talents/talent-1/public-presence?templateId=');
}

function isPreviewRequest(path: string) {
  return path === '/api/v1/talents/talent-1/public-presence/preview'
    || path.startsWith('/api/v1/talents/talent-1/public-presence/preview?');
}

describe('PublicPresenceStudioScreen', () => {
  beforeEach(() => {
    mockRequest.mockReset();
    replace.mockReset();
    localeState.locale = 'en';
    localeState.locale = 'en';
    pathname = '/studio/public-presence/tenant-1/talent-1';
    currentSearch = '';
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1440,
      writable: true,
    });
    resetPublicHomepageProjectionMediaPreloadCache();
    replace.mockImplementation((href: string) => {
      const resolved = new URL(href, 'https://tcrn.local');
      pathname = resolved.pathname;
      currentSearch = resolved.search.startsWith('?') ? resolved.search.slice(1) : resolved.search;
    });
  });

  it('mounts the canvas immediately and keeps legacy ops out of first-class UI', async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (isWorkspaceRequest(path)) {
        return buildWorkspace();
      }

      if (isPreviewRequest(path)) {
        return buildPreview();
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    const { container } = render(
      <PublicPresenceStudioScreen tenantId="tenant-1" talentId="talent-1" />,
    );

    expect(
      await screen.findByTestId('canvas-stage', {}, { timeout: STUDIO_RENDER_TIMEOUT }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Legacy Ops/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Move up/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Move down/i })).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(
      /projection|content hash|runtime|policy version|workflow event id|registry/i,
    );
    expect(container.textContent).not.toMatch(ORDINARY_COPY_BOUNDARY_PATTERN);
  });

  it('restores deep-linked workbench state and safely falls back from invalid query values', async () => {
    currentSearch = 'viewport=mobile&previewFocus=1&phase=always&sheet=preview-tools';

    mockRequest.mockImplementation(async (path: string) => {
      if (isWorkspaceRequest(path)) {
        return buildWorkspace();
      }

      if (isPreviewRequest(path)) {
        return buildPreview();
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    const { unmount } = render(
      <PublicPresenceStudioScreen tenantId="tenant-1" talentId="talent-1" />,
    );

    await screen.findByTestId('canvas-stage', {}, { timeout: STUDIO_RENDER_TIMEOUT });
    expect(screen.getAllByRole('button', { name: 'Mobile' })[0]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('button', { name: 'Preview focus' })[0]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('studio-mobile-preview-tools-sheet')).toBeInTheDocument();

    unmount();
    currentSearch = 'viewport=cinema&previewFocus=banana&phase=broken&leftPanel=unknown&stagePanel=oops';

    render(<PublicPresenceStudioScreen tenantId="tenant-1" talentId="talent-1" />);

    await screen.findByTestId('canvas-stage', {}, { timeout: STUDIO_RENDER_TIMEOUT });
    expect(screen.getAllByRole('button', { name: 'Desktop' })[0]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('button', { name: 'Preview focus' })[0]).toHaveAttribute('aria-pressed', 'false');
    await waitFor(() => {
      expect(currentSearch).toBe('');
    });
  });

  it('exposes desktop drawer semantics and initial focus for workbench panels', async () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1440,
      writable: true,
    });

    mockRequest.mockImplementation(async (path: string) => {
      if (isWorkspaceRequest(path)) {
        return buildWorkspace();
      }

      if (isPreviewRequest(path)) {
        return buildPreview();
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<PublicPresenceStudioScreen tenantId="tenant-1" talentId="talent-1" />);
    await screen.findByTestId('canvas-stage', {}, { timeout: STUDIO_RENDER_TIMEOUT });

    const personaButton = screen.getByRole('button', { name: 'Persona Kit' });
    fireEvent.click(personaButton);

    const leftDrawer = screen.getByTestId('studio-left-drawer-desktop');
    expect(leftDrawer).toHaveAttribute('role', 'region');
    expect(personaButton).toHaveAttribute('aria-expanded', 'true');
    expect(personaButton).toHaveAttribute('aria-controls', leftDrawer.id);

    const leftDrawerClose = within(leftDrawer).getByRole('button', { name: 'Close panel' });
    await waitFor(() => {
      expect(document.activeElement).toBe(leftDrawerClose);
    });
    expect(leftDrawerClose).toHaveAccessibleName('Close panel');
  });

  it('keeps desktop editing to one active side panel so the canvas stays dominant', async () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1440,
      writable: true,
    });

    mockRequest.mockImplementation(async (path: string) => {
      if (isWorkspaceRequest(path)) {
        return buildWorkspace();
      }

      if (isPreviewRequest(path)) {
        return buildPreview();
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<PublicPresenceStudioScreen tenantId="tenant-1" talentId="talent-1" />);
    await screen.findByTestId('canvas-stage', {}, { timeout: STUDIO_RENDER_TIMEOUT });

    fireEvent.click(screen.getByRole('button', { name: 'Stage Sections' }));
    expect(screen.getByTestId('studio-left-drawer-desktop')).toBeInTheDocument();

    fireEvent.click(screen.getAllByTestId('stage-row-firstEncounter')[0]);

    await waitFor(() => {
      expect(screen.queryByTestId('studio-left-drawer-desktop')).not.toBeInTheDocument();
      expect(screen.getByTestId('studio-right-drawer-desktop')).toBeInTheDocument();
    });
  });

  it('keeps mobile preview context in a dedicated tools sheet', async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (isWorkspaceRequest(path)) {
        return buildWorkspace();
      }

      if (isPreviewRequest(path)) {
        return buildPreview();
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<PublicPresenceStudioScreen tenantId="tenant-1" talentId="talent-1" />);

    await screen.findByTestId('canvas-stage', {}, { timeout: STUDIO_RENDER_TIMEOUT });
    const previewToolsButton = screen.getByRole('button', { name: 'Preview tools' });
    fireEvent.click(previewToolsButton);

    const previewToolsSheet = screen.getByTestId('studio-mobile-preview-tools-sheet');
    expect(previewToolsSheet).toHaveAttribute('role', 'dialog');
    expect(previewToolsButton).toHaveAttribute('aria-expanded', 'true');
    expect(previewToolsButton).toHaveAttribute('aria-controls', previewToolsSheet.id);
    const previewToolsClose = within(previewToolsSheet).getByRole('button', { name: 'Close' });
    await waitFor(() => {
      expect(document.activeElement).toBe(previewToolsClose);
    });
    expect(screen.getAllByText('Active Talent Hub')[0]).toBeInTheDocument();
  });

  it('preserves an explicit default template query while syncing studio state', async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (isWorkspaceRequest(path)) {
        return buildWorkspace();
      }

      if (isPreviewRequest(path)) {
        return buildPreview();
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    currentSearch = 'templateId=activeTalentHub&leftPanel=sections&stagePanel=edit%3AfirstEncounter';

    render(
      <PublicPresenceStudioScreen
        initialTemplateId="activeTalentHub"
        talentId="talent-1"
        tenantId="tenant-1"
      />,
    );

    await screen.findByTestId('canvas-stage', {}, { timeout: STUDIO_RENDER_TIMEOUT });
    await waitFor(() => {
      expect(currentSearch).toContain('templateId=activeTalentHub');
      expect(currentSearch).toContain('leftPanel=sections');
      expect(currentSearch).toContain('stagePanel=edit%3AfirstEncounter');
    });
  });

  it('stabilizes the stage panel query when opening a section from query-backed drawer state', async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (isWorkspaceRequest(path)) {
        return buildWorkspace();
      }

      if (isPreviewRequest(path)) {
        return buildPreview();
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    currentSearch = 'templateId=activeTalentHub&leftPanel=sections';

    const screenProps = {
      initialTemplateId: 'activeTalentHub',
      talentId: 'talent-1',
      tenantId: 'tenant-1',
    };
    const { rerender } = render(<PublicPresenceStudioScreen {...screenProps} />);

    await screen.findByTestId('canvas-stage', {}, { timeout: STUDIO_RENDER_TIMEOUT });
    fireEvent.click(screen.getAllByTestId('stage-row-firstEncounter')[0]);

    await waitFor(() => {
      expect(currentSearch).toContain('stagePanel=edit%3AfirstEncounter');
    });

    const replaceCallCountAfterOpen = replace.mock.calls.length;
    rerender(<PublicPresenceStudioScreen {...screenProps} />);
    rerender(<PublicPresenceStudioScreen {...screenProps} />);

    await waitFor(() => {
      expect(currentSearch).toContain('templateId=activeTalentHub');
      expect(currentSearch).toContain('leftPanel=sections');
      expect(currentSearch).toContain('stagePanel=edit%3AfirstEncounter');
    });

    const followUpUrls = replace.mock.calls
      .slice(replaceCallCountAfterOpen)
      .map(([href]) => new URL(String(href), 'https://tcrn.local'));

    expect(
      followUpUrls.some((url) => (
        url.searchParams.get('leftPanel') === 'sections'
        && !url.searchParams.has('stagePanel')
      )),
    ).toBe(false);
  });

  it('keeps focus in the selected section field while typing', async () => {
    const user = userEvent.setup();

    mockRequest.mockImplementation(async (path: string) => {
      if (isWorkspaceRequest(path)) {
        return buildWorkspace();
      }

      if (isPreviewRequest(path)) {
        return buildPreview();
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    currentSearch = 'templateId=activeTalentHub&leftPanel=sections';

    render(
      <PublicPresenceStudioScreen
        initialTemplateId="activeTalentHub"
        talentId="talent-1"
        tenantId="tenant-1"
      />,
    );

    await screen.findByTestId('canvas-stage', {}, { timeout: STUDIO_RENDER_TIMEOUT });
    await user.click(screen.getAllByTestId('stage-row-firstEncounter')[0]);

    const stagePanel = (await screen.findAllByTestId('stage-section-panel'))[0];
    const displayNameInput = within(stagePanel).getAllByRole('textbox')[0];
    await user.click(displayNameInput);
    await user.type(displayNameInput, ' Aki Stage');

    expect(displayNameInput).toHaveFocus();
    expect(screen.getAllByText('Unsaved').length).toBeGreaterThan(0);
    expect(currentSearch).toContain('stagePanel=edit%3AfirstEncounter');
  });

  it('does not expose a source editor inside visual studio and links Advanced to a standalone route', async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (isWorkspaceRequest(path)) {
        return buildWorkspace();
      }

      if (isPreviewRequest(path)) {
        return buildPreview();
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(
      <PublicPresenceStudioScreen
        initialTemplateId="activeTalentHub"
        talentId="talent-1"
        tenantId="tenant-1"
      />,
    );

    await screen.findByTestId('canvas-stage', {}, { timeout: STUDIO_RENDER_TIMEOUT });

    expect(screen.queryByRole('textbox', { name: /source schema/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save source/i })).not.toBeInTheDocument();

    const advancedLink = screen.getByRole('link', { name: 'Advanced' });
    expect(advancedLink).toHaveAttribute('href', '/studio/public-presence/tenant-1/talent-1/advanced?templateId=activeTalentHub&mode=page-source');
  });

  it('dismisses save success feedback after a short timeout while keeping the saved badge', async () => {
    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (isWorkspaceRequest(path)) {
        return buildWorkspace();
      }

      if (isPreviewRequest(path)) {
        return buildPreview();
      }

      if (path === '/api/v1/talents/talent-1/public-presence/draft' && init?.method === 'PATCH') {
        return buildWorkspace();
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    const user = userEvent.setup();

    render(
      <PublicPresenceStudioScreen
        initialTemplateId="activeTalentHub"
        talentId="talent-1"
        tenantId="tenant-1"
      />,
    );

    await screen.findByTestId('canvas-stage', {}, { timeout: STUDIO_RENDER_TIMEOUT });
    await user.click(screen.getByRole('button', { name: 'Stage Sections' }));
    await user.click(screen.getAllByTestId('stage-row-firstEncounter')[0]);
    const stagePanel = (await screen.findAllByTestId('stage-section-panel'))[0];
    const displayNameInput = within(stagePanel).getAllByRole('textbox')[0];
    await user.type(displayNameInput, ' updated');
    await user.click(screen.getAllByRole('button', { name: 'Save draft' })[0]);

    expect(await screen.findByRole('status')).toHaveTextContent('Draft saved.');

    await waitFor(
      () => {
        expect(screen.queryByText('Draft saved.')).not.toBeInTheDocument();
      },
      { timeout: 7000 },
    );
    expect(screen.getAllByText('Saved').length).toBeGreaterThan(0);
  });

  it('shows delete controls for repeatable schedule entries', async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (isWorkspaceRequest(path)) {
        return buildWorkspace({
          draftVersion: {
            ...buildWorkspace().draftVersion,
            document: {
              ...buildWorkspace().draftVersion.document,
              sections: [
                ...buildWorkspace().draftVersion.document.sections,
                {
                  components: [
                    {
                      id: 'schedule-1',
                      props: {
                        events: [{ day: 'Mon', time: '19:00', title: 'Showcase' }],
                        title: 'Weekly schedule',
                        weekOf: '2026-05-18',
                      },
                      type: 'Schedule',
                      visible: true,
                    },
                  ],
                  id: 'stage-schedule-1',
                  kind: 'stageSchedule',
                  title: 'Stage Schedule',
                },
              ],
              templateId: 'activeTalentHub',
            },
          },
        });
      }

      if (isPreviewRequest(path)) {
        return buildPreview();
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(
      <PublicPresenceStudioScreen
        initialTemplateId="activeTalentHub"
        talentId="talent-1"
        tenantId="tenant-1"
      />,
    );

    await screen.findByTestId('canvas-stage', {}, { timeout: STUDIO_RENDER_TIMEOUT });
    fireEvent.click(screen.getByRole('button', { name: 'Stage Sections' }));
    fireEvent.click(screen.getByTestId('stage-row-stageSchedule'));

    const stagePanel = (await screen.findAllByTestId('stage-section-panel'))[0];
    expect(within(stagePanel).getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('keeps ordinary mobile manage sheets free from design-rationale copy', async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (isWorkspaceRequest(path)) {
        return buildWorkspace();
      }

      if (isPreviewRequest(path)) {
        return buildPreview();
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    const { container } = render(
      <PublicPresenceStudioScreen tenantId="tenant-1" talentId="talent-1" />,
    );

    await screen.findByTestId('canvas-stage', {}, { timeout: STUDIO_RENDER_TIMEOUT });
    fireEvent.click(screen.getByTestId('studio-mobile-manage-button'));

    expect(screen.getByTestId('studio-mobile-manage-sheet')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(ORDINARY_COPY_BOUNDARY_PATTERN);
  });

  it('keeps ordinary mobile preview tool sheets free from design-rationale copy', async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (isWorkspaceRequest(path)) {
        return buildWorkspace();
      }

      if (isPreviewRequest(path)) {
        return buildPreview();
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    const { container } = render(
      <PublicPresenceStudioScreen tenantId="tenant-1" talentId="talent-1" />,
    );

    await screen.findByTestId('canvas-stage', {}, { timeout: STUDIO_RENDER_TIMEOUT });

    fireEvent.click(screen.getByRole('button', { name: 'Preview tools' }));
    expect(screen.getByTestId('studio-mobile-preview-tools-sheet')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(ORDINARY_COPY_BOUNDARY_PATTERN);
  });

  it('switches between mobile manage and preview tools sheets from the active sheet surface', async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (isWorkspaceRequest(path)) {
        return buildWorkspace();
      }

      if (isPreviewRequest(path)) {
        return buildPreview();
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<PublicPresenceStudioScreen tenantId="tenant-1" talentId="talent-1" />);

    await screen.findByTestId('canvas-stage', {}, { timeout: STUDIO_RENDER_TIMEOUT });

    fireEvent.click(screen.getByTestId('studio-mobile-manage-button'));

    const manageSheet = screen.getByTestId('studio-mobile-manage-sheet');
    fireEvent.click(within(manageSheet).getByRole('button', { name: 'Preview tools' }));

    await waitFor(() => {
      expect(screen.queryByTestId('studio-mobile-manage-sheet')).not.toBeInTheDocument();
    });

    const previewToolsSheet = screen.getByTestId('studio-mobile-preview-tools-sheet');
    expect(currentSearch).toContain('sheet=preview-tools');
    expect(screen.getByRole('button', { name: 'Preview tools' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    fireEvent.click(within(previewToolsSheet).getByRole('button', { name: 'Manage' }));

    await waitFor(() => {
      expect(screen.queryByTestId('studio-mobile-preview-tools-sheet')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('studio-mobile-manage-sheet')).toBeInTheDocument();
    expect(screen.getByTestId('studio-mobile-manage-button')).toHaveAttribute('aria-expanded', 'true');
    expect(currentSearch).toContain('sheet=manage');
  });

  it('replaces the mobile sections sheet with a single section editor sheet', async () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 390,
      writable: true,
    });

    mockRequest.mockImplementation(async (path: string) => {
      if (isWorkspaceRequest(path)) {
        return buildWorkspace();
      }

      if (isPreviewRequest(path)) {
        return buildPreview();
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<PublicPresenceStudioScreen tenantId="tenant-1" talentId="talent-1" />);

    await screen.findByTestId('canvas-stage', {}, { timeout: STUDIO_RENDER_TIMEOUT });
    fireEvent.click(within(screen.getByTestId('left-rail')).getByRole('button', { name: 'Stage Sections' }));

    const sectionsSheet = screen.getByRole('dialog', { name: 'Stage sections panel' });
    fireEvent.click(within(sectionsSheet).getByTestId('stage-row-firstEncounter'));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Stage sections panel' })).not.toBeInTheDocument();
    });

    expect(screen.getByRole('dialog', { name: 'Edit section panel' })).toBeInTheDocument();
    expect(screen.queryByTestId('studio-mobile-manage-sheet')).not.toBeInTheDocument();
    expect(screen.queryByTestId('studio-mobile-preview-tools-sheet')).not.toBeInTheDocument();
    expect(currentSearch).not.toContain('leftPanel=sections');
    expect(currentSearch).toContain('stagePanel=edit%3AfirstEncounter');
  });

  it('keeps mobile sheet query state mutually exclusive on restore', async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (isWorkspaceRequest(path)) {
        return buildWorkspace();
      }

      if (isPreviewRequest(path)) {
        return buildPreview();
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    currentSearch = 'viewport=mobile&sheet=manage';
    const { unmount } = render(
      <PublicPresenceStudioScreen tenantId="tenant-1" talentId="talent-1" />,
    );

    await screen.findByTestId('canvas-stage', {}, { timeout: STUDIO_RENDER_TIMEOUT });
    expect(screen.getByTestId('studio-mobile-manage-sheet')).toBeInTheDocument();
    expect(screen.queryByTestId('studio-mobile-preview-tools-sheet')).not.toBeInTheDocument();
    expect(currentSearch).toContain('sheet=manage');

    unmount();
    currentSearch = 'viewport=mobile&sheet=preview-tools';

    render(<PublicPresenceStudioScreen tenantId="tenant-1" talentId="talent-1" />);

    await screen.findByTestId('canvas-stage', {}, { timeout: STUDIO_RENDER_TIMEOUT });
    expect(screen.getByTestId('studio-mobile-preview-tools-sheet')).toBeInTheDocument();
    expect(screen.queryByTestId('studio-mobile-manage-sheet')).not.toBeInTheDocument();
    expect(currentSearch).toContain('sheet=preview-tools');
  });

  it('shows a preview refresh state instead of a saved-draft waiting empty state when draft preview is still loading', async () => {
    let resolvePreview: ((value: PublicPresenceProjection) => void) | null = null;

    mockRequest.mockImplementation((path: string) => {
      if (isWorkspaceRequest(path)) {
        return Promise.resolve(buildWorkspace());
      }

      if (isPreviewRequest(path)) {
        return new Promise((resolve) => {
          resolvePreview = resolve as (value: PublicPresenceProjection) => void;
        });
      }

      return Promise.reject(new Error(`Unhandled request: ${path}`));
    });

    render(<PublicPresenceStudioScreen tenantId="tenant-1" talentId="talent-1" />);

    await screen.findByTestId('canvas-stage', {}, { timeout: STUDIO_RENDER_TIMEOUT });
    expect(screen.getByText('Refreshing fan preview')).toBeInTheDocument();
    expect(screen.queryByText('Fan preview is waiting for a saved draft')).not.toBeInTheDocument();

    const settlePreview = resolvePreview as ((value: PublicPresenceProjection) => void) | null;
    expect(settlePreview).not.toBeNull();
    if (!settlePreview) {
      throw new Error('Preview resolver was not captured');
    }
    settlePreview(buildPreview() as PublicPresenceProjection);

    await waitFor(() => {
      expect(screen.getByTestId('mock-public-preview')).toBeInTheDocument();
    });
  });

  it('lets Publish now call the atomic publish endpoint for a draft workspace', async () => {
    const readyWorkspace = buildWorkspace({
      draftVersion: {
        ...buildWorkspace().draftVersion,
        validationSnapshot: {
          ...buildWorkspace().draftVersion.validationSnapshot,
          blockerIds: [],
          issueCounts: {
            blocker: 0,
            fatal: 0,
            info: 0,
            warning: 0,
          },
          issues: [],
        },
      },
    });
    const publishedWorkspace = buildWorkspace({
      draftVersion: {
        ...readyWorkspace.draftVersion,
        documentState: 'published',
        publishedAt: '2026-05-21T01:10:00.000Z',
      },
      liveVersion: {
        ...readyWorkspace.draftVersion,
        documentState: 'published',
        publishedAt: '2026-05-21T01:10:00.000Z',
      },
    });

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (isWorkspaceRequest(path)) {
        return readyWorkspace;
      }

      if (isPreviewRequest(path)) {
        return buildPreview();
      }

      if (path === '/api/v1/talents/talent-1/public-presence/publish' && init?.method === 'POST') {
        return publishedWorkspace;
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    const user = userEvent.setup();

    render(
      <PublicPresenceStudioScreen
        initialFocus="release"
        initialTemplateId="activeTalentHub"
        talentId="talent-1"
        tenantId="tenant-1"
      />,
    );

    await screen.findByTestId('canvas-stage', {}, { timeout: STUDIO_RENDER_TIMEOUT });
    await user.click(screen.getByRole('button', { name: 'Open readiness panel' }));

    const publishButton = screen.getByRole('button', { name: 'Publish now' });
    expect(publishButton).toBeEnabled();

    await user.click(publishButton);

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/talents/talent-1/public-presence/publish',
        expect.objectContaining({ method: 'POST' }),
      );
    });
    expect(mockRequest).not.toHaveBeenCalledWith(
      '/api/v1/talents/talent-1/public-presence/review/submit',
      expect.anything(),
    );
    expect(mockRequest).not.toHaveBeenCalledWith(
      '/api/v1/talents/talent-1/public-presence/review/approve',
      expect.anything(),
    );
  });

  it('shows the Debut dependency blocker and routes the operator to the always-on hub draft before publish', async () => {
    const debutWorkspace = buildWorkspace({
      draftVersion: {
        ...buildWorkspace().draftVersion,
        documentState: 'draft',
        document: {
          ...buildWorkspace().draftVersion.document,
          sections: [
            {
              id: 'first-encounter-1',
              kind: 'firstEncounter',
              fields: {
                displayName: {
                  provenance: 'override',
                  value: 'Aki Rosenthal',
                },
              },
            },
            {
              id: 'countdown-1',
              kind: 'countdownReveal',
              fields: {
                phase: {
                  provenance: 'publicPresence',
                  value: 'countdown',
                },
                revealAtUtc: {
                  provenance: 'publicPresence',
                  value: '2030-05-15T10:00:00.000Z',
                },
              },
            },
          ],
          templateId: 'debutReveal',
        },
        templateId: 'debutReveal',
        validationSnapshot: {
          ...buildWorkspace().draftVersion.validationSnapshot,
          blockerIds: [],
          issueCounts: {
            blocker: 0,
            fatal: 0,
            info: 0,
            warning: 0,
          },
          issues: [],
          templateId: 'debutReveal',
        },
      },
      releaseReadiness: {
        blockingDependencyCount: 1,
        dependencies: [
          {
            blocksPublish: true,
            id: 'publicPresence.release.debutReveal.activeTalentHubAutoSwitch',
            messageKey: 'publicPresence.validation.debutRevealRequiresApprovedActiveHub',
            nextAction: 'openActiveTalentHubDraft',
            revealAutoSwitchAt: '2030-05-15T10:00:00.000Z',
            severity: 'blocker',
            status: 'blocked',
            suggestedFix: 'Approve the always-on hub before scheduling the debut switch.',
            targetTemplateId: 'activeTalentHub',
            targetVersionId: 'active-hub-draft-1',
            targetVersionState: 'draft',
            templateId: 'debutReveal',
          },
        ],
      },
      selectedTemplateId: 'debutReveal',
    });
    const activeHubWorkspace = buildWorkspace({
      selectedTemplateId: 'activeTalentHub',
    });

    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/talents/talent-1/public-presence?templateId=debutReveal') {
        return debutWorkspace;
      }

      if (path === '/api/v1/talents/talent-1/public-presence?templateId=activeTalentHub') {
        return activeHubWorkspace;
      }

      if (isPreviewRequest(path)) {
        return buildPreview();
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    const user = userEvent.setup();

    render(
      <PublicPresenceStudioScreen
        initialFocus="release"
        initialTemplateId="debutReveal"
        talentId="talent-1"
        tenantId="tenant-1"
      />,
    );

    await screen.findByTestId('canvas-stage', {}, { timeout: STUDIO_RENDER_TIMEOUT });
    await user.click(screen.getByRole('button', { name: 'Open readiness panel' }));

    expect(
      screen.getByText('Approve the always-on hub before scheduling the debut switch.'),
    ).toBeInTheDocument();

    const publishButton = screen.getByRole('button', { name: 'Publish now' });
    expect(publishButton).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Open the always-on hub draft' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/talents/talent-1/public-presence?templateId=activeTalentHub',
      );
    });
  });
});
