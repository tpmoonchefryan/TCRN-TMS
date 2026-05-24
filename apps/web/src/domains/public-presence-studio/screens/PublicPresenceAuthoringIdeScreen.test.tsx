import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useEffect, useRef, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PublicPresenceAuthoringIdeScreen } from '@/domains/public-presence-studio/screens/PublicPresenceAuthoringIdeScreen';

const mockRequest = vi.fn();
const ORDINARY_COPY_BOUNDARY_PATTERN =
  /\bcanvas\b|admin chrome|topbar compact|first work surface|first surface/i;
const ORDINARY_IMPLEMENTATION_COPY_PATTERN =
  /Fallback safety sample|Choose fixture, phase, and viewport options here|Code, manifest, schema, fixture, and validation notes stay together here|Preview controls are running in .* mode at the .* phase/i;

vi.setConfig({
  testTimeout: 15_000,
});

vi.mock('@/platform/runtime/locale/locale-provider', () => ({
  useUiLocale: () => ({
    locale: 'en',
  }),
}));

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    request: mockRequest,
  }),
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

vi.mock('next/dynamic', () => ({
  default: () =>
    function MonacoStub(props: {
      onMount?: (editor: {
        getModel: () => {
          getValue: () => string;
          onDidChangeContent: (listener: () => void) => { dispose: () => void };
        } | null;
        onDidChangeModelContent: (listener: () => void) => { dispose: () => void };
      }) => void;
      path?: string;
      value?: string;
    }) {
      const [value, setValue] = useState(props.value ?? '');
      const valueRef = useRef(value);
      const modelListenersRef = useRef(new Set<() => void>());
      const editorListenersRef = useRef(new Set<() => void>());
      const updateModelValue = (nextValue: string, notifyListeners = true) => {
        valueRef.current = nextValue;
        setValue(nextValue);

        if (!notifyListeners) {
          return;
        }

        modelListenersRef.current.forEach((listener) => listener());
        editorListenersRef.current.forEach((listener) => listener());
      };
      const modelRef = useRef({
        getValue: () => valueRef.current,
        onDidChangeContent: (listener: () => void) => {
          modelListenersRef.current.add(listener);
          return {
            dispose: () => {
              modelListenersRef.current.delete(listener);
            },
          };
        },
        setValue: (nextValue: string) => {
          updateModelValue(nextValue);
        },
      });

      useEffect(() => {
        const nextValue = props.value ?? '';
        valueRef.current = nextValue;
        setValue(nextValue);
      }, [props.value]);

      useEffect(() => {
        props.onMount?.({
          getModel: () => modelRef.current,
          onDidChangeModelContent: (listener: () => void) => {
            editorListenersRef.current.add(listener);
            return {
              dispose: () => {
                editorListenersRef.current.delete(listener);
              },
            };
          },
        });
      }, [props.onMount]);

      return (
        <div className="monaco-editor" data-testid="monaco-editor-stub">
          <div className="view-lines">{props.path}</div>
          <textarea
            aria-label={props.path ?? 'Editor file'}
            onChange={(event) => {
              const nextValue = event.currentTarget.value;
              updateModelValue(nextValue);
            }}
            value={value}
          />
          <textarea
            aria-label={`${props.path ?? 'Editor file'} input area`}
            className="inputarea"
            data-testid="monaco-inputarea-stub"
            defaultValue=""
            onInput={() => undefined}
          />
        </div>
      );
    },
}));

function buildAdvancedWorkspace() {
  return {
    draftVersion: {
      contentHash: 'workspace-hash-1',
      contentHashAlgorithm: 'sha256',
      createdAt: '2026-05-21T01:00:00.000Z',
      document: {
        metadata: {
          title: 'Sakura Kaze Official Hub',
        },
        personaKit: {
          campaignLabel: 'Sakura Kaze',
        },
        schemaVersion: '1.0',
        sections: [
          {
            fields: {
              displayName: {
                provenance: 'publicPresence',
                value: 'Sakura Kaze',
              },
            },
            id: 'first-1',
            kind: 'firstEncounter',
            phaseVisibility: 'always',
          },
        ],
        templateId: 'activeTalentHub',
      },
      documentSchemaVersion: '1.0',
      documentState: 'draft',
      id: 'draft-version-1',
      lastValidationSnapshotId: null,
      publishedAt: null,
      scheduledFor: null,
      templateId: 'activeTalentHub',
      updatedAt: '2026-05-21T01:05:00.000Z',
      validationSnapshot: null,
      versionNumber: 1,
    },
    liveTemplateId: null,
    liveVersion: null,
    pageVersions: [],
    portal: {
      createdAt: '2026-05-21T01:00:00.000Z',
      draftVersionId: 'draft-version-1',
      id: 'portal-1',
      lastValidatedAt: '2026-05-21T01:05:00.000Z',
      latestValidationState: 'validEditable',
      latestVersionNumber: 1,
      liveVersionId: null,
      talentId: 'talent-1',
      updatedAt: '2026-05-21T01:05:00.000Z',
      version: 1,
    },
    publicRoute: {
      canonicalPath: '/tenant-1/sakura/homepage',
      domainHostname: null,
      legacyPath: null,
      talentCode: 'sakura',
      tenantCode: 'tenant-1',
    },
    releaseReadiness: {
      blockingDependencyCount: 0,
      dependencies: [],
    },
    selectedTemplateId: 'activeTalentHub',
    stageSections: [],
    templates: [],
    workflowEvents: [],
  };
}

function buildAdvancedPreview() {
  return {
    appearance: {
      theme: {},
    },
    metadata: {
      title: 'Sakura Kaze Official Hub',
    },
    sections: [],
  };
}

function buildAssetDetail() {
  return {
    asset: {
      assetKind: 'template',
      code: 'active-talent-hub-local',
      componentType: null,
      createdAt: '2026-05-23T01:00:00.000Z',
      currentRevisionId: 'asset-revision-1',
      description: {
        en: 'Tenant-scoped template asset.',
        fr: 'Tenant-scoped template asset.',
        ja: 'Tenant-scoped template asset.',
        ko: 'Tenant-scoped template asset.',
        zh_HANS: 'Tenant-scoped template asset.',
        zh_HANT: 'Tenant-scoped template asset.',
      },
      id: 'asset-template-1',
      isSystem: false,
      name: {
        en: 'Active Talent Hub Local',
        fr: 'Active Talent Hub Local',
        ja: 'Active Talent Hub Local',
        ko: 'Active Talent Hub Local',
        zh_HANS: 'Active Talent Hub Local',
        zh_HANT: 'Active Talent Hub Local',
      },
      ownerId: null,
      ownerType: 'tenant',
      status: 'draft',
      templateId: 'activeTalentHub',
      updatedAt: '2026-05-23T01:05:00.000Z',
      version: 1,
    },
    canEdit: true,
    currentRevision: {
      artifactStatus: 'draft',
      assetId: 'asset-template-1',
      createdAt: '2026-05-23T01:05:00.000Z',
      createdBy: 'user-1',
      id: 'asset-revision-1',
      lastValidatedAt: null,
      manifest: {
        assetKind: 'template',
        defaultSectionOrder: ['firstEncounter', 'officialChannels'],
        label: 'Active Talent Hub',
        lockedSections: [],
        optionalSections: ['fanActions'],
        ownerId: null,
        ownerType: 'tenant',
        personaKitFields: ['campaignLabel'],
        policyReferences: ['artistLifecycleFlow'],
        recommendedSections: ['fanActions'],
        requiredSections: ['firstEncounter', 'officialChannels'],
        runtimeContractVersion: '2026.05',
        templateId: 'activeTalentHub',
        useCase: 'Always-on official public presence for an active talent.',
        validationRules: ['requiresOfficialChannels'],
      },
      revisionNumber: 1,
      runtimeContractVersion: '2026.05',
      sourceBundle: [
        {
          contents: 'export function activeTalentHubTemplate() { return null; }\n',
          kind: 'code',
          language: 'typescript',
          path: 'src/template.tsx',
        },
        {
          contents: '{"assetKind":"template"}',
          kind: 'schema',
          language: 'json',
          path: 'manifest.json',
        },
      ],
      sourceHash: 'assethash001',
      submittedAt: null,
      validationState: 'unvalidated',
      validationSummary: {
        issueCount: 0,
        passCount: 0,
        warnCount: 0,
      },
    },
    isInherited: false,
    revisions: [],
    scope: {
      scopeId: null,
      scopeType: 'tenant',
    },
  };
}

function setWindowWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
    writable: true,
  });
  window.dispatchEvent(new Event('resize'));
}

describe('PublicPresenceAuthoringIdeScreen', () => {
  beforeEach(() => {
    setWindowWidth(1024);
    mockRequest.mockReset();
    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path.startsWith('/api/v1/talents/talent-1/public-presence/preview')) {
        return buildAdvancedPreview();
      }

      if (path.startsWith('/api/v1/talents/talent-1/public-presence') && !path.includes('/authoring/')) {
        if (init?.method === 'PATCH') {
          const payload = JSON.parse(String(init.body ?? '{}')) as {
            document?: Record<string, unknown>;
          };

          return {
            ...buildAdvancedWorkspace(),
            draftVersion: {
              ...buildAdvancedWorkspace().draftVersion,
              document: payload.document ?? buildAdvancedWorkspace().draftVersion.document,
              updatedAt: '2026-05-21T01:06:00.000Z',
            },
            portal: {
              ...buildAdvancedWorkspace().portal,
              lastValidatedAt: '2026-05-21T01:06:00.000Z',
            },
          };
        }

        return buildAdvancedWorkspace();
      }

      if (
        path.includes('/authoring/templates/current')
        || path.includes('/authoring/components/current')
      ) {
        if (init?.method === 'PUT' || init?.method === 'POST') {
          const payload = JSON.parse(String(init.body ?? '{}')) as {
            sourceBundle: Array<{
              contents: string;
              kind: string;
              language: string;
              path: string;
            }>;
            subjectKey?: string;
            validationSummary?: {
              issueCount?: number;
              passCount?: number;
              warnCount?: number;
            };
          };
          const artifactKind = path.includes('/templates/')
            ? 'template'
            : 'component';
          const artifactStatus = path.endsWith('/submit')
            ? 'submitted'
            : path.endsWith('/validate')
              ? 'validated'
              : 'draft';

          return {
            artifactKind,
            artifactStatus,
            id: `${artifactKind}-draft-1`,
            lastSavedAt: '2026-05-21T01:05:00.000Z',
            lastValidatedAt:
              artifactStatus === 'validated' || artifactStatus === 'submitted'
                ? '2026-05-21T01:06:00.000Z'
                : null,
            sourceBundle: payload.sourceBundle,
            subjectKey: payload.subjectKey ?? 'new',
            submittedAt:
              artifactStatus === 'submitted'
                ? '2026-05-21T01:07:00.000Z'
                : null,
            updatedAt: '2026-05-21T01:07:00.000Z',
            validationState:
              (payload.validationSummary?.warnCount ?? 0) > 0 ? 'warning' : 'ready',
            validationSummary: payload.validationSummary ?? {
              issueCount: 0,
              passCount: 0,
              warnCount: 0,
            },
            version: 1,
          };
        }

        return null;
      }

      throw new Error(`Unhandled request: ${path}`);
    });
  });

  it('renders a Monaco-backed authoring workspace for templates', async () => {
    const { container } = render(
      <PublicPresenceAuthoringIdeScreen
        target="template"
        talentId="talent-1"
        tenantId="tenant-1"
        templateId="activeTalentHub"
      />,
    );

    expect(screen.getAllByText('Template IDE')[0]).toBeInTheDocument();
    expect(screen.getByTestId('ide-topbar')).toBeInTheDocument();
    expect(screen.getByTestId('ide-mobile-actions-button')).toBeInTheDocument();
    expect(screen.getByTestId('monaco-editor-host')).toBeInTheDocument();
    expect(screen.getByTestId('monaco-editor-stub')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Files' })[0]);
    const fileDrawer = screen.getByTestId('ide-file-drawer');
    expect(screen.getByTestId('ide-file-src/template.tsx')).toBeInTheDocument();
    expect(screen.getByTestId('ide-live-preview')).toBeInTheDocument();
    expect(within(fileDrawer).getByRole('button', { name: 'Validation checks' })).toBeInTheDocument();
    expect(screen.queryByText(/codemirror-wrapper/i)).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/Monaco|CodeMirror|runtime/i);
    expect(container.textContent).not.toMatch(ORDINARY_COPY_BOUNDARY_PATTERN);
    expect(screen.getByTestId('mock-public-preview')).toHaveAttribute('data-responsive-mode', 'desktop');
  }, 15_000);

  it('marks legacy non-asset template authoring as a compatibility entry', async () => {
    render(
      <PublicPresenceAuthoringIdeScreen
        target="template"
        talentId="talent-1"
        tenantId="tenant-1"
        templateId="activeTalentHub"
      />,
    );

    expect(await screen.findByTestId('legacy-authoring-compatibility-notice')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open asset workspace' })).toHaveAttribute(
      'href',
      '/tenant/tenant-1/talent/talent-1/settings?section=config-entities',
    );
    expect(screen.getByRole('link', { name: 'Open Homepage Management' })).toHaveAttribute(
      'href',
      '/tenant/tenant-1/talent/talent-1/homepage',
    );
  });

  it('loads and saves asset-scoped template revisions through the asset endpoints', async () => {
    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/public-presence/assets/asset-template-1?scopeType=tenant' && !init) {
        return buildAssetDetail();
      }

      if (path === '/api/v1/public-presence/assets/asset-template-1/current?scopeType=tenant' && init?.method === 'PUT') {
        const payload = JSON.parse(String(init.body ?? '{}')) as {
          sourceBundle: Array<{
            contents: string;
            kind: string;
            language: string;
            path: string;
          }>;
        };

        return {
          ...buildAssetDetail(),
          currentRevision: {
            ...buildAssetDetail().currentRevision,
            createdAt: '2026-05-23T01:06:00.000Z',
            sourceBundle: payload.sourceBundle,
          },
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(
      <PublicPresenceAuthoringIdeScreen
        assetId="asset-template-1"
        assetScopeType="tenant"
        target="template"
        tenantId="tenant-1"
      />,
    );

    const editor = await screen.findByRole('textbox', { name: 'src/template.tsx' });

    await waitFor(() => {
      expect(String((editor as HTMLTextAreaElement).value)).toContain('activeTalentHubTemplate');
    });
    expect(screen.getByRole('link', { name: 'Exit' })).toHaveAttribute(
      'href',
      '/tenant/tenant-1/settings?section=config-entities',
    );
    expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument();

    fireEvent.change(editor, {
      target: {
        value: 'export function activeTalentHubTemplate() { return "changed"; }\n',
      },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Save draft' })[0]);

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/public-presence/assets/asset-template-1/current?scopeType=tenant',
        expect.objectContaining({
          method: 'PUT',
        }),
      );
      expect(screen.getAllByText('Draft saved')[0]).toBeInTheDocument();
    });
  });

  it('renders a component authoring workspace with file tree and preview controls', async () => {
    render(
      <PublicPresenceAuthoringIdeScreen
        target="component"
        talentId="talent-1"
        tenantId="tenant-1"
        componentType="SocialLinks"
      />,
    );

    expect(screen.getAllByText('Component IDE')[0]).toBeInTheDocument();
    expect(screen.getByTestId('ide-topbar')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Desktop' })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Mobile' })[0]).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Files' })[0]);
    expect(screen.getByTestId('ide-file-src/component.tsx')).toBeInTheDocument();
    expect(screen.getAllByText('Editor')[0]).toBeInTheDocument();
  });

  it('supports restricted workspace file and folder CRUD from the file explorer', async () => {
    setWindowWidth(1440);

    render(
      <PublicPresenceAuthoringIdeScreen
        target="template"
        talentId="talent-1"
        tenantId="tenant-1"
        templateId="activeTalentHub"
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Files' })[0]);

    const fileDrawer = screen.getByTestId('ide-file-drawer');
    fireEvent.click(within(fileDrawer).getByRole('button', { name: 'New folder' }));
    fireEvent.change(within(fileDrawer).getByRole('textbox'), {
      target: {
        value: 'src/custom-blocks',
      },
    });
    fireEvent.click(within(fileDrawer).getByRole('button', { name: 'Apply' }));

    expect(within(fileDrawer).getByTestId('ide-folder-src/custom-blocks')).toBeInTheDocument();

    fireEvent.click(within(fileDrawer).getByRole('button', { name: 'New file' }));
    fireEvent.change(within(fileDrawer).getByRole('textbox'), {
      target: {
        value: 'src/custom-blocks/hero-note.tsx',
      },
    });
    fireEvent.click(within(fileDrawer).getByRole('button', { name: 'Apply' }));

    expect(within(fileDrawer).getByTestId('ide-file-src/custom-blocks/hero-note.tsx')).toBeInTheDocument();
    expect(screen.getAllByText('src/custom-blocks/hero-note.tsx').length).toBeGreaterThan(0);

    fireEvent.click(within(fileDrawer).getByTestId('ide-file-src/custom-blocks/hero-note.tsx'));
    fireEvent.click(screen.getAllByRole('button', { name: 'Files' })[0]);
    fireEvent.click(within(screen.getByTestId('ide-file-drawer')).getByRole('button', { name: 'Rename' }));
    fireEvent.change(within(screen.getByTestId('ide-file-drawer')).getByRole('textbox'), {
      target: {
        value: 'src/custom-blocks/hero-note-renamed.tsx',
      },
    });
    fireEvent.click(within(screen.getByTestId('ide-file-drawer')).getByRole('button', { name: 'Apply' }));

    expect(screen.getByTestId('ide-file-src/custom-blocks/hero-note-renamed.tsx')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('ide-folder-src/custom-blocks'));
    fireEvent.click(within(screen.getByTestId('ide-file-drawer')).getByRole('button', { name: 'Delete' }));

    expect(screen.queryByTestId('ide-folder-src/custom-blocks')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ide-file-src/custom-blocks/hero-note-renamed.tsx')).not.toBeInTheDocument();
  });

  it('rejects blocked workspace paths before applying file explorer changes', async () => {
    setWindowWidth(1440);

    render(
      <PublicPresenceAuthoringIdeScreen
        target="component"
        talentId="talent-1"
        tenantId="tenant-1"
        componentType="SocialLinks"
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Files' })[0]);

    const fileDrawer = screen.getByTestId('ide-file-drawer');
    fireEvent.click(within(fileDrawer).getByRole('button', { name: 'New file' }));
    fireEvent.change(within(fileDrawer).getByRole('textbox'), {
      target: {
        value: '../escape.ts',
      },
    });
    fireEvent.click(within(fileDrawer).getByRole('button', { name: 'Apply' }));

    expect(within(fileDrawer).getByRole('alert')).toHaveTextContent(/letters|workspace/i);
    expect(screen.queryByTestId('ide-file-../escape.ts')).not.toBeInTheDocument();
  });

  it('switches the live preview to mobile layout mode when requested', async () => {
    render(
      <PublicPresenceAuthoringIdeScreen
        target="template"
        talentId="talent-1"
        tenantId="tenant-1"
        templateId="activeTalentHub"
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Mobile' })[0]);

    expect(screen.getByTestId('mock-public-preview')).toHaveAttribute('data-responsive-mode', 'mobile');
  });

  it('exposes mobile sheets and utility drawers with dialog semantics and focus return', async () => {
    render(
      <PublicPresenceAuthoringIdeScreen
        target="template"
        talentId="talent-1"
        tenantId="tenant-1"
        templateId="activeTalentHub"
      />,
    );

    const actionsButton = screen.getByTestId('ide-mobile-actions-button');
    fireEvent.click(actionsButton);

    const actionsSheet = screen.getByTestId('ide-mobile-actions-sheet');
    expect(actionsSheet).toHaveAttribute('role', 'dialog');
    expect(actionsButton).toHaveAttribute('aria-expanded', 'true');
    expect(actionsButton).toHaveAttribute('aria-controls', actionsSheet.id);

    const actionsClose = within(actionsSheet).getByRole('button', { name: 'Close' });
    await waitFor(() => {
      expect(document.activeElement).toBe(actionsClose);
    });

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByTestId('ide-mobile-actions-sheet')).not.toBeInTheDocument();
      expect(document.activeElement).toBe(actionsButton);
    });

    const filesButton = screen.getAllByRole('button', { name: 'Files' })[0];
    fireEvent.click(filesButton);

    const filesDrawer = screen.getByTestId('ide-file-drawer');
    expect(filesDrawer).toHaveAttribute('role', 'dialog');
    expect(filesButton).toHaveAttribute('aria-expanded', 'true');
    expect(filesButton).toHaveAttribute('aria-controls', filesDrawer.id);

    const filesClose = within(filesDrawer).getByRole('button', { name: 'Close' });
    expect(filesClose).toBeInTheDocument();
  });

  it('keeps one mobile utility sheet active at a time and traps focus inside it', async () => {
    setWindowWidth(390);

    render(
      <PublicPresenceAuthoringIdeScreen
        target="template"
        talentId="talent-1"
        tenantId="tenant-1"
        templateId="activeTalentHub"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Preview view' }));
    fireEvent.click(screen.getByTestId('ide-mobile-preview-options-button'));

    expect(screen.getByTestId('ide-mobile-preview-options-sheet')).toBeInTheDocument();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByTestId('ide-topbar')).toHaveAttribute('data-overlay-inert', 'true');
    expect(screen.getByTestId('ide-mobile-overlay-backdrop')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Files' }));
    expect(screen.queryByTestId('ide-mobile-preview-options-sheet')).not.toBeInTheDocument();
    expect(screen.getByTestId('ide-file-drawer')).toBeInTheDocument();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Validation checks' }));
    expect(screen.queryByTestId('ide-file-drawer')).not.toBeInTheDocument();
    const validationDrawer = screen.getByTestId('ide-validation-drawer');
    expect(validationDrawer).toBeInTheDocument();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);

    const validationClose = within(validationDrawer).getByRole('button', { name: 'Close' });
    await waitFor(() => {
      expect(document.activeElement).toBe(validationClose);
    });

    const backgroundTrigger = screen.getByTestId('ide-mobile-actions-button');
    backgroundTrigger.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    await waitFor(() => {
      expect(validationDrawer.contains(document.activeElement)).toBe(true);
    });
  });

  it('docks desktop utility panels and keeps implementation copy out of ordinary UI', async () => {
    setWindowWidth(1440);

    const { container } = render(
      <PublicPresenceAuthoringIdeScreen
        target="template"
        talentId="talent-1"
        tenantId="tenant-1"
        templateId="activeTalentHub"
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Files' })[0]);
    const filesPanel = screen.getByTestId('ide-file-drawer');
    expect(filesPanel).toHaveAttribute('role', 'region');
    expect(within(filesPanel).getByText('Source')).toBeInTheDocument();
    expect(within(filesPanel).getByText('Docs')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(ORDINARY_IMPLEMENTATION_COPY_PATTERN);

    fireEvent.click(screen.getAllByRole('button', { name: 'Validation checks' })[0]);
    const validationPanel = screen.getByTestId('ide-validation-drawer');
    expect(validationPanel).toHaveAttribute('role', 'region');
    expect(screen.getByText('Validation')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(ORDINARY_IMPLEMENTATION_COPY_PATTERN);
  });

  it('keeps ordinary mobile authoring sheets free from design-rationale copy', async () => {
    const { container } = render(
      <PublicPresenceAuthoringIdeScreen
        target="template"
        talentId="talent-1"
        tenantId="tenant-1"
        templateId="activeTalentHub"
      />,
    );

    fireEvent.click(screen.getByTestId('ide-mobile-actions-button'));
    expect(screen.getByTestId('ide-mobile-actions-sheet')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(ORDINARY_COPY_BOUNDARY_PATTERN);

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByTestId('ide-mobile-actions-sheet')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Preview view' }));
    await waitFor(() => {
      expect(screen.getByTestId('ide-mobile-surface-status')).toHaveTextContent('Previewing output');
    });
    fireEvent.click(screen.getByTestId('ide-mobile-preview-options-button'));
    expect(screen.getByTestId('ide-mobile-preview-options-sheet')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(ORDINARY_COPY_BOUNDARY_PATTERN);
    expect(container.textContent).not.toMatch(ORDINARY_IMPLEMENTATION_COPY_PATTERN);

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByTestId('ide-mobile-preview-options-sheet')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Files' })[0]);
    expect(screen.getByTestId('ide-file-drawer')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(ORDINARY_IMPLEMENTATION_COPY_PATTERN);
  });

  it('keeps mobile authoring state and fixture labels creator-readable', async () => {
    render(
      <PublicPresenceAuthoringIdeScreen
        target="component"
        talentId="talent-1"
        tenantId="tenant-1"
        componentType="SocialLinks"
      />,
    );

    expect(screen.getByTestId('ide-mobile-surface-status')).toHaveTextContent('Editing code');

    fireEvent.click(screen.getByRole('button', { name: 'Preview view' }));
    expect(screen.getByTestId('ide-mobile-surface-status')).toHaveTextContent('Previewing output');

    fireEvent.click(screen.getByRole('button', { name: 'Preview view' }));
    await waitFor(() => {
      expect(screen.getByTestId('ide-mobile-surface-status')).toHaveTextContent('Previewing output');
    });
    fireEvent.click(screen.getByTestId('ide-mobile-preview-options-button'));
    expect(screen.getByText('Sample content')).toBeInTheDocument();
    expect(screen.getByText('Reveal state')).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Everyday sample' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Safe launch sample' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Before reveal hold' })).toBeInTheDocument();
  });

  it('falls back legacy page-source deep links to the safe custom-html mode', async () => {
    render(
      <PublicPresenceAuthoringIdeScreen
        advancedMode="page-source"
        target="advanced"
        talentId="talent-1"
        tenantId="tenant-1"
        templateId="activeTalentHub"
      />,
    );

    expect(screen.queryByRole('button', { name: 'Page source' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Custom HTML' })).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByRole('textbox', { name: 'src/index.html' })).toBeInTheDocument();
    expect(screen.getByTestId('ide-custom-html-preview')).toBeInTheDocument();
  });

  it('renders a standalone advanced IDE with mode switches and safe custom-html preview', async () => {
    render(
      <PublicPresenceAuthoringIdeScreen
        advancedMode="custom-html"
        target="advanced"
        talentId="talent-1"
        tenantId="tenant-1"
        templateId="activeTalentHub"
      />,
    );

    expect(screen.getAllByText('Advanced IDE')[0]).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Custom HTML' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: 'Page source' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registry snippets' })).toBeInTheDocument();
    expect(screen.getByTestId('ide-custom-html-preview')).toBeInTheDocument();
    expect(screen.getByText('Safe custom page preview')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Registry snippets' }));
    expect(screen.getByRole('button', { name: 'Registry snippets' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Approved snippet preview')).toBeInTheDocument();
  });

  it('keeps legacy page-source deep links off the homepage draft endpoint', async () => {
    render(
      <PublicPresenceAuthoringIdeScreen
        advancedMode="page-source"
        target="advanced"
        talentId="talent-1"
        tenantId="tenant-1"
        templateId="activeTalentHub"
      />,
    );

    const editor = await screen.findByRole('textbox', { name: 'src/index.html' });
    fireEvent.change(editor, {
      target: {
        value: '<main class="fan-page"><h1>Legacy deep link fallback</h1></main>',
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => {
      expect(screen.getAllByText('Draft saved')[0]).toBeInTheDocument();
    });
    expect(
      mockRequest.mock.calls.some(
        ([path]) => path === '/api/v1/talents/talent-1/public-presence/draft',
      ),
    ).toBe(false);
  });

  it('captures select-all textarea fallback edits for custom-html saves after legacy deep-link fallback', async () => {
    render(
      <PublicPresenceAuthoringIdeScreen
        advancedMode="page-source"
        target="advanced"
        talentId="talent-1"
        tenantId="tenant-1"
        templateId="activeTalentHub"
      />,
    );

    const editor = await screen.findByRole('textbox', { name: 'src/index.html' });

    const replacement = '<main class="fan-page"><h1>Advanced textarea fallback marker</h1></main>';
    const saveButton = screen.getByRole('button', { name: 'Save draft' });

    expect(saveButton).toBeDisabled();
    fireEvent.keyDown(screen.getByTestId('monaco-editor-host'), {
      key: 'a',
      metaKey: true,
    });
    fireEvent.input(screen.getByTestId('monaco-inputarea-stub'), {
      target: {
        value: replacement,
      },
    });

    await waitFor(() => {
      expect(screen.getAllByText('Unsaved changes')[0]).toBeInTheDocument();
      expect(saveButton).not.toBeDisabled();
    });

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByTestId('ide-custom-html-preview').getAttribute('srcdoc')).toContain(
        'Advanced textarea fallback marker',
      );
    });
    expect(
      mockRequest.mock.calls.some(
        ([path]) => path === '/api/v1/talents/talent-1/public-presence/draft',
      ),
    ).toBe(false);
  });

  it('keeps the visible editor focus path saveable for compatibility template routes without legacy draft requests', async () => {
    render(
      <PublicPresenceAuthoringIdeScreen
        target="template"
        talentId="talent-1"
        tenantId="tenant-1"
      />,
    );

    const marker = 'AR38 visible editor marker';
    const saveButton = screen.getByRole('button', { name: 'Save draft' });
    const viewLines = document.querySelector('.monaco-editor .view-lines');
    const editor = screen.getByRole('textbox', { name: 'src/template.tsx' });

    expect(viewLines).not.toBeNull();
    fireEvent.mouseDown(viewLines!);
    expect(document.activeElement).toBe(editor);

    fireEvent.change(editor, {
      target: {
        value: `export const customTemplateVisibleMarker = "${marker}";\n`,
      },
    });

    await waitFor(() => {
      expect(screen.getAllByText('Unsaved changes')[0]).toBeInTheDocument();
      expect(saveButton).not.toBeDisabled();
    });

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getAllByText('Draft saved')[0]).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
    });
    expect(
      mockRequest.mock.calls.some(([path]) => String(path).includes('/public-presence/authoring/')),
    ).toBe(false);
  });

  it('keeps custom HTML authoring in a real dirty-save-validate lifecycle', async () => {
    render(
      <PublicPresenceAuthoringIdeScreen
        advancedMode="custom-html"
        target="advanced"
        talentId="talent-1"
        tenantId="tenant-1"
        templateId="activeTalentHub"
      />,
    );

    const saveButton = screen.getByRole('button', { name: 'Save draft' });
    const validateButton = screen.getByRole('button', { name: 'Validate' });
    const editor = screen.getByRole('textbox', { name: 'src/index.html' });

    expect(saveButton).toBeDisabled();
    fireEvent.change(editor, {
      target: {
        value: '<main class="fan-page"><h1>Fresh AR34 marker</h1></main>',
      },
    });

    await waitFor(() => {
      expect(screen.getAllByText('Unsaved changes')[0]).toBeInTheDocument();
      expect(saveButton).not.toBeDisabled();
    });

    const preview = screen.getByTestId('ide-custom-html-preview');
    expect(preview.getAttribute('srcdoc')).toContain('Fresh AR34 marker');

    fireEvent.click(saveButton);
    await waitFor(() => {
      expect(screen.getAllByText('Draft saved')[0]).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Files' })[0]);
    fireEvent.click(await screen.findByTestId('ide-file-src/index.html'));
    expect(
      (screen.getByRole('textbox', { name: 'src/index.html' }) as HTMLTextAreaElement).value,
    ).toContain('Fresh AR34 marker');

    fireEvent.click(validateButton);
    await waitFor(() => {
      expect(screen.getAllByText('Validation refreshed')[0]).toBeInTheDocument();
    });
  });

  it('keeps the custom HTML dirty lifecycle after a legacy page-source deep link falls back', async () => {
    render(
      <PublicPresenceAuthoringIdeScreen
        advancedMode="page-source"
        target="advanced"
        talentId="talent-1"
        tenantId="tenant-1"
        templateId="activeTalentHub"
      />,
    );

    const saveButton = screen.getByRole('button', { name: 'Save draft' });
    const editor = await screen.findByRole('textbox', { name: 'src/index.html' });

    fireEvent.change(editor, {
      target: {
        value: '<main class="fan-page"><h1>Advanced switch marker</h1></main>',
      },
    });

    await waitFor(() => {
      expect(screen.getAllByText('Unsaved changes')[0]).toBeInTheDocument();
      expect(saveButton).not.toBeDisabled();
    });

    expect(screen.getByTestId('ide-custom-html-preview').getAttribute('srcdoc')).toContain(
      'Advanced switch marker',
    );
  });

  it('keeps textarea replacement fallback saveable on compatibility template routes without legacy draft persistence', async () => {
    render(
      <PublicPresenceAuthoringIdeScreen
        target="template"
        talentId="talent-1"
        tenantId="tenant-1"
      />,
    );

    const marker = 'AR38 textarea template marker';
    const saveButton = screen.getByRole('button', { name: 'Save draft' });

    fireEvent.keyDown(screen.getByTestId('monaco-editor-host'), {
      key: 'a',
      metaKey: true,
    });
    fireEvent.input(screen.getByTestId('monaco-inputarea-stub'), {
      target: {
        value: `export const customTemplateMarker = "${marker}";\n`,
      },
    });

    await waitFor(() => {
      expect(screen.getAllByText('Unsaved changes')[0]).toBeInTheDocument();
      expect(saveButton).not.toBeDisabled();
    });

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getAllByText('Draft saved')[0]).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
    });
    expect(
      (screen.getByRole('textbox', { name: 'src/template.tsx' }) as HTMLTextAreaElement).value,
    ).toContain(marker);
    expect(
      mockRequest.mock.calls.some(([path]) => String(path).includes('/public-presence/authoring/')),
    ).toBe(false);
  });

  it('keeps created workspace file contents saveable on compatibility template routes without legacy draft persistence', async () => {
    setWindowWidth(1440);

    render(
      <PublicPresenceAuthoringIdeScreen
        target="template"
        talentId="talent-1"
        tenantId="tenant-1"
        templateId="activeTalentHub"
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Files' })[0]);

    const fileDrawer = screen.getByTestId('ide-file-drawer');
    fireEvent.click(within(fileDrawer).getByRole('button', { name: 'New folder' }));
    fireEvent.change(within(fileDrawer).getByRole('textbox'), {
      target: {
        value: 'src/custom-blocks',
      },
    });
    fireEvent.click(within(fileDrawer).getByRole('button', { name: 'Apply' }));

    fireEvent.click(within(fileDrawer).getByRole('button', { name: 'New file' }));
    fireEvent.change(within(fileDrawer).getByRole('textbox'), {
      target: {
        value: 'src/custom-blocks/hero-note.tsx',
      },
    });
    fireEvent.click(within(fileDrawer).getByRole('button', { name: 'Apply' }));

    const marker = 'AR38 workspace textarea marker';
    const saveButton = screen.getByRole('button', { name: 'Save draft' });

    fireEvent.keyDown(screen.getByTestId('monaco-editor-host'), {
      key: 'a',
      metaKey: true,
    });
    fireEvent.input(screen.getByTestId('monaco-inputarea-stub'), {
      target: {
        value: `export const customWorkspaceMarker = "${marker}";\n`,
      },
    });

    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getAllByText('Draft saved')[0]).toBeInTheDocument();
    });

    fireEvent.click(within(fileDrawer).getByTestId('ide-file-src/custom-blocks/hero-note.tsx'));
    expect(
      (screen.getByRole('textbox', { name: 'src/custom-blocks/hero-note.tsx' }) as HTMLTextAreaElement).value,
    ).toContain(marker);
    expect(
      mockRequest.mock.calls.some(([path]) => String(path).includes('/public-presence/authoring/')),
    ).toBe(false);
  });

  it('keeps compatibility template routes in a local save-validate-submit lifecycle without legacy authoring endpoints', async () => {
    setWindowWidth(1440);

    render(
      <PublicPresenceAuthoringIdeScreen
        target="template"
        talentId="talent-1"
        tenantId="tenant-1"
        templateId="activeTalentHub"
      />,
    );

    const editor = await screen.findByRole('textbox', { name: 'src/template.tsx' });
    fireEvent.change(editor, {
      target: {
        value: 'export const templateMarker = "AR37";\n',
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => {
      expect(screen.getAllByText('Draft saved')[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Validate' }));
    await waitFor(() => {
      expect(screen.getAllByText('Validation refreshed')[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(
      mockRequest.mock.calls.some(([path]) => String(path).includes('/public-presence/authoring/')),
    ).toBe(false);
  });
});
