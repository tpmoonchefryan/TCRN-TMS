// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { MarshmallowWidgetProps } from './schema';

export const MarshmallowWidget: React.FC<MarshmallowWidgetProps & { className?: string }> = ({
  homepagePath,
  displayMode,
  showSubmitButton,
  title,
  description,
  buttonText,
  className,
}) => {
  const t = useTranslations('homepageComponentEditor');

  if (!homepagePath) return null;

  // Link to internal marshmallow page
  const marshmallowUrl = `/m/${homepagePath}`;

  // Default values using i18n if props are missing
  // Default values using i18n if props are missing or equal to hardcoded defaults
  const effectiveTitle = title && title !== 'Marshmallow' ? title : t('marshmallowPlaceholder');
  const effectiveDescription =
    description && description !== 'Anonymous messages are welcome!'
      ? description
      : t('descPlaceholder');
  const effectiveButtonText =
    buttonText && buttonText !== 'Send Message' ? buttonText : t('buttonTextPlaceholder');

  if (displayMode === 'button') {
    return (
      <div className={cn('flex justify-center p-4', className)}>
        <Button
          asChild
          className="gap-2 rounded-full bg-[#E799B0] px-6 text-white shadow-sm hover:bg-[#D6889F]"
        >
          <Link href={marshmallowUrl}>
            <MessageCircle size={18} />
            {effectiveButtonText}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('flex h-full w-full items-center justify-center p-4', className)}>
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 rounded-2xl border border-[#FFE0EB] bg-[#FFF5F8] p-6 text-center shadow-sm dark:border-[#5A3E48] dark:bg-[#3D2C32]">
        <div className="rounded-full bg-white p-3 shadow-inner dark:bg-[#2C2024]">
          <MessageCircle size={32} className="text-[#E799B0]" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-[#E799B0]">{effectiveTitle}</h3>
          <p className="mt-1 text-sm text-[var(--hp-text-secondary)]">{effectiveDescription}</p>
        </div>

        {showSubmitButton && (
          <Button
            asChild
            className="w-full rounded-xl bg-[#E799B0] text-white shadow-sm hover:bg-[#D6889F]"
          >
            <Link href={marshmallowUrl}>{effectiveButtonText}</Link>
          </Button>
        )}
      </div>
    </div>
  );
};
