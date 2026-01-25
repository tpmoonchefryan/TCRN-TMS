// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Mock the stores and router before importing the component
const mockPush = vi.fn();
const mockCheckAuth = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

// Create a mock store state
let mockAuthState = {
  isAuthenticated: false,
  _hasHydrated: false,
  checkAuth: mockCheckAuth,
  user: null,
};

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => mockAuthState,
}));

// Import component after mocks are set up
import { AuthGuard } from '@/components/auth/auth-guard';

describe('AuthGuard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock state
    mockAuthState = {
      isAuthenticated: false,
      _hasHydrated: false,
      checkAuth: mockCheckAuth,
      user: null,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should show loading spinner while hydrating', () => {
    mockAuthState._hasHydrated = false;
    mockAuthState.isAuthenticated = false;
    
    render(
      <AuthGuard>
        <div data-testid="protected-content">Protected Content</div>
      </AuthGuard>
    );

    // Should show loading spinner (check for animate-spin class)
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
    
    // Protected content should not be visible
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('should redirect to login when not authenticated after hydration', async () => {
    mockAuthState._hasHydrated = true;
    mockAuthState.isAuthenticated = false;

    render(
      <AuthGuard>
        <div data-testid="protected-content">Protected Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('should verify session and render children when authenticated', async () => {
    mockAuthState._hasHydrated = true;
    mockAuthState.isAuthenticated = true;
    mockCheckAuth.mockResolvedValue(true);

    render(
      <AuthGuard>
        <div data-testid="protected-content">Protected Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(mockCheckAuth).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  it('should redirect to login when session verification fails', async () => {
    mockAuthState._hasHydrated = true;
    mockAuthState.isAuthenticated = true;
    mockCheckAuth.mockResolvedValue(false);

    render(
      <AuthGuard>
        <div data-testid="protected-content">Protected Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(mockCheckAuth).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('should not verify session multiple times', async () => {
    mockAuthState._hasHydrated = true;
    mockAuthState.isAuthenticated = true;
    mockCheckAuth.mockResolvedValue(true);

    const { rerender } = render(
      <AuthGuard>
        <div data-testid="protected-content">Protected Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(mockCheckAuth).toHaveBeenCalledTimes(1);
    });

    // Rerender should not trigger another check
    rerender(
      <AuthGuard>
        <div data-testid="protected-content">Protected Content</div>
      </AuthGuard>
    );

    // Should still only be called once
    expect(mockCheckAuth).toHaveBeenCalledTimes(1);
  });

  it('should display loading state with proper styling', () => {
    mockAuthState._hasHydrated = false;
    
    render(
      <AuthGuard>
        <div>Protected</div>
      </AuthGuard>
    );

    // Should have a loading container
    const container = document.querySelector('.flex.h-screen');
    expect(container).toBeInTheDocument();
    
    // Should have animated spinner
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });
});
