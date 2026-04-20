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
});
