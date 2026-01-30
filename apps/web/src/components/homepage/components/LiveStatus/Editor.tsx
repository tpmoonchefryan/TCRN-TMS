/* eslint-disable @typescript-eslint/no-explicit-any */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';


import { useTranslations } from 'next-intl';

import { LiveStatusProps } from './Preview';

import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch } from '@/components/ui';

interface LiveStatusEditorProps {
  props: LiveStatusProps;
  onChange: (props: LiveStatusProps) => void;
}

export function LiveStatusEditor({ props, onChange }: LiveStatusEditorProps) {
  const t = useTranslations('homepageComponentEditor');
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t('platform')}</Label>
        <Select 
          value={props.platform} 
          onValueChange={(v: any) => onChange({ ...props, platform: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="youtube">{t('youtube')}</SelectItem>
            <SelectItem value="twitch">{t('twitch')}</SelectItem>
            <SelectItem value="bilibili">{t('bilibili')}</SelectItem>
            <SelectItem value="twitter">{t('twitter')}</SelectItem>
            <SelectItem value="other">{t('other')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label>{t('channelName')}</Label>
        <Input 
          value={props.channelName} 
          onChange={(e) => onChange({ ...props, channelName: e.target.value })} 
        />
      </div>

      <div className="space-y-2">
        <Label>
          {props.platform === 'bilibili' ? 'Room ID' : 'Channel ID'} <span className="text-xs text-muted-foreground">(Required for Auto-Fetch)</span>
        </Label>
        <Input 
          value={props.channelId || ''} 
          placeholder={props.platform === 'bilibili' ? 'e.g. 123456' : 'e.g. UC123...'}
          onChange={(e) => onChange({ ...props, channelId: e.target.value })} 
        />
      </div>

      <div className="space-y-2">
        <Label>{t('streamTitle')}</Label>
        <Input 
          value={props.title} 
          onChange={(e) => onChange({ ...props, title: e.target.value })} 
        />
      </div>
      
      <div className="space-y-2">
        <Label>{t('streamUrl')}</Label>
        <Input 
          value={props.streamUrl} 
          onChange={(e) => onChange({ ...props, streamUrl: e.target.value })} 
        />
      </div>

      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="space-y-0.5">
          <Label className="text-base">Manual Mode</Label>
          <p className="text-xs text-muted-foreground">Override auto-fetched data</p>
        </div>
        <Switch 
          checked={props.isLive}
          onCheckedChange={(checked) => onChange({ ...props, isLive: checked })}
        />
      </div>

      {(props.isLive || !['bilibili', 'youtube'].includes(props.platform || '')) && (
        <>
          {props.isLive && (
             <div className="space-y-2">
                 <Label>{t('viewersCount')}</Label>
                 <Input 
                 value={props.viewers} 
                 onChange={(e) => onChange({ ...props, viewers: e.target.value })} 
                 />
             </div>
           )}
        </>
      )}
    </div>
  );
}
