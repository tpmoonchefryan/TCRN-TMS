// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { Smile } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
}

// Map next-intl locale to emoji-mart locale
const localeMap: Record<string, string> = {
  en: 'en',
  zh: 'zh',
  ja: 'ja',
};

export function EmojiPicker({ onEmojiSelect, disabled }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations('publicMarshmallow');
  const locale = useLocale();
  
  const handleSelect = (emoji: { native: string }) => {
    onEmojiSelect(emoji.native);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-400 hover:text-slate-600"
          disabled={disabled}
          title={t('addEmoji')}
        >
          <Smile size={18} />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 border-0 shadow-xl" 
        side="top" 
        align="end"
        sideOffset={8}
      >
        <Picker
          data={data}
          onEmojiSelect={handleSelect}
          locale={localeMap[locale] || 'en'}
          theme="light"
          previewPosition="none"
          skinTonePosition="none"
          maxFrequentRows={2}
          perLine={8}
          emojiButtonSize={32}
          emojiSize={20}
        />
      </PopoverContent>
    </Popover>
  );
}
