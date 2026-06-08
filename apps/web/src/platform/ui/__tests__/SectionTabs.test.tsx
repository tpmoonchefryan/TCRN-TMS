import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SectionTabs } from '../patterns/SectionTabs';

const items = [
  { id: 'overview', label: 'Overview', count: 2 },
  { id: 'settings', label: 'Settings', count: 4 },
  { id: 'disabled', label: 'Disabled', disabled: true },
];

describe('SectionTabs', () => {
  it('renders tabs with selected state and counts', () => {
    render(
      <SectionTabs
        items={items}
        activeId="overview"
        onChange={vi.fn()}
        ariaLabel="Workspace sections"
      />
    );

    expect(screen.getByRole('tablist')).toHaveAttribute('aria-label', 'Workspace sections');
    expect(screen.getByRole('tablist')).toHaveClass('flex-wrap');
    expect(screen.getByRole('tablist')).not.toHaveClass('overflow-x-auto');
    expect(screen.getByRole('tab', { name: 'Overview 2' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('tab', { name: 'Settings 4' })).toHaveAttribute('tabindex', '-1');
  });

  it('supports arrow, Home, and End keyboard navigation over enabled tabs', () => {
    const onChange = vi.fn();
    render(
      <SectionTabs
        items={items}
        activeId="overview"
        onChange={onChange}
        ariaLabel="Workspace sections"
      />
    );

    const tablist = screen.getByRole('tablist');
    fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('settings');

    fireEvent.keyDown(tablist, { key: 'End' });
    expect(onChange).toHaveBeenLastCalledWith('settings');

    fireEvent.keyDown(tablist, { key: 'Home' });
    expect(onChange).toHaveBeenLastCalledWith('overview');
  });
});
