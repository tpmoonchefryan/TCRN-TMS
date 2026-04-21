import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountDropdownMenu } from '../patterns/AccountDropdownMenu';

describe('AccountDropdownMenu', () => {
  const defaultProps = {
    user: { name: 'Test User', email: 'test@example.com' },
    onNavigateProfile: vi.fn(),
    onNavigateSecurity: vi.fn(),
    onSignOut: vi.fn(),
    labels: { trigger: "Account menu", profile: "My Profile", security: "Security", signOut: "Sign Out", signingOut: "Signing out..." },
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

  it('renders with accessible name and points aria-labelledby to the trigger', async () => {
    render(<AccountDropdownMenu {...defaultProps} />);
    
    const trigger = screen.getByLabelText('Account menu');
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    
    await act(async () => {
      fireEvent.click(trigger);
      vi.advanceTimersByTime(0);
    });
    const menu = screen.getByRole('menu');
    
    // Verify labeling reference
    expect(menu).toHaveAttribute('aria-labelledby', trigger.id);
  });

  it('handles keyboard navigation correctly', async () => {
    render(<AccountDropdownMenu {...defaultProps} />);
    
    const trigger = screen.getByLabelText('Account menu');
    await act(async () => {
      fireEvent.click(trigger);
    });
    // Let mount effects settle
    act(() => {
      vi.advanceTimersByTime(0);
    });
    
    const menu = screen.getByRole('menu');
    
    // Default focus
    const profileItem = screen.getByText('My Profile');
    expect(profileItem).toHaveFocus();
    
    // Arrow down
    await act(async () => {
      fireEvent.keyDown(menu, { key: 'ArrowDown', code: 'ArrowDown' });
    });
    expect(screen.getByText('Security')).toHaveFocus();
    
    // Wrap around
    await act(async () => {
      fireEvent.keyDown(menu, { key: 'ArrowDown', code: 'ArrowDown' });
    });
    await act(async () => {
      fireEvent.keyDown(menu, { key: 'ArrowDown', code: 'ArrowDown' });
    });
    expect(profileItem).toHaveFocus();
    
    // Arrow up wrap
    await act(async () => {
      fireEvent.keyDown(menu, { key: 'ArrowUp', code: 'ArrowUp' });
    });
    expect(screen.getByText('Sign Out')).toHaveFocus();
  });

  it('closes on Escape and returns focus to trigger', async () => {
    render(<AccountDropdownMenu {...defaultProps} />);
    
    const trigger = screen.getByLabelText('Account menu');
    await act(async () => {
      fireEvent.click(trigger);
    });
    act(() => {
      vi.advanceTimersByTime(0);
    });
    const menu = screen.getByRole('menu');
    expect(menu).toBeInTheDocument();
    
    await act(async () => {
      fireEvent.keyDown(menu, { key: 'Escape', code: 'Escape' });
    });
    
    act(() => {
      vi.advanceTimersByTime(100);
    });
    
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes on outside click', async () => {
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <AccountDropdownMenu {...defaultProps} />
      </div>
    );
    
    const trigger = screen.getByLabelText('Account menu');
    await act(async () => {
      fireEvent.click(trigger);
      vi.advanceTimersByTime(0);
    });
    expect(screen.getByRole('menu')).toBeInTheDocument();
    
    await act(async () => {
      fireEvent.mouseDown(screen.getByTestId('outside'));
    });
    
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('cancels exit timeout if reopened rapidly', async () => {
    render(<AccountDropdownMenu {...defaultProps} />);
    
    const trigger = screen.getByLabelText('Account menu');
    
    // Open
    await act(async () => {
      fireEvent.click(trigger);
      vi.advanceTimersByTime(0);
    });
    expect(screen.getByRole('menu')).toBeInTheDocument();
    
    // Close
    await act(async () => {
      fireEvent.click(trigger);
    });
    
    // Advance partially
    act(() => {
      vi.advanceTimersByTime(50);
    });
    
    // It should be animating out, but still in the DOM
    expect(screen.getByRole('menu')).toBeInTheDocument();
    
    // Reopen before timeout completes
    await act(async () => {
      fireEvent.click(trigger);
    });
    
    // Advance past original timeout length
    act(() => {
      vi.advanceTimersByTime(60);
    });
    
    // It should STILL be in the DOM because the old unmount was canceled
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });
});
