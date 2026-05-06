import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MarshmallowManagementScreen } from '@/domains/marshmallow-management/screens/MarshmallowManagementScreen';

const mockRequest = vi.fn();
const openSpy = vi.fn();
const replace = vi.fn();
let pathname = '/tenant/tenant-1/talent/talent-1/marshmallow';
let currentSearch = '';
const localeState = {
  currentLocale: 'en' as 'en' | 'zh' | 'ja',
  selectedLocale: 'en',
};

HTMLDialogElement.prototype.showModal = vi.fn(function mockShowModal(this: HTMLDialogElement) {
  this.setAttribute('open', '');
});
HTMLDialogElement.prototype.close = vi.fn(function mockClose(this: HTMLDialogElement) {
  this.removeAttribute('open');
});

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    request: mockRequest,
    session: {
      tenantName: 'Test Tenant',
    },
  }),
}));

vi.mock('@/platform/runtime/locale/locale-provider', () => ({
  useRuntimeLocale: () => localeState,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({
    replace,
  }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

function buildConfig(version = 3) {
  return {
    id: 'config-1',
    talentId: 'talent-1',
    isEnabled: true,
    title: 'Aki Mailbox',
    welcomeText: 'Leave your message here.',
    placeholderText: 'Write your message...',
    thankYouText: 'Thanks for your message!',
    allowAnonymous: true,
    captchaMode: 'auto',
    moderationEnabled: true,
    autoApprove: false,
    profanityFilterEnabled: true,
    externalBlocklistEnabled: true,
    maxMessageLength: 500,
    minMessageLength: 1,
    rateLimitPerIp: 5,
    rateLimitWindowHours: 1,
    reactionsEnabled: true,
    allowedReactions: ['heart', 'star'],
    theme: {},
    avatarUrl: null,
    termsContentEn: null,
    termsContentZh: null,
    termsContentJa: null,
    privacyContentEn: null,
    privacyContentZh: null,
    privacyContentJa: null,
    stats: {
      totalMessages: 12,
      pendingCount: 3,
      approvedCount: 7,
      rejectedCount: 2,
      unreadCount: 4,
    },
    marshmallowUrl: 'https://app.example.com/m/aki-mailbox',
    createdAt: '2026-04-17T09:00:00.000Z',
    updatedAt: '2026-04-17T10:00:00.000Z',
    version,
  };
}

describe('MarshmallowManagementScreen', () => {
  beforeEach(() => {
    mockRequest.mockReset();
    openSpy.mockReset();
    replace.mockReset();
    localeState.currentLocale = 'en';
    localeState.selectedLocale = 'en';
    pathname = '/tenant/tenant-1/talent/talent-1/marshmallow';
    currentSearch = '';
    replace.mockImplementation((href: string) => {
      const resolved = new URL(href, 'https://tcrn.local');
      pathname = resolved.pathname;
      currentSearch = resolved.search.startsWith('?') ? resolved.search.slice(1) : resolved.search;
    });
    vi.stubGlobal('open', openSpy);
  });

  it('loads the moderation workspace and applies message filters', async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/talents/talent-1/marshmallow/config') {
        return buildConfig();
      }

      if (path === '/api/v1/talents/talent-1/marshmallow/messages?page=1&pageSize=20') {
        return {
          items: [
            {
              id: 'message-1',
              content: 'Happy birthday!',
              senderName: 'Fan A',
              isAnonymous: false,
              status: 'pending',
              rejectionReason: null,
              isRead: false,
              isStarred: false,
              isPinned: false,
              replyContent: null,
              repliedAt: null,
              repliedBy: null,
              reactionCounts: {},
              profanityFlags: [],
              imageUrl: null,
              imageUrls: [],
              socialLink: null,
              createdAt: '2026-04-17T10:00:00.000Z',
            },
          ],
          meta: {
            total: 1,
            stats: {
              pendingCount: 1,
              approvedCount: 0,
              rejectedCount: 0,
              unreadCount: 1,
            },
          },
        };
      }

      if (path === '/api/v1/talents/talent-1/marshmallow/messages?page=1&pageSize=20&status=approved') {
        return {
          items: [
            {
              id: 'message-2',
              content: 'Approved note',
              senderName: 'Fan B',
              isAnonymous: false,
              status: 'approved',
              rejectionReason: null,
              isRead: true,
              isStarred: true,
              isPinned: false,
              replyContent: 'Thanks!',
              repliedAt: '2026-04-17T10:10:00.000Z',
              repliedBy: {
                id: 'user-1',
                username: 'moderator',
              },
              reactionCounts: {
                heart: 2,
              },
              profanityFlags: [],
              imageUrl: null,
              imageUrls: [],
              socialLink: null,
              createdAt: '2026-04-17T10:05:00.000Z',
            },
          ],
          meta: {
            total: 1,
            stats: {
              pendingCount: 0,
              approvedCount: 1,
              rejectedCount: 0,
              unreadCount: 0,
            },
          },
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<MarshmallowManagementScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: 'Marshmallow Management' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Moderation Queue' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Configuration' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Export' })).toBeInTheDocument();
    expect(await screen.findByText('Happy birthday!')).toBeInTheDocument();
    expect(screen.queryByLabelText('Enable public marshmallow route')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /routing in settings/i })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Message status filter'), {
      target: { value: 'approved' },
    });

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/talents/talent-1/marshmallow/messages?page=1&pageSize=20&status=approved',
      );
    });

    expect(await screen.findByText('Approved note')).toBeInTheDocument();
    expect(screen.queryByText('Happy birthday!')).not.toBeInTheDocument();
  });

  it('hydrates moderation filters from the URL and keeps reply changes shareable', async () => {
    currentSearch = 'keyword=fan&status=approved&reply=replied&page=2&pageSize=50';

    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/talents/talent-1/marshmallow/config') {
        return buildConfig();
      }

      if (path === '/api/v1/talents/talent-1/marshmallow/messages?page=2&pageSize=50&status=approved&keyword=fan&hasReply=true') {
        return {
          items: [
            {
              id: 'message-2',
              content: 'Approved fan note',
              senderName: 'Fan B',
              isAnonymous: false,
              status: 'approved',
              rejectionReason: null,
              isRead: true,
              isStarred: true,
              isPinned: false,
              replyContent: 'Thanks!',
              repliedAt: '2026-04-17T10:10:00.000Z',
              repliedBy: {
                id: 'user-1',
                username: 'moderator',
              },
              reactionCounts: {
                heart: 2,
              },
              profanityFlags: [],
              imageUrl: null,
              imageUrls: [],
              socialLink: null,
              createdAt: '2026-04-17T10:05:00.000Z',
            },
          ],
          meta: {
            total: 51,
            stats: {
              pendingCount: 0,
              approvedCount: 51,
              rejectedCount: 0,
              unreadCount: 0,
            },
          },
        };
      }

      if (path === '/api/v1/talents/talent-1/marshmallow/messages?page=1&pageSize=50&status=approved&keyword=fan&hasReply=false') {
        return {
          items: [
            {
              id: 'message-3',
              content: 'Needs reply',
              senderName: 'Fan C',
              isAnonymous: false,
              status: 'approved',
              rejectionReason: null,
              isRead: false,
              isStarred: false,
              isPinned: false,
              replyContent: null,
              repliedAt: null,
              repliedBy: null,
              reactionCounts: {},
              profanityFlags: [],
              imageUrl: null,
              imageUrls: [],
              socialLink: null,
              createdAt: '2026-04-17T10:20:00.000Z',
            },
          ],
          meta: {
            total: 1,
            stats: {
              pendingCount: 0,
              approvedCount: 1,
              rejectedCount: 0,
              unreadCount: 1,
            },
          },
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<MarshmallowManagementScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByText('Approved fan note')).toBeInTheDocument();
    expect(screen.getByLabelText('Keyword search')).toHaveValue('fan');
    expect(screen.getByLabelText('Message status filter')).toHaveValue('approved');
    expect(screen.getByLabelText('Reply state')).toHaveValue('replied');

    fireEvent.change(screen.getByLabelText('Reply state'), {
      target: { value: 'unreplied' },
    });

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/talents/talent-1/marshmallow/messages?page=1&pageSize=50&status=approved&keyword=fan&hasReply=false',
      );
      expect(replace).toHaveBeenCalledWith(
        '/tenant/tenant-1/talent/talent-1/marshmallow?keyword=fan&status=approved&reply=unreplied&pageSize=50',
      );
    });

    expect(await screen.findByText('Needs reply')).toBeInTheDocument();
  });

  it('saves config updates and moderates messages through the shared confirm dialog', async () => {
    let approved = false;
    let configVersion = 3;

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/talents/talent-1/marshmallow/config' && !init) {
        return buildConfig(configVersion);
      }

      if (path === '/api/v1/talents/talent-1/marshmallow/config' && init?.method === 'PATCH') {
        configVersion += 1;
        return {
          ...buildConfig(configVersion),
          title: 'Updated Mailbox',
        };
      }

      if (path === '/api/v1/talents/talent-1/marshmallow/messages?page=1&pageSize=20') {
        return {
          items: [
            {
              id: 'message-1',
              content: 'Moderate me',
              senderName: 'Fan A',
              isAnonymous: false,
              status: approved ? 'approved' : 'pending',
              rejectionReason: null,
              isRead: false,
              isStarred: false,
              isPinned: false,
              replyContent: null,
              repliedAt: null,
              repliedBy: null,
              reactionCounts: {},
              profanityFlags: [],
              imageUrl: null,
              imageUrls: [],
              socialLink: null,
              createdAt: '2026-04-17T10:00:00.000Z',
            },
          ],
          meta: {
            total: 1,
            stats: {
              pendingCount: approved ? 0 : 1,
              approvedCount: approved ? 1 : 0,
              rejectedCount: 0,
              unreadCount: 1,
            },
          },
        };
      }

      if (path === '/api/v1/talents/talent-1/marshmallow/messages/message-1/approve' && init?.method === 'POST') {
        approved = true;
        return {
          id: 'message-1',
          status: 'approved',
          moderatedAt: '2026-04-17T10:05:00.000Z',
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<MarshmallowManagementScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: 'Marshmallow Management' })).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Aki Mailbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Configure mailbox' }));
    expect(await screen.findByDisplayValue('Aki Mailbox')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Updated Mailbox' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save marshmallow config' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/talents/talent-1/marshmallow/config',
        expect.objectContaining({
          method: 'PATCH',
        }),
      );
    });

    expect(await screen.findByText('Marshmallow configuration saved.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Approve message-1' }));

    expect(await screen.findByText('Approve this message?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/talents/talent-1/marshmallow/messages/message-1/approve',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });

    expect(await screen.findByText('Marshmallow message approved.')).toBeInTheDocument();
    expect((await screen.findAllByText('Approved')).length).toBeGreaterThan(0);
  });

  it('creates a marshmallow export job and downloads it once ready', async () => {
    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/talents/talent-1/marshmallow/config') {
        return buildConfig();
      }

      if (path === '/api/v1/talents/talent-1/marshmallow/messages?page=1&pageSize=20') {
        return {
          items: [],
          meta: {
            total: 0,
            stats: {
              pendingCount: 0,
              approvedCount: 0,
              rejectedCount: 0,
              unreadCount: 0,
            },
          },
        };
      }

      if (path === '/api/v1/talents/talent-1/marshmallow/export' && init?.method === 'POST') {
        return {
          jobId: 'export-1',
          status: 'pending',
        };
      }

      if (path === '/api/v1/talents/talent-1/marshmallow/export/export-1') {
        return {
          id: 'export-1',
          status: 'success',
          format: 'xlsx',
          fileName: 'marshmallow-export.xlsx',
          totalRecords: 42,
          processedRecords: 42,
          downloadUrl: 'https://files.example.com/marshmallow-export.xlsx',
          expiresAt: '2026-04-18T10:00:00.000Z',
          createdAt: '2026-04-17T10:00:00.000Z',
          completedAt: '2026-04-17T10:01:00.000Z',
        };
      }

      if (path === '/api/v1/talents/talent-1/marshmallow/export/export-1/download') {
        return {
          url: 'https://files.example.com/marshmallow-export.xlsx',
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<MarshmallowManagementScreen tenantId="tenant-1" talentId="talent-1" />);

    fireEvent.click(await screen.findByRole('tab', { name: 'Export' }));
    expect(await screen.findByText('No export job created in this session')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create export job' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/talents/talent-1/marshmallow/export',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });

    expect(await screen.findByText('marshmallow-export.xlsx')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Download marshmallow export' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith('/api/v1/talents/talent-1/marshmallow/export/export-1/download');
    });

    expect(openSpy).toHaveBeenCalledWith('https://files.example.com/marshmallow-export.xlsx', '_blank', 'noopener,noreferrer');
  });
});
