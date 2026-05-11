import { DEFAULT_THEME } from '@tcrn/shared';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { HomepagePuckBlockPreview } from '@/domains/homepage-management/editor/puck/HomepagePuckBlockPreview';
import { RuntimeLocaleProvider } from '@/platform/runtime/locale/locale-provider';

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    session: null,
  }),
}));

function renderWithLocale(ui: ReactElement) {
  return render(<RuntimeLocaleProvider>{ui}</RuntimeLocaleProvider>);
}

describe('HomepagePuckBlockPreview', () => {
  it('renders a single block preview without the public homepage hero or statistics shell', () => {
    renderWithLocale(
      <HomepagePuckBlockPreview
        type="LinkButton"
        props={{
          id: 'link-1',
          visible: true,
          label: 'Visit store',
          url: 'https://example.com/store',
        }}
        theme={DEFAULT_THEME}
      />,
    );

    expect(screen.getByRole('link', { name: 'Visit store' })).toHaveAttribute(
      'href',
      'https://example.com/store',
    );
    expect(screen.queryByText('公开主页')).not.toBeInTheDocument();
    expect(screen.queryByText(/更新时间/)).not.toBeInTheDocument();
    expect(screen.queryByText(/已发布区块/)).not.toBeInTheDocument();
  });

  it('keeps empty blocks visible in the editor preview', () => {
    renderWithLocale(
      <HomepagePuckBlockPreview
        type="ImageGallery"
        props={{
          id: 'gallery-1',
          visible: true,
          images: [],
        }}
        theme={DEFAULT_THEME}
      />,
    );

    expect(screen.getByText('Image Gallery')).toBeInTheDocument();
    expect(screen.getByText('Add at least one image URL to preview this gallery.')).toBeInTheDocument();
  });

  it('shows block-specific empty state guidance for profile cards', () => {
    renderWithLocale(
      <HomepagePuckBlockPreview
        type="ProfileCard"
        props={{
          id: 'profile-1',
          visible: true,
          avatarUrl: '',
          bio: '',
          displayName: '',
        }}
        theme={DEFAULT_THEME}
      />,
    );

    expect(screen.getByText('Profile Card')).toBeInTheDocument();
    expect(screen.getByText('Add a display name, avatar, or bio to preview this profile card.')).toBeInTheDocument();
  });
});
