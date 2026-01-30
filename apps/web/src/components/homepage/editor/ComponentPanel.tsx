/* eslint-disable @typescript-eslint/no-explicit-any */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { ComponentType } from '@tcrn/shared';
import {
    Calendar,
    Candy,
    Image as ImageIcon,
    Link as LinkIcon,
    Minus,
    MoveVertical,
    Music,
    Radio,
    Share2,
    Type,
    User,
    Youtube
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEditorStore } from '@/stores/homepage/editor-store';


const COMPONENTS_LIST: { type: ComponentType, labelKey: string, icon: any }[] = [
  { type: 'ProfileCard', labelKey: 'profileCard', icon: User },
  { type: 'SocialLinks', labelKey: 'socialLinks', icon: Share2 },
  { type: 'Schedule', labelKey: 'schedule', icon: Calendar },
  { type: 'LiveStatus', labelKey: 'liveStatus', icon: Radio },
  { type: 'MusicPlayer', labelKey: 'musicPlayer', icon: Music },
  { type: 'ImageGallery', labelKey: 'imageGallery', icon: ImageIcon },
  { type: 'VideoEmbed', labelKey: 'videoEmbed', icon: Youtube },
  { type: 'RichText', labelKey: 'richText', icon: Type },
  { type: 'LinkButton', labelKey: 'linkButton', icon: LinkIcon },
  { type: 'MarshmallowWidget', labelKey: 'marshmallow', icon: Candy },
  { type: 'Divider', labelKey: 'divider', icon: Minus },
  { type: 'Spacer', labelKey: 'spacer', icon: MoveVertical },
];

export function ComponentPanel() {
  const t = useTranslations('homepageEditor');
  const addComponent = useEditorStore(state => state.addComponent);

  return (
    <div className="flex flex-col h-full border-r bg-white dark:bg-slate-950 overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="font-semibold">{t('components')}</h3>
        <p className="text-xs text-muted-foreground">{t('dragOrClick')}</p>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="grid grid-cols-2 gap-3">
          {COMPONENTS_LIST.map((comp) => (
            <Button
              key={comp.type}
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-all"
              onClick={() => addComponent(comp.type)}
            >
              <comp.icon className="w-6 h-6 text-slate-500" />
              <span className="text-xs">{t(comp.labelKey)}</span>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
