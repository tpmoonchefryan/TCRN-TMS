// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
'use client';

import { icons, LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Common icons for quick access (most frequently used in UI)
const COMMON_ICONS = [
  'Home', 'User', 'Settings', 'Search', 'Mail', 'Phone', 'Link', 'ExternalLink',
  'Star', 'Heart', 'ThumbsUp', 'MessageCircle', 'Share', 'Download', 'Upload',
  'Play', 'Pause', 'Music', 'Video', 'Image', 'Camera', 'Mic',
  'Globe', 'MapPin', 'Calendar', 'Clock', 'Bell', 'Send',
  'Twitter', 'Github', 'Youtube', 'Instagram', 'Facebook', 'Linkedin',
  'ChevronRight', 'ChevronDown', 'ArrowRight', 'ArrowUpRight', 'Plus', 'Minus',
  'Check', 'X', 'AlertCircle', 'Info', 'HelpCircle', 'Sparkles',
  'Zap', 'Flame', 'Trophy', 'Award', 'Gift', 'Rocket', 'Target',
  'Bookmark', 'Tag', 'Hash', 'AtSign', 'Wallet', 'CreditCard', 'ShoppingCart',
  'Coffee', 'Utensils', 'Car', 'Plane', 'Building', 'Briefcase', 'GraduationCap',
];

interface IconPickerProps {
  value?: string;
  onChange: (iconName: string) => void;
  className?: string;
}

export function IconPicker({ value, onChange, className }: IconPickerProps) {
  const t = useTranslations('homepageComponentEditor');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Get the current icon component
  const SelectedIcon = value ? (icons[value as keyof typeof icons] as LucideIcon) : null;

  // Filter icons based on search
  const filteredIcons = useMemo(() => {
    if (!search) {
      return COMMON_ICONS;
    }
    
    const searchLower = search.toLowerCase();
    // Search in all icons when user is searching
    return Object.keys(icons)
      .filter(name => name.toLowerCase().includes(searchLower))
      .slice(0, 60); // Limit results for performance
  }, [search]);

  const handleSelect = (iconName: string) => {
    onChange(iconName);
    setOpen(false);
    setSearch('');
  };

  const handleClear = () => {
    onChange('');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between h-10',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <div className="flex items-center gap-2">
            {SelectedIcon ? (
              <>
                <SelectedIcon className="h-4 w-4" />
                <span>{value}</span>
              </>
            ) : (
              <span>{t('selectIcon')}</span>
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <div className="p-3 border-b">
          <Input
            placeholder={t('searchIcons')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9"
            autoFocus
          />
        </div>
        
        <ScrollArea className="h-[280px]">
          <div className="p-3">
            {value && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start mb-2 text-muted-foreground hover:text-destructive"
                onClick={handleClear}
              >
                <span className="mr-2">✕</span>
                {t('clearIcon')}
              </Button>
            )}
            
            <div className="grid grid-cols-6 gap-1">
              {filteredIcons.map((iconName) => {
                const IconComponent = icons[iconName as keyof typeof icons] as LucideIcon;
                if (!IconComponent) return null;
                
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => handleSelect(iconName)}
                    className={cn(
                      'p-2 rounded-md hover:bg-accent transition-colors cursor-pointer',
                      'flex items-center justify-center',
                      'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
                      value === iconName && 'bg-primary text-primary-foreground hover:bg-primary/90'
                    )}
                    title={iconName}
                    aria-label={iconName}
                  >
                    <IconComponent className="h-5 w-5" />
                  </button>
                );
              })}
            </div>
            
            {filteredIcons.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                {t('noIconsFound')}
              </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="p-2 border-t text-xs text-muted-foreground text-center">
          {search ? t('showingResults', { count: filteredIcons.length }) : t('commonIcons')}
        </div>
      </PopoverContent>
    </Popover>
  );
}
