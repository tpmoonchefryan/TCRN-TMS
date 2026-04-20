import { render, screen } from '@testing-library/react';
import { describe, expect,it } from 'vitest';

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
});
