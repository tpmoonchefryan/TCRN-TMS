import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RoleEditorScreen } from '@/domains/user-management/screens/RoleEditorScreen';

const mockRequest = vi.fn();
const mockRequestEnvelope = vi.fn();
const mockReplace = vi.fn();
const localeState = {
  currentLocale: 'en' as 'en' | 'zh' | 'ja',
  selectedLocale: 'en' as 'en' | 'zh_HANS' | 'zh_HANT' | 'ja' | 'ko' | 'fr',
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
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

describe('RoleEditorScreen', () => {
  beforeEach(() => {
    localeState.currentLocale = 'en';
    localeState.selectedLocale = 'en';
    mockRequest.mockReset();
    mockRequestEnvelope.mockReset();
    mockReplace.mockReset();
  });

  it('creates a role from the dedicated route-level editor and redirects to the role page', async () => {
    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/system-roles' && init?.method === 'POST') {
        return {
          id: 'role-2',
          code: 'REVIEWER',
          nameEn: 'Reviewer',
          nameZh: null,
          nameJa: null,
          translations: {
            en: 'Reviewer',
          },
          description: null,
          isSystem: false,
          isActive: true,
          permissionCount: 1,
          userCount: 0,
          createdAt: '2026-04-18T08:00:00.000Z',
          updatedAt: '2026-04-18T08:00:00.000Z',
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<RoleEditorScreen tenantId="tenant-1" mode="create" />);

    fireEvent.change(screen.getByLabelText('Role code'), {
      target: { value: 'reviewer' },
    });
    fireEvent.change(screen.getByLabelText('English role name'), {
      target: { value: 'Reviewer' },
    });
    fireEvent.change(screen.getByLabelText('System User Read'), {
      target: { value: 'grant' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create role' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/system-roles',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: 'REVIEWER',
            nameEn: 'Reviewer',
            translations: {
              en: 'Reviewer',
            },
            isActive: true,
            permissions: [
              {
                resource: 'system_user',
                action: 'read',
                effect: 'grant',
              },
            ],
          }),
        }),
      );
    });

    expect(mockReplace).toHaveBeenCalledWith('/tenant/tenant-1/user-management/roles/role-2');
  });

  it('loads role detail and updates role permissions from the dedicated editor route', async () => {
    const scopeBindings = Array.from({ length: 21 }, (_, index) => ({
      scopeType: 'talent' as const,
      scopeId: `talent-${index + 1}`,
      scopeName: `Tokino Sora ${index + 1}`,
      scopePath: `/TOKYO/SORA-${index + 1}`,
      assignmentCount: index + 1,
      userCount: index + 1,
      inheritedAssignmentCount: index === 0 ? 1 : 0,
    }));
    const assignedUsers = Array.from({ length: 21 }, (_, index) => ({
      assignmentId: `assignment-${index + 1}`,
      userId: `user-${index + 1}`,
      username: `alice-${index + 1}`,
      email: `alice-${index + 1}@example.com`,
      displayName: `Alice ${index + 1}`,
      avatarUrl: null,
      isActive: true,
      scopeType: 'talent' as const,
      scopeId: `talent-${index + 1}`,
      scopeName: `Tokino Sora ${index + 1}`,
      scopePath: `/TOKYO/SORA-${index + 1}`,
      inherit: false,
      grantedAt: '2026-04-17T05:00:00.000Z',
      expiresAt: null,
    }));

    let detail = {
      id: 'role-1',
      code: 'EDITOR',
      nameEn: 'Editor',
      nameZh: null,
      nameJa: null,
      translations: {
        en: 'Editor',
      },
      description: 'Can manage tenant content.',
      isSystem: false,
      isActive: true,
      permissions: [
        {
          resource: 'system_user',
          action: 'read',
          effect: 'grant',
        },
      ],
      permissionCount: 1,
      userCount: 3,
      createdAt: '2026-04-17T01:00:00.000Z',
      updatedAt: '2026-04-17T02:00:00.000Z',
      scopeBindings,
      assignedUsers,
    };

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/system-roles/role-1' && !init) {
        return detail;
      }

      if (path === '/api/v1/system-roles/role-1' && init?.method === 'PATCH') {
        detail = {
          ...detail,
          nameEn: 'Senior Editor',
          permissions: [
            {
              resource: 'system_user',
              action: 'read',
              effect: 'deny',
            },
            {
              resource: 'role',
              action: 'delete',
              effect: 'grant',
            },
          ],
          permissionCount: 2,
          updatedAt: '2026-04-18T09:00:00.000Z',
        };

        return {
          id: 'role-1',
          code: 'EDITOR',
          nameEn: 'Senior Editor',
          nameZh: null,
          nameJa: null,
          translations: {
            en: 'Senior Editor',
          },
          description: 'Can manage tenant content.',
          isSystem: false,
          isActive: true,
          permissionCount: 2,
          userCount: 3,
          createdAt: '2026-04-17T01:00:00.000Z',
          updatedAt: '2026-04-18T09:00:00.000Z',
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<RoleEditorScreen tenantId="tenant-1" systemRoleId="role-1" mode="edit" />);

    expect(await screen.findByRole('heading', { name: 'Editor' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('EDITOR')).toBeInTheDocument();
    expect(screen.getByLabelText('System User Read')).toHaveValue('grant');
    expect(screen.getByText('Assignment-derived scope bindings')).toBeInTheDocument();
    expect(screen.getByText('Assigned users')).toBeInTheDocument();
    expect(screen.getAllByText('Tokino Sora 1').length).toBeGreaterThan(0);
    expect(screen.getByText('alice-1@example.com')).toBeInTheDocument();

    const nextButtons = screen.getAllByRole('button', { name: 'Next' });
    fireEvent.click(nextButtons[0]);
    expect(await screen.findByText('Tokino Sora 21')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Next' })[1]);
    expect(await screen.findByText('alice-21@example.com')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('English role name'), {
      target: { value: 'Senior Editor' },
    });
    fireEvent.change(screen.getByLabelText('System User Read'), {
      target: { value: 'deny' },
    });
    fireEvent.change(screen.getByLabelText('Role Delete'), {
      target: { value: 'grant' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save role' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/system-roles/role-1',
        expect.objectContaining({
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nameEn: 'Senior Editor',
            translations: {
              en: 'Senior Editor',
            },
            description: 'Can manage tenant content.',
            isActive: true,
            permissions: [
              {
                resource: 'system_user',
                action: 'read',
                effect: 'deny',
              },
              {
                resource: 'role',
                action: 'delete',
                effect: 'grant',
              },
            ],
          }),
        }),
      );
    });

    expect(await screen.findByText('Senior Editor was updated.')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Senior Editor' })).toBeInTheDocument();
  });
});
