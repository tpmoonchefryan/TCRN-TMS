// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the API client
const mockMembershipList = vi.fn();

vi.mock('@/lib/api/modules/customer', () => ({
  membershipApi: {
    list: (...args: unknown[]) => mockMembershipList(...args),
  },
}));

// Import after mocks
import { MembershipSummaryBadge } from '@/components/customer/MembershipSummaryBadge';

describe('MembershipSummaryBadge Component', () => {
  const defaultProps = {
    customerId: 'customer-123',
    talentId: 'talent-456',
  };
  const buildMembershipResponse = (items: unknown[], totalCount: number = items.length) => ({
    success: true,
    data: {
      items,
      meta: {
        summary: {
          activeCount: items.length,
          expiredCount: Math.max(totalCount - items.length, 0),
          totalCount,
        },
      },
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading state', () => {
    it('should show loading spinner initially', () => {
      mockMembershipList.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<MembershipSummaryBadge {...defaultProps} />);
      
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('No memberships', () => {
    it('should display "no memberships" message when empty', async () => {
      mockMembershipList.mockResolvedValue(buildMembershipResponse([]));

      render(<MembershipSummaryBadge {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('noMemberships')).toBeInTheDocument();
      });
    });

    it('should handle null response gracefully', async () => {
      mockMembershipList.mockResolvedValue({
        success: true,
        data: null,
      });

      render(<MembershipSummaryBadge {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('noMemberships')).toBeInTheDocument();
      });
    });
  });

  describe('With memberships', () => {
    const mockMemberships = [
      {
        id: 'mem-1',
        platform: { code: 'YOUTUBE', name: 'YouTube' },
        membershipLevel: { code: 'GOLD', name: 'Gold', rank: 1, color: '#FFD700' },
      },
      {
        id: 'mem-2',
        platform: { code: 'BILIBILI', name: 'Bilibili' },
        membershipLevel: { code: 'SILVER', name: 'Silver', rank: 2, color: '#C0C0C0' },
      },
    ];

    it('should display highest level badge', async () => {
      mockMembershipList
        .mockResolvedValueOnce(buildMembershipResponse(mockMemberships))
        .mockResolvedValueOnce(buildMembershipResponse(mockMemberships));

      render(<MembershipSummaryBadge {...defaultProps} />);

      await waitFor(() => {
        // Should show Gold (rank 1) as highest
        expect(screen.getByText('Gold')).toBeInTheDocument();
      });
    });

    it('should display platform name with level', async () => {
      mockMembershipList
        .mockResolvedValueOnce(buildMembershipResponse(mockMemberships))
        .mockResolvedValueOnce(buildMembershipResponse(mockMemberships));

      render(<MembershipSummaryBadge {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/YouTube/)).toBeInTheDocument();
      });
    });

    it('should display active count', async () => {
      mockMembershipList
        .mockResolvedValueOnce(buildMembershipResponse(mockMemberships))
        .mockResolvedValueOnce(buildMembershipResponse(mockMemberships));

      render(<MembershipSummaryBadge {...defaultProps} showCounts={true} />);

      await waitFor(() => {
        expect(screen.getByText(/activeCount/)).toBeInTheDocument();
      });
    });

    it('should hide counts when showCounts is false', async () => {
      mockMembershipList
        .mockResolvedValueOnce(buildMembershipResponse(mockMemberships))
        .mockResolvedValueOnce(buildMembershipResponse(mockMemberships));

      render(<MembershipSummaryBadge {...defaultProps} showCounts={false} />);

      await waitFor(() => {
        expect(screen.getByText('Gold')).toBeInTheDocument();
      });

      expect(screen.queryByText(/activeCount/)).not.toBeInTheDocument();
    });
  });

  describe('Click handler', () => {
    it('should call onClick when provided and clicked', async () => {
      const handleClick = vi.fn();
      mockMembershipList
        .mockResolvedValueOnce(
          buildMembershipResponse([
            {
              id: 'mem-1',
              platform: { code: 'YOUTUBE', name: 'YouTube' },
              membershipLevel: { code: 'GOLD', name: 'Gold', rank: 1, color: '#FFD700' },
            },
          ])
        )
        .mockResolvedValueOnce(
          buildMembershipResponse([
            {
              id: 'mem-1',
              platform: { code: 'YOUTUBE', name: 'YouTube' },
              membershipLevel: { code: 'GOLD', name: 'Gold', rank: 1, color: '#FFD700' },
            },
          ])
        );

      render(<MembershipSummaryBadge {...defaultProps} onClick={handleClick} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Gold')).toBeInTheDocument();
      });

      const clickable = screen.getByRole('button');
      await user.click(clickable);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not have button role when no onClick', async () => {
      mockMembershipList
        .mockResolvedValueOnce(
          buildMembershipResponse([
            {
              id: 'mem-1',
              platform: { code: 'YOUTUBE', name: 'YouTube' },
              membershipLevel: { code: 'GOLD', name: 'Gold', rank: 1, color: '#FFD700' },
            },
          ])
        )
        .mockResolvedValueOnce(buildMembershipResponse([], 1));

      render(<MembershipSummaryBadge {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Gold')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('should show no memberships on API error', async () => {
      mockMembershipList.mockRejectedValue(new Error('API Error'));

      render(<MembershipSummaryBadge {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('noMemberships')).toBeInTheDocument();
      });
    });
  });

  describe('Styling', () => {
    it('should apply custom className', async () => {
      mockMembershipList.mockResolvedValue(buildMembershipResponse([]));

      const { container } = render(
        <MembershipSummaryBadge {...defaultProps} className="custom-class" />
      );

      await waitFor(() => {
        expect(container.querySelector('.custom-class')).toBeInTheDocument();
      });
    });

    it('should apply correct badge color from membership level', async () => {
      mockMembershipList
        .mockResolvedValueOnce(
          buildMembershipResponse([
            {
              id: 'mem-1',
              platform: { code: 'YOUTUBE', name: 'YouTube' },
              membershipLevel: { code: 'GOLD', name: 'Gold', rank: 1, color: '#FFD700' },
            },
          ])
        )
        .mockResolvedValueOnce(buildMembershipResponse([], 1));

      render(<MembershipSummaryBadge {...defaultProps} />);

      await waitFor(() => {
        const badge = screen.getByText('Gold').closest('div[class*="px-2"]');
        expect(badge).toHaveStyle({ color: '#FFD700' });
      });
    });
  });
});
