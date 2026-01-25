// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Check, ChevronsUpDown, User } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCurrentTalent } from '@/hooks/use-current-talent';
import { cn } from '@/lib/utils';
import { TalentInfo } from '@/stores/talent-store';

interface TalentSwitcherProps {
  className?: string;
  collapsed?: boolean;
}

export function TalentSwitcher({ className, collapsed = false }: TalentSwitcherProps) {
  const t = useTranslations('talentSwitcher');
  const { currentTalent, accessibleTalents, canSwitch, selectTalent, isSelected } =
    useCurrentTalent();

  // If no talents available, don't render
  if (accessibleTalents.length === 0) {
    return null;
  }

  // Render current talent info
  const renderTalentInfo = (talent: TalentInfo | null, showPath = false) => {
    if (!talent) {
      return (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-medium">{t('noTalentSelected')}</span>
              <span className="text-xs text-muted-foreground">{t('selectTalentToContinue')}</span>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        {talent.avatarUrl ? (
          <img
            src={talent.avatarUrl}
            alt={talent.displayName}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            {talent.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        {!collapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-sm font-medium">{talent.displayName}</span>
            {showPath && talent.subsidiaryName && (
              <span className="truncate text-xs text-muted-foreground">
                {talent.subsidiaryName}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  // Non-interactive display (single talent)
  if (!canSwitch) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border bg-card p-2',
          collapsed ? 'justify-center' : 'px-3',
          className
        )}
      >
        {renderTalentInfo(currentTalent, true)}
      </div>
    );
  }

  // Interactive dropdown (multiple talents)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            'w-full justify-between',
            collapsed ? 'px-2' : 'px-3',
            className
          )}
        >
          {renderTalentInfo(currentTalent, false)}
          {!collapsed && <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start">
        <DropdownMenuLabel>{t('switchTalent')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {accessibleTalents.map((talent) => (
          <DropdownMenuItem
            key={talent.id}
            onClick={() => selectTalent(talent.id)}
            className="cursor-pointer"
          >
            <div className="flex w-full items-center gap-2">
              {talent.avatarUrl ? (
                <img
                  src={talent.avatarUrl}
                  alt={talent.displayName}
                  className="h-6 w-6 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
                  {talent.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex flex-1 flex-col overflow-hidden">
                <span className="truncate text-sm">{talent.displayName}</span>
                {talent.subsidiaryName && (
                  <span className="truncate text-xs text-muted-foreground">
                    {talent.subsidiaryName}
                  </span>
                )}
              </div>
              {isSelected(talent.id) && <Check className="h-4 w-4 text-primary" />}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Export for use in login flow
export function TalentSwitcherCompact({
  talents,
  selectedId,
  onSelect,
  className,
}: {
  talents: TalentInfo[];
  selectedId?: string;
  onSelect: (talent: TalentInfo) => void;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-2', className)}>
      {talents.map((talent) => (
        <button
          key={talent.id}
          onClick={() => onSelect(talent)}
          className={cn(
            'flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent',
            selectedId === talent.id && 'border-primary bg-primary/5'
          )}
        >
          {talent.avatarUrl ? (
            <img
              src={talent.avatarUrl}
              alt={talent.displayName}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg text-primary">
              {talent.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate font-medium">{talent.displayName}</span>
            {talent.subsidiaryName && (
              <span className="truncate text-sm text-muted-foreground">
                {talent.subsidiaryName}
              </span>
            )}
            <span className="truncate text-xs text-muted-foreground">{talent.code}</span>
          </div>
          {selectedId === talent.id && <Check className="h-5 w-5 text-primary" />}
        </button>
      ))}
    </div>
  );
}
