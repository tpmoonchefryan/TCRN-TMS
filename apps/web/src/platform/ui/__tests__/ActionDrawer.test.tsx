import { act,fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ActionDrawer } from '../patterns/ActionDrawer';

describe('ActionDrawer', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    title: 'Test Drawer',
    children: <div data-testid="drawer-content">Content</div>,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    // jsdom doesn't support matchMedia by default
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders content when open', () => {
    render(<ActionDrawer {...defaultProps} />);
    expect(screen.getByText('Test Drawer')).toBeInTheDocument();
    expect(screen.getByTestId('drawer-content')).toBeInTheDocument();
  });

  it('calls onOpenChange with false when close button is clicked', () => {
    render(<ActionDrawer {...defaultProps} />);
    const closeButton = screen.getByLabelText('Close drawer');
    fireEvent.click(closeButton);
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('locks body scroll when open and unlocks ONLY after exit animation', () => {
    const { rerender } = render(<ActionDrawer {...defaultProps} />);
    
    // Body overflow should be hidden
    expect(document.body.style.overflow).toBe('hidden');
    
    // Trigger close (starts unmount delay)
    rerender(<ActionDrawer {...defaultProps} open={false} />);
    
    // Should STILL be hidden because unmount is delayed
    expect(document.body.style.overflow).toBe('hidden');
    
    // Fast forward past the 300ms duration
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    // NOW it should be unlocked
    expect(document.body.style.overflow).toBe('');
  });

  it('bypasses unmount delay when prefers-reduced-motion is true', () => {
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(prefers-reduced-motion: reduce)',
    }));
    
    const { rerender } = render(<ActionDrawer {...defaultProps} />);
    expect(document.body.style.overflow).toBe('hidden');
    
    // Trigger close
    rerender(<ActionDrawer {...defaultProps} open={false} />);
    
    // Should be unlocked immediately (0ms delay)
    act(() => {
      vi.advanceTimersByTime(0);
    });
    
    expect(document.body.style.overflow).toBe('');
  });
});
