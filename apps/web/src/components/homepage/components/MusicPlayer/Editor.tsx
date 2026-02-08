/* eslint-disable @typescript-eslint/no-explicit-any */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { useTranslations } from 'next-intl';

import { Input, Label } from '@/components/ui';

import { MusicPlayerProps } from './Preview';

interface MusicPlayerEditorProps {
  props: MusicPlayerProps;
  onChange: (props: MusicPlayerProps) => void;
}

export function MusicPlayerEditor({ props, onChange }: MusicPlayerEditorProps) {
  const t = useTranslations('homepageComponentEditor');

  const platforms = [
    { value: 'spotify', label: t('platformSpotify') },
    { value: 'apple', label: t('platformApple') },
    { value: 'soundcloud', label: t('platformSoundcloud') },
    { value: 'youtube_music', label: t('platformYoutubeMusic') },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t('musicPlatform')}</Label>
        <select 
          className="w-full p-2 border rounded text-sm bg-background"
          value={props.platform || 'spotify'}
          onChange={(e) => onChange({ ...props, platform: e.target.value as any })}
        >
          {platforms.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>
      
      <div className="space-y-2">
        <Label>{t('embedValue')}</Label>
        <Input 
          value={props.embedValue || ''} 
          placeholder={t('embedValuePlaceholder')}
          onChange={(e) => onChange({ ...props, embedValue: e.target.value })} 
        />
        <p className="text-xs text-muted-foreground">
          {t('musicHelp')}
        </p>
      </div>

    </div>
  );
}
