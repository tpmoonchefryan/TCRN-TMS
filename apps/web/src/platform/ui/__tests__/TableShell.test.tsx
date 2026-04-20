import { render, screen } from '@testing-library/react';
import { describe, expect,it } from 'vitest';

import { TableShell } from '../patterns/TableShell';

describe('TableShell', () => {
  const columns = ['Name', 'Role'];

  it('renders table structure with children', () => {
    render(
      <TableShell columns={columns} dataLength={1}>
        <tr>
          <td>Alice</td>
          <td>Admin</td>
        </tr>
      </TableShell>
    );
    
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('renders StateView when empty and not loading', () => {
    render(
      <TableShell columns={columns} dataLength={0} isEmpty={true} emptyTitle="No Users">
        <tr />
      </TableShell>
    );
    
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('No Users')).toBeInTheDocument();
  });
});
