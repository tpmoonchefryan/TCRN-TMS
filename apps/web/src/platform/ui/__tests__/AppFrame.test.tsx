import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppFrame } from '../patterns/AppFrame';

describe('AppFrame', () => {
  it('renders the primary navigation shell on the left of the workspace', () => {
    render(
      <AppFrame
        sidebar={<div>Sidebar content</div>}
        commandBar={<div>Command bar</div>}
      >
        <div>Main content</div>
      </AppFrame>,
    );

    const main = screen.getByRole('main');
    const sidebar = screen.getByText('Sidebar content').closest('aside');
    const frameRoot = main.parentElement?.parentElement?.parentElement;

    expect(main).toBeInTheDocument();
    expect(sidebar).toBeInTheDocument();
    expect(main.parentElement?.previousElementSibling).toBe(sidebar);
    expect(sidebar).toHaveClass('border-r');
    expect(sidebar).toHaveClass('min-h-0');
    expect(main).toHaveClass('overflow-y-auto');
    expect(main).toHaveClass('overscroll-contain');
    expect(frameRoot).toHaveClass('h-[100dvh]');
    expect(frameRoot).toHaveClass('overflow-hidden');
  });
});
