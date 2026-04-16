// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';


import { useTranslations } from 'next-intl';

import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch } from '@/components/ui';

import { isOptionValue } from '../../lib/option-guards';
import { LiveStatusProps } from './Preview';

const LIVE_STATUS_PLATFORM_OPTIONS = ['youtube', 'twitch', 'twitter', 'bilibili', 'other'] as const satisfies readonly NonNullable<LiveStatusProps['platform']>[];

interface LiveStatusEditorProps {
  props: LiveStatusProps;
  onChange: (props: LiveStatusProps) => void;
}

export function LiveStatusEditor({ props, onChange }: LiveStatusEditorProps) {
  const t = useTranslations('homepageComponentEditor');
  const tForms = useTranslations('forms');
  const tLive = useTranslations('homepageComponentEditor.liveStatus');
  const channelIdLabel = props.platform === 'bilibili' ? tLive('roomIdLabel') : tLive('channelIdLabel');
  const channelIdPlaceholder = props.platform === 'bilibili' ? tLive('roomIdPlaceholder') : tLive('channelIdPlaceholder');
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t('platform')}</Label>
        <Select 
          value={props.platform} 
          onValueChange={(value) => {
            if (isOptionValue(LIVE_STATUS_PLATFORM_OPTIONS, value)) {
              onChange({ ...props, platform: value });
            }
          }}
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
          {channelIdLabel} <span className="text-xs text-muted-foreground">({tLive('requiredForAutoFetch')})</span>
        </Label>
        <Input 
          value={props.channelId || ''} 
          placeholder={channelIdPlaceholder}
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
          placeholder={tForms('placeholders.url')}
          onChange={(e) => onChange({ ...props, streamUrl: e.target.value })} 
        />
      </div>

      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="space-y-0.5">
          <Label className="text-base">{tLive('manualMode')}</Label>
          <p className="text-xs text-muted-foreground">{tLive('manualModeHint')}</p>
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
