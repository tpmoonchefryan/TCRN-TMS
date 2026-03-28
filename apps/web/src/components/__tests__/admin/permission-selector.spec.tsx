// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { RolePermissionInput } from '@tcrn/shared';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetResources = vi.fn();

vi.mock('@/lib/api/modules/permission', () => ({
  permissionApi: {
    getResources: (...args: unknown[]) => mockGetResources(...args),
  },
}));

import { PermissionSelector } from '@/components/admin/permission-selector';

describe('PermissionSelector', () => {
  const labels = {
    grant: 'Grant',
    deny: 'Deny',
    unset: 'Unset',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetResources.mockResolvedValue({
      success: true,
      data: [
        {
          module: 'customer',
          moduleName: 'Customer',
          resources: [
            {
              code: 'customer.export',
              name: 'Customer Export',
              actions: ['read', 'write'],
            },
          ],
        },
      ],
    });
  });

  it('shows existing deny effects as deny instead of treating them as generic checked permissions', async () => {
    render(
      <PermissionSelector
        value={[{ resource: 'customer.export', action: 'read', effect: 'deny' }]}
        onChange={vi.fn()}
        labels={labels}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Customer Export')).toBeInTheDocument();
    });

    expect(screen.getByTestId('perm-customer.export-read-deny')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('perm-customer.export-read-grant')).toHaveAttribute('aria-pressed', 'false');
  });

  it('emits explicit grant, deny, and unset transitions', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    const value: RolePermissionInput[] = [];

    const { rerender } = render(
      <PermissionSelector
        value={value}
        onChange={handleChange}
        labels={labels}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('perm-customer.export-read-grant')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('perm-customer.export-read-grant'));
    expect(handleChange).toHaveBeenLastCalledWith([
      { resource: 'customer.export', action: 'read', effect: 'grant' },
    ]);

    rerender(
      <PermissionSelector
        value={[{ resource: 'customer.export', action: 'read', effect: 'grant' }]}
        onChange={handleChange}
        labels={labels}
      />,
    );

    await user.click(screen.getByTestId('perm-customer.export-read-deny'));
    expect(handleChange).toHaveBeenLastCalledWith([
      { resource: 'customer.export', action: 'read', effect: 'deny' },
    ]);

    rerender(
      <PermissionSelector
        value={[{ resource: 'customer.export', action: 'read', effect: 'deny' }]}
        onChange={handleChange}
        labels={labels}
      />,
    );

    await user.click(screen.getByTestId('perm-customer.export-read-unset'));
    expect(handleChange).toHaveBeenLastCalledWith([]);
  });

  it('fails closed when resource loading fails', async () => {
    mockGetResources.mockRejectedValueOnce(new Error('network failed'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <PermissionSelector
        value={[]}
        onChange={vi.fn()}
        labels={labels}
      />,
    );

    await waitFor(() => {
      expect(mockGetResources).toHaveBeenCalled();
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(screen.queryByText('Customer Export')).not.toBeInTheDocument();
    expect(screen.queryByTestId('perm-customer.export-read-grant')).not.toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });
});
