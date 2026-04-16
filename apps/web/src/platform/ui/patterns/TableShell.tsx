// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { ReactNode } from 'react';

import { cn } from '@/platform/ui/foundations';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/platform/ui/primitives';

type TableShellProps = {
  title: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  count?: number | string;
  actions?: ReactNode;
  filters?: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function TableShell({
  title,
  children,
  description,
  icon,
  count,
  actions,
  filters,
  className,
  bodyClassName,
}: TableShellProps) {
  return (
    <Card className={cn('border-border/70 bg-background/95', className)}>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {icon}
              <CardTitle className="flex items-center gap-2">
                <span>{title}</span>
                {typeof count !== 'undefined' ? <Badge variant="secondary">{count}</Badge> : null}
              </CardTitle>
            </div>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
        {filters ? <div className="flex flex-col gap-3 md:flex-row md:items-center">{filters}</div> : null}
      </CardHeader>
      <CardContent className={cn('space-y-4', bodyClassName)}>{children}</CardContent>
    </Card>
  );
}
