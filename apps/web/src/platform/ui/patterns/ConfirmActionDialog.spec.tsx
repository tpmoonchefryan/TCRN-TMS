// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmActionDialog } from '@/platform/ui/patterns/ConfirmActionDialog';

describe('ConfirmActionDialog', () => {
  it('renders copy and calls the confirm callback', () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <ConfirmActionDialog
        open
        onOpenChange={onOpenChange}
        title="Delete role"
        description="This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText('Delete role')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
