import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HelpLink } from '../patterns/HelpLink';

describe('HelpLink', () => {
  it('renders a link with descriptive aria label', () => {
    render(<HelpLink href="/help/settings" label="Help" ariaLabel="Open settings help" />);

    const link = screen.getByRole('link', { name: 'Open settings help' });
    expect(link).toHaveAttribute('href', '/help/settings');
    expect(screen.getByText('Help')).toBeInTheDocument();
  });

  it('renders a button when no href is provided', () => {
    const onClick = vi.fn();
    render(<HelpLink label="Help" ariaLabel="Open help panel" onClick={onClick} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open help panel' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
