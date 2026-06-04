import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SupportedUiLocale } from '@tcrn/shared';

import { localizedFixture } from '@/domains/config-dictionary-settings/testing/localized-fixtures';
import { UserEditorScreen } from '@/domains/user-management/screens/UserEditorScreen';

const mockRequest = vi.fn();
const mockReplace = vi.fn();
const localeState = {
  locale: 'en' as SupportedUiLocale,
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
  useUiLocale: () => localeState,
}));

describe('UserEditorScreen', () => {
  beforeEach(() => {
    localeState.locale = 'en';
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
      if (path === '/api/v1/roles') {
        return [];
      }

      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return organizationTreeResponse;
      }

      if (path === '/api/v1/permissions/check' && init?.method === 'POST') {
        return {
          results: [
            {
              resource: 'system_user',
              action: 'admin',
              checkedAction: 'admin',
              allowed: true,
            },
          ],
        };
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
    expect(screen.getByLabelText('Initial password')).toHaveAttribute(
      'autocomplete',
      'new-password'
    );

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
        })
      );
    });

    expect(mockReplace).toHaveBeenCalledWith('/tenant/tenant-1/user-management/user-2');
  });

  it('adds, updates, and removes scoped role assignments from the dedicated editor', async () => {
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
      if (path === '/api/v1/roles') {
        return [
          {
            id: 'role-1',
            code: 'ADMIN',
            name: localizedFixture('Administrator', { zh_HANS: '管理员' }),
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
            name: localizedFixture('Platform Administrator', { zh_HANS: '平台管理员' }),
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

      if (path === '/api/v1/permissions/check' && init?.method === 'POST') {
        return {
          results: [
            {
              resource: 'system_user',
              action: 'admin',
              checkedAction: 'admin',
              allowed: true,
            },
          ],
        };
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
            roleName: localizedFixture('Administrator', { zh_HANS: '管理员' }),
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

      if (path === '/api/v1/users/user-1/roles/assignment-1' && init?.method === 'PATCH') {
        return {
          id: 'assignment-1',
          inherit: false,
          expiresAt: null,
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
    expect(
      screen.queryByRole('option', { name: 'Platform Administrator' })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Administrator' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Changing scope, inheritance, or expiration can expand or contract effective access. Review the before/after access summary before saving.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('Permission version and snapshot refresh will be checked after save.')
    ).toBeInTheDocument();

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
            roleCode: 'ADMIN',
            scopeType: 'tenant',
            scopeId: null,
            inherit: false,
            expiresAt: null,
          }),
        })
      );
    });

    expect(await screen.findByText('Administrator was assigned.')).toBeInTheDocument();
    expect(await screen.findByText('ADMIN')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(
      await screen.findByText('Save changes to Administrator assignment?')
    ).toBeInTheDocument();
    expect(screen.getByText(/Role: Administrator. User: Alice. Scope: Tenant One./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save assignment' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/users/user-1/roles/assignment-1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            inherit: false,
            expiresAt: null,
          }),
        })
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(await screen.findByText('Remove Administrator from Alice?')).toBeInTheDocument();
    expect(
      screen.getByText(
        "Removing this assignment may change the user's effective access. Review the affected scope, inheritance, expiration, and snapshot refresh result before saving."
      )
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove assignment' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/users/user-1/roles/assignment-1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    expect(await screen.findByText('Role assignment was removed.')).toBeInTheDocument();
  });

  it('requires confirmation before assigning Initial Admin and shows no-last-admin warning copy', async () => {
    const detail = {
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
      roleAssignments: [] as Array<Record<string, unknown>>,
      scopeAccess: [],
    };

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/roles') {
        return [
          {
            id: 'role-initial-admin',
            code: 'INITIAL_ADMIN',
            name: localizedFixture('Initial Admin', { zh_HANS: '初始管理员' }),
            description: 'Built-in recovery role',
            isSystem: true,
            isActive: true,
            permissionCount: 99,
            userCount: 1,
            createdAt: '2026-04-17T01:00:00.000Z',
            updatedAt: '2026-04-17T02:00:00.000Z',
          },
        ];
      }

      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return organizationTreeResponse;
      }

      if (path === '/api/v1/permissions/check' && init?.method === 'POST') {
        return {
          results: [
            {
              resource: 'system_user',
              action: 'admin',
              checkedAction: 'admin',
              allowed: true,
            },
          ],
        };
      }

      if (path === '/api/v1/system-users/user-1' && !init) {
        return detail;
      }

      if (path === '/api/v1/users/user-1/roles' && init?.method === 'POST') {
        detail.roleAssignments = [
          {
            id: 'assignment-initial-admin',
            roleId: 'role-initial-admin',
            roleCode: 'INITIAL_ADMIN',
            roleName: localizedFixture('Initial Admin'),
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
          id: 'assignment-initial-admin',
          userId: 'user-1',
          roleId: 'role-initial-admin',
          scopeType: 'tenant',
          scopeId: null,
          inherit: false,
          grantedAt: '2026-04-18T09:00:00.000Z',
          snapshotUpdateQueued: true,
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<UserEditorScreen tenantId="tenant-1" systemUserId="user-1" mode="edit" />);

    expect(await screen.findByRole('heading', { name: 'Alice' })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Initial Admin' })).toBeInTheDocument();
    expect(
      await screen.findByText(
        'Initial Admin grants every permission in this tenant. Keep at least one active tenant-scope Initial Admin assignment before saving.'
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Assign role' }));

    expect(await screen.findByText('Assign Initial Admin?')).toBeInTheDocument();
    expect(
      screen.getByText(/Role: Initial Admin. User: Alice. Scope: Tenant One./)
    ).toBeInTheDocument();
    expect(
      mockRequest.mock.calls.filter(
        ([path, init]) => path === '/api/v1/users/user-1/roles' && init?.method === 'POST'
      )
    ).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Assign Initial Admin' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/users/user-1/roles',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            roleCode: 'INITIAL_ADMIN',
            scopeType: 'tenant',
            scopeId: null,
            inherit: false,
            expiresAt: null,
          }),
        })
      );
    });
  });

  it('hides tenant-only business roles in AC user assignment flows', async () => {
    currentSession = {
      tenantId: 'tenant-ac',
      tenantName: 'AC Tenant',
      tenantTier: 'ac',
    };
    const detail = {
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
      roleAssignments: [] as Array<Record<string, unknown>>,
      scopeAccess: [],
    };

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/roles') {
        return [
          {
            id: 'role-1',
            code: 'PLATFORM_ADMIN',
            name: localizedFixture('Platform Administrator', { zh_HANS: '平台管理员' }),
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
            name: localizedFixture('Talent Manager', { zh_HANS: '艺人经理' }),
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

      if (path === '/api/v1/permissions/check' && init?.method === 'POST') {
        return {
          results: [
            {
              resource: 'system_user',
              action: 'admin',
              checkedAction: 'admin',
              allowed: true,
            },
          ],
        };
      }

      if (path === '/api/v1/system-users/user-1' && !init) {
        return detail;
      }

      if (path === '/api/v1/users/user-1/roles' && init?.method === 'POST') {
        detail.roleAssignments = [
          {
            id: 'assignment-1',
            roleId: 'tenant-role-platform-admin',
            roleCode: 'PLATFORM_ADMIN',
            roleName: localizedFixture('Platform Administrator', { zh_HANS: '平台管理员' }),
            roleIsActive: true,
            scopeType: 'tenant',
            scopeId: null,
            scopeName: 'AC Tenant',
            scopePath: null,
            inherit: false,
            grantedAt: '2026-04-18T09:00:00.000Z',
            expiresAt: null,
          },
        ];

        return {
          id: 'assignment-1',
          userId: 'user-1',
          roleId: 'tenant-role-platform-admin',
          scopeType: 'tenant',
          scopeId: null,
          inherit: false,
          grantedAt: '2026-04-18T09:00:00.000Z',
          snapshotUpdateQueued: true,
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(
      <UserEditorScreen tenantId="tenant-ac" systemUserId="user-1" mode="edit" workspaceKind="ac" />
    );

    expect(await screen.findByRole('heading', { name: 'Alice' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Platform Administrator' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Talent Manager' })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByLabelText('Role')).toHaveValue('role-1');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Assign role' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/users/user-1/roles',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            roleCode: 'PLATFORM_ADMIN',
            scopeType: 'tenant',
            scopeId: null,
            inherit: false,
            expiresAt: null,
          }),
        })
      );
    });

    expect(await screen.findByText('Platform Administrator was assigned.')).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: 'Platform Administrator' })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'No compatible roles' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Assign role' })).toBeDisabled();
  });

  it('keeps role permission denial compact inside the role assignment section', async () => {
    const detail = {
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
      roleAssignments: [] as Array<Record<string, unknown>>,
      scopeAccess: [],
    };

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/roles') {
        return [
          {
            id: 'role-1',
            code: 'ADMIN',
            name: localizedFixture('Administrator', { zh_HANS: '管理员' }),
            description: 'Full access',
            isSystem: true,
            isActive: true,
            permissionCount: 1,
            userCount: 1,
            createdAt: '2026-04-17T01:00:00.000Z',
            updatedAt: '2026-04-17T02:00:00.000Z',
          },
        ];
      }

      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return organizationTreeResponse;
      }

      if (path === '/api/v1/permissions/check' && init?.method === 'POST') {
        return {
          results: [
            {
              resource: 'system_user',
              action: 'admin',
              checkedAction: 'admin',
              allowed: false,
            },
          ],
        };
      }

      if (path === '/api/v1/system-users/user-1' && !init) {
        return detail;
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<UserEditorScreen tenantId="tenant-1" systemUserId="user-1" mode="edit" />);

    expect(await screen.findByRole('heading', { name: 'Alice' })).toBeInTheDocument();
    expect(screen.getByText('Role assignment unavailable for this scope')).toBeInTheDocument();
    expect(screen.getByLabelText('Display name')).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Assign role' })).not.toBeInTheDocument();
  });
});
