// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionBootstrapAlert } from '@/components/auth/session-bootstrap-alert';

const mockUseAuthStore = vi.fn();

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => mockUseAuthStore(),
}));

describe('SessionBootstrapAlert', () => {
  const bootstrapAuthenticatedSession = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      sessionBootstrapStatus: 'idle',
      sessionBootstrapErrors: null,
      bootstrapAuthenticatedSession,
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
      bootstrapAuthenticatedSession,
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
    expect(screen.getByRole('button', { name: 'Retry refresh' })).toBeInTheDocument();
  });

  it('retries the bootstrap refresh and keeps the warning visible while retrying', async () => {
    const user = userEvent.setup();
    let resolveRetry: (() => void) | undefined;

    bootstrapAuthenticatedSession.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          mockUseAuthStore.mockReturnValue({
            sessionBootstrapStatus: 'loading',
            sessionBootstrapErrors: null,
            bootstrapAuthenticatedSession,
          });
          resolveRetry = () => resolve();
        })
    );

    mockUseAuthStore.mockReturnValue({
      sessionBootstrapStatus: 'degraded',
      sessionBootstrapErrors: {
        permissions: 'snapshot unavailable',
      },
      bootstrapAuthenticatedSession,
    });

    render(<SessionBootstrapAlert />);

    await user.click(screen.getByRole('button', { name: 'Retry refresh' }));

    expect(bootstrapAuthenticatedSession).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Refreshing authenticated context')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retrying refresh...' })).toBeDisabled();

    if (typeof resolveRetry !== 'function') {
      throw new Error('Expected retry promise resolver to be captured');
    }

    resolveRetry();

    await waitFor(() => {
      expect(screen.queryByText('Refreshing authenticated context')).not.toBeInTheDocument();
    });
  });
});
