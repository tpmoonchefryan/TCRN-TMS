import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TopCommandBar } from '../patterns/TopCommandBar';

describe('TopCommandBar', () => {
  it('supports caller-supplied ariaLabel for search', () => {
    const customLabel = '自定义搜索';
    render(<TopCommandBar searchProps={{ ariaLabel: customLabel, placeholder: '搜索...' }} />);
    expect(screen.getByRole('searchbox')).toHaveAttribute('aria-label', customLabel);
  });

  it('renders a mobile menu trigger when provided', () => {
    const onMobileMenuOpen = vi.fn();
    render(<TopCommandBar mobileMenuButtonLabel="Open menu" onMobileMenuOpen={onMobileMenuOpen} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(onMobileMenuOpen).toHaveBeenCalledTimes(1);
  });

  it('renders breadcrumbs in the command bar', () => {
    render(
      <TopCommandBar
        breadcrumbAriaLabel="Workspace breadcrumb"
        breadcrumbItems={[
          { label: 'Tenant', href: '/tenant/1' },
          { label: 'Settings', isCurrent: true },
        ]}
      />
    );

    expect(screen.getByRole('navigation', { name: 'Workspace breadcrumb' })).toBeInTheDocument();
    expect(screen.getByText('Settings')).toHaveAttribute('aria-current', 'page');
  });

  it('expands mobile search on demand', () => {
    render(
      <TopCommandBar
        mobileSearchButtonLabel="Open mobile search"
        mobileSearchCloseLabel="Close mobile search"
        searchProps={{ ariaLabel: 'Search records', placeholder: 'Search' }}
      />
    );

    const trigger = screen.getByRole('button', { name: 'Open mobile search' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    expect(screen.getByRole('button', { name: 'Close mobile search' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getAllByRole('searchbox', { name: 'Search records' })).toHaveLength(2);
  });
});
