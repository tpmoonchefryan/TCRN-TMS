import type { SupportedUiLocale } from '@tcrn/shared';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { localizedFixture } from '@/domains/config-dictionary-settings/testing/localized-fixtures';

import { SecurityManagementScreen } from '@/domains/security-management/screens/SecurityManagementScreen';

const mockRequest = vi.fn();
const mockRequestEnvelope = vi.fn();
const mockReplace = vi.fn();
let searchQuery = 'tab=external-blocklist&scopeType=subsidiary&scopeId=sub-1';
const localeState = {
  locale: 'en' as SupportedUiLocale,
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
  useUiLocale: () => localeState,
}));

describe('SecurityManagementScreen', () => {
  beforeEach(() => {
    searchQuery = 'tab=external-blocklist&scopeType=subsidiary&scopeId=sub-1';
    localeState.locale = 'en';
    localeState.locale = 'en';
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
            name: localizedFixture('Profanity rule', { zh_HANS: '敏感词规则' }),
            description: null,
            category: 'profanity',
            severity: 'medium',
            action: 'reject',
            replacement: '***',
            scope: ['marshmallow'],
            scopeSummary: {
              tokens: ['marshmallow'],
              structuredScope: {
                entries: [{ category: 'surface', value: 'marshmallow' }],
              },
              unsupported: [],
            },
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
              name: localizedFixture('Simplified Chinese', { zh_HANS: '简体中文' }),
              localizedName: 'Simplified Chinese',
              description: localizedFixture(''),
              localizedDescription: null,
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
              name: localizedFixture('Korean', { zh_HANS: '韩语' }),
              localizedName: 'Korean',
              description: localizedFixture(''),
              localizedDescription: null,
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
    expect(screen.getByText('Scope lock')).toBeInTheDocument();
    expect(screen.getByText(/tenant-wide level/)).toBeInTheDocument();
    expect(screen.queryByText(/Change the level before opening/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Rule name')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add rule' }));

    const ruleDrawer = await screen.findByRole('dialog', { name: 'Create Blocklist Rule' });
    expect(within(ruleDrawer).queryByLabelText('Scopes')).not.toBeInTheDocument();
    expect(within(ruleDrawer).getByText('Structured scope builder')).toBeInTheDocument();
    expect(within(ruleDrawer).getByLabelText('Tenant')).toBeChecked();
    expect(within(ruleDrawer).getByLabelText('Marshmallow surface')).toBeChecked();

    fireEvent.click(within(ruleDrawer).getByRole('button', { name: 'Edit advanced scopes' }));
    expect(within(ruleDrawer).getByLabelText('Scopes')).toBeInTheDocument();
    fireEvent.change(within(ruleDrawer).getByLabelText('Scopes'), {
      target: { value: 'legacy-surface' },
    });

    fireEvent.click(within(ruleDrawer).getByRole('button', { name: 'Translation management' }));
    const translationDrawer = await screen.findByRole('dialog', { name: 'Blocklist rule translations' });
    fireEvent.click(await within(translationDrawer).findByRole('button', { name: /Simplified Chinese/i }));
    fireEvent.click(await within(translationDrawer).findByRole('button', { name: /Korean/i }));

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

    fireEvent.change(within(ruleDrawer).getByLabelText('Rule name'), {
      target: { value: 'Profanity rule' },
    });
    fireEvent.change(within(ruleDrawer).getByLabelText('Category'), {
      target: { value: 'profanity' },
    });
    fireEvent.change(within(ruleDrawer).getByLabelText('Pattern'), {
      target: { value: 'badword' },
    });

    fireEvent.click(within(ruleDrawer).getByRole('button', { name: /Create rule/i }));

    await waitFor(() => {
      expect(createdPayload).toEqual(
        expect.objectContaining({
          name: localizedFixture('Profanity rule', {
            zh_HANS: '敏感词规则',
            ko: '비속어 규칙',
          }),
          structuredScope: {
            entries: [
              { category: 'tenant' },
              { category: 'surface', value: 'marshmallow' },
            ],
          },
          scope: ['legacy-surface'],
        }),
      );
    });
  });

  it('tests the current blocklist draft with the real payload contract and guards missing inputs', async () => {
    searchQuery = 'tab=blocklist&scopeType=tenant';

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

      if (path === '/api/v1/blocklist-entries/test' && init?.method === 'POST') {
        return {
          matched: true,
          matches: [
            {
              pattern: 'badword',
              action: 'reject',
              severity: 'high',
              category: 'profanity',
            },
          ],
          action: 'reject',
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

      throw new Error(`Unhandled envelope request: ${path}`);
    });

    render(<SecurityManagementScreen tenantId="tenant-1" />);

    await screen.findByRole('heading', { name: 'Security' });
    fireEvent.click(screen.getByRole('button', { name: 'Add rule' }));

    const ruleDrawer = await screen.findByRole('dialog', { name: 'Create Blocklist Rule' });

    fireEvent.click(screen.getByRole('button', { name: 'Test rule' }));
    expect(await screen.findByText('Enter a pattern before testing the rule.')).toBeInTheDocument();
    expect(mockRequest).not.toHaveBeenCalledWith(
      '/api/v1/blocklist-entries/test',
      expect.anything(),
    );

    fireEvent.change(within(ruleDrawer).getByLabelText('Pattern'), {
      target: { value: 'badword' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Test rule' }));
    expect(await screen.findByText('Enter sample text before testing the rule.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Sample text'), {
      target: { value: 'This contains badword.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Test rule' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/blocklist-entries/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            testContent: 'This contains badword.',
            pattern: 'badword',
            patternType: 'keyword',
          }),
        }),
      );
    });

    expect(
      await screen.findByText(
        '1 match(es) detected. Effective action: Reject. Severity: High. Category: profanity.',
      ),
    ).toBeInTheDocument();
  });

  it('quick-adds one keyword pattern with defaults from the current scope lens', async () => {
    searchQuery = 'tab=blocklist&scopeType=tenant';

    const createdPayloads: Array<Record<string, unknown>> = [];
    let blocklistItems: Array<Record<string, unknown>> = [];

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
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
        const payload = JSON.parse(String(init.body));
        createdPayloads.push(payload);
        blocklistItems = [
          {
            id: `entry-${createdPayloads.length}`,
            ownerType: 'tenant',
            ownerId: null,
            pattern: payload.pattern,
            patternType: payload.patternType,
            name: payload.name,
            description: null,
            category: null,
            severity: payload.severity,
            action: payload.action,
            replacement: payload.replacement,
            scope: [],
            scopeSummary: {
              tokens: [],
              structuredScope: payload.structuredScope,
              unsupported: [],
            },
            inherit: payload.inherit,
            sortOrder: payload.sortOrder ?? 0,
            isActive: true,
            isForceUse: payload.isForceUse ?? false,
            isSystem: false,
            matchCount: 0,
            lastMatchedAt: null,
            createdAt: '2026-04-20T10:00:00.000Z',
            createdBy: 'user-1',
            updatedAt: '2026-04-20T10:00:00.000Z',
            updatedBy: 'user-1',
            version: 1,
          },
          ...blocklistItems,
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

      throw new Error(`Unhandled envelope request: ${path}`);
    });

    render(<SecurityManagementScreen tenantId="tenant-1" />);

    await screen.findByRole('heading', { name: 'Security' });
    fireEvent.change(screen.getByLabelText('Keyword pattern'), {
      target: { value: 'badword' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add one' }));

    await waitFor(() => {
      expect(createdPayloads).toHaveLength(1);
    });

    expect(createdPayloads[0]).toEqual(
      expect.objectContaining({
        ownerType: 'tenant',
        pattern: 'badword',
        patternType: 'keyword',
        name: localizedFixture('badword'),
        severity: 'medium',
        action: 'reject',
        inherit: true,
        isForceUse: false,
        structuredScope: {
          entries: [
            { category: 'tenant' },
            { category: 'surface', value: 'marshmallow' },
          ],
        },
      }),
    );
    expect(createdPayloads[0]).not.toHaveProperty('ownerId');
    expect(await screen.findByText('Blocklist entry created.')).toBeInTheDocument();
    expect((await screen.findAllByText('badword')).length).toBeGreaterThan(0);
  });

  it('shows batch import preview and keeps failed blocklist lines visible after partial failure', async () => {
    searchQuery = 'tab=blocklist&scopeType=tenant';

    const createdPatterns: string[] = [];

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

      if (path === '/api/v1/blocklist-entries' && init?.method === 'POST') {
        const payload = JSON.parse(String(init.body));
        createdPatterns.push(payload.pattern);

        if (payload.pattern === 'blocked-two') {
          throw new Error('Create failed');
        }

        return {
          id: payload.pattern,
          ownerType: 'tenant',
          ownerId: null,
          pattern: payload.pattern,
          patternType: payload.patternType,
          name: payload.name,
          description: null,
          category: null,
          severity: payload.severity,
          action: payload.action,
          replacement: payload.replacement,
          scope: [],
          scopeSummary: {
            tokens: [],
            structuredScope: payload.structuredScope,
            unsupported: [],
          },
          inherit: payload.inherit,
          sortOrder: payload.sortOrder ?? 0,
          isActive: true,
          isForceUse: payload.isForceUse ?? false,
          isSystem: false,
          matchCount: 0,
          lastMatchedAt: null,
          createdAt: '2026-04-20T10:00:00.000Z',
          createdBy: 'user-1',
          updatedAt: '2026-04-20T10:00:00.000Z',
          updatedBy: 'user-1',
          version: 1,
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

      throw new Error(`Unhandled envelope request: ${path}`);
    });

    render(<SecurityManagementScreen tenantId="tenant-1" />);

    await screen.findByRole('heading', { name: 'Security' });
    fireEvent.click(screen.getByRole('button', { name: 'Batch add / import' }));

    const batchDrawer = await screen.findByRole('dialog', { name: 'Batch Add Blocklist Patterns' });
    fireEvent.change(within(batchDrawer).getByLabelText('Patterns'), {
      target: {
        value: `alpha\nalpha\nblocked-two\n${'x'.repeat(513)}`,
      },
    });

    expect(within(batchDrawer).getAllByText('Ready to add').length).toBeGreaterThan(0);
    expect(within(batchDrawer).getAllByText('Duplicate lines').length).toBeGreaterThan(0);
    expect(within(batchDrawer).getAllByText('Invalid lines').length).toBeGreaterThan(0);
    expect(within(batchDrawer).getAllByText('alpha').length).toBeGreaterThan(1);
    expect(within(batchDrawer).getByText('blocked-two')).toBeInTheDocument();

    fireEvent.click(within(batchDrawer).getByRole('button', { name: 'Add patterns' }));

    await waitFor(() => {
      expect(createdPatterns).toEqual(['alpha', 'blocked-two']);
    });

    expect(await screen.findByText('Added 1 blocklist pattern(s); 1 failed.')).toBeInTheDocument();
    expect((within(batchDrawer).getByLabelText('Patterns') as HTMLTextAreaElement).value).toBe('blocked-two');
  });

  it('guards dirty security editors before closing or switching tabs', async () => {
    searchQuery = 'tab=blocklist&scopeType=tenant';

    mockRequest.mockImplementation(async (requestPath: string, init?: RequestInit) => {
      if (requestPath === '/api/v1/organization/tree?includeInactive=true') {
        return organizationTreeResponse;
      }

      if (requestPath.startsWith('/api/v1/blocklist-entries?')) {
        return {
          items: [],
          meta: { total: 0 },
        };
      }

      if (requestPath.startsWith('/api/v1/ip-access-rules?')) {
        return {
          items: [],
          meta: { total: 0 },
        };
      }

      if (requestPath === '/api/v1/security/fingerprint' && init?.method === 'POST') {
        return {
          fingerprint: 'tenant-user-fingerprint',
          shortFingerprint: 'abc123',
          version: 'v1',
          generatedAt: '2026-04-17T10:00:00.000Z',
        };
      }

      if (requestPath === '/api/v1/rate-limit/stats') {
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

      if (requestPath === '/api/v1/profile-stores?page=1&pageSize=8') {
        return {
          items: [],
        };
      }

      throw new Error(`Unhandled request: ${requestPath}`);
    });

    mockRequestEnvelope.mockImplementation(async (requestPath: string) => {
      if (requestPath.startsWith('/api/v1/external-blocklist?')) {
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

      throw new Error(`Unhandled envelope request: ${requestPath}`);
    });

    render(<SecurityManagementScreen tenantId="tenant-1" />);

    await screen.findByRole('heading', { name: 'Security' });
    fireEvent.click(screen.getByRole('button', { name: 'Add rule' }));

    const ruleDrawer = await screen.findByRole('dialog', { name: 'Create Blocklist Rule' });
    fireEvent.change(within(ruleDrawer).getByLabelText('Rule name'), {
      target: { value: 'Unsaved rule' },
    });

    fireEvent.click(within(ruleDrawer).getByRole('button', { name: 'Cancel' }));
    const closeGuard = await screen.findByRole('dialog', { name: 'Discard unsaved security changes?' });
    fireEvent.click(within(closeGuard).getByRole('button', { name: 'Cancel' }));

    expect(await screen.findByRole('dialog', { name: 'Create Blocklist Rule' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'IP Access' }));
    const tabGuard = await screen.findByRole('dialog', { name: 'Discard unsaved security changes?' });
    fireEvent.click(within(tabGuard).getByRole('button', { name: 'Discard changes' }));

    expect(await screen.findByRole('button', { name: 'Add IP rule' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Create Blocklist Rule' })).not.toBeInTheDocument();
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
              name: localizedFixture('Primary Store', { zh_HANS: '主档案库' }),
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
              name: localizedFixture('Discord Invite Filter', { zh_HANS: 'Discord 邀请链接过滤' }),
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
    expect(mockReplace).not.toHaveBeenCalledWith(
      '/tenant/tenant-1/security?tab=external-blocklist&scopeType=subsidiary&scopeId=sub-1',
    );

    fireEvent.click(screen.getByRole('tab', { name: 'IP Access' }));
    expect(await screen.findByRole('button', { name: 'Add IP rule' })).toBeInTheDocument();
    expect(screen.queryByLabelText('IP / CIDR')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add IP rule' }));
    const ipRuleDrawer = await screen.findByRole('dialog', { name: 'Create IP Rule' });
    expect(within(ipRuleDrawer).getByLabelText('IP / CIDR')).toBeInTheDocument();

    fireEvent.click(within(ipRuleDrawer).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Create IP Rule' })).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('tab', { name: 'Overview' }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        '/tenant/tenant-1/security?tab=runtime-signals&scopeType=subsidiary&scopeId=sub-1',
      );
    });

    expect(await screen.findByText('Security Overview')).toBeInTheDocument();
    expect(await screen.findByText('Active blocks')).toBeInTheDocument();
    expect(await screen.findByText('Read-only policy probe')).toBeInTheDocument();
    expect(await screen.findByText('Device fingerprint')).toBeInTheDocument();
    expect(await screen.findByText('abc123')).toBeInTheDocument();
    expect(await screen.findByText('Primary Store')).toBeInTheDocument();
  });

  it('hydrates and writes scoped list pagination through URL query', async () => {
    searchQuery = 'tab=external-blocklist&scopeType=subsidiary&scopeId=sub-1&externalPage=2&externalPageSize=20&foo=1';
    const externalRequests: string[] = [];

    mockRequest.mockImplementation(async (requestPath: string, init?: RequestInit) => {
      if (requestPath === '/api/v1/organization/tree?includeInactive=true') {
        return organizationTreeResponse;
      }

      if (requestPath.startsWith('/api/v1/blocklist-entries?')) {
        return {
          items: [],
          meta: { total: 0 },
        };
      }

      if (requestPath.startsWith('/api/v1/ip-access-rules?')) {
        return {
          items: [],
          meta: { total: 0 },
        };
      }

      if (requestPath === '/api/v1/security/fingerprint' && init?.method === 'POST') {
        return {
          fingerprint: 'tenant-user-fingerprint',
          shortFingerprint: 'abc123',
          version: 'v1',
          generatedAt: '2026-04-17T10:00:00.000Z',
        };
      }

      if (requestPath === '/api/v1/rate-limit/stats') {
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

      if (requestPath === '/api/v1/profile-stores?page=1&pageSize=8') {
        return {
          items: [],
        };
      }

      throw new Error(`Unhandled request: ${requestPath}`);
    });

    mockRequestEnvelope.mockImplementation(async (requestPath: string) => {
      if (requestPath.startsWith('/api/v1/external-blocklist?')) {
        externalRequests.push(requestPath);
        const isPageTwo = requestPath.includes('page=2');
        const itemNumber = isPageTwo ? 21 : 1;

        return {
          success: true,
          data: [
            {
              id: `ext-${itemNumber}`,
              ownerType: 'subsidiary',
              ownerId: 'sub-1',
              pattern: `pattern-${itemNumber}`,
              patternType: 'domain',
              name: localizedFixture(`External Pattern ${itemNumber}`),
              description: null,
              category: 'spam',
              severity: 'medium',
              action: 'reject',
              replacement: '[filtered]',
              inherit: true,
              sortOrder: itemNumber,
              isActive: true,
              version: 1,
              isInherited: false,
              isDisabledHere: false,
              canDisable: false,
            },
          ],
          meta: {
            pagination: {
              page: isPageTwo ? 2 : 1,
              pageSize: 20,
              totalCount: 25,
              totalPages: 2,
              hasNext: !isPageTwo,
              hasPrev: isPageTwo,
            },
          },
        };
      }

      throw new Error(`Unhandled envelope request: ${requestPath}`);
    });

    render(<SecurityManagementScreen tenantId="tenant-1" />);

    expect(await screen.findByText('External Pattern 21')).toBeInTheDocument();
    expect(externalRequests.some((requestPath) => (
      requestPath.includes('page=2') && requestPath.includes('pageSize=20')
    ))).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        '/tenant/tenant-1/security?tab=external-blocklist&scopeType=subsidiary&scopeId=sub-1&foo=1',
      );
    });
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
              name: localizedFixture('Discord Invite Filter'),
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
    expect(screen.queryByLabelText('Pattern')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add pattern' }));
    const patternDrawer = await screen.findByRole('dialog', { name: 'Create External Pattern' });
    expect(within(patternDrawer).getByLabelText('Pattern')).toBeInTheDocument();

    fireEvent.click(within(patternDrawer).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Create External Pattern' })).not.toBeInTheDocument();
    });

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
    localeState.locale = 'zh_HANS';

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
