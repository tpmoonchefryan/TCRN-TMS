// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AsyncSubmitButton } from '@/platform/ui/patterns/AsyncSubmitButton';

describe('AsyncSubmitButton', () => {
  it('keeps the default label when not loading', () => {
    render(<AsyncSubmitButton type="submit">Create customer</AsyncSubmitButton>);

    const button = screen.getByRole('button', { name: 'Create customer' });
    expect(button).toBeEnabled();
    expect(button).not.toHaveAttribute('aria-busy');
  });

  it('disables the button and exposes busy state when loading', () => {
    render(
      <AsyncSubmitButton type="submit" isLoading>
        Create customer
      </AsyncSubmitButton>,
    );

    const button = screen.getByRole('button', { name: 'Create customer' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('renders an explicit loading label when provided', () => {
    render(
      <AsyncSubmitButton type="submit" isLoading loadingText="Saving...">
        Save changes
      </AsyncSubmitButton>,
    );

    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
  });
});
