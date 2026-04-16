// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import * as LucideIcons from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { LEGACY_LINK_BUTTON_DEFAULT_LABEL, LinkButtonProps } from './schema';

const ICON_COMPONENTS = LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number }>>;

export const LinkButton: React.FC<LinkButtonProps & { className?: string }> = ({
  label,
  url,
  style,
  icon,
  fullWidth,
  className,
}) => {
  const t = useTranslations('homepageComponentEditor');
  // Dynamic icon rendering
  const IconComponent = icon ? ICON_COMPONENTS[icon] : undefined;
  const effectiveLabel =
    label && label !== LEGACY_LINK_BUTTON_DEFAULT_LABEL
      ? label
      : t('linkButtonDefaultLabel');

  const variantMap: Record<LinkButtonProps['style'], "default" | "outline" | "ghost" | "link" | "secondary" | "destructive"> = {
    solid: 'default', // Map to default/primary
    outline: 'outline',
    ghost: 'ghost',
    link: 'link'
  };

  return (
    <div className={cn("flex justify-center p-2", fullWidth ? "w-full" : "w-auto inline-block", className)}>
      <Button 
        asChild 
        variant={variantMap[style] || 'default'}
        className={cn(
           "gap-2",
           fullWidth && "w-full",
           style === 'solid' && "bg-[var(--hp-primary)] text-white hover:bg-[var(--hp-primary)]/90",
           style === 'outline' && "border-[var(--hp-primary)] text-[var(--hp-primary)] hover:bg-[var(--hp-primary)]/10"
        )}
      >
        <Link href={url} target="_blank" rel="noopener noreferrer">
          {IconComponent && <IconComponent size={16} />}
          {effectiveLabel}
        </Link>
      </Button>
    </div>
  );
};
