import { DEFAULT_THEME, normalizeTheme } from '@tcrn/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getHomepageEditorPreviewStorageKey,
  type HomepageEditorPreviewSnapshot,
} from '@/domains/homepage-management/screens/homepage-editor-preview-storage';
import { HomepageEditorPreviewScreen } from '@/domains/homepage-management/screens/HomepageEditorPreviewScreen';
import { RuntimeLocaleProvider } from '@/platform/runtime/locale/locale-provider';

const mockSearchParams = new URLSearchParams({ previewId: 'preview-1' });

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    session: {
      user: {
        preferredLanguage: 'en',
      },
    },
  }),
}));

function renderWithLocale(ui: ReactElement) {
  return render(<RuntimeLocaleProvider>{ui}</RuntimeLocaleProvider>);
}

const baseSnapshot: HomepageEditorPreviewSnapshot = {
  schemaVersion: 1,
  tenantId: 'tenant-1',
  talentId: 'talent-1',
  homepageUrl: 'https://app.example.com/p/sora',
  updatedAt: '2026-04-17T12:00:00.000Z',
  content: {
    version: '1.0',
    components: [
      {
        id: 'profile-1',
        type: 'ProfileCard',
        visible: true,
        order: 1,
        props: {
          displayName: 'Tokino Sora',
          bio: 'Live preview profile',
          avatarUrl: '',
          avatarShape: 'circle',
        },
      },
    ],
  },
  theme: normalizeTheme(DEFAULT_THEME),
  hero: {
    avatarUrl: null,
    description: null,
    displayName: 'Tokino Sora',
    timezone: null,
  },
};

describe('HomepageEditorPreviewScreen', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('loads the local live preview snapshot and reacts to storage updates', async () => {
    const storageKey = getHomepageEditorPreviewStorageKey('preview-1');
    window.localStorage.setItem(storageKey, JSON.stringify(baseSnapshot));

    renderWithLocale(<HomepageEditorPreviewScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: 'Live homepage preview' })).toBeInTheDocument();
    expect(screen.getAllByText('Tokino Sora').length).toBeGreaterThan(0);

    const updatedSnapshot = {
      ...baseSnapshot,
      hero: {
        ...baseSnapshot.hero,
        displayName: 'Updated Preview Sora',
      },
      content: {
        ...baseSnapshot.content,
        components: [
          {
            ...baseSnapshot.content.components[0],
            props: {
              ...baseSnapshot.content.components[0].props,
              displayName: 'Updated Preview Sora',
            },
          },
        ],
      },
    };

    window.localStorage.setItem(storageKey, JSON.stringify(updatedSnapshot));
    fireEvent(window, new StorageEvent('storage', { key: storageKey }));

    await waitFor(() => {
      expect(screen.getAllByText('Updated Preview Sora').length).toBeGreaterThan(0);
    });
  });

  it('shows an unavailable state when the local preview source is missing', async () => {
    renderWithLocale(<HomepageEditorPreviewScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByText('Live preview unavailable')).toBeInTheDocument();
  });
});
