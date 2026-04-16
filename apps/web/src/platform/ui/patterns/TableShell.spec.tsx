// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TableShell } from '@/platform/ui/patterns/TableShell';

describe('TableShell', () => {
  it('renders title, count, actions, filters, and children', () => {
    render(
      <TableShell
        title="Users"
        count={12}
        actions={<button type="button">Create</button>}
        filters={<input aria-label="Search users" />}
      >
        <div>Table body</div>
      </TableShell>,
    );

    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
    expect(screen.getByLabelText('Search users')).toBeInTheDocument();
    expect(screen.getByText('Table body')).toBeInTheDocument();
  });
});
