import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SidebarNav } from '../patterns/SidebarNav';

describe('SidebarNav', () => {
  it('supports caller-supplied ariaLabel', () => {
    const customLabel = "Custom Localized Nav";
    render(
      <SidebarNav 
        items={[{ key: '1', label: 'Item', href: '/item' }]} 
        onNavigate={vi.fn()} 
        ariaLabel={customLabel} 
      />
    );
    expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', customLabel);
  });

  it('keeps the footer outside the scrollable nav region', () => {
    render(
      <SidebarNav
        items={[{ key: '1', label: 'Item', href: '/item' }]}
        onNavigate={vi.fn()}
        footer={<div>Footer action</div>}
      />,
    );

    const nav = screen.getByRole('navigation');
    const footer = screen.getByText('Footer action').parentElement;

    expect(nav).toHaveClass('min-h-0');
    expect(nav).toHaveClass('overflow-y-auto');
    expect(footer).toHaveClass('flex-none');
    expect(footer).toHaveClass('border-t');
  });
});
