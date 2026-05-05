import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Breadcrumb } from '../patterns/Breadcrumb';

describe('Breadcrumb', () => {
  it('renders linked ancestors and marks the current item', () => {
    render(
      <Breadcrumb
        ariaLabel="Workspace trail"
        items={[
          { label: 'Tenant', href: '/tenant/1' },
          { label: 'Talent', href: '/tenant/1/business/talent/2' },
          { label: 'Homepage', isCurrent: true },
        ]}
      />,
    );

    expect(screen.getByRole('navigation', { name: 'Workspace trail' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tenant' })).toHaveAttribute('href', '/tenant/1');
    expect(screen.getByText('Homepage')).toHaveAttribute('aria-current', 'page');
  });

  it('uses onNavigate for same-window linked segments', () => {
    const onNavigate = vi.fn();
    render(
      <Breadcrumb
        ariaLabel="Workspace trail"
        onNavigate={onNavigate}
        items={[
          { label: 'Tenant', href: '/tenant/1' },
          { label: 'Settings', isCurrent: true },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole('link', { name: 'Tenant' }));
    expect(onNavigate).toHaveBeenCalledWith('/tenant/1');
  });
});
