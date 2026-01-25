// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ActionType, EffectType, Permission, ResourceDefinition } from '@tcrn/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PermissionMatrix } from '@/components/rbac/permission-matrix';

// Test data factories
function createTestResources(): ResourceDefinition[] {
  return [
    {
      module: 'customer',
      module_name: 'Customer Management',
      resources: [
        {
          code: 'customer.profile',
          name: 'Customer Profile',
          actions: [ActionType.READ, ActionType.WRITE, ActionType.DELETE],
        },
        {
          code: 'customer.pii',
          name: 'Customer PII',
          actions: [ActionType.READ, ActionType.ADMIN],
        },
      ],
    },
    {
      module: 'report',
      module_name: 'Report Module',
      resources: [
        {
          code: 'report.mfr',
          name: 'MFR Report',
          actions: [ActionType.READ, ActionType.WRITE, ActionType.EXECUTE],
        },
      ],
    },
  ];
}

function createTestPermissions(): Permission[] {
  return [
    // Customer Profile permissions
    { id: 'perm-1', resource_code: 'customer.profile', action: ActionType.READ, effect: EffectType.ALLOW },
    { id: 'perm-2', resource_code: 'customer.profile', action: ActionType.WRITE, effect: EffectType.ALLOW },
    { id: 'perm-3', resource_code: 'customer.profile', action: ActionType.DELETE, effect: EffectType.ALLOW },
    // Customer PII permissions
    { id: 'perm-4', resource_code: 'customer.pii', action: ActionType.READ, effect: EffectType.ALLOW },
    { id: 'perm-5', resource_code: 'customer.pii', action: ActionType.ADMIN, effect: EffectType.ALLOW },
    // Report MFR permissions
    { id: 'perm-6', resource_code: 'report.mfr', action: ActionType.READ, effect: EffectType.ALLOW },
    { id: 'perm-7', resource_code: 'report.mfr', action: ActionType.WRITE, effect: EffectType.ALLOW },
    { id: 'perm-8', resource_code: 'report.mfr', action: ActionType.EXECUTE, effect: EffectType.ALLOW },
  ];
}

describe('PermissionMatrix Component', () => {
  let mockOnChange: (ids: string[]) => void;
  let testResources: ResourceDefinition[];
  let testPermissions: Permission[];

  beforeEach(() => {
    mockOnChange = vi.fn();
    testResources = createTestResources();
    testPermissions = createTestPermissions();
  });

  describe('Basic Rendering', () => {
    it('should render all modules with correct titles', () => {
      render(
        <PermissionMatrix
          resources={testResources}
          selectedPermissionIds={[]}
          permissions={testPermissions}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Customer Management')).toBeInTheDocument();
      expect(screen.getByText('Report Module')).toBeInTheDocument();
    });

    it('should render all resources within modules', () => {
      render(
        <PermissionMatrix
          resources={testResources}
          selectedPermissionIds={[]}
          permissions={testPermissions}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Customer Profile')).toBeInTheDocument();
      expect(screen.getByText('customer.profile')).toBeInTheDocument();
      expect(screen.getByText('Customer PII')).toBeInTheDocument();
      expect(screen.getByText('MFR Report')).toBeInTheDocument();
    });

    it('should render action labels for each resource', () => {
      render(
        <PermissionMatrix
          resources={testResources}
          selectedPermissionIds={[]}
          permissions={testPermissions}
          onChange={mockOnChange}
        />
      );

      // Check action labels exist
      expect(screen.getAllByText('read').length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText('write').length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('delete')).toBeInTheDocument();
      expect(screen.getByText('admin')).toBeInTheDocument();
      expect(screen.getByText('execute')).toBeInTheDocument();
    });

    it('should render "All" checkbox for each resource row', () => {
      render(
        <PermissionMatrix
          resources={testResources}
          selectedPermissionIds={[]}
          permissions={testPermissions}
          onChange={mockOnChange}
        />
      );

      // 3 resources = 3 "All" labels
      expect(screen.getAllByText('All').length).toBe(3);
    });
  });

  describe('Permission Selection', () => {
    it('should show selected permissions as checked', () => {
      render(
        <PermissionMatrix
          resources={testResources}
          selectedPermissionIds={['perm-1', 'perm-4']}
          permissions={testPermissions}
          onChange={mockOnChange}
        />
      );

      // Find checkboxes by their id (which is the permission id)
      const checkbox1 = document.getElementById('perm-1') as HTMLInputElement;
      const checkbox4 = document.getElementById('perm-4') as HTMLInputElement;
      const checkbox2 = document.getElementById('perm-2') as HTMLInputElement;

      expect(checkbox1).toBeChecked();
      expect(checkbox4).toBeChecked();
      expect(checkbox2).not.toBeChecked();
    });

    it('should call onChange when toggling a permission on', async () => {
      const user = userEvent.setup();
      
      render(
        <PermissionMatrix
          resources={testResources}
          selectedPermissionIds={[]}
          permissions={testPermissions}
          onChange={mockOnChange}
        />
      );

      const checkbox = document.getElementById('perm-1') as HTMLInputElement;
      await user.click(checkbox);

      expect(mockOnChange).toHaveBeenCalledWith(['perm-1']);
    });

    it('should call onChange when toggling a permission off', async () => {
      const user = userEvent.setup();
      
      render(
        <PermissionMatrix
          resources={testResources}
          selectedPermissionIds={['perm-1', 'perm-2']}
          permissions={testPermissions}
          onChange={mockOnChange}
        />
      );

      const checkbox = document.getElementById('perm-1') as HTMLInputElement;
      await user.click(checkbox);

      expect(mockOnChange).toHaveBeenCalledWith(['perm-2']);
    });
  });

  describe('Row Selection (All checkbox)', () => {
    it('should select all permissions in row when clicking "All"', async () => {
      const user = userEvent.setup();
      
      render(
        <PermissionMatrix
          resources={testResources}
          selectedPermissionIds={[]}
          permissions={testPermissions}
          onChange={mockOnChange}
        />
      );

      // Click on "All" for customer.profile (first resource)
      const allCheckbox = document.getElementById('all-customer.profile') as HTMLInputElement;
      await user.click(allCheckbox);

      // Should select all 3 permissions for customer.profile
      expect(mockOnChange).toHaveBeenCalledWith(['perm-1', 'perm-2', 'perm-3']);
    });

    it('should deselect all permissions in row when all are selected', async () => {
      const user = userEvent.setup();
      
      render(
        <PermissionMatrix
          resources={testResources}
          selectedPermissionIds={['perm-1', 'perm-2', 'perm-3', 'perm-6']}
          permissions={testPermissions}
          onChange={mockOnChange}
        />
      );

      // All customer.profile permissions are selected, clicking "All" should deselect
      const allCheckbox = document.getElementById('all-customer.profile') as HTMLInputElement;
      await user.click(allCheckbox);

      // Should keep only perm-6 (from another resource)
      expect(mockOnChange).toHaveBeenCalledWith(['perm-6']);
    });

    it('should show "All" as checked when all row permissions are selected', () => {
      render(
        <PermissionMatrix
          resources={testResources}
          selectedPermissionIds={['perm-1', 'perm-2', 'perm-3']}
          permissions={testPermissions}
          onChange={mockOnChange}
        />
      );

      const allCheckbox = document.getElementById('all-customer.profile') as HTMLInputElement;
      expect(allCheckbox).toBeChecked();
    });

    it('should show "All" as unchecked when only some row permissions are selected', () => {
      render(
        <PermissionMatrix
          resources={testResources}
          selectedPermissionIds={['perm-1', 'perm-2']}
          permissions={testPermissions}
          onChange={mockOnChange}
        />
      );

      const allCheckbox = document.getElementById('all-customer.profile') as HTMLInputElement;
      expect(allCheckbox).not.toBeChecked();
    });
  });

  describe('Read-Only Mode', () => {
    it('should disable all checkboxes when readOnly is true', () => {
      render(
        <PermissionMatrix
          resources={testResources}
          selectedPermissionIds={['perm-1']}
          permissions={testPermissions}
          onChange={mockOnChange}
          readOnly={true}
        />
      );

      const checkbox = document.getElementById('perm-1') as HTMLInputElement;
      const allCheckbox = document.getElementById('all-customer.profile') as HTMLInputElement;

      expect(checkbox).toBeDisabled();
      expect(allCheckbox).toBeDisabled();
    });

    it('should not call onChange when clicking in readOnly mode', async () => {
      const user = userEvent.setup();
      
      render(
        <PermissionMatrix
          resources={testResources}
          selectedPermissionIds={[]}
          permissions={testPermissions}
          onChange={mockOnChange}
          readOnly={true}
        />
      );

      const checkbox = document.getElementById('perm-1') as HTMLInputElement;
      await user.click(checkbox);

      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('Action Type Styling', () => {
    it('should apply special styling to ADMIN action', () => {
      render(
        <PermissionMatrix
          resources={testResources}
          selectedPermissionIds={[]}
          permissions={testPermissions}
          onChange={mockOnChange}
        />
      );

      const adminLabel = screen.getByText('admin');
      expect(adminLabel).toHaveClass('text-amber-600');
      expect(adminLabel).toHaveClass('font-bold');
    });

    it('should apply special styling to DELETE action', () => {
      render(
        <PermissionMatrix
          resources={testResources}
          selectedPermissionIds={[]}
          permissions={testPermissions}
          onChange={mockOnChange}
        />
      );

      const deleteLabel = screen.getByText('delete');
      expect(deleteLabel).toHaveClass('text-red-500');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty resources array', () => {
      render(
        <PermissionMatrix
          resources={[]}
          selectedPermissionIds={[]}
          permissions={testPermissions}
          onChange={mockOnChange}
        />
      );

      // Should render empty container without errors
      expect(screen.queryByText('Customer Management')).not.toBeInTheDocument();
    });

    it('should handle empty permissions array', () => {
      render(
        <PermissionMatrix
          resources={testResources}
          selectedPermissionIds={[]}
          permissions={[]}
          onChange={mockOnChange}
        />
      );

      // Resources should render but without action checkboxes
      expect(screen.getByText('Customer Profile')).toBeInTheDocument();
      // No individual action checkboxes should be rendered
      expect(screen.queryByText('read')).not.toBeInTheDocument();
    });

    it('should handle resource with no matching permissions', () => {
      const resourcesWithNoMatch: ResourceDefinition[] = [
        {
          module: 'unknown',
          module_name: 'Unknown Module',
          resources: [
            {
              code: 'unknown.resource',
              name: 'Unknown Resource',
              actions: [ActionType.READ],
            },
          ],
        },
      ];

      render(
        <PermissionMatrix
          resources={resourcesWithNoMatch}
          selectedPermissionIds={[]}
          permissions={testPermissions}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Unknown Module')).toBeInTheDocument();
      expect(screen.getByText('Unknown Resource')).toBeInTheDocument();
    });

    it('should preserve unrelated permissions when selecting/deselecting', async () => {
      const user = userEvent.setup();
      
      render(
        <PermissionMatrix
          resources={testResources}
          selectedPermissionIds={['perm-6', 'perm-7']}
          permissions={testPermissions}
          onChange={mockOnChange}
        />
      );

      // Toggle a permission from customer.profile
      const checkbox = document.getElementById('perm-1') as HTMLInputElement;
      await user.click(checkbox);

      // Should add perm-1 while keeping perm-6 and perm-7
      expect(mockOnChange).toHaveBeenCalledWith(['perm-6', 'perm-7', 'perm-1']);
    });
  });
});
