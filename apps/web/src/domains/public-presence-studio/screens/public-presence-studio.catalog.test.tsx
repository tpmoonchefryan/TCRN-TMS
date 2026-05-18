import { render, screen } from '@testing-library/react';
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
  it('keeps template center copy operator-safe', () => {
    const { container } = render(
      <TemplateCenterScreen talentId="talent-1" tenantId="tenant-1" />,
    );

    expect(screen.getAllByText('Template Center').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Add Template' }).length).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(
      /registry|policy coverage|props schema|AI allowlist|renderer|Visual Mode|code-owned|governance/i,
    );
  });

  it('keeps component store copy operator-safe', () => {
    const { container } = render(
      <ComponentStoreScreen talentId="talent-1" tenantId="tenant-1" />,
    );

    expect(screen.getAllByText('Component Store').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Add Component' }).length).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(
      /registry|policy coverage|props schema|AI allowlist|renderer|Visual Mode|code-owned|governance/i,
    );
  });
});
