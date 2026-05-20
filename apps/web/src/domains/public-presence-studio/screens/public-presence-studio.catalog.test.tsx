import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  ComponentStoreScreen,
  TemplateCenterScreen,
} from '@/domains/public-presence-studio/screens/public-presence-studio.catalog';

vi.mock('@/platform/runtime/locale/locale-provider', () => ({
  useUiLocale: () => ({
    locale: 'en',
  }),
}));

describe('public-presence-studio.catalog', () => {
  const blockedComponentStoreTerms =
    /protected behavior|editing range|Studio ready|Advanced handling|Component ID:|Live preview:|Editable fields:|typed destination rules|bounded controls|outside Studio editing|locked audio module|read-only|locked separator|locked spacing block|locked official updates feed/i;

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
});
