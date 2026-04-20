import { fireEvent,render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SidebarNav } from '../patterns/SidebarNav';

describe('Edge Hardening', () => {
  it('SidebarNav items support open-in-new-tab native semantics', () => {
    const onNavigate = vi.fn();
    render(
      <SidebarNav 
        items={[{ key: '1', label: 'Item', href: '/test' }]} 
        onNavigate={onNavigate} 
      />
    );
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/test');

    // Simulate regular click
    fireEvent.click(link, { button: 0 });
    expect(onNavigate).toHaveBeenCalledWith('/test');
    
    onNavigate.mockClear();

    // Simulate middle click (should not call onNavigate to preserve native behavior)
    fireEvent.click(link, { button: 1 });
    expect(onNavigate).not.toHaveBeenCalled();

    // Simulate ctrl-click
    fireEvent.click(link, { button: 0, ctrlKey: true });
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
