import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TableShell } from '../patterns/TableShell';

describe('TableShell', () => {
  const columns = ['Name', 'Role'];

  it('renders table structure with children', () => {
    render(
      <TableShell ariaLabel="User table" columns={columns} dataLength={1} emptyTitle="No Users" emptyDescription="No users are available.">
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
      <TableShell ariaLabel="User table" columns={columns} dataLength={0} isEmpty={true} emptyTitle="No Users" emptyDescription="Invite a user to get started.">
        <tr />
      </TableShell>
    );
    
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('No Users')).toBeInTheDocument();
  });

  it('supports caption, aria label, density, and column metadata', () => {
    render(
      <TableShell
        ariaLabel="User table"
        caption="Users"
        columns={[{ id: 'name', header: 'Name', width: '12rem' }, { id: 'actions', header: 'Actions', align: 'right' }]}
        dataLength={1}
        emptyTitle="No Users"
        emptyDescription="No users are available."
        density="compact"
      >
        <tr>
          <td>Alice</td>
          <td>Edit</td>
        </tr>
      </TableShell>,
    );

    expect(screen.getByRole('table', { name: 'User table' })).toBeInTheDocument();
    expect(screen.getByText('Users')).toHaveClass('sr-only');
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toHaveClass('text-right');
  });

});
