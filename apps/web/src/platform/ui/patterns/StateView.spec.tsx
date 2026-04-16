// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StateView } from '@/platform/ui/patterns/StateView';

describe('StateView', () => {
  it('renders child content when state is ready', () => {
    render(
      <StateView state="ready">
        <div>Ready content</div>
      </StateView>,
    );

    expect(screen.getByText('Ready content')).toBeInTheDocument();
  });

  it('renders loading copy and action when state is loading', () => {
    render(
      <StateView
        state="loading"
        loading={{
          title: 'Loading users',
          description: 'Please wait.',
        }}
        action={<button type="button">Refresh</button>}
      />,
    );

    expect(screen.getByText('Loading users')).toBeInTheDocument();
    expect(screen.getByText('Please wait.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
  });
});
