import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PublicPresenceManagementScreen } from '@/domains/public-presence-studio/screens/PublicPresenceManagementScreen';

const mockRequest = vi.fn();
const localeState = {
  locale: 'en',
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
  useUiLocale: () => localeState,
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
          description: 'Official fan hub',
          canonicalPath: '/tenant-1/aki/homepage',
        },
        personaKit: {
          accentTone: 'rose',
          campaignLabel: 'Spring launch',
          tagline: 'Official fan hub',
        },
        schemaVersion: '1.0',
        sections: [],
      },
      documentSchemaVersion: '1.0',
      documentState: 'draft',
      id: 'version-1',
      lastValidationSnapshotId: 'snapshot-1',
      publishedAt: null,
      scheduledFor: null,
      templateId: 'activeTalentHub',
      updatedAt: '2026-05-15T12:00:00.000Z',
      validationSnapshot: {
        acknowledgementIds: [],
        blockerIds: [],
        componentRegistryVersion: '1.0.0',
        documentSchemaVersion: '1.0',
        fallbackDecisions: [],
        issueCounts: {
          blocker: 0,
          fatal: 0,
          info: 0,
          warning: 1,
        },
        issues: [],
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
    liveTemplateId: null,
    pageVersions: [
      {
        latestVersion: {
          contentHash: 'hash-1',
          contentHashAlgorithm: 'sha256',
          createdAt: '2026-05-15T12:00:00.000Z',
          document: {
            metadata: {
              title: 'Aki Rosenthal',
              description: 'Official fan hub',
            },
            schemaVersion: '1.0',
            sections: [],
          },
          documentSchemaVersion: '1.0',
          documentState: 'draft',
          id: 'version-1',
          lastValidationSnapshotId: 'snapshot-1',
          publishedAt: null,
          scheduledFor: null,
          templateId: 'activeTalentHub',
          updatedAt: '2026-05-15T12:00:00.000Z',
          validationSnapshot: {
            acknowledgementIds: [],
            blockerIds: [],
            componentRegistryVersion: '1.0.0',
            documentSchemaVersion: '1.0',
            fallbackDecisions: [],
            issueCounts: {
              blocker: 0,
              fatal: 0,
              info: 0,
              warning: 1,
            },
            issues: [],
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
        revealAutoSwitchAt: null,
        scheduledVersion: null,
        templateId: 'activeTalentHub',
      },
      {
        latestVersion: {
          contentHash: 'hash-2',
          contentHashAlgorithm: 'sha256',
          createdAt: '2026-05-15T13:00:00.000Z',
          document: {
            metadata: {
              title: 'Aki debut countdown',
              description: 'Reveal countdown page',
            },
            schemaVersion: '1.0',
            sections: [
              {
                fields: {
                  phase: {
                    provenance: 'publicPresence',
                    value: 'countdown',
                  },
                },
                id: 'countdown-1',
                kind: 'countdownReveal',
                title: 'Countdown Reveal',
              },
            ],
          },
          documentSchemaVersion: '1.0',
          documentState: 'approved',
          id: 'version-2',
          lastValidationSnapshotId: 'snapshot-2',
          publishedAt: null,
          scheduledFor: '2026-05-16T10:00:00.000Z',
          templateId: 'debutReveal',
          updatedAt: '2026-05-15T13:00:00.000Z',
          validationSnapshot: {
            acknowledgementIds: [],
            blockerIds: [],
            componentRegistryVersion: '1.0.0',
            documentSchemaVersion: '1.0',
            fallbackDecisions: [],
            issueCounts: {
              blocker: 0,
              fatal: 0,
              info: 0,
              warning: 0,
            },
            issues: [],
            projectionHash: null,
            safetyPolicyVersion: '1.0.0',
            schemaVersion: '1.0',
            snapshotId: 'snapshot-2',
            templateId: 'debutReveal',
            templateRegistryVersion: '1.0.0',
            validationMode: 'draft',
          },
          versionNumber: 2,
        },
        liveVersion: null,
        revealAutoSwitchAt: '2026-05-16T12:00:00.000Z',
        scheduledVersion: {
          contentHash: 'hash-2',
          contentHashAlgorithm: 'sha256',
          createdAt: '2026-05-15T13:00:00.000Z',
          document: {
            metadata: {
              title: 'Aki debut countdown',
              description: 'Reveal countdown page',
            },
            schemaVersion: '1.0',
            sections: [],
          },
          documentSchemaVersion: '1.0',
          documentState: 'scheduled',
          id: 'version-2',
          lastValidationSnapshotId: 'snapshot-2',
          publishedAt: null,
          scheduledFor: '2026-05-16T10:00:00.000Z',
          templateId: 'debutReveal',
          updatedAt: '2026-05-15T13:00:00.000Z',
          validationSnapshot: null,
          versionNumber: 2,
        },
        templateId: 'debutReveal',
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
      {
        defaultSectionOrder: ['firstEncounter'],
        label: 'Debut / Reveal',
        optionalSections: [],
        recommendedSections: ['countdownReveal'],
        requiredSections: ['firstEncounter'],
        templateId: 'debutReveal',
        useCase: 'Reveal-safe campaign layout with pre-reveal controls.',
      },
    ],
    workflowEvents: [
      {
        actorId: 'user-1',
        contentHash: 'hash-2',
        eventType: 'scheduled',
        fromDocumentState: 'approved',
        id: 'event-1',
        occurredAt: '2026-05-15T13:05:00.000Z',
        payload: {},
        toDocumentState: 'scheduled',
        versionId: 'version-2',
      },
    ],
  };
}

describe('PublicPresenceManagementScreen', () => {
  beforeEach(() => {
    mockRequest.mockReset();
    mockRequest.mockResolvedValue(buildWorkspace());
    localeState.locale = 'en';
  });

  it.each([
    ['fr', 'Gestion de la page d’accueil'],
    ['ko', '홈페이지 관리'],
  ])('renders localized management copy for %s and keeps standalone launch links', async (locale, heading) => {
    localeState.locale = locale;

    render(<PublicPresenceManagementScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', {
        name: locale === 'fr' ? 'Definir la version live' : '라이브 버전 설정',
      }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('link', {
        name: locale === 'fr' ? 'Auto-switch apres reveal' : '리빌 후 자동 전환',
      }).length,
    ).toBeGreaterThan(0);
    expect(
      screen
        .getAllByRole('link', { name: locale === 'fr' ? 'Editer Active Hub' : 'Active Hub 편집' })
        .map((link) => link.getAttribute('href')),
    ).toContain('/studio/public-presence/tenant-1/talent-1?templateId=activeTalentHub');
    expect(
      screen
        .getAllByRole('link', { name: locale === 'fr' ? 'Apercu Active Hub' : 'Active Hub 미리보기' })
        .map((link) => link.getAttribute('href')),
    ).toContain('/studio/public-presence/tenant-1/talent-1/preview?templateId=activeTalentHub');
  });

  it('surfaces first-level version actions and workflow status for both built-in page versions', async () => {
    const { container } = render(
      <PublicPresenceManagementScreen tenantId="tenant-1" talentId="talent-1" />,
    );

    expect(await screen.findByText('Edit Active Hub')).toBeInTheDocument();
    expect(screen.getByText('Edit Debut / Reveal')).toBeInTheDocument();
    expect(screen.getByText('Preview Active Hub')).toBeInTheDocument();
    expect(screen.getByText('Preview Debut / Reveal')).toBeInTheDocument();
    expect(screen.getAllByText('Set live version').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText('Auto-switch after reveal').length,
    ).toBeGreaterThan(0);
    expect(screen.getByText('SEO and share readiness')).toBeInTheDocument();
    expect(screen.getAllByText('Last workflow activity').length).toBeGreaterThan(0);

    expect(
      screen
        .getAllByRole('link', { name: 'Set live version' })
        .map((link) => link.getAttribute('href')),
    ).toContain('/studio/public-presence/tenant-1/talent-1?templateId=activeTalentHub&focus=release');
    expect(
      screen
        .getAllByRole('link', { name: 'Auto-switch after reveal' })
        .map((link) => link.getAttribute('href')),
    ).toContain('/studio/public-presence/tenant-1/talent-1?templateId=debutReveal&focus=countdown');
    expect(screen.getAllByText('Scheduled').length).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(
      /projection|content hash|runtime|policy version|workflow event id|registry/i,
    );
  });

  it('keeps the live route compact and action-first for the management command strip', async () => {
    render(<PublicPresenceManagementScreen tenantId="tenant-1" talentId="talent-1" />);

    const routeValue = await screen.findByTestId('management-live-route-value');
    const commandStrip = screen.getByTestId('management-command-strip');
    const helpPanel = screen.getByTestId('management-header');
    expect(routeValue).toHaveTextContent('/tenant-1/aki/homepage');
    expect(routeValue).toHaveClass('truncate');
    expect(routeValue).toHaveClass('sm:max-w-[28rem]');
    expect(screen.getByRole('link', { name: 'Open live public page' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy live route' })).toBeInTheDocument();
    expect(
      commandStrip.compareDocumentPosition(helpPanel) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
