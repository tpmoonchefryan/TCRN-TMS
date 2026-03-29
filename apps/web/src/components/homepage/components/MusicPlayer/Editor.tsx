// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { useTranslations } from 'next-intl';

import { Input, Label } from '@/components/ui';

import { MusicPlayerProps } from './Preview';

const MUSIC_PLATFORM_OPTIONS = ['spotify', 'apple', 'soundcloud', 'youtube_music'] as const satisfies readonly NonNullable<MusicPlayerProps['platform']>[];

function isMusicPlatform(value: string): value is (typeof MUSIC_PLATFORM_OPTIONS)[number] {
  return MUSIC_PLATFORM_OPTIONS.includes(value as (typeof MUSIC_PLATFORM_OPTIONS)[number]);
}

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
  ] as const;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t('musicPlatform')}</Label>
        <select 
          className="w-full p-2 border rounded text-sm bg-background"
          value={props.platform || 'spotify'}
          onChange={(e) => {
            const nextPlatform = e.target.value;
            if (isMusicPlatform(nextPlatform)) {
              onChange({ ...props, platform: nextPlatform });
            }
          }}
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
