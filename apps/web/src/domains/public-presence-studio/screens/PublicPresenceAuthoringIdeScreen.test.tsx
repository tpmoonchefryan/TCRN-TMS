import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PublicPresenceAuthoringIdeScreen } from '@/domains/public-presence-studio/screens/PublicPresenceAuthoringIdeScreen';

const ORDINARY_COPY_BOUNDARY_PATTERN =
  /\bcanvas\b|admin chrome|topbar compact|first work surface|first surface/i;

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
    function MonacoStub(props: { path?: string; value?: string }) {
      return (
        <div data-testid="monaco-editor-stub">
          {props.path}
          {props.value}
        </div>
      );
    },
}));

describe('PublicPresenceAuthoringIdeScreen', () => {
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
    expect(screen.getByTestId('ide-file-src/template.tsx')).toBeInTheDocument();
    expect(screen.getByTestId('ide-live-preview')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Validation checks' })[0]).toBeInTheDocument();
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
    fireEvent.click(screen.getAllByRole('button', { name: 'Files' })[0]);
    expect(screen.getByTestId('ide-file-src/component.tsx')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Desktop' })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Mobile' })[0]).toBeInTheDocument();
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
    await waitFor(() => {
      expect(document.activeElement).toBe(filesClose);
    });
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

    fireEvent.click(screen.getByTestId('ide-mobile-preview-options-button'));
    expect(screen.getByTestId('ide-mobile-preview-options-sheet')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(ORDINARY_COPY_BOUNDARY_PATTERN);
  });
});
