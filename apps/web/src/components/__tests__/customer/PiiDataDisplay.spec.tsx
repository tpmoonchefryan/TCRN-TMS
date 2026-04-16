// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreatePiiPortalSession = vi.fn();
const mockLocationAssign = vi.fn();
const originalLocation = window.location;

vi.mock('@/lib/api/modules/customer', () => ({
  customerApi: {
    createPiiPortalSession: (...args: unknown[]) => mockCreatePiiPortalSession(...args),
  },
}));

import { PiiDataDisplay } from '@/components/customer/PiiDataDisplay';

describe('PiiDataDisplay', () => {
  const defaultProps = {
    customerId: 'customer-123',
    talentId: 'talent-456',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        assign: mockLocationAssign,
      },
    });
  });

  it('renders the protected-state copy and portal button', () => {
    render(<PiiDataDisplay {...defaultProps} />);

    expect(screen.getByText('labels.sensitiveDataProtected')).toBeInTheDocument();
    expect(screen.getByText('labels.piiManagedExternally')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'actions.openPortal' })).toBeInTheDocument();
  });

  it('creates a portal session and redirects to the portal', async () => {
    mockCreatePiiPortalSession.mockResolvedValue({
      success: true,
      data: {
        redirectUrl: 'https://pii-platform.example.com/portal/sessions/session-1',
        expiresAt: '2026-04-14T08:05:00.000Z',
      },
    });

    const user = userEvent.setup();
    render(<PiiDataDisplay {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'actions.openPortal' }));

    await waitFor(() => {
      expect(mockCreatePiiPortalSession).toHaveBeenCalledWith(
        'customer-123',
        'talent-456',
        'individual',
      );
      expect(mockLocationAssign).toHaveBeenCalledWith(
        'https://pii-platform.example.com/portal/sessions/session-1',
      );
    });
  });

  it('shows the redirecting state while the portal request is pending', async () => {
    mockCreatePiiPortalSession.mockImplementation(() => new Promise(() => {}));

    const user = userEvent.setup();
    render(<PiiDataDisplay {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'actions.openPortal' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'actions.redirecting' })).toBeDisabled();
    });
  });

  it('shows an error when portal session creation fails', async () => {
    mockCreatePiiPortalSession.mockRejectedValue(new Error('network failure'));

    const user = userEvent.setup();
    render(<PiiDataDisplay {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'actions.openPortal' }));

    await waitFor(() => {
      expect(screen.getByText('errors.retrieveFailed')).toBeInTheDocument();
      expect(mockLocationAssign).not.toHaveBeenCalled();
    });
  });

  it('passes through custom wrapper classes', () => {
    const { container } = render(
      <PiiDataDisplay {...defaultProps} className="custom-pii-class" />,
    );

    expect(container.querySelector('.custom-pii-class')).toBeTruthy();
  });

  it('passes through company profile type when requesting portal access', async () => {
    mockCreatePiiPortalSession.mockResolvedValue({
      success: true,
      data: {
        redirectUrl: 'https://pii-platform.example.com/portal/sessions/session-2',
        expiresAt: '2026-04-14T08:10:00.000Z',
      },
    });

    const user = userEvent.setup();
    render(<PiiDataDisplay {...defaultProps} profileType="company" />);

    await user.click(screen.getByRole('button', { name: 'actions.openPortal' }));

    await waitFor(() => {
      expect(mockCreatePiiPortalSession).toHaveBeenCalledWith(
        'customer-123',
        'talent-456',
        'company',
      );
    });
  });
});

afterAll(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: originalLocation,
  });
});
