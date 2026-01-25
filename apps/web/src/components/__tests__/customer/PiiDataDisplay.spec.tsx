// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock PII token manager
const mockGetPiiProfile = vi.fn();

vi.mock('@/lib/pii', () => ({
  piiTokenManager: {
    getPiiProfile: (...args: unknown[]) => mockGetPiiProfile(...args),
    clearCache: vi.fn(),
  },
  PiiServiceError: class PiiServiceError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

// Import after mocks
import { PiiDataDisplay } from '@/components/customer/PiiDataDisplay';

describe('PiiDataDisplay Component', () => {
  const defaultProps = {
    customerId: 'customer-123',
    talentId: 'talent-456',
  };

  const mockPiiProfile = {
    givenName: 'John',
    familyName: 'Doe',
    phoneNumbers: [{ type: 'mobile', number: '+1234567890', isPrimary: true }],
    emails: [{ type: 'personal', address: 'john@example.com', isPrimary: true }],
    addresses: [
      {
        type: 'home',
        province: 'Tokyo',
        city: 'Shibuya',
        district: 'Jingumae',
        street: '1-2-3',
        isPrimary: true,
      },
    ],
    birthDate: '1990-01-01',
    gender: 'male',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial state', () => {
    it('should show reveal button in idle state', () => {
      render(<PiiDataDisplay {...defaultProps} />);

      expect(screen.getByText('actions.reveal')).toBeInTheDocument();
    });

    it('should show title with lock icon', () => {
      render(<PiiDataDisplay {...defaultProps} />);

      expect(screen.getByText('title')).toBeInTheDocument();
    });

    it('should show "click to reveal" prompts for fields', () => {
      render(<PiiDataDisplay {...defaultProps} />);

      const revealLinks = screen.getAllByText('actions.clickToReveal');
      expect(revealLinks.length).toBeGreaterThan(0);
    });
  });

  describe('Auto-load behavior', () => {
    it('should auto-load PII when autoLoad is true', async () => {
      mockGetPiiProfile.mockResolvedValue(mockPiiProfile);

      render(<PiiDataDisplay {...defaultProps} autoLoad={true} />);

      await waitFor(() => {
        expect(mockGetPiiProfile).toHaveBeenCalledWith(
          'customer-123',
          'talent-456',
          expect.any(Object)
        );
      });
    });

    it('should not auto-load PII when autoLoad is false', () => {
      render(<PiiDataDisplay {...defaultProps} autoLoad={false} />);

      expect(mockGetPiiProfile).not.toHaveBeenCalled();
    });
  });

  describe('Reveal button', () => {
    it('should fetch PII when reveal button is clicked', async () => {
      mockGetPiiProfile.mockResolvedValue(mockPiiProfile);
      const user = userEvent.setup();

      render(<PiiDataDisplay {...defaultProps} />);

      const revealButton = screen.getByText('actions.reveal');
      await user.click(revealButton);

      await waitFor(() => {
        expect(mockGetPiiProfile).toHaveBeenCalled();
      });
    });

    it('should toggle to hide after successful load', async () => {
      mockGetPiiProfile.mockResolvedValue(mockPiiProfile);
      const user = userEvent.setup();

      render(<PiiDataDisplay {...defaultProps} />);

      const revealButton = screen.getByText('actions.reveal');
      await user.click(revealButton);

      await waitFor(() => {
        expect(screen.getByText('actions.hide')).toBeInTheDocument();
      });
    });
  });

  describe('Loading state', () => {
    it('should show skeleton loaders while loading', async () => {
      mockGetPiiProfile.mockImplementation(() => new Promise(() => {}));
      const user = userEvent.setup();

      render(<PiiDataDisplay {...defaultProps} />);

      await user.click(screen.getByText('actions.reveal'));

      await waitFor(() => {
        // Skeleton uses animate-pulse class
        const skeletons = document.querySelectorAll('.animate-pulse');
        expect(skeletons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Success state', () => {
    it('should display full name correctly', async () => {
      mockGetPiiProfile.mockResolvedValue(mockPiiProfile);
      const user = userEvent.setup();

      render(<PiiDataDisplay {...defaultProps} />);
      await user.click(screen.getByText('actions.reveal'));

      await waitFor(() => {
        // Chinese/Japanese name order: family name first
        expect(screen.getByText('DoeJohn')).toBeInTheDocument();
      });
    });

    it('should display phone number', async () => {
      mockGetPiiProfile.mockResolvedValue(mockPiiProfile);
      const user = userEvent.setup();

      render(<PiiDataDisplay {...defaultProps} />);
      await user.click(screen.getByText('actions.reveal'));

      await waitFor(() => {
        expect(screen.getByText('+1234567890')).toBeInTheDocument();
      });
    });

    it('should display email address', async () => {
      mockGetPiiProfile.mockResolvedValue(mockPiiProfile);
      const user = userEvent.setup();

      render(<PiiDataDisplay {...defaultProps} />);
      await user.click(screen.getByText('actions.reveal'));

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });
    });

    it('should call onLoad callback on success', async () => {
      mockGetPiiProfile.mockResolvedValue(mockPiiProfile);
      const onLoad = vi.fn();
      const user = userEvent.setup();

      render(<PiiDataDisplay {...defaultProps} onLoad={onLoad} />);
      await user.click(screen.getByText('actions.reveal'));

      await waitFor(() => {
        expect(onLoad).toHaveBeenCalledWith(mockPiiProfile);
      });
    });
  });

  describe('Error state', () => {
    it('should show error alert on failure', async () => {
      mockGetPiiProfile.mockRejectedValue(new Error('Network error'));
      const user = userEvent.setup();

      render(<PiiDataDisplay {...defaultProps} />);
      await user.click(screen.getByText('actions.reveal'));

      await waitFor(() => {
        expect(screen.getByText('errors.networkError')).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      mockGetPiiProfile.mockRejectedValue(new Error('Network error'));
      const user = userEvent.setup();

      render(<PiiDataDisplay {...defaultProps} />);
      await user.click(screen.getByText('actions.reveal'));

      await waitFor(() => {
        expect(screen.getByText('actions.retry')).toBeInTheDocument();
      });
    });

    it('should call onError callback on failure', async () => {
      const error = new Error('Network error');
      mockGetPiiProfile.mockRejectedValue(error);
      const onError = vi.fn();
      const user = userEvent.setup();

      render(<PiiDataDisplay {...defaultProps} onError={onError} />);
      await user.click(screen.getByText('actions.reveal'));

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });

    it('should show "[failed]" placeholder for fields on error', async () => {
      mockGetPiiProfile.mockRejectedValue(new Error('Error'));
      const user = userEvent.setup();

      render(<PiiDataDisplay {...defaultProps} />);
      await user.click(screen.getByText('actions.reveal'));

      await waitFor(() => {
        const failedTexts = screen.getAllByText('[status.failed]');
        expect(failedTexts.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Compact mode', () => {
    it('should show fewer fields in compact mode', async () => {
      mockGetPiiProfile.mockResolvedValue(mockPiiProfile);
      const user = userEvent.setup();

      render(<PiiDataDisplay {...defaultProps} compact={true} />);
      await user.click(screen.getByText('actions.reveal'));

      await waitFor(() => {
        expect(screen.getByText('DoeJohn')).toBeInTheDocument();
      });

      // Address should not be shown in compact mode
      expect(screen.queryByText(/Tokyo/)).not.toBeInTheDocument();
    });

    it('should show all fields in non-compact mode', async () => {
      mockGetPiiProfile.mockResolvedValue(mockPiiProfile);
      const user = userEvent.setup();

      render(<PiiDataDisplay {...defaultProps} compact={false} />);
      await user.click(screen.getByText('actions.reveal'));

      await waitFor(() => {
        expect(screen.getByText(/Tokyo/)).toBeInTheDocument();
      });
    });
  });

  describe('Custom styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <PiiDataDisplay {...defaultProps} className="custom-pii-class" />
      );

      expect(container.querySelector('.custom-pii-class')).toBeInTheDocument();
    });
  });
});
