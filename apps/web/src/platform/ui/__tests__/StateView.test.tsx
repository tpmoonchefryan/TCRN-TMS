import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StateView } from '../patterns/StateView';

describe('StateView', () => {
  it('renders empty state correctly', () => {
    render(<StateView status="empty" title="No Data" description="Nothing to see here" />);
    expect(screen.getByText('No Data')).toBeInTheDocument();
    expect(screen.getByText('Nothing to see here')).toBeInTheDocument();
  });

  it('renders error state correctly', () => {
    render(<StateView status="error" title="Fetch Failed" />);
    expect(screen.getByText('Fetch Failed')).toBeInTheDocument();
  });

  it('renders denied state correctly', () => {
    render(<StateView status="denied" title="Access Denied" />);
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it('renders unavailable state correctly', () => {
    render(<StateView status="unavailable" title="Not Found" />);
    expect(screen.getByText('Not Found')).toBeInTheDocument();
  });

  it('renders action node when provided', () => {
    render(<StateView status="empty" title="Test" action={<button>Retry</button>} />);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('renders secondary text and actions', () => {
    render(
      <StateView
        status="empty"
        title="No adapters"
        description="Create one to start receiving events."
        secondaryText="You can also switch scope if this is unexpected."
        actions={<>
          <button type="button">Create adapter</button>
          <button type="button">Switch scope</button>
        </>}
      />,
    );

    expect(screen.getByText('You can also switch scope if this is unexpected.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create adapter' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Switch scope' })).toBeInTheDocument();
  });
});
