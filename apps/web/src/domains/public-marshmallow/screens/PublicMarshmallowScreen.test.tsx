import { BROWSER_PUBLIC_CONSUMER_CODE, BROWSER_PUBLIC_CONSUMER_HEADER } from '@tcrn/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PublicMarshmallowScreen } from '@/domains/public-marshmallow/screens/PublicMarshmallowScreen';
import { RuntimeLocaleProvider } from '@/platform/runtime/locale/locale-provider';

const mockFetch = vi.fn();

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    session: null,
  }),
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function renderWithLocale(ui: ReactElement) {
  return render(<RuntimeLocaleProvider>{ui}</RuntimeLocaleProvider>);
}

describe('PublicMarshmallowScreen', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
    window.localStorage.clear();
    Object.defineProperty(window.navigator, 'language', {
      configurable: true,
      value: 'en-US',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads the public marshmallow workspace and submits a message when captcha is not required', async () => {
    let feedVersion = 0;

    mockFetch.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith('/api/v1/public/marshmallow/aki-mailbox/config')) {
        return jsonResponse({
          success: true,
          data: {
            talent: {
              displayName: 'Aki Rosenthal',
              avatarUrl: null,
            },
            title: 'Ask Aki',
            welcomeText: 'Leave your next question here.',
            placeholderText: 'Type your question',
            allowAnonymous: true,
            captchaMode: 'never',
            maxMessageLength: 500,
            minMessageLength: 5,
            reactionsEnabled: true,
            allowedReactions: ['heart'],
            theme: {
              accentColor: '#ec4899',
            },
            terms: {
              en: null,
              zh: null,
              ja: null,
            },
            privacy: {
              en: null,
              zh: null,
              ja: null,
            },
          },
        });
      }

      if (url.includes('/api/v1/public/marshmallow/aki-mailbox/messages')) {
        return jsonResponse({
          success: true,
          data: {
            messages:
              feedVersion === 0
                ? [
                    {
                      id: 'message-1',
                      content: 'What inspires your next stream theme?',
                      senderName: null,
                      isAnonymous: true,
                      isRead: false,
                      isStarred: false,
                      isPinned: false,
                      replyContent: null,
                      repliedAt: null,
                      repliedBy: null,
                      reactionCounts: {
                        heart: 1,
                      },
                      userReactions: [],
                      createdAt: '2026-04-17T12:00:00.000Z',
                      imageUrl: null,
                      imageUrls: [],
                    },
                  ]
                : [
                    {
                      id: 'message-2',
                      content: 'Will there be a karaoke this weekend?',
                      senderName: null,
                      isAnonymous: true,
                      isRead: false,
                      isStarred: false,
                      isPinned: false,
                      replyContent: null,
                      repliedAt: null,
                      repliedBy: null,
                      reactionCounts: {},
                      userReactions: [],
                      createdAt: '2026-04-17T13:00:00.000Z',
                      imageUrl: null,
                      imageUrls: [],
                    },
                  ],
            cursor: null,
            hasMore: false,
          },
        });
      }

      if (url.endsWith('/api/v1/public/marshmallow/aki-mailbox/submit') && init?.method === 'POST') {
        feedVersion = 1;
        return jsonResponse({
          success: true,
          data: {
            id: 'message-2',
            status: 'pending',
            message: 'Question received.',
          },
        });
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    renderWithLocale(<PublicMarshmallowScreen path="aki-mailbox" turnstileSiteKey="" />);

    expect(await screen.findByRole('heading', { name: 'Ask Aki' })).toBeInTheDocument();
    expect(screen.getByText('Public Marshmallow')).toBeInTheDocument();
    expect(screen.getByText('What inspires your next stream theme?')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Message'), {
      target: {
        value: 'Will there be a karaoke this weekend?',
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('Question received.')).toBeInTheDocument();
    expect(await screen.findByText('Will there be a karaoke this weekend?')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/public/marshmallow/aki-mailbox/submit',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });

    const headers = new Headers(
      mockFetch.mock.calls.find((call) => call[0] === '/api/v1/public/marshmallow/aki-mailbox/submit')?.[1]?.headers,
    );
    expect(headers.get(BROWSER_PUBLIC_CONSUMER_HEADER)).toBe(BROWSER_PUBLIC_CONSUMER_CODE);
  });

  it('shows the unavailable state when the public marshmallow page is not reachable', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(
        {
          success: false,
          error: {
            code: 'RES_NOT_FOUND',
            message: 'Page not found',
          },
        },
        404,
      ),
    );
    mockFetch.mockResolvedValueOnce(
      jsonResponse(
        {
          success: false,
          error: {
            code: 'RES_NOT_FOUND',
            message: 'Page not found',
          },
        },
        404,
      ),
    );

    renderWithLocale(<PublicMarshmallowScreen path="missing-mailbox" turnstileSiteKey="" />);

    expect(await screen.findByText('Public marshmallow unavailable')).toBeInTheDocument();
    expect(screen.getByText('Page not found')).toBeInTheDocument();
  });

  it('uses runtime locale copy for unavailable public marshmallow states', async () => {
    Object.defineProperty(window.navigator, 'language', {
      configurable: true,
      value: 'zh-CN',
    });

    mockFetch.mockResolvedValueOnce(
      jsonResponse(
        {
          success: false,
          error: {
            code: 'RES_NOT_FOUND',
            message: '',
          },
        },
        404,
      ),
    );
    mockFetch.mockResolvedValueOnce(
      jsonResponse(
        {
          success: false,
          error: {
            code: 'RES_NOT_FOUND',
            message: '',
          },
        },
        404,
      ),
    );

    renderWithLocale(<PublicMarshmallowScreen path="missing-mailbox" turnstileSiteKey="" />);

    expect(await screen.findByText('公开棉花糖不可用')).toBeInTheDocument();
    expect(screen.getByText('当前公开棉花糖页面尚未发布、未启用，或暂时不可达。')).toBeInTheDocument();
  });

  it('selects locale-aware runtime copy and legal fallback content', async () => {
    Object.defineProperty(window.navigator, 'language', {
      configurable: true,
      value: 'ja-JP',
    });

    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith('/api/v1/public/marshmallow/aki-mailbox/config')) {
        return jsonResponse({
          success: true,
          data: {
            talent: {
              displayName: 'Aki Rosenthal',
              avatarUrl: null,
            },
            title: null,
            welcomeText: '',
            placeholderText: null,
            allowAnonymous: false,
            captchaMode: 'auto',
            maxMessageLength: 500,
            minMessageLength: 5,
            reactionsEnabled: false,
            allowedReactions: [],
            theme: {
              accentColor: '#ec4899',
            },
            terms: {
              en: 'English terms fallback',
              zh: null,
              ja: null,
            },
            privacy: {
              en: null,
              zh: null,
              ja: '日本語のプライバシー',
            },
          },
        });
      }

      if (url.includes('/api/v1/public/marshmallow/aki-mailbox/messages')) {
        return jsonResponse({
          success: true,
          data: {
            messages: [],
            cursor: null,
            hasMore: false,
          },
        });
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    renderWithLocale(<PublicMarshmallowScreen path="aki-mailbox" turnstileSiteKey="" />);

    expect(await screen.findByRole('heading', { name: 'Aki Rosenthal マシュマロ' })).toBeInTheDocument();
    expect(screen.getByText('公開マシュマロ')).toBeInTheDocument();
    expect(screen.getByText('記名投稿のみ')).toBeInTheDocument();
    expect(screen.getByText('CAPTCHA モード: 自動')).toBeInTheDocument();
    expect(screen.getByText('利用規約')).toBeInTheDocument();
    expect(screen.getByText('English terms fallback')).toBeInTheDocument();
    expect(screen.getByText('プライバシー')).toBeInTheDocument();
    expect(screen.getByText('日本語のプライバシー')).toBeInTheDocument();
    expect(screen.getByText('公開メッセージはまだありません')).toBeInTheDocument();
  });

  it('uses exact ko runtime helper copy instead of falling back to English', async () => {
    Object.defineProperty(window.navigator, 'language', {
      configurable: true,
      value: 'ko-KR',
    });

    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith('/api/v1/public/marshmallow/aki-mailbox/config')) {
        return jsonResponse({
          success: true,
          data: {
            talent: {
              displayName: 'Aki Rosenthal',
              avatarUrl: null,
            },
            title: null,
            welcomeText: '',
            placeholderText: null,
            allowAnonymous: true,
            captchaMode: 'never',
            maxMessageLength: 500,
            minMessageLength: 5,
            reactionsEnabled: false,
            allowedReactions: [],
            theme: {
              accentColor: '#ec4899',
            },
            terms: {
              en: 'English terms fallback',
              zh: null,
              ja: null,
            },
            privacy: {
              en: null,
              zh: null,
              ja: null,
            },
          },
        });
      }

      if (url.includes('/api/v1/public/marshmallow/aki-mailbox/messages')) {
        return jsonResponse({
          success: true,
          data: {
            messages: [
              {
                id: 'message-1',
                content: '한국어 메시지입니다.',
                senderName: null,
                isAnonymous: true,
                isRead: false,
                isStarred: false,
                isPinned: false,
                replyContent: null,
                repliedAt: null,
                repliedBy: null,
                reactionCounts: {},
                userReactions: [],
                createdAt: '2026-04-17T12:00:00.000Z',
                imageUrl: null,
                imageUrls: [],
              },
            ],
            cursor: null,
            hasMore: false,
          },
        });
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    renderWithLocale(<PublicMarshmallowScreen path="aki-mailbox" turnstileSiteKey="" />);

    expect(await screen.findByText('공개 마시멜로')).toBeInTheDocument();
    expect(screen.getByText('메시지 1개 로드됨')).toBeInTheDocument();
    expect(screen.getByText('현재 1개 표시 중')).toBeInTheDocument();
    expect(screen.getByText('English terms fallback')).toBeInTheDocument();
  });
});
