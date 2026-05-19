import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PublicPresencePreviewScreen } from '@/domains/public-presence-studio/screens/PublicPresencePreviewScreen';

const ORDINARY_COPY_BOUNDARY_PATTERN =
  /\bcanvas\b|admin chrome|topbar compact|first work surface|first surface/i;

const mockRequest = vi.fn();
const replace = vi.fn();
let pathname = '/studio/public-presence/tenant-1/talent-1/preview';
let currentSearch = '';

vi.setConfig({
  testTimeout: 15_000,
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
  useUiLocale: () => ({
    locale: 'en',
  }),
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
      Fan page preview {projection.metadata.title}
    </div>
  ),
}));

function buildWorkspace() {
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
        schemaVersion: '1.0',
        sections: [],
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
      validationSnapshot: null,
      versionNumber: 1,
    },
    liveVersion: null,
    pageVersions: [
      {
        latestVersion: {
          contentHash: 'hash-1',
          contentHashAlgorithm: 'sha256',
          createdAt: '2026-05-15T12:00:00.000Z',
          document: {
            metadata: {
              title: 'Aki Rosenthal',
            },
            schemaVersion: '1.0',
            sections: [],
          },
          documentSchemaVersion: '1.0',
          documentState: 'draft',
          id: 'draft-version-1',
          lastValidationSnapshotId: 'snapshot-1',
          publishedAt: null,
          scheduledFor: null,
          templateId: 'activeTalentHub',
          updatedAt: '2026-05-15T12:05:00.000Z',
          validationSnapshot: null,
          versionNumber: 1,
        },
        liveVersion: null,
        revealAutoSwitchAt: null,
        scheduledVersion: null,
        templateId: 'activeTalentHub',
      },
    ],
    portal: null,
    publicRoute: {
      canonicalPath: '/tenant-1/aki/homepage',
      domainHostname: null,
      legacyPath: null,
      talentCode: 'aki',
      tenantCode: 'tenant-1',
    },
    selectedTemplateId: 'activeTalentHub',
    stageSections: [],
    templates: [
      {
        defaultSectionOrder: ['firstEncounter'],
        label: 'Active Talent Hub',
        optionalSections: [],
        recommendedSections: ['officialChannels'],
        requiredSections: ['firstEncounter'],
        templateId: 'activeTalentHub',
        useCase: 'Always-on official public presence for an active talent.',
      },
    ],
    workflowEvents: [],
  };
}

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

function isWorkspaceRequest(path: string) {
  return path === '/api/v1/talents/talent-1/public-presence'
    || path.startsWith('/api/v1/talents/talent-1/public-presence?templateId=');
}

function isPreviewRequest(path: string) {
  return path === '/api/v1/talents/talent-1/public-presence/preview'
    || path.startsWith('/api/v1/talents/talent-1/public-presence/preview?');
}

describe('PublicPresencePreviewScreen', () => {
  beforeEach(() => {
    mockRequest.mockReset();
    replace.mockReset();
    pathname = '/studio/public-presence/tenant-1/talent-1/preview';
    currentSearch = '';
    replace.mockImplementation((href: string) => {
      const resolved = new URL(href, 'https://tcrn.local');
      pathname = resolved.pathname;
      currentSearch = resolved.search.startsWith('?') ? resolved.search.slice(1) : resolved.search;
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
  });

  it('keeps the preview route canvas-first without ordinary technical copy leakage', async () => {
    const { container } = render(
      <PublicPresencePreviewScreen talentId="talent-1" tenantId="tenant-1" />,
    );

    expect(await screen.findByTestId('preview-topbar')).toBeInTheDocument();
    expect(await screen.findByTestId('preview-canvas-stage')).toBeInTheDocument();
    expect(screen.queryByTestId('preview-side-rail')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Inspect sections' })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Mobile' })[0]).toBeInTheDocument();
    expect(container.textContent).not.toMatch(
      /projection|content hash|runtime|policy version|workflow event id|registry/i,
    );
    expect(container.textContent).not.toMatch(ORDINARY_COPY_BOUNDARY_PATTERN);
  });

  it('builds the section edit link from a single query string', async () => {
    render(<PublicPresencePreviewScreen talentId="talent-1" tenantId="tenant-1" />);

    await screen.findByTestId('preview-topbar');
    fireEvent.click(screen.getAllByRole('button', { name: 'Inspect sections' })[0]);

    expect(await screen.findByRole('link', { name: 'Edit this section' })).toHaveAttribute(
      'href',
      '/studio/public-presence/tenant-1/talent-1?templateId=activeTalentHub&leftPanel=sections&stagePanel=edit%3AfirstEncounter',
    );
  });

  it('preserves an explicit default template query while syncing preview state', async () => {
    currentSearch = 'templateId=activeTalentHub&viewport=mobile';

    render(
      <PublicPresencePreviewScreen
        initialTemplateId="activeTalentHub"
        talentId="talent-1"
        tenantId="tenant-1"
      />,
    );

    await screen.findByTestId('preview-canvas-stage');
    expect(currentSearch).toContain('templateId=activeTalentHub');
    expect(currentSearch).toContain('viewport=mobile');
  });

  it('keeps mobile preview details behind a dedicated tools sheet', async () => {
    const { container } = render(
      <PublicPresencePreviewScreen talentId="talent-1" tenantId="tenant-1" />,
    );

    await screen.findByTestId('preview-topbar');
    fireEvent.click(screen.getByRole('button', { name: 'Preview tools' }));

    expect(screen.getByTestId('preview-mobile-tools-sheet')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Inspect sections' })[0]).toBeInTheDocument();
    expect(container.textContent).not.toMatch(ORDINARY_COPY_BOUNDARY_PATTERN);
  });

  it('forces mobile layout mode inside the standalone preview when Mobile is selected', async () => {
    render(<PublicPresencePreviewScreen talentId="talent-1" tenantId="tenant-1" />);

    await screen.findByTestId('preview-canvas-stage');
    fireEvent.click(screen.getAllByRole('button', { name: 'Mobile' })[0]);

    expect(screen.getByTestId('mock-public-preview')).toHaveAttribute('data-responsive-mode', 'mobile');
    expect(currentSearch).toContain('viewport=mobile');
  });

  it('restores deep-linked preview state and keeps overlay semantics keyboard-reproducible', async () => {
    currentSearch = 'viewport=mobile&phase=always&details=1&sheet=tools';

    render(<PublicPresencePreviewScreen talentId="talent-1" tenantId="tenant-1" />);

    await screen.findByTestId('preview-canvas-stage');
    expect(screen.getAllByRole('button', { name: 'Mobile' })[0]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('preview-side-rail')).toHaveAttribute('role', 'dialog');
    expect(screen.queryByTestId('preview-mobile-tools-sheet')).not.toBeInTheDocument();

    const inspectButton = screen.getAllByRole('button', { name: 'Inspect sections' })[0];
    expect(inspectButton).toHaveAttribute('aria-expanded', 'true');
    expect(inspectButton).toHaveAttribute('aria-controls', screen.getByTestId('preview-side-rail').id);

    await waitFor(() => {
      expect(currentSearch).toContain('details=1');
      expect(currentSearch).toContain('viewport=mobile');
      expect(currentSearch).not.toContain('sheet=tools');
    });

    const closeInspector = within(screen.getByTestId('preview-side-rail')).getByRole('button', {
      name: 'Close inspector',
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(closeInspector);
    });

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByTestId('preview-side-rail')).not.toBeInTheDocument();
      expect(document.activeElement).toBe(inspectButton);
    });
  });
});
