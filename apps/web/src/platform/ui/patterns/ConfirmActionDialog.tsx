// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { ReactNode } from 'react';

import { AsyncSubmitButton } from '@/platform/ui/patterns/AsyncSubmitButton';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/platform/ui/primitives';

type ConfirmActionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  confirmLabel: ReactNode;
  cancelLabel?: ReactNode;
  isSubmitting?: boolean;
  onConfirm: () => void | Promise<void>;
  tone?: 'default' | 'danger';
  children?: ReactNode;
};

export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  isSubmitting = false,
  onConfirm,
  tone = 'danger',
  children,
}: ConfirmActionDialogProps) {
  const confirmVariant = tone === 'danger' ? 'destructive' : 'default';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children ? <div className="space-y-4">{children}</div> : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {cancelLabel}
          </Button>
          <AsyncSubmitButton
            type="button"
            variant={confirmVariant}
            isLoading={isSubmitting}
            onClick={() => {
              void onConfirm();
            }}
          >
            {confirmLabel}
          </AsyncSubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
