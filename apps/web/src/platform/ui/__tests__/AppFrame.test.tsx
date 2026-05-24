import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppFrame } from '../patterns/AppFrame';

describe('AppFrame', () => {
  it('renders the primary navigation shell on the left of the workspace', () => {
    render(
      <AppFrame
        sidebar={<div>Sidebar content</div>}
        commandBar={<div>Command bar</div>}
        mobileSidebarLabel="Mobile workspace navigation"
        mobileSidebarCloseLabel="Close workspace navigation"
      >
        <div>Main content</div>
      </AppFrame>
    );

    const main = screen.getByRole('main');
    const skipLink = screen.getByRole('link', { name: 'Skip to main content' });
    const sidebar = screen.getAllByText('Sidebar content')[0].closest('aside');
    const frameRoot = main.parentElement?.parentElement?.parentElement;

    expect(main).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#app-main-content');
    expect(main).toHaveAttribute('id', 'app-main-content');
    expect(main).toHaveAttribute('tabindex', '-1');
    expect(sidebar).toBeInTheDocument();
    expect(main.parentElement?.previousElementSibling).toBe(sidebar);
    expect(sidebar).toHaveClass('border-r');
    expect(sidebar).toHaveClass('min-h-0');
    expect(sidebar).toHaveClass('hidden');
    expect(sidebar).toHaveClass('md:flex');
    expect(main).toHaveClass('overflow-y-auto');
    expect(main).toHaveClass('overscroll-contain');
    expect(frameRoot).toHaveClass('h-[100dvh]');
    expect(frameRoot).toHaveClass('overflow-hidden');
  });

  it('renders a dismissible mobile sidebar drawer when opened', async () => {
    const onOpenChange = vi.fn();
    render(
      <AppFrame
        sidebar={<div>Mobile navigation</div>}
        commandBar={<div>Command bar</div>}
        isMobileSidebarOpen
        onMobileSidebarOpenChange={onOpenChange}
        mobileSidebarLabel="Mobile workspace navigation"
        mobileSidebarCloseLabel="Close workspace navigation"
      >
        <div>Main content</div>
      </AppFrame>
    );

    const mobileDialog = screen.getByRole('dialog', { name: 'Mobile workspace navigation' });
    expect(mobileDialog).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');

    const closeButton = screen.getByRole('button', { name: 'Close workspace navigation' });
    await waitFor(() => expect(closeButton).toHaveFocus());
    fireEvent.click(closeButton);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes the mobile sidebar drawer on Escape', () => {
    const onOpenChange = vi.fn();
    render(
      <AppFrame
        sidebar={<a href="/workspace">Workspace</a>}
        commandBar={<div>Command bar</div>}
        isMobileSidebarOpen
        onMobileSidebarOpenChange={onOpenChange}
        mobileSidebarLabel="Mobile workspace navigation"
        mobileSidebarCloseLabel="Close workspace navigation"
      >
        <div>Main content</div>
      </AppFrame>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
