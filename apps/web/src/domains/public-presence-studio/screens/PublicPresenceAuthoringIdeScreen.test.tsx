import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useEffect, useRef, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PublicPresenceAuthoringIdeScreen } from '@/domains/public-presence-studio/screens/PublicPresenceAuthoringIdeScreen';

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
        <div data-testid="monaco-editor-stub">
          <div>{props.path}</div>
          <textarea
            aria-label={props.path ?? 'Editor file'}
            onChange={(event) => {
              const nextValue = event.currentTarget.value;
              valueRef.current = nextValue;
              setValue(nextValue);
              modelListenersRef.current.forEach((listener) => listener());
              editorListenersRef.current.forEach((listener) => listener());
            }}
            value={value}
          />
        </div>
      );
    },
}));

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
    expect(screen.getByRole('button', { name: 'Page source' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Registry snippets' })).toBeInTheDocument();
    expect(screen.getByTestId('ide-custom-html-preview')).toBeInTheDocument();
    expect(screen.getByText('Safe custom page preview')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Registry snippets' }));
    expect(screen.getByRole('button', { name: 'Registry snippets' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Approved snippet preview')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Page source' }));
    expect(screen.getByRole('button', { name: 'Page source' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Structured page preview')).toBeInTheDocument();
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

  it('keeps the custom HTML dirty lifecycle after switching from page source mode', async () => {
    render(
      <PublicPresenceAuthoringIdeScreen
        advancedMode="page-source"
        target="advanced"
        talentId="talent-1"
        tenantId="tenant-1"
        templateId="activeTalentHub"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Custom HTML' }));

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
});
