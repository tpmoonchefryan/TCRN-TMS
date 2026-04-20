import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserEditorScreen } from '@/domains/user-management/screens/UserEditorScreen';

const mockRequest = vi.fn();
const mockReplace = vi.fn();
const localeState = {
  currentLocale: 'en' as 'en' | 'zh' | 'ja',
};

const organizationTreeResponse = {
  tenantId: 'tenant-1',
  subsidiaries: [
    {
      id: 'subsidiary-1',
      code: 'TOKYO',
      displayName: 'Tokyo Branch',
      parentId: null,
      path: '/TOKYO',
      talents: [
        {
          id: 'talent-1',
          code: 'SORA',
          displayName: 'Tokino Sora',
          avatarUrl: null,
          subsidiaryId: 'subsidiary-1',
          subsidiaryName: 'Tokyo Branch',
          path: '/TOKYO/SORA',
          homepagePath: 'sora',
          lifecycleStatus: 'draft',
          publishedAt: null,
          isActive: true,
        },
      ],
      children: [],
    },
  ],
  directTalents: [],
};

let currentSession = {
  tenantId: 'tenant-1',
  tenantName: 'Tenant One',
  tenantTier: 'standard',
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    request: mockRequest,
    session: currentSession,
  }),
}));

vi.mock('@/platform/runtime/locale/locale-provider', () => ({
  useRuntimeLocale: () => localeState,
}));

describe('UserEditorScreen', () => {
  beforeEach(() => {
    localeState.currentLocale = 'en';
    mockRequest.mockReset();
    mockReplace.mockReset();
    currentSession = {
      tenantId: 'tenant-1',
      tenantName: 'Tenant One',
      tenantTier: 'standard',
    };
  });

  it('creates a user from the dedicated route-level editor and redirects to the editor page', async () => {
    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/system-roles?isActive=true') {
        return [];
      }

      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return organizationTreeResponse;
      }

      if (path === '/api/v1/system-users' && init?.method === 'POST') {
        return {
          id: 'user-2',
          username: 'bob',
          email: 'bob@example.com',
          displayName: 'Bob',
          isActive: true,
          forceReset: true,
          createdAt: '2026-04-18T08:00:00.000Z',
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<UserEditorScreen tenantId="tenant-1" mode="create" />);

    expect(screen.getByLabelText('Username')).toHaveAttribute('autocomplete', 'username');
    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText('Initial password')).toHaveAttribute('autocomplete', 'new-password');

    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'bob' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'bob@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Initial password'), {
      target: { value: 'VerySecure123' },
    });
    fireEvent.change(screen.getByLabelText('Display name'), {
      target: { value: 'Bob' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create user' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/system-users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            username: 'bob',
            email: 'bob@example.com',
            password: 'VerySecure123',
            displayName: 'Bob',
            phone: undefined,
            preferredLanguage: 'en',
            forceReset: true,
          }),
        }),
      );
    });

    expect(mockReplace).toHaveBeenCalledWith('/tenant/tenant-1/user-management/user-2');
  });

  it('adds and removes scoped role assignments from the dedicated editor', async () => {
    const detail = {
      id: 'user-1',
      username: 'alice',
      email: 'alice@example.com',
      displayName: 'Alice',
      phone: '+81-90-0000-0000',
      avatarUrl: null,
      preferredLanguage: 'en',
      isActive: true,
      isTotpEnabled: false,
      forceReset: false,
      lastLoginAt: null,
      createdAt: '2026-04-17T03:00:00.000Z',
      updatedAt: '2026-04-17T03:30:00.000Z',
      roleAssignments: [] as Array<Record<string, unknown>>,
      scopeAccess: [],
    };

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/system-roles?isActive=true') {
        return [
          {
            id: 'role-1',
            code: 'ADMIN',
            nameEn: 'Administrator',
            nameZh: '管理员',
            nameJa: null,
            description: 'Full access',
            isSystem: true,
            isActive: true,
            permissionCount: 1,
            userCount: 1,
            createdAt: '2026-04-17T01:00:00.000Z',
            updatedAt: '2026-04-17T02:00:00.000Z',
          },
          {
            id: 'role-2',
            code: 'PLATFORM_ADMIN',
            nameEn: 'Platform Administrator',
            nameZh: '平台管理员',
            nameJa: null,
            description: 'AC only',
            isSystem: true,
            isActive: true,
            permissionCount: 1,
            userCount: 0,
            createdAt: '2026-04-17T01:00:00.000Z',
            updatedAt: '2026-04-17T02:00:00.000Z',
          },
        ];
      }

      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return organizationTreeResponse;
      }

      if (path === '/api/v1/system-users/user-1' && !init) {
        return detail;
      }

      if (path === '/api/v1/users/user-1/roles' && init?.method === 'POST') {
        detail.roleAssignments = [
          {
            id: 'assignment-1',
            roleId: 'role-1',
            roleCode: 'ADMIN',
            roleNameEn: 'Administrator',
            roleNameZh: '管理员',
            roleNameJa: null,
            roleIsActive: true,
            scopeType: 'tenant',
            scopeId: null,
            scopeName: 'Tenant One',
            scopePath: null,
            inherit: false,
            grantedAt: '2026-04-18T09:00:00.000Z',
            expiresAt: null,
          },
        ];

        return {
          id: 'assignment-1',
          userId: 'user-1',
          roleId: 'role-1',
          scopeType: 'tenant',
          scopeId: null,
          inherit: false,
          grantedAt: '2026-04-18T09:00:00.000Z',
          snapshotUpdateQueued: true,
        };
      }

      if (path === '/api/v1/users/user-1/roles/assignment-1' && init?.method === 'DELETE') {
        detail.roleAssignments = [];
        return {
          message: 'Role assignment removed',
          snapshotUpdateQueued: true,
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<UserEditorScreen tenantId="tenant-1" systemUserId="user-1" mode="edit" />);

    expect(await screen.findByRole('heading', { name: 'Alice' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Platform Administrator' })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Administrator' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Role'), {
      target: { value: 'role-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Assign role' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/users/user-1/roles',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            roleId: 'role-1',
            scopeType: 'tenant',
            scopeId: null,
            inherit: false,
            expiresAt: null,
          }),
        }),
      );
    });

    expect(await screen.findByText('Administrator was assigned.')).toBeInTheDocument();
    expect(await screen.findByText('ADMIN')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/users/user-1/roles/assignment-1',
        expect.objectContaining({
          method: 'DELETE',
        }),
      );
    });

    expect(await screen.findByText('Role assignment was removed.')).toBeInTheDocument();
  });

  it('hides tenant-only business roles in AC user assignment flows', async () => {
    currentSession = {
      tenantId: 'tenant-ac',
      tenantName: 'AC Tenant',
      tenantTier: 'ac',
    };

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/system-roles?isActive=true') {
        return [
          {
            id: 'role-1',
            code: 'PLATFORM_ADMIN',
            nameEn: 'Platform Administrator',
            nameZh: '平台管理员',
            nameJa: null,
            description: 'AC only',
            isSystem: true,
            isActive: true,
            permissionCount: 1,
            userCount: 1,
            createdAt: '2026-04-17T01:00:00.000Z',
            updatedAt: '2026-04-17T02:00:00.000Z',
          },
          {
            id: 'role-2',
            code: 'TALENT_MANAGER',
            nameEn: 'Talent Manager',
            nameZh: '艺人经理',
            nameJa: null,
            description: 'Tenant business role',
            isSystem: false,
            isActive: true,
            permissionCount: 1,
            userCount: 0,
            createdAt: '2026-04-17T01:00:00.000Z',
            updatedAt: '2026-04-17T02:00:00.000Z',
          },
        ];
      }

      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return organizationTreeResponse;
      }

      if (path === '/api/v1/system-users/user-1' && !init) {
        return {
          id: 'user-1',
          username: 'alice',
          email: 'alice@example.com',
          displayName: 'Alice',
          phone: null,
          avatarUrl: null,
          preferredLanguage: 'en',
          isActive: true,
          isTotpEnabled: false,
          forceReset: false,
          lastLoginAt: null,
          createdAt: '2026-04-17T03:00:00.000Z',
          updatedAt: '2026-04-17T03:30:00.000Z',
          roleAssignments: [],
          scopeAccess: [],
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(
      <UserEditorScreen
        tenantId="tenant-ac"
        systemUserId="user-1"
        mode="edit"
        workspaceKind="ac"
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Alice' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Platform Administrator' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Talent Manager' })).not.toBeInTheDocument();
  });
});
