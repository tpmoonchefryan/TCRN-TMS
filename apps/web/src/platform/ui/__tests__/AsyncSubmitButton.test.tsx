import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AsyncSubmitButton } from '../patterns/AsyncSubmitButton';

describe('AsyncSubmitButton', () => {
  it('renders children when not pending', () => {
    render(<AsyncSubmitButton>Save</AsyncSubmitButton>);
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('aria-busy', 'false');
  });

  it('renders pendingText and sets aria-busy when pending', () => {
    render(<AsyncSubmitButton isPending pendingText="Saving...">Save</AsyncSubmitButton>);
    const button = screen.getByRole('button', { name: 'Saving...' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(<AsyncSubmitButton disabled>Save</AsyncSubmitButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
