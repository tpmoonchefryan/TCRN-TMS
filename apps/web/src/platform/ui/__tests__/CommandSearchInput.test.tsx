import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CommandSearchInput } from '../patterns/CommandSearchInput';

describe('CommandSearchInput', () => {
  it('supports controlled value changes and submit', () => {
    const onValueChange = vi.fn();
    const onSubmit = vi.fn();

    render(
      <CommandSearchInput
        placeholder="Search"
        ariaLabel="Search records"
        value="alice"
        onValueChange={onValueChange}
        onSubmit={onSubmit}
      />,
    );

    const input = screen.getByRole('searchbox');
    expect(input).toHaveValue('alice');

    fireEvent.change(input, { target: { value: 'bob' } });
    expect(onValueChange).toHaveBeenCalledWith('bob');

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledWith('alice');
  });

  it('binds an explicit keyboard shortcut when provided', () => {
    const onShortcut = vi.fn();

    render(
      <CommandSearchInput
        placeholder="Search"
        ariaLabel="Search records"
        shortcutKey="⌘K"
        shortcut={{ key: 'k', metaKey: true }}
        onShortcut={onShortcut}
      />,
    );

    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(onShortcut).toHaveBeenCalledTimes(1);
    expect(screen.getByText('⌘K')).toBeInTheDocument();
  });
});
