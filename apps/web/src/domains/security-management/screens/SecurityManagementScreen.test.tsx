import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SecurityManagementScreen } from '@/domains/security-management/screens/SecurityManagementScreen';

const mockRequest = vi.fn();
const mockRequestEnvelope = vi.fn();
const mockReplace = vi.fn();
let searchQuery = 'tab=external-blocklist&scopeType=subsidiary&scopeId=sub-1';
const localeState = {
  currentLocale: 'en' as 'en' | 'zh' | 'ja',
  selectedLocale: 'en',
};
const organizationTreeResponse = {
  tenantId: 'tenant-1',
  directTalents: [
    {
      id: 'talent-root-1',
      code: 'ROOT',
      displayName: 'Root Talent',
      avatarUrl: null,
      subsidiaryId: null,
      subsidiaryName: null,
      path: 'root-talent',
      homepagePath: 'root-talent',
      lifecycleStatus: 'published' as const,
      publishedAt: '2026-04-17T10:00:00.000Z',
      isActive: true,
    },
  ],
  subsidiaries: [
    {
      id: 'sub-1',
      code: 'SUB_1',
      displayName: 'North Division',
      parentId: null,
      path: 'north',
      talents: [
        {
          id: 'talent-1',
          code: 'TALENT_1',
          displayName: 'Talent One',
          avatarUrl: null,
          subsidiaryId: 'sub-1',
          subsidiaryName: 'North Division',
          path: 'talent-one',
          homepagePath: 'talent-one',
          lifecycleStatus: 'published' as const,
          publishedAt: '2026-04-17T10:00:00.000Z',
          isActive: true,
        },
      ],
      children: [],
    },
  ],
};

HTMLDialogElement.prototype.showModal = vi.fn(function mockShowModal(this: HTMLDialogElement) {
  this.setAttribute('open', '');
});
HTMLDialogElement.prototype.close = vi.fn(function mockClose(this: HTMLDialogElement) {
  this.removeAttribute('open');
});

vi.mock('next/navigation', () => ({
  usePathname: () => '/tenant/tenant-1/security',
  useRouter: () => ({
    replace: mockReplace,
  }),
  useSearchParams: () => new URLSearchParams(searchQuery),
}));

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    request: mockRequest,
    requestEnvelope: mockRequestEnvelope,
    session: {
      tenantName: 'Moonshot Tenant',
    },
  }),
}));

vi.mock('@/platform/runtime/locale/locale-provider', () => ({
  useRuntimeLocale: () => localeState,
}));

describe('SecurityManagementScreen', () => {
  beforeEach(() => {
    searchQuery = 'tab=external-blocklist&scopeType=subsidiary&scopeId=sub-1';
    localeState.currentLocale = 'en';
    localeState.selectedLocale = 'en';
    mockReplace.mockReset();
    mockRequest.mockReset();
    mockRequestEnvelope.mockReset();
  });

  it('creates a blocklist rule with managed translations from the translation drawer', async () => {
    searchQuery = 'tab=blocklist&scopeType=tenant';

    let createdPayload: Record<string, unknown> | null = null;
    let blocklistItems: Array<Record<string, unknown>> = [];

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/system-dictionary') {
        return [
          {
            type: 'language',
            name: 'Language',
            description: null,
            count: 2,
          },
        ];
      }

      if (path === '/api/v1/organization/tree?includeInactive=true') {
        return organizationTreeResponse;
      }

      if (path.startsWith('/api/v1/blocklist-entries?')) {
        return {
          items: blocklistItems,
          meta: { total: blocklistItems.length },
        };
      }

      if (path === '/api/v1/blocklist-entries' && init?.method === 'POST') {
        createdPayload = JSON.parse(String(init.body));
        blocklistItems = [
          {
            id: 'entry-1',
            ownerType: 'tenant',
            ownerId: null,
            pattern: 'badword',
            patternType: 'keyword',
            nameEn: 'Profanity rule',
            nameZh: '敏感词规则',
            nameJa: null,
            translations: {
              en: 'Profanity rule',
              zh_HANS: '敏感词规则',
              ko: '비속어 규칙',
            },
            description: null,
            category: 'profanity',
            severity: 'medium',
            action: 'reject',
            replacement: '***',
            scope: ['marshmallow'],
            inherit: true,
            sortOrder: 0,
            isActive: true,
            isForceUse: false,
            isSystem: false,
            matchCount: 0,
            lastMatchedAt: null,
            createdAt: '2026-04-20T10:00:00.000Z',
            createdBy: 'user-1',
            updatedAt: '2026-04-20T10:00:00.000Z',
            updatedBy: 'user-1',
            version: 1,
          },
        ];

        return blocklistItems[0];
      }

      if (path === '/api/v1/ip-access-rules?page=1&pageSize=20') {
        return {
          items: [],
          meta: { total: 0 },
        };
      }

      if (path === '/api/v1/security/fingerprint' && init?.method === 'POST') {
        return {
          fingerprint: 'tenant-user-fingerprint',
          shortFingerprint: 'abc123',
          version: 'v1',
          generatedAt: '2026-04-17T10:00:00.000Z',
        };
      }

      if (path === '/api/v1/rate-limit/stats') {
        return {
          summary: {
            totalRequests24h: 0,
            blockedRequests24h: 0,
            uniqueIPs24h: 0,
            currentlyBlocked: 0,
          },
          topEndpoints: [],
          topIPs: [],
          lastUpdated: '2026-04-17T10:00:00.000Z',
        };
      }

      if (path === '/api/v1/profile-stores?page=1&pageSize=8') {
        return {
          items: [],
          meta: {
            pagination: {
              totalCount: 0,
            },
          },
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    mockRequestEnvelope.mockImplementation(async (path: string) => {
      if (path.startsWith('/api/v1/external-blocklist?')) {
        return {
          success: true,
          data: [],
          meta: {
            pagination: {
              page: 1,
              pageSize: 20,
              totalCount: 0,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            },
          },
        };
      }

      if (path.startsWith('/api/v1/system-dictionary/language?')) {
        return {
          success: true,
          data: [
            {
              id: 'lang-1',
              dictionaryCode: 'language',
              code: 'zh_HANS',
              nameEn: 'Simplified Chinese',
              nameZh: '简体中文',
              nameJa: null,
              translations: {
                en: 'Simplified Chinese',
                zh_HANS: '简体中文',
              },
              name: 'Simplified Chinese',
              descriptionEn: null,
              descriptionZh: null,
              descriptionJa: null,
              descriptionTranslations: {},
              sortOrder: 0,
              isActive: true,
              extraData: null,
              createdAt: '2026-04-20T10:00:00.000Z',
              updatedAt: '2026-04-20T10:00:00.000Z',
              version: 1,
            },
            {
              id: 'lang-2',
              dictionaryCode: 'language',
              code: 'ko',
              nameEn: 'Korean',
              nameZh: '韩语',
              nameJa: null,
              translations: {
                en: 'Korean',
                zh_HANS: '韩语',
              },
              name: 'Korean',
              descriptionEn: null,
              descriptionZh: null,
              descriptionJa: null,
              descriptionTranslations: {},
              sortOrder: 1,
              isActive: true,
              extraData: null,
              createdAt: '2026-04-20T10:00:00.000Z',
              updatedAt: '2026-04-20T10:00:00.000Z',
              version: 1,
            },
          ],
          meta: {
            pagination: {
              page: 1,
              pageSize: 100,
              totalCount: 2,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            },
          },
        };
      }

      throw new Error(`Unhandled envelope request: ${path}`);
    });

    render(<SecurityManagementScreen tenantId="tenant-1" />);

    await screen.findByRole('heading', { name: 'Security' });

    fireEvent.click(screen.getByRole('button', { name: 'Translation management' }));
    const translationDrawer = await screen.findByRole('dialog', { name: 'Blocklist rule translations' });
    fireEvent.click(within(translationDrawer).getByRole('button', { name: /Simplified Chinese/i }));
    fireEvent.click(within(translationDrawer).getByRole('button', { name: /Korean/i }));

    const translationInputs = within(translationDrawer).getAllByLabelText('Rule name');
    fireEvent.change(translationInputs[0], {
      target: { value: '敏感词规则' },
    });
    fireEvent.change(translationInputs[1], {
      target: { value: '비속어 규칙' },
    });
    fireEvent.click(within(translationDrawer).getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: 'Blocklist rule translations' }),
      ).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Rule name'), {
      target: { value: 'Profanity rule' },
    });
    fireEvent.change(screen.getByLabelText('Category'), {
      target: { value: 'profanity' },
    });
    fireEvent.change(screen.getByLabelText('Pattern'), {
      target: { value: 'badword' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Create rule/i }));

    await waitFor(() => {
      expect(createdPayload).toEqual(
        expect.objectContaining({
          nameEn: 'Profanity rule',
          nameZh: '敏感词规则',
          translations: {
            en: 'Profanity rule',
            zh_HANS: '敏感词规则',
            ko: '비속어 규칙',
          },
        }),
      );
    });
  });

  it('renders the scoped external blocklist workspace and switches to runtime signals', async () => {
    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/organization/tree?includeInactive=true') {
        return organizationTreeResponse;
      }

      if (path.startsWith('/api/v1/blocklist-entries?')) {
        return {
          items: [],
          meta: { total: 0 },
        };
      }

      if (path === '/api/v1/ip-access-rules?page=1&pageSize=20') {
        return {
          items: [],
          meta: { total: 0 },
        };
      }

      if (path === '/api/v1/security/fingerprint' && init?.method === 'POST') {
        return {
          fingerprint: 'tenant-user-fingerprint',
          shortFingerprint: 'abc123',
          version: 'v1',
          generatedAt: '2026-04-17T10:00:00.000Z',
        };
      }

      if (path === '/api/v1/rate-limit/stats') {
        return {
          summary: {
            totalRequests24h: 320,
            blockedRequests24h: 4,
            uniqueIPs24h: 18,
            currentlyBlocked: 1,
          },
          topEndpoints: [
            {
              endpoint: '/api/v1/talents',
              method: 'POST',
              current: 12,
              limit: 100,
              resetIn: 24,
            },
          ],
          topIPs: [
            {
              ip: '203.0.113.10',
              requests: 42,
              blocked: true,
              lastSeen: 'recently',
            },
          ],
          lastUpdated: '2026-04-17T10:00:00.000Z',
        };
      }

      if (path === '/api/v1/profile-stores?page=1&pageSize=8') {
        return {
          items: [
            {
              id: 'store-1',
              code: 'PRIMARY',
              nameEn: 'Primary Store',
              nameZh: '主档案库',
              nameJa: null,
              isActive: true,
              isDefault: true,
              talentCount: 2,
              customerCount: 18,
            },
          ],
          meta: {
            pagination: {
              totalCount: 1,
            },
          },
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    mockRequestEnvelope.mockImplementation(async (path: string) => {
      if (path.startsWith('/api/v1/external-blocklist?')) {
        return {
          success: true,
          data: [
            {
              id: 'ext-1',
              ownerType: 'subsidiary',
              ownerId: 'sub-1',
              pattern: 'discord\\.gg/',
              patternType: 'url_regex',
              nameEn: 'Discord Invite Filter',
              nameZh: 'Discord 邀请链接过滤',
              nameJa: null,
              description: null,
              category: 'spam',
              severity: 'high',
              action: 'reject',
              replacement: '[filtered]',
              inherit: true,
              sortOrder: 0,
              isActive: true,
              version: 3,
              isInherited: false,
              isDisabledHere: false,
              canDisable: false,
            },
          ],
          meta: {
            pagination: {
              page: 1,
              pageSize: 20,
              totalCount: 1,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            },
          },
        };
      }

      throw new Error(`Unhandled envelope request: ${path}`);
    });

    render(<SecurityManagementScreen tenantId="tenant-1" />);

    expect(await screen.findByRole('heading', { name: 'Security' })).toBeInTheDocument();
    expect(await screen.findByText('Discord Invite Filter')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' }).closest('div')).toHaveClass(
      'flex-nowrap',
      'whitespace-nowrap',
    );
    expect(screen.getByText('active').closest('div')).toHaveClass('flex-nowrap', 'whitespace-nowrap');
    expect(mockReplace).toHaveBeenCalledWith(
      '/tenant/tenant-1/security?tab=external-blocklist&scopeType=subsidiary&scopeId=sub-1',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Security Activity' }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        '/tenant/tenant-1/security?tab=runtime-signals&scopeType=subsidiary&scopeId=sub-1',
      );
    });

    expect(await screen.findByText('Device fingerprint')).toBeInTheDocument();
    expect(await screen.findByText('abc123')).toBeInTheDocument();
    expect(await screen.findByText('Primary Store')).toBeInTheDocument();
  });

  it('batch deactivates the visible external patterns through the shared confirm dialog', async () => {
    let isActive = true;

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/organization/tree?includeInactive=true') {
        return organizationTreeResponse;
      }

      if (path.startsWith('/api/v1/blocklist-entries?')) {
        return {
          items: [],
          meta: { total: 0 },
        };
      }

      if (path === '/api/v1/external-blocklist/batch-toggle' && init?.method === 'POST') {
        isActive = false;
        return {
          updated: 1,
        };
      }

      if (path === '/api/v1/ip-access-rules?page=1&pageSize=20') {
        return {
          items: [],
          meta: { total: 0 },
        };
      }

      if (path === '/api/v1/security/fingerprint' && init?.method === 'POST') {
        return {
          fingerprint: 'tenant-user-fingerprint',
          shortFingerprint: 'abc123',
          version: 'v1',
          generatedAt: '2026-04-17T10:00:00.000Z',
        };
      }

      if (path === '/api/v1/rate-limit/stats') {
        return {
          summary: {
            totalRequests24h: 320,
            blockedRequests24h: 4,
            uniqueIPs24h: 18,
            currentlyBlocked: 1,
          },
          topEndpoints: [],
          topIPs: [],
          lastUpdated: '2026-04-17T10:00:00.000Z',
        };
      }

      if (path === '/api/v1/profile-stores?page=1&pageSize=8') {
        return {
          items: [],
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    mockRequestEnvelope.mockImplementation(async (path: string) => {
      if (path.startsWith('/api/v1/external-blocklist?')) {
        return {
          success: true,
          data: [
            {
              id: 'ext-1',
              ownerType: 'subsidiary',
              ownerId: 'sub-1',
              pattern: 'discord\\.gg/',
              patternType: 'url_regex',
              nameEn: 'Discord Invite Filter',
              nameZh: null,
              nameJa: null,
              description: null,
              category: 'spam',
              severity: 'high',
              action: 'reject',
              replacement: '[filtered]',
              inherit: true,
              sortOrder: 0,
              isActive,
              version: 3,
              isInherited: false,
              isDisabledHere: false,
              canDisable: false,
            },
          ],
          meta: {
            pagination: {
              page: 1,
              pageSize: 20,
              totalCount: 1,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            },
          },
        };
      }

      throw new Error(`Unhandled envelope request: ${path}`);
    });

    render(<SecurityManagementScreen tenantId="tenant-1" />);

    expect(await screen.findByText('Discord Invite Filter')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Batch deactivate' }));

    expect(await screen.findByText('Deactivate all visible external patterns?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate visible rules' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/external-blocklist/batch-toggle',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });

    expect(await screen.findByText('Visible external patterns were deactivated.')).toBeInTheDocument();
    expect(await screen.findByText('inactive')).toBeInTheDocument();
  });

  it('renders localized zh copy for the security header', async () => {
    localeState.currentLocale = 'zh';

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/organization/tree?includeInactive=true') {
        return organizationTreeResponse;
      }

      if (path.startsWith('/api/v1/blocklist-entries?')) {
        return {
          items: [],
          meta: { total: 0 },
        };
      }

      if (path === '/api/v1/ip-access-rules?page=1&pageSize=20') {
        return {
          items: [],
          meta: { total: 0 },
        };
      }

      if (path === '/api/v1/security/fingerprint' && init?.method === 'POST') {
        return {
          fingerprint: 'tenant-user-fingerprint',
          shortFingerprint: 'abc123',
          version: 'v1',
          generatedAt: '2026-04-17T10:00:00.000Z',
        };
      }

      if (path === '/api/v1/rate-limit/stats') {
        return {
          summary: {
            totalRequests24h: 320,
            blockedRequests24h: 4,
            uniqueIPs24h: 18,
            currentlyBlocked: 1,
          },
          topEndpoints: [],
          topIPs: [],
          lastUpdated: '2026-04-17T10:00:00.000Z',
        };
      }

      if (path === '/api/v1/profile-stores?page=1&pageSize=8') {
        return {
          items: [],
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    mockRequestEnvelope.mockImplementation(async (path: string) => {
      if (path.startsWith('/api/v1/external-blocklist?')) {
        return {
          success: true,
          data: [],
          meta: {
            pagination: {
              page: 1,
              pageSize: 20,
              totalCount: 0,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            },
          },
        };
      }

      throw new Error(`Unhandled envelope request: ${path}`);
    });

    render(<SecurityManagementScreen tenantId="tenant-1" />);

    expect(await screen.findByRole('heading', { name: '安全' })).toBeInTheDocument();
    expect((await screen.findAllByText('内容拦截')).length).toBeGreaterThan(0);
  });
});
