import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TableShell } from '../patterns/TableShell';

describe('TableShell', () => {
  const columns = ['Name', 'Role'];

  it('renders table structure with children', () => {
    render(
      <TableShell
        ariaLabel="User table"
        columns={columns}
        dataLength={1}
        emptyTitle="No Users"
        emptyDescription="No users are available."
      >
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
      <TableShell
        ariaLabel="User table"
        columns={columns}
        dataLength={0}
        isEmpty={true}
        emptyTitle="No Users"
        emptyDescription="Invite a user to get started."
      >
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
        columns={[
          { id: 'name', header: 'Name', width: '12rem' },
          { id: 'actions', header: 'Actions', align: 'right' },
        ]}
        dataLength={1}
        emptyTitle="No Users"
        emptyDescription="No users are available."
        density="compact"
      >
        <tr>
          <td>Alice</td>
          <td>Edit</td>
        </tr>
      </TableShell>
    );

    expect(screen.getByRole('table', { name: 'User table' })).toBeInTheDocument();
    expect(screen.getByText('Users')).toHaveClass('sr-only');
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toHaveClass('text-right');
  });

  it('supports controlled sort headers', () => {
    const onSortChange = vi.fn();

    render(
      <TableShell
        ariaLabel="User table"
        columns={[
          { id: 'name', header: 'Name', sortable: true },
          { id: 'role', header: 'Role' },
        ]}
        dataLength={1}
        emptyTitle="No Users"
        emptyDescription="No users are available."
        sort={{
          state: { columnId: 'name', direction: 'ascending' },
          onChange: onSortChange,
          getSortButtonLabel: (column, direction) =>
            `${String(column.header)} ${direction ?? 'none'}`,
          getSortIndicator: (direction) => (direction === 'ascending' ? '↑' : '↓'),
        }}
      >
        <tr>
          <td>Alice</td>
          <td>Admin</td>
        </tr>
      </TableShell>
    );

    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute(
      'aria-sort',
      'ascending'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Name ascending' }));
    expect(onSortChange).toHaveBeenCalledWith({ columnId: 'name', direction: 'descending' });
  });

  it('supports controlled row selection and batch actions', () => {
    const onRowToggle = vi.fn();
    const onAllVisibleToggle = vi.fn();

    render(
      <TableShell
        ariaLabel="User table"
        columns={columns}
        dataLength={2}
        emptyTitle="No Users"
        emptyDescription="No users are available."
        rowSelection={{
          visibleRowIds: ['alice', 'bob'],
          selectedRowIds: ['alice'],
          onRowToggle,
          onAllVisibleToggle,
          getRowCheckboxLabel: (rowId) => `Select ${rowId}`,
          selectAllLabel: 'Select all visible',
          getSelectedCountLabel: (count) => `${count} selected`,
          batchToolbarAriaLabel: 'Selected rows',
          batchActions: <button type="button">Delete selected</button>,
        }}
      >
        {({ renderSelectionCell }) => (
          <>
            <tr>
              {renderSelectionCell('alice')}
              <td>Alice</td>
              <td>Admin</td>
            </tr>
            <tr>
              {renderSelectionCell('bob')}
              <td>Bob</td>
              <td>Editor</td>
            </tr>
          </>
        )}
      </TableShell>
    );

    expect(screen.getByRole('toolbar', { name: 'Selected rows' })).toHaveTextContent('1 selected');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select bob' }));
    expect(onRowToggle).toHaveBeenCalledWith('bob', true);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all visible' }));
    expect(onAllVisibleToggle).toHaveBeenCalledWith(true);
    expect(screen.getByRole('button', { name: 'Delete selected' })).toBeInTheDocument();
  });
});
