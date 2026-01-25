// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActionType } from '@tcrn/shared';

// Mock auth store with different permission states
const mockHasPermission = vi.fn();

vi.mock('@/hooks/use-permission', () => ({
  usePermission: () => ({
    hasPermission: mockHasPermission,
    hasAnyPermission: vi.fn(),
    hasAllPermissions: vi.fn(),
    getPermittedActions: vi.fn(),
    userRoles: ['TENANT_ADMIN'],
  }),
}));

// Import after mocks
import { PermissionGuard, PermissionRender } from '@/components/auth/permission-guard';

describe('PermissionGuard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('should render children when user has permission', () => {
      mockHasPermission.mockReturnValue(true);

      render(
        <PermissionGuard resource="customer.profile" action={ActionType.READ}>
          <div data-testid="protected-content">Protected Content</div>
        </PermissionGuard>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(mockHasPermission).toHaveBeenCalledWith('customer.profile', ActionType.READ, undefined);
    });

    it('should not render children when user lacks permission', () => {
      mockHasPermission.mockReturnValue(false);

      render(
        <PermissionGuard resource="customer.profile" action={ActionType.DELETE}>
          <div data-testid="protected-content">Protected Content</div>
        </PermissionGuard>
      );

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should render fallback when user lacks permission', () => {
      mockHasPermission.mockReturnValue(false);

      render(
        <PermissionGuard 
          resource="customer.pii" 
          action={ActionType.READ}
          fallback={<div data-testid="fallback">Access Denied</div>}
        >
          <div data-testid="protected-content">Protected Content</div>
        </PermissionGuard>
      );

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      expect(screen.getByTestId('fallback')).toBeInTheDocument();
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });

    it('should not render fallback when user has permission', () => {
      mockHasPermission.mockReturnValue(true);

      render(
        <PermissionGuard 
          resource="customer.profile" 
          action={ActionType.READ}
          fallback={<div data-testid="fallback">Access Denied</div>}
        >
          <div data-testid="protected-content">Protected Content</div>
        </PermissionGuard>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.queryByTestId('fallback')).not.toBeInTheDocument();
    });
  });

  describe('Action type handling', () => {
    it('should handle single action type', () => {
      mockHasPermission.mockReturnValue(true);

      render(
        <PermissionGuard resource="customer.profile" action={ActionType.WRITE}>
          <button>Edit</button>
        </PermissionGuard>
      );

      expect(mockHasPermission).toHaveBeenCalledWith('customer.profile', ActionType.WRITE, undefined);
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    });

    it('should handle array of action types', () => {
      mockHasPermission.mockReturnValue(true);

      render(
        <PermissionGuard 
          resource="customer.profile" 
          action={[ActionType.READ, ActionType.WRITE]}
        >
          <button>Edit</button>
        </PermissionGuard>
      );

      expect(mockHasPermission).toHaveBeenCalledWith(
        'customer.profile', 
        [ActionType.READ, ActionType.WRITE], 
        undefined
      );
    });
  });

  describe('Scope handling', () => {
    it('should pass scopeId to permission check', () => {
      mockHasPermission.mockReturnValue(true);
      const scopeId = 'talent-123';

      render(
        <PermissionGuard 
          resource="customer.profile" 
          action={ActionType.READ}
          scopeId={scopeId}
        >
          <div>Content</div>
        </PermissionGuard>
      );

      expect(mockHasPermission).toHaveBeenCalledWith('customer.profile', ActionType.READ, scopeId);
    });
  });

  describe('Edge cases', () => {
    it('should render nothing (null fallback) when permission denied and no fallback provided', () => {
      mockHasPermission.mockReturnValue(false);

      const { container } = render(
        <PermissionGuard resource="admin.settings" action={ActionType.ADMIN}>
          <div data-testid="admin-only">Admin Content</div>
        </PermissionGuard>
      );

      expect(screen.queryByTestId('admin-only')).not.toBeInTheDocument();
      // Container should be empty or contain only empty fragment
      expect(container.firstChild).toBeNull();
    });

    it('should handle complex children', () => {
      mockHasPermission.mockReturnValue(true);

      render(
        <PermissionGuard resource="report.mfr" action={ActionType.READ}>
          <div data-testid="report-container">
            <h1>Report Title</h1>
            <table>
              <tbody>
                <tr><td>Data</td></tr>
              </tbody>
            </table>
          </div>
        </PermissionGuard>
      );

      expect(screen.getByTestId('report-container')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /report title/i })).toBeInTheDocument();
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });
});

describe('PermissionRender Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call render function with true when has permission', () => {
    mockHasPermission.mockReturnValue(true);

    render(
      <PermissionRender resource="customer.profile" action={ActionType.READ}>
        {(hasPermission) => (
          <div data-testid="render-result">
            {hasPermission ? 'Has Access' : 'No Access'}
          </div>
        )}
      </PermissionRender>
    );

    expect(screen.getByTestId('render-result')).toHaveTextContent('Has Access');
  });

  it('should call render function with false when lacks permission', () => {
    mockHasPermission.mockReturnValue(false);

    render(
      <PermissionRender resource="customer.profile" action={ActionType.DELETE}>
        {(hasPermission) => (
          <div data-testid="render-result">
            {hasPermission ? 'Can Delete' : 'Cannot Delete'}
          </div>
        )}
      </PermissionRender>
    );

    expect(screen.getByTestId('render-result')).toHaveTextContent('Cannot Delete');
  });

  it('should allow conditional rendering based on permission', () => {
    mockHasPermission.mockReturnValue(true);

    render(
      <PermissionRender resource="customer.profile" action={ActionType.WRITE}>
        {(canEdit) => (
          <button disabled={!canEdit}>
            {canEdit ? 'Edit' : 'View Only'}
          </button>
        )}
      </PermissionRender>
    );

    const button = screen.getByRole('button');
    expect(button).not.toBeDisabled();
    expect(button).toHaveTextContent('Edit');
  });

  it('should pass scopeId to permission check', () => {
    mockHasPermission.mockReturnValue(true);
    const scopeId = 'subsidiary-456';

    render(
      <PermissionRender 
        resource="subsidiary" 
        action={ActionType.WRITE}
        scopeId={scopeId}
      >
        {() => <div>Content</div>}
      </PermissionRender>
    );

    expect(mockHasPermission).toHaveBeenCalledWith('subsidiary', ActionType.WRITE, scopeId);
  });
});
