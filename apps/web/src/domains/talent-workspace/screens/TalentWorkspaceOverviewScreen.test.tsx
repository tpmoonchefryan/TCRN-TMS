import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TalentWorkspaceOverviewScreen } from '@/domains/talent-workspace/screens/TalentWorkspaceOverviewScreen';

vi.mock('@/platform/runtime/locale/locale-provider', () => ({
  useRuntimeLocale: () => ({
    currentLocale: 'en',
  }),
}));

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    request: vi.fn(),
    session: {
      tenantName: 'tenant-1',
    },
  }),
}));

vi.mock('@/domains/config-dictionary-settings/api/settings.api', () => ({
  readTalentDetail: vi.fn().mockResolvedValue({
    displayName: 'talent-1',
    homepagePath: 'talent-1-home',
  }),
}));

describe('TalentWorkspaceOverviewScreen', () => {
  it('renders the talent business launch surface with module routes and a governance entry', async () => {
    render(<TalentWorkspaceOverviewScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: 'talent-1' })).toBeInTheDocument();
    expect(screen.getByText('tenant-1')).toBeInTheDocument();
    expect((await screen.findAllByText('talent-1')).length).toBeGreaterThan(0);

    expect(await screen.findByRole('link', { name: /Customer Management/i })).toHaveAttribute(
      'href',
      '/tenant/tenant-1/talent/talent-1/customers',
    );
    expect(screen.getByRole('link', { name: /Homepage Management/i })).toHaveAttribute(
      'href',
      '/tenant/tenant-1/talent/talent-1/homepage',
    );
    expect(screen.getByRole('link', { name: /Marshmallow Management/i })).toHaveAttribute(
      'href',
      '/tenant/tenant-1/talent/talent-1/marshmallow',
    );
    expect(screen.getByRole('link', { name: /^Reports/i })).toHaveAttribute(
      'href',
      '/tenant/tenant-1/talent/talent-1/reports',
    );
    expect(screen.getByRole('link', { name: 'Open organization structure' })).toHaveAttribute(
      'href',
      '/tenant/tenant-1/organization-structure',
    );
  });
});
