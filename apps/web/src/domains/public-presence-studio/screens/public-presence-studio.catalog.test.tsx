import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ComponentStoreScreen,
  TemplateCenterScreen,
} from '@/domains/public-presence-studio/screens/public-presence-studio.catalog';

const mockRequest = vi.fn();

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

describe('public-presence-studio.catalog', () => {
  const blockedComponentStoreTerms =
    /protected behavior|editing range|Studio ready|Advanced handling|Component ID:|Live preview:|Editable fields:|typed destination rules|bounded controls|outside Studio editing|locked audio module|read-only|locked separator|locked spacing block|locked official updates feed/i;

  beforeEach(() => {
    mockRequest.mockReset();
    mockRequest.mockImplementation(async (path: string) => {
      if (path.endsWith('/authoring/templates')) {
        return [];
      }

      if (path.endsWith('/authoring/components')) {
        return [];
      }

      throw new Error(`Unhandled request: ${path}`);
    });
  });

  it('keeps template center copy operator-safe', () => {
    const { container } = render(
      <TemplateCenterScreen talentId="talent-1" tenantId="tenant-1" />,
    );

    expect(screen.getAllByText('Template Center').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Add new template' }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Inspect section order, compare launch use cases/i)).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(
      /registry|policy coverage|props schema|AI allowlist|renderer|Visual Mode|code-owned|governance/i,
    );
  });

  it('keeps component store copy operator-safe', () => {
    const { container } = render(
      <ComponentStoreScreen talentId="talent-1" tenantId="tenant-1" />,
    );

    expect(screen.getAllByText('Component Store').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Add new component' }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Browse fan-facing building blocks, compare their preview roles/i)).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(
      /registry|policy coverage|props schema|AI allowlist|renderer|Visual Mode|code-owned|governance/i,
    );
    expect(container.textContent).not.toMatch(
      /Studio handling|Handled from Advanced only|Studio editing ready|Advanced only|editing stops/i,
    );
    expect(container.textContent).not.toMatch(blockedComponentStoreTerms);

    fireEvent.click(screen.getByRole('button', { name: /Inspect: Social Links/i }));
    expect(screen.getByTestId('component-inspect-drawer')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(blockedComponentStoreTerms);
    expect(screen.getAllByRole('link', { name: /Use as starting point/i }).length).toBeGreaterThan(0);
  });

  it('keeps homepage surface switching compact so catalog content stays first-viewport oriented', () => {
    render(<TemplateCenterScreen talentId="talent-1" tenantId="tenant-1" />);

    const menu = screen.getByTestId('homepage-surface-menu');
    const toolbar = screen.getByTestId('template-center-topbar');
    expect(menu.textContent).not.toMatch(/Switch between live operations, templates, and components/i);
    expect(screen.getByRole('link', { name: 'Template Center' })).toBeInTheDocument();
    expect(toolbar).toHaveClass('sticky');
    expect(toolbar.textContent).not.toMatch(/Inspect section order, compare launch use cases/i);
  });

  it('keeps template inspect creator-readable and browse-first', () => {
    const { container } = render(
      <TemplateCenterScreen talentId="talent-1" tenantId="tenant-1" />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Inspect: Active Talent Hub/i }));

    const drawer = screen.getByTestId('template-inspect-drawer');
    expect(drawer.className).toContain('xl:max-h-[34rem]');
    expect(screen.getAllByRole('link', { name: /Use as starting point/i }).length).toBeGreaterThan(0);
    expect(screen.getByText('Opens the full Template IDE with this layout loaded as your starting point.')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/requiresOfficialChannels|requiresFirstEncounter|accentTone|campaignLabel/i);
  });

  it('keeps component inspect creator-readable and browse-first', () => {
    const { container } = render(
      <ComponentStoreScreen talentId="talent-1" tenantId="tenant-1" />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Inspect: Social Links/i }));

    const drawer = screen.getByTestId('component-inspect-drawer');
    expect(drawer.className).toContain('xl:max-h-[34rem]');
    expect(screen.getAllByRole('link', { name: /Use as starting point/i }).length).toBeGreaterThan(0);
    expect(screen.getByText('Opens the full Component IDE with this block loaded as your starting point.')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/componentType|validationRules|templateId/i);
  });

  it('surfaces durable authoring state in Template Center and Component Store', async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (path.endsWith('/authoring/templates')) {
        return [
          {
            artifactKind: 'template',
            artifactStatus: 'submitted',
            id: 'template-draft-1',
            lastSavedAt: '2026-05-21T01:05:00.000Z',
            lastValidatedAt: '2026-05-21T01:06:00.000Z',
            subjectKey: 'new',
            submittedAt: '2026-05-21T01:07:00.000Z',
            updatedAt: '2026-05-21T01:07:00.000Z',
            validationState: 'ready',
          },
        ];
      }

      if (path.endsWith('/authoring/components')) {
        return [
          {
            artifactKind: 'component',
            artifactStatus: 'validated',
            id: 'component-draft-1',
            lastSavedAt: '2026-05-21T01:08:00.000Z',
            lastValidatedAt: '2026-05-21T01:09:00.000Z',
            subjectKey: 'new',
            submittedAt: null,
            updatedAt: '2026-05-21T01:09:00.000Z',
            validationState: 'ready',
          },
        ];
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<TemplateCenterScreen talentId="talent-1" tenantId="tenant-1" />);
    expect(await screen.findByText('Recent draft activity')).toBeInTheDocument();
    expect(screen.getByText('New template draft')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open saved draft' })).toHaveAttribute(
      'href',
      '/studio/public-presence/tenant-1/talent-1/templates/new',
    );
    expect(screen.getByRole('link', { name: 'Create homepage from this draft' })).toHaveAttribute(
      'href',
      '/studio/public-presence/tenant-1/talent-1?templateId=activeTalentHub&templateDraftKey=new',
    );

    render(<ComponentStoreScreen talentId="talent-1" tenantId="tenant-1" />);
    await waitFor(() => {
      expect(screen.getAllByText('Recent draft activity').length).toBeGreaterThan(1);
    });
    expect(screen.getByText('New component draft')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start template from this block' })).toHaveAttribute(
      'href',
      '/studio/public-presence/tenant-1/talent-1/templates/new?componentDraftKey=new',
    );
  });
});
