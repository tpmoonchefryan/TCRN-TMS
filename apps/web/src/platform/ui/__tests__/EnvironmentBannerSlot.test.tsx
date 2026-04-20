import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EnvironmentBannerSlot } from '../patterns/EnvironmentBannerSlot';

describe('EnvironmentBannerSlot', () => {
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

  it('renders content when visible is true', () => {
    act(() => {
      render(<EnvironmentBannerSlot message="Testing banner" visible={true} />);
    });
    expect(screen.getByText('Testing banner')).toBeInTheDocument();
  });

  it('delays unmount until exit animation completes', async () => {
    const { rerender } = render(<EnvironmentBannerSlot message="Testing banner" visible={true} />);
    
    // Trigger hide
    rerender(<EnvironmentBannerSlot message="Testing banner" visible={false} />);
    
    // Should still be in document immediately after due to exit animation
    expect(screen.getByText('Testing banner')).toBeInTheDocument();
    
    await act(async () => {
      vi.advanceTimersByTime(200); // Wait for duration-200
      await Promise.resolve(); // flush microtasks
    });
    
    expect(screen.queryByText('Testing banner')).not.toBeInTheDocument();
  });

  it('bypasses exit animation delay when reduced motion is preferred', async () => {
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(prefers-reduced-motion: reduce)',
    }));
    
    const { rerender } = render(<EnvironmentBannerSlot message="Testing banner" visible={true} />);
    
    // Trigger hide
    rerender(<EnvironmentBannerSlot message="Testing banner" visible={false} />);
    
    // Should be unmounted immediately
    await act(async () => {
      vi.advanceTimersByTime(0);
      await Promise.resolve();
    });
    
    expect(screen.queryByText('Testing banner')).not.toBeInTheDocument();
  });
});
