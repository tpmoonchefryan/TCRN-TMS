// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { publicApi, reportApi } from '@/lib/api/modules/content';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/api/core', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: vi.fn(),
    put: vi.fn(),
    delete: (...args: unknown[]) => mockDelete(...args),
    getAccessToken: vi.fn(),
  },
}));

describe('reportApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists report jobs with flattened query params', async () => {
    mockGet.mockResolvedValue({ success: true, data: { items: [], meta: { total: 0 } } });

    await reportApi.list('talent-1', 2, 50);

    expect(mockGet).toHaveBeenCalledWith('/api/v1/reports/mfr/jobs', {
      talentId: 'talent-1',
      page: 2,
      pageSize: 50,
    });
  });

  it('creates report jobs without dead web-only options fields', async () => {
    mockPost.mockResolvedValue({ success: true, data: { jobId: 'job-1' } });

    await reportApi.create({
      talentId: 'talent-1',
      filters: {
        platformCodes: ['bilibili'],
        includeExpired: true,
      },
      format: 'csv',
    });

    expect(mockPost).toHaveBeenCalledWith('/api/v1/reports/mfr/jobs', {
      talentId: 'talent-1',
      filters: {
        platformCodes: ['bilibili'],
        membershipClassCodes: undefined,
        membershipTypeCodes: undefined,
        membershipLevelCodes: undefined,
        statusCodes: undefined,
        validFromStart: undefined,
        validFromEnd: undefined,
        validToStart: undefined,
        validToEnd: undefined,
        includeExpired: true,
        includeInactive: undefined,
      },
      format: 'csv',
    });
  });

  it('posts typed report preview payloads unchanged', async () => {
    mockPost.mockResolvedValue({ success: true, data: { totalCount: 0, preview: [] } });

    await reportApi.search(
      'talent-1',
      {
        membershipClassCodes: ['annual'],
        includeInactive: true,
      },
      10,
    );

    expect(mockPost).toHaveBeenCalledWith('/api/v1/reports/mfr/search', {
      talentId: 'talent-1',
      filters: {
        membershipClassCodes: ['annual'],
        includeInactive: true,
      },
      previewLimit: 10,
    });
  });

  it('requests report status and download URLs with talent query params', async () => {
    mockGet.mockResolvedValue({ success: true, data: { id: 'job-1' } });

    await reportApi.getStatus('job-1', 'talent-1');
    await reportApi.getDownloadUrl('job-1', 'talent-1');

    expect(mockGet).toHaveBeenNthCalledWith(1, '/api/v1/reports/mfr/jobs/job-1', {
      talent_id: 'talent-1',
    });
    expect(mockGet).toHaveBeenNthCalledWith(2, '/api/v1/reports/mfr/jobs/job-1/download', {
      talent_id: 'talent-1',
    });
  });

  it('cancels report jobs through the current REST path', async () => {
    mockDelete.mockResolvedValue({ success: true, data: { id: 'job-1', status: 'cancelled' } });

    await reportApi.cancel('job-1', 'talent-1');

    expect(mockDelete).toHaveBeenCalledWith('/api/v1/reports/mfr/jobs/job-1?talent_id=talent-1');
  });
});

describe('publicApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests public marshmallow config through the current public route', async () => {
    mockGet.mockResolvedValue({ success: true, data: { title: 'Marshmallow' } });

    await publicApi.getMarshmallowConfig('talent-path');

    expect(mockGet).toHaveBeenCalledWith('/api/v1/public/marshmallow/talent-path/config');
  });

  it('requests public homepage data through the canonical public route', async () => {
    mockGet.mockResolvedValue({ success: true, data: { updatedAt: '2026-03-29T00:00:00.000Z' } });

    await publicApi.getHomepage('talent-path');

    expect(mockGet).toHaveBeenCalledWith('/api/v1/public/homepage/talent-path');
  });

  it('posts public marshmallow submit payloads unchanged', async () => {
    mockPost.mockResolvedValue({ success: true, data: { id: 'message-1', status: 'pending' } });

    await publicApi.submitMarshmallow('talent-path', {
      content: 'hello',
      isAnonymous: true,
      fingerprint: 'fp-1',
      turnstileToken: 'turnstile-1',
      socialLink: 'https://t.bilibili.com/1',
      selectedImageUrls: ['https://image.example/1.jpg'],
    });

    expect(mockPost).toHaveBeenCalledWith('/api/v1/public/marshmallow/talent-path/submit', {
      content: 'hello',
      isAnonymous: true,
      fingerprint: 'fp-1',
      turnstileToken: 'turnstile-1',
      socialLink: 'https://t.bilibili.com/1',
      selectedImageUrls: ['https://image.example/1.jpg'],
    });
  });

  it('serializes public message list params as the current query contract', async () => {
    mockGet.mockResolvedValue({ success: true, data: { messages: [], hasMore: false } });

    await publicApi.getPublicMessages('talent-path', '2026-03-29T00:00:00.000Z', 200, 'fp-1', true);

    expect(mockGet).toHaveBeenCalledWith('/api/v1/public/marshmallow/talent-path/messages', {
      cursor: '2026-03-29T00:00:00.000Z',
      limit: '200',
      fingerprint: 'fp-1',
      _t: expect.any(String),
    });
  });

  it('posts streamer and reaction actions to the public marshmallow routes', async () => {
    mockPost.mockResolvedValue({ success: true, data: { success: true } });

    await publicApi.markMarshmallowReadAuth('talent-path', 'message-1', 'sso-1');
    await publicApi.replyMarshmallowAuth('talent-path', 'message-1', 'reply body', 'sso-1');
    await publicApi.toggleMarshmallowReaction('message-1', '❤️', 'fp-1');

    expect(mockPost).toHaveBeenNthCalledWith(
      1,
      '/api/v1/public/marshmallow/talent-path/messages/message-1/mark-read-auth',
      { ssoToken: 'sso-1' },
    );
    expect(mockPost).toHaveBeenNthCalledWith(
      2,
      '/api/v1/public/marshmallow/talent-path/messages/message-1/reply-auth',
      { ssoToken: 'sso-1', content: 'reply body' },
    );
    expect(mockPost).toHaveBeenNthCalledWith(3, '/api/v1/public/marshmallow/messages/message-1/react', {
      reaction: '❤️',
      fingerprint: 'fp-1',
    });
  });
});
