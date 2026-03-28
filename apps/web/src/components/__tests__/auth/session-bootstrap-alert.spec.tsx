// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseAuthStore = vi.fn();

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => mockUseAuthStore(),
}));

import { SessionBootstrapAlert } from '@/components/auth/session-bootstrap-alert';

describe('SessionBootstrapAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      sessionBootstrapStatus: 'idle',
      sessionBootstrapErrors: null,
    });
  });

  it('does not render when bootstrap is not degraded', () => {
    render(<SessionBootstrapAlert />);

    expect(screen.queryByText('Session restored with limited context')).not.toBeInTheDocument();
  });

  it('renders a warning with degraded task details', () => {
    mockUseAuthStore.mockReturnValue({
      sessionBootstrapStatus: 'degraded',
      sessionBootstrapErrors: {
        talents: 'tree unavailable',
        permissions: 'snapshot unavailable',
      },
    });

    render(<SessionBootstrapAlert />);

    expect(screen.getByText('Session restored with limited context')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Some authenticated data could not be refreshed. You can keep working, but navigation or permission checks may be incomplete until the next successful refresh.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Accessible talent data could not be refreshed.')).toBeInTheDocument();
    expect(screen.getByText('Permission snapshot could not be refreshed.')).toBeInTheDocument();
  });
});
