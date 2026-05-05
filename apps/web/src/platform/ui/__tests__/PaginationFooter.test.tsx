import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PaginationFooter } from '../patterns/PaginationFooter';

const pagination = {
  page: 2,
  pageSize: 20,
  totalCount: 55,
  totalPages: 3,
  hasNext: true,
  hasPrev: true,
};

const labels = {
  pageLabel: 'Page 2 of 3',
  rowsPerPageLabel: 'Rows per page',
  previousLabel: 'Previous',
  nextLabel: 'Next',
};

describe('PaginationFooter', () => {
  it('renders page, range, page-size, and navigation controls', () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();

    render(
      <PaginationFooter
        pagination={pagination}
        itemCount={20}
        labels={labels}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />,
    );

    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
    expect(screen.getByText('21-40 / 55')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Rows per page'), { target: { value: '50' } });
    expect(onPageSizeChange).toHaveBeenCalledWith(50);

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onPageChange).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('disables controls while loading', () => {
    render(
      <PaginationFooter
        pagination={pagination}
        itemCount={20}
        labels={labels}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        isLoading
      />,
    );

    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.getByLabelText('Rows per page')).toBeDisabled();
  });
});
