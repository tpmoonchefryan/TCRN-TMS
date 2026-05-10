import { DEFAULT_THEME } from '@tcrn/shared';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type PublicHomepageContent } from '@/domains/public-homepage/api/public-homepage.api';
import { PublicHomepageRenderer } from '@/domains/public-homepage/components/PublicHomepageRenderer';
import { RuntimeLocaleProvider } from '@/platform/runtime/locale/locale-provider';

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    session: null,
  }),
}));

function renderWithLocale(ui: ReactElement) {
  return render(<RuntimeLocaleProvider>{ui}</RuntimeLocaleProvider>);
}

describe('PublicHomepageRenderer', () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, 'language', {
      configurable: true,
      value: 'zh-CN',
    });
  });

  it('uses runtime locale copy for public fallback labels and helper text', () => {
    const content: PublicHomepageContent = {
      version: '1.0',
      components: [
        {
          id: 'link-1',
          type: 'LinkButton',
          visible: true,
          order: 1,
          props: {
            label: '',
            url: 'https://example.com',
          },
        },
        {
          id: 'schedule-1',
          type: 'Schedule',
          visible: true,
          order: 2,
          props: {
            title: '',
            events: [],
          },
        },
        {
          id: 'live-1',
          type: 'LiveStatus',
          visible: true,
          order: 3,
          props: {
            isLive: false,
            viewers: '128',
            streamUrl: 'https://example.com/live',
          },
        },
        {
          id: 'bili-1',
          type: 'BilibiliDynamic',
          visible: true,
          order: 4,
          props: {
            title: '',
            uid: '123456',
          },
        },
      ],
    };

    renderWithLocale(
      <PublicHomepageRenderer
        content={content}
        theme={DEFAULT_THEME}
        updatedAt="2026-04-17T12:00:00.000Z"
        hero={{
          displayName: '星野ルナ',
          avatarUrl: null,
          timezone: 'Asia/Shanghai',
          description: null,
        }}
      />,
    );

    expect(screen.getByText('公开主页')).toBeInTheDocument();
    expect(screen.queryByText(/更新时间/)).not.toBeInTheDocument();
    expect(screen.queryByText(/已发布区块/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '打开链接' })).toHaveAttribute('href', 'https://example.com');
    expect(screen.getByText('当前还没有已发布的公开日程。')).toBeInTheDocument();
    expect(screen.getByText('当前离线')).toBeInTheDocument();
    expect(screen.getByText('128 人正在观看')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '打开直播' })).toHaveAttribute('href', 'https://example.com/live');
    expect(screen.getByText('B站动态')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '查看 B 站动态' })).toHaveAttribute(
      'href',
      'https://space.bilibili.com/123456/dynamic',
    );
  });

  it('renders exact zh_HANT hero copy without reviving removed public stats', () => {
    Object.defineProperty(window.navigator, 'language', {
      configurable: true,
      value: 'zh-HK',
    });

    const content: PublicHomepageContent = {
      version: '1.0',
      components: [],
    };

    renderWithLocale(
      <PublicHomepageRenderer
        content={content}
        theme={DEFAULT_THEME}
        updatedAt="2026-04-17T12:00:00.000Z"
        hero={{
          displayName: '星街すいせい',
          avatarUrl: null,
          timezone: 'Asia/Tokyo',
          description: null,
        }}
      />,
    );

    expect(screen.getByText('公開主頁')).toBeInTheDocument();
    expect(screen.getByText('時區: Asia/Tokyo')).toBeInTheDocument();
    expect(screen.queryByText(/已發佈區塊/)).not.toBeInTheDocument();
  });

  it('applies bounded layout wrapper styles to supported components', () => {
    const content: PublicHomepageContent = {
      version: '1.0',
      components: [
        {
          id: 'profile-layout-1',
          type: 'ProfileCard',
          visible: true,
          order: 1,
          props: {
            displayName: 'Layout Proof',
            bio: 'Bounded layout should flow through the public renderer.',
            layoutMode: 'row',
            gapToken: 'lg',
            widthPreset: 'custom',
            customWidthPx: 1300,
            heightPreset: 'custom',
            customHeightPx: 180,
          },
        },
      ],
    };

    const { container } = renderWithLocale(
      <PublicHomepageRenderer
        content={content}
        theme={DEFAULT_THEME}
        updatedAt="2026-04-17T12:00:00.000Z"
        hero={{
          displayName: 'Layout Proof',
          avatarUrl: null,
          timezone: 'Asia/Shanghai',
          description: 'Preview layout contract',
        }}
      />,
    );

    expect(screen.getByText('Bounded layout should flow through the public renderer.')).toBeInTheDocument();
    const wrapper = container.querySelector('[style*="max-width: 1300px"][style*="min-height: 180px"]');
    expect(wrapper).toHaveStyle({
      maxWidth: '1300px',
      minHeight: '180px',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '24px',
    });
  });
});
