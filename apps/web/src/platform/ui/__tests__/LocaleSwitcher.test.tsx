import { act,fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LocaleSwitcher } from '../patterns/LocaleSwitcher';

describe('LocaleSwitcher', () => {
  const defaultProps = {
    currentLocale: 'en',
    options: [
      { code: 'en', label: 'English' },
      { code: 'zh', label: '中文' },
    ],
    onChange: vi.fn(),
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

  it('renders with current locale label and correct listbox semantics', async () => {
    render(<LocaleSwitcher {...defaultProps} />);
    
    const trigger = screen.getByLabelText(/Change language, current language is English/i);
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    
    await act(async () => {
      fireEvent.click(trigger);
      vi.advanceTimersByTime(0);
    });
    
    const listbox = screen.getByRole('listbox');
    expect(listbox).toHaveAttribute('aria-labelledby', trigger.id);
    
    // Correct option semantics
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
  });

  it('handles keyboard navigation correctly', async () => {
    render(<LocaleSwitcher {...defaultProps} />);
    
    const trigger = screen.getByRole('button', { name: /Change language/i });
    await act(async () => {
      fireEvent.click(trigger);
    });
    act(() => {
      vi.advanceTimersByTime(0);
    });
    
    const listbox = screen.getByRole('listbox');
    
    // Active item (en) should have focus first
    const enOption = screen.getAllByText('English')[1]; // Account for the label inside the trigger
    expect(enOption).toHaveFocus();
    
    // Arrow down
    await act(async () => {
      fireEvent.keyDown(listbox, { key: 'ArrowDown', code: 'ArrowDown' });
    });
    expect(screen.getByText('中文')).toHaveFocus();
    
    // Arrow down wrap around
    await act(async () => {
      fireEvent.keyDown(listbox, { key: 'ArrowDown', code: 'ArrowDown' });
    });
    expect(enOption).toHaveFocus();
    
    // Arrow up wrap
    await act(async () => {
      fireEvent.keyDown(listbox, { key: 'ArrowUp', code: 'ArrowUp' });
    });
    expect(screen.getByText('中文')).toHaveFocus();
  });

  it('closes on Escape and returns focus to trigger', async () => {
    render(<LocaleSwitcher {...defaultProps} />);
    
    const trigger = screen.getByRole('button', { name: /Change language/i });
    await act(async () => {
      fireEvent.click(trigger);
    });
    act(() => {
      vi.advanceTimersByTime(0);
    });
    
    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();
    
    await act(async () => {
      fireEvent.keyDown(listbox, { key: 'Escape', code: 'Escape' });
    });
    
    act(() => {
      vi.advanceTimersByTime(100);
    });
    
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('shows selected state and handles onChange', async () => {
    const onChange = vi.fn();
    render(<LocaleSwitcher {...defaultProps} onChange={onChange} />);
    
    const trigger = screen.getByRole('button', { name: /Change language/i });
    await act(async () => {
      fireEvent.click(trigger);
    });
    act(() => {
      vi.advanceTimersByTime(0);
    });
    
    const enOption = screen.getAllByText('English')[1];
    expect(enOption).toHaveAttribute('aria-selected', 'true');
    
    const zhOption = screen.getByText('中文');
    expect(zhOption).toHaveAttribute('aria-selected', 'false');
    
    await act(async () => {
      fireEvent.click(zhOption);
    });
    
    expect(onChange).toHaveBeenCalledWith('zh');
    
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('cancels exit timeout if reopened rapidly', async () => {
    render(<LocaleSwitcher {...defaultProps} />);
    
    const trigger = screen.getByRole('button', { name: /Change language/i });
    
    // Open
    await act(async () => {
      fireEvent.click(trigger);
    });
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    
    // Close
    await act(async () => {
      fireEvent.click(trigger);
    });
    
    // Advance partially
    act(() => {
      vi.advanceTimersByTime(50);
    });
    
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    
    // Reopen
    await act(async () => {
      fireEvent.click(trigger);
    });
    
    // Pass original unmount time
    act(() => {
      vi.advanceTimersByTime(60);
    });
    
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });
});
