// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockListRoles = vi.hoisted(() => vi.fn());
const mockDeleteRole = vi.hoisted(() => vi.fn());
const mockToastSuccess = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());

vi.mock('@/domains/tenant-organization-rbac/api/ac-role-management.api', () => ({
  acRoleManagementDomainApi: {
    listRoles: (...args: unknown[]) => mockListRoles(...args),
    deleteRole: (...args: unknown[]) => mockDeleteRole(...args),
  },
}));

vi.mock('@/components/admin/create-role-dialog', () => ({
  CreateRoleDialog: () => null,
}));

vi.mock('@/components/admin/edit-role-dialog', () => ({
  EditRoleDialog: () => null,
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

import { AdminRolesScreen } from '@/domains/tenant-organization-rbac/screens/AdminRolesScreen';

describe('AdminRolesScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListRoles.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'role-1',
          code: 'OPS_MANAGER',
          nameEn: 'Operations Manager',
          description: 'Admin role',
          isActive: true,
          isSystem: false,
          permissionCount: 3,
          userCount: 0,
        },
      ],
    });
    mockDeleteRole.mockResolvedValue({
      success: true,
    });
  });

  it('loads roles and deletes a role through the confirm dialog', async () => {
    render(<AdminRolesScreen />);

    expect(await screen.findByText('Operations Manager')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'deleteRoleAriaLabel' }));

    expect(await screen.findByText('confirmDelete')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'delete' }));

    await waitFor(() => {
      expect(mockDeleteRole).toHaveBeenCalledWith('role-1');
    });

    expect(mockToastSuccess).toHaveBeenCalledWith('success');
  });
});
