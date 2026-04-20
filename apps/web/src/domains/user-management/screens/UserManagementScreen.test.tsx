import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserManagementScreen } from '@/domains/user-management/screens/UserManagementScreen';
import type { ApiPaginationMeta, ApiSuccessEnvelope } from '@/platform/http/api';

const mockRequest = vi.fn();
const mockRequestEnvelope = vi.fn();
const mockReplace = vi.fn();
let searchQuery = '';
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

HTMLDialogElement.prototype.showModal = vi.fn(function mockShowModal(this: HTMLDialogElement) {
  this.setAttribute('open', '');
});
HTMLDialogElement.prototype.close = vi.fn(function mockClose(this: HTMLDialogElement) {
  this.removeAttribute('open');
});

function buildSuccessEnvelope<T>(
  data: T,
  pagination?: ApiPaginationMeta,
): ApiSuccessEnvelope<T> {
  return {
    success: true,
    data,
    meta: pagination ? { pagination } : undefined,
  };
}

vi.mock('next/navigation', () => ({
  usePathname: () => '/tenant/tenant-1/user-management',
  useRouter: () => ({
    replace: mockReplace,
  }),
  useSearchParams: () => new URLSearchParams(searchQuery),
}));

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    request: mockRequest,
    requestEnvelope: mockRequestEnvelope,
  }),
}));

vi.mock('@/platform/runtime/locale/locale-provider', () => ({
  useRuntimeLocale: () => localeState,
}));

describe('UserManagementScreen', () => {
  beforeEach(() => {
    searchQuery = '';
    localeState.currentLocale = 'en';
    mockReplace.mockReset();
    mockRequest.mockReset();
    mockRequestEnvelope.mockReset();
  });

  it('renders the rebuilt users workspace and switches to roles and delegation tabs', async () => {
    mockRequestEnvelope.mockImplementation(async (path: string) => {
      if (path === '/api/v1/system-users?page=1&pageSize=20') {
        return buildSuccessEnvelope([
          {
            id: 'user-1',
            username: 'alice',
            email: 'alice@example.com',
            displayName: 'Alice',
            avatarUrl: null,
            isActive: true,
            isTotpEnabled: true,
            forceReset: false,
            lastLoginAt: '2026-04-17T04:00:00.000Z',
            createdAt: '2026-04-17T03:00:00.000Z',
          },
        ]);
      }

      throw new Error(`Unhandled requestEnvelope: ${path}`);
    });

    mockRequest.mockImplementation(async (path: string) => {

      if (path === '/api/v1/system-roles?isActive=true') {
        return [
          {
            id: 'role-1',
            code: 'EDITOR',
            nameEn: 'Editor',
            nameZh: null,
            nameJa: null,
            description: 'Can manage tenant content.',
            isSystem: false,
            isActive: true,
            permissionCount: 12,
            userCount: 3,
            createdAt: '2026-04-17T01:00:00.000Z',
            updatedAt: '2026-04-17T02:00:00.000Z',
          },
        ];
      }

      if (path === '/api/v1/delegated-admins') {
        return [
          {
            id: 'delegation-1',
            scopeType: 'talent',
            scopeId: 'talent-1',
            scopeName: 'Tokino Sora',
            delegateType: 'user',
            delegateId: 'user-2',
            delegateName: 'Operator Alice',
            grantedAt: '2026-04-17T05:00:00.000Z',
            grantedBy: {
              id: 'user-9',
              username: 'owner',
            },
          },
        ];
      }

      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return organizationTreeResponse;
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<UserManagementScreen />);

    expect(await screen.findByRole('heading', { name: 'Identity, role, and delegation control' })).toBeInTheDocument();
    expect(await screen.findByText('alice@example.com')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Roles/i }));

    expect(mockReplace).toHaveBeenCalledWith('/tenant/tenant-1/user-management?tab=roles');
    expect(await screen.findByText('EDITOR')).toBeInTheDocument();
    expect(screen.getByText('Can manage tenant content.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Delegation/i }));

    expect(mockReplace).toHaveBeenCalledWith('/tenant/tenant-1/user-management?tab=delegation');
    expect(await screen.findByText('Operator Alice')).toBeInTheDocument();
    expect(screen.getByText('Tokino Sora')).toBeInTheDocument();
  });

  it('deactivates a user through the shared confirm dialog and refreshes the list', async () => {
    let isActive = true;

    mockRequestEnvelope.mockImplementation(async (path: string) => {
      if (path === '/api/v1/system-users?page=1&pageSize=20') {
        return buildSuccessEnvelope([
          {
            id: 'user-1',
            username: 'alice',
            email: 'alice@example.com',
            displayName: 'Alice',
            avatarUrl: null,
            isActive,
            isTotpEnabled: false,
            forceReset: false,
            lastLoginAt: null,
            createdAt: '2026-04-17T03:00:00.000Z',
          },
        ]);
      }

      throw new Error(`Unhandled requestEnvelope: ${path}`);
    });

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {

      if (path === '/api/v1/system-users/user-1/deactivate' && init?.method === 'POST') {
        isActive = false;
        return {
          id: 'user-1',
          isActive: false,
        };
      }

      if (path === '/api/v1/system-roles?isActive=true') {
        return [];
      }

      if (path === '/api/v1/delegated-admins') {
        return [];
      }

      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return organizationTreeResponse;
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<UserManagementScreen />);

    expect(await screen.findByText('alice@example.com')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));

    expect(await screen.findByText('Deactivate Alice?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate user' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/system-users/user-1/deactivate',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });

    expect(await screen.findByText('Alice was deactivated.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Reactivate' })).toBeInTheDocument();
  });

  it('keeps the inventory page focused and links user create/edit to dedicated routes', async () => {
    mockRequestEnvelope.mockImplementation(async (path: string) => {
      if (path === '/api/v1/system-users?page=1&pageSize=20') {
        return buildSuccessEnvelope([
          {
            id: 'user-1',
            username: 'alice',
            email: 'alice@example.com',
            displayName: 'Alice',
            avatarUrl: null,
            isActive: true,
            isTotpEnabled: false,
            forceReset: false,
            lastLoginAt: null,
            createdAt: '2026-04-17T03:00:00.000Z',
          },
        ]);
      }

      throw new Error(`Unhandled requestEnvelope: ${path}`);
    });

    mockRequest.mockImplementation(async (path: string) => {

      if (path === '/api/v1/system-roles?isActive=true') {
        return [];
      }

      if (path === '/api/v1/delegated-admins') {
        return [];
      }

      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return organizationTreeResponse;
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<UserManagementScreen />);

    expect(await screen.findByText('alice@example.com')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Create system user' })).not.toBeInTheDocument();

    const createLink = screen.getByRole('link', { name: 'New user' });
    const editLink = screen.getByRole('link', { name: 'Edit' });

    expect(createLink).toHaveAttribute('href', '/tenant/tenant-1/user-management/new');
    expect(editLink).toHaveAttribute('href', '/tenant/tenant-1/user-management/user-1');
  });

  it('keeps the role inventory focused and links role create/edit to dedicated routes', async () => {
    searchQuery = 'tab=roles';

    mockRequestEnvelope.mockImplementation(async (path: string) => {
      if (path === '/api/v1/system-users?page=1&pageSize=20') {
        return buildSuccessEnvelope([]);
      }

      throw new Error(`Unhandled requestEnvelope: ${path}`);
    });

    mockRequest.mockImplementation(async (path: string) => {

      if (path === '/api/v1/system-roles?isActive=true') {
        return [
          {
            id: 'role-1',
            code: 'EDITOR',
            nameEn: 'Editor',
            nameZh: null,
            nameJa: null,
            description: 'Can manage tenant content.',
            isSystem: false,
            isActive: true,
            permissionCount: 12,
            userCount: 3,
            createdAt: '2026-04-17T01:00:00.000Z',
            updatedAt: '2026-04-17T02:00:00.000Z',
          },
          {
            id: 'role-2',
            code: 'VIEWER',
            nameEn: 'Viewer',
            nameZh: null,
            nameJa: null,
            description: 'Read only access.',
            isSystem: true,
            isActive: true,
            permissionCount: 4,
            userCount: 9,
            createdAt: '2026-04-17T08:00:00.000Z',
            updatedAt: '2026-04-17T08:00:00.000Z',
          },
        ];
      }

      if (path === '/api/v1/delegated-admins') {
        return [];
      }

      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return organizationTreeResponse;
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<UserManagementScreen />);

    expect(await screen.findByText('System roles')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Create system role' })).not.toBeInTheDocument();

    const newRoleLink = screen.getByRole('link', { name: 'New role' });
    const editLinks = screen.getAllByRole('link', { name: 'Edit' });

    expect(newRoleLink).toHaveAttribute('href', '/tenant/tenant-1/user-management/roles/new');
    expect(editLinks[0]).toHaveAttribute('href', '/tenant/tenant-1/user-management/roles/role-1');
    expect(editLinks[1]).toHaveAttribute('href', '/tenant/tenant-1/user-management/roles/role-2');
  });

  it('keeps tenant role inventory filtered to roles valid for the current workspace', async () => {
    searchQuery = 'tab=roles';

    mockRequestEnvelope.mockImplementation(async (path: string) => {
      if (path === '/api/v1/system-users?page=1&pageSize=20') {
        return buildSuccessEnvelope([]);
      }

      throw new Error(`Unhandled requestEnvelope: ${path}`);
    });

    mockRequest.mockImplementation(async (path: string) => {

      if (path === '/api/v1/system-roles?isActive=true') {
        return [
          {
            id: 'role-1',
            code: 'ADMIN',
            nameEn: 'Administrator',
            nameZh: '管理员',
            nameJa: null,
            description: 'Tenant administrator',
            isSystem: true,
            isActive: true,
            permissionCount: 12,
            userCount: 3,
            createdAt: '2026-04-17T01:00:00.000Z',
            updatedAt: '2026-04-17T02:00:00.000Z',
          },
          {
            id: 'role-2',
            code: 'PLATFORM_ADMIN',
            nameEn: 'Platform Administrator',
            nameZh: null,
            nameJa: null,
            description: 'AC only',
            isSystem: true,
            isActive: true,
            permissionCount: 1,
            userCount: 0,
            createdAt: '2026-04-17T08:00:00.000Z',
            updatedAt: '2026-04-17T08:00:00.000Z',
          },
        ];
      }

      if (path === '/api/v1/delegated-admins') {
        return [];
      }

      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return organizationTreeResponse;
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<UserManagementScreen />);

    expect(await screen.findByText('System roles')).toBeInTheDocument();
    expect(screen.getByText('Administrator')).toBeInTheDocument();
    expect(screen.queryByText('Platform Administrator')).not.toBeInTheDocument();
  });

  it('creates delegated administration using live scope options instead of raw UUID input', async () => {
    searchQuery = 'tab=delegation';
    const delegations: Array<{
      id: string;
      scopeType: 'subsidiary' | 'talent';
      scopeId: string;
      scopeName: string;
      delegateType: 'user' | 'role';
      delegateId: string;
      delegateName: string;
      grantedAt: string;
      grantedBy: { id: string; username: string } | null;
    }> = [];

    mockRequestEnvelope.mockImplementation(async (path: string) => {
      if (path === '/api/v1/system-users?page=1&pageSize=20') {
        return buildSuccessEnvelope([
          {
            id: 'user-1',
            username: 'alice',
            email: 'alice@example.com',
            displayName: 'Alice',
            avatarUrl: null,
            isActive: true,
            isTotpEnabled: true,
            forceReset: false,
            lastLoginAt: null,
            createdAt: '2026-04-17T03:00:00.000Z',
          },
        ]);
      }

      throw new Error(`Unhandled requestEnvelope: ${path}`);
    });

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {

      if (path === '/api/v1/system-roles?isActive=true') {
        return [
          {
            id: 'role-1',
            code: 'EDITOR',
            nameEn: 'Editor',
            nameZh: null,
            nameJa: null,
            description: 'Can manage tenant content.',
            isSystem: false,
            isActive: true,
            permissionCount: 12,
            userCount: 3,
            createdAt: '2026-04-17T01:00:00.000Z',
            updatedAt: '2026-04-17T02:00:00.000Z',
          },
        ];
      }

      if (path === '/api/v1/delegated-admins' && !init) {
        return delegations;
      }

      if (path === '/api/v1/delegated-admins' && init?.method === 'POST') {
        delegations.push({
          id: 'delegation-1',
          scopeType: 'talent',
          scopeId: 'talent-1',
          scopeName: 'Tokino Sora',
          delegateType: 'role',
          delegateId: 'role-1',
          delegateName: 'Editor',
          grantedAt: '2026-04-17T08:00:00.000Z',
          grantedBy: {
            id: 'user-9',
            username: 'owner',
          },
        });

        return {
          id: 'delegation-1',
          scopeType: 'talent',
          scopeId: 'talent-1',
          scopeName: 'Tokino Sora',
          delegateType: 'role',
          delegateId: 'role-1',
          delegateName: 'Editor',
          grantedAt: '2026-04-17T08:00:00.000Z',
        };
      }

      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return organizationTreeResponse;
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<UserManagementScreen />);

    expect(await screen.findByText('Grant delegated admin')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Scope type'), {
      target: { value: 'talent' },
    });
    fireEvent.change(screen.getByLabelText('Delegate type'), {
      target: { value: 'role' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Grant delegation' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/delegated-admins',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            scopeType: 'talent',
            scopeId: 'talent-1',
            delegateType: 'role',
            delegateId: 'role-1',
          }),
        }),
      );
    });

    expect(await screen.findByText('Editor was granted delegated administration for Tokino Sora.')).toBeInTheDocument();
    expect((await screen.findAllByText('Tokino Sora')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Editor')).length).toBeGreaterThan(0);
  });

  it('renders zh runtime copy and locale-aware timestamps', async () => {
    localeState.currentLocale = 'zh';

    mockRequestEnvelope.mockImplementation(async (path: string) => {
      if (path === '/api/v1/system-users?page=1&pageSize=20') {
        return buildSuccessEnvelope([
          {
            id: 'user-1',
            username: 'alice',
            email: 'alice@example.com',
            displayName: 'Alice',
            avatarUrl: null,
            isActive: true,
            isTotpEnabled: false,
            forceReset: false,
            lastLoginAt: '2026-04-17T04:00:00.000Z',
            createdAt: '2026-04-17T03:00:00.000Z',
          },
        ]);
      }

      throw new Error(`Unhandled requestEnvelope: ${path}`);
    });

    mockRequest.mockImplementation(async (path: string) => {

      if (path === '/api/v1/system-roles?isActive=true') {
        return [];
      }

      if (path === '/api/v1/delegated-admins') {
        return [];
      }

      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return organizationTreeResponse;
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<UserManagementScreen />);

    expect(await screen.findByRole('heading', { name: '身份、角色与委派管理' })).toBeInTheDocument();

    const expectedCreatedAt = new Intl.DateTimeFormat('zh', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date('2026-04-17T03:00:00.000Z'));

    expect(await screen.findByText(expectedCreatedAt)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '新建用户' })).toHaveAttribute(
      'href',
      '/tenant/tenant-1/user-management/new',
    );
  });

  it('supports paginated users from server envelopes and local pagination for roles and delegation', async () => {
    let usersPage = 1;
    searchQuery = '';

    const paginatedUsers = [
      ...Array.from({ length: 20 }, (_, index) => ({
        id: `user-${index + 1}`,
        username: `user${index + 1}`,
        email: `user${index + 1}@example.com`,
        displayName: `User ${index + 1}`,
        avatarUrl: null,
        isActive: true,
        isTotpEnabled: false,
        forceReset: false,
        lastLoginAt: null,
        createdAt: '2026-04-17T03:00:00.000Z',
      })),
      {
        id: 'user-21',
        username: 'user21',
        email: 'user21@example.com',
        displayName: 'User 21',
        avatarUrl: null,
        isActive: true,
        isTotpEnabled: false,
        forceReset: false,
        lastLoginAt: null,
        createdAt: '2026-04-17T03:00:00.000Z',
      },
    ];
    const roleItems = Array.from({ length: 21 }, (_, index) => ({
      id: `role-${index + 1}`,
      code: `ROLE_${index + 1}`,
      nameEn: `Role ${index + 1}`,
      nameZh: null,
      nameJa: null,
      description: `Role description ${index + 1}`,
      isSystem: false,
      isActive: true,
      permissionCount: index + 1,
      userCount: index + 1,
      createdAt: '2026-04-17T01:00:00.000Z',
      updatedAt: '2026-04-17T02:00:00.000Z',
    }));
    const delegations = Array.from({ length: 21 }, (_, index) => ({
      id: `delegation-${index + 1}`,
      scopeType: 'talent' as const,
      scopeId: `talent-${index + 1}`,
      scopeName: `Talent ${index + 1}`,
      delegateType: 'user' as const,
      delegateId: `delegate-${index + 1}`,
      delegateName: `Delegate ${index + 1}`,
      grantedAt: '2026-04-17T05:00:00.000Z',
      grantedBy: {
        id: 'user-9',
        username: 'owner',
      },
    }));

    mockRequestEnvelope.mockImplementation(async (path: string) => {
      if (path === '/api/v1/system-users?page=1&pageSize=20') {
        usersPage = 1;
        return buildSuccessEnvelope(paginatedUsers.slice(0, 20), {
          page: 1,
          pageSize: 20,
          totalCount: 21,
          totalPages: 2,
          hasNext: true,
          hasPrev: false,
        });
      }

      if (path === '/api/v1/system-users?page=2&pageSize=20') {
        usersPage = 2;
        return buildSuccessEnvelope(paginatedUsers.slice(20), {
          page: 2,
          pageSize: 20,
          totalCount: 21,
          totalPages: 2,
          hasNext: false,
          hasPrev: true,
        });
      }

      throw new Error(`Unhandled requestEnvelope: ${path}`);
    });

    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/system-roles?isActive=true') {
        return roleItems;
      }

      if (path === '/api/v1/delegated-admins') {
        return delegations;
      }

      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return organizationTreeResponse;
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<UserManagementScreen />);

    expect(await screen.findByText('user1@example.com')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/tenant/tenant-1/user-management?page=2');
    });

    expect(await screen.findByText('user21@example.com')).toBeInTheDocument();
    expect(usersPage).toBe(2);

    fireEvent.click(screen.getByRole('button', { name: /Roles/i }));
    expect(await screen.findByText('ROLE_1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('ROLE_21')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Delegation/i }));
    expect(await screen.findByText('Delegate 1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Delegate 21')).toBeInTheDocument();
  });
});
