import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfirmActionDialog } from '../patterns/ConfirmActionDialog';

describe('ConfirmActionDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    title: 'Delete Item',
    description: 'Are you sure you want to delete this item?',
    onConfirm: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(_query => ({
        matches: false,
      })),
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders content when open', () => {
    render(<ConfirmActionDialog {...defaultProps} />);
    expect(screen.getByText('Delete Item')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this item?')).toBeInTheDocument();
  });

  it('calls onOpenChange with false when cancel is clicked', () => {
    render(<ConfirmActionDialog {...defaultProps} />);
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls onConfirm when confirm is clicked', async () => {
    render(<ConfirmActionDialog {...defaultProps} />);
    const confirmButton = screen.getByText('Confirm');
    
    await act(async () => {
      fireEvent.click(confirmButton);
    });
    
    expect(defaultProps.onConfirm).toHaveBeenCalled();
  });

  it('maintains body scroll lock until exit animation completes', () => {
    const { rerender } = render(<ConfirmActionDialog {...defaultProps} />);
    
    expect(document.body.style.overflow).toBe('hidden');
    
    // Trigger close
    rerender(<ConfirmActionDialog {...defaultProps} open={false} />);
    
    // Still hidden because of 150ms delay
    expect(document.body.style.overflow).toBe('hidden');
    
    act(() => {
      vi.advanceTimersByTime(150);
    });
    
    // Now unlocked
    expect(document.body.style.overflow).toBe('');
  });

  it('renders provided pendingText instead of a hardcoded fallback', () => {
    render(<ConfirmActionDialog {...defaultProps} isPending pendingText="Deleting..." />);

    expect(screen.getByText('Deleting...')).toBeInTheDocument();
    expect(screen.queryByText('Working...')).not.toBeInTheDocument();
  });
});
