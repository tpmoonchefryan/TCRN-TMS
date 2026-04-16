// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { ReactNode } from 'react';

import { cn } from '@/platform/ui/foundations';

type FormSectionProps = {
  title: ReactNode;
  children: ReactNode;
  icon?: ReactNode;
  description?: ReactNode;
  className?: string;
  headerClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  contentClassName?: string;
};

export function FormSection({
  title,
  children,
  icon,
  description,
  className,
  headerClassName,
  titleClassName,
  descriptionClassName,
  contentClassName,
}: FormSectionProps) {
  return (
    <section className={cn('space-y-4', className)}>
      <div className={cn('space-y-3', headerClassName)}>
        <div className={cn('flex items-center gap-2 border-b pb-2 text-lg font-medium', titleClassName)}>
          {icon}
          <h3>{title}</h3>
        </div>
        {description ? (
          <div className={cn('space-y-2', descriptionClassName)}>{description}</div>
        ) : null}
      </div>
      <div className={cn('space-y-4', contentClassName)}>{children}</div>
    </section>
  );
}
