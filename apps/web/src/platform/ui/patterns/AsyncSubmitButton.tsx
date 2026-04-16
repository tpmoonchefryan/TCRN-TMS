// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Loader2 } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

import { Button } from '@/platform/ui/primitives';

type AsyncSubmitButtonProps = Omit<ComponentProps<typeof Button>, 'children'> & {
  children: ReactNode;
  isLoading?: boolean;
  loadingText?: ReactNode;
  spinner?: ReactNode;
};

export function AsyncSubmitButton({
  children,
  isLoading = false,
  loadingText,
  spinner,
  disabled,
  ...props
}: AsyncSubmitButtonProps) {
  return (
    <Button
      {...props}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
    >
      {isLoading ? (
        spinner ?? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
      ) : null}
      {isLoading ? (loadingText ?? children) : children}
    </Button>
  );
}
