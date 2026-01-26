// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { useTranslations } from 'next-intl';
import React from 'react';

import { VideoEmbedProps } from './schema';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface VideoEmbedEditorProps {
  props: VideoEmbedProps;
  onChange: (props: Partial<VideoEmbedProps>) => void;
}

export const VideoEmbedEditor: React.FC<VideoEmbedEditorProps> = ({ props, onChange }) => {
  const t = useTranslations('homepageComponentEditor');
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t('videoUrl')}</Label>
        <Input 
          value={props.videoUrl} 
          onChange={(e) => onChange({ videoUrl: e.target.value })}
          placeholder={t('videoUrlPlaceholder')}
        />
        <p className="text-xs text-muted-foreground">
          {t('videoSupportHint')}
        </p>
      </div>

      <div className="space-y-2">
        <Label>{t('aspectRatio')}</Label>
        <Select 
          value={props.aspectRatio} 
          onValueChange={(v: any) => onChange({ aspectRatio: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="16:9">{t('widescreen')}</SelectItem>
            <SelectItem value="4:3">{t('classic')}</SelectItem>
            <SelectItem value="1:1">{t('square')}</SelectItem>
            <SelectItem value="9:16">{t('vertical916')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Label>{t('autoplay')}</Label>
        <Switch 
          checked={props.autoplay} 
          onCheckedChange={(checked) => onChange({ autoplay: checked })} 
        />
      </div>
      
       <div className="flex items-center justify-between">
        <Label>{t('showControls')}</Label>
        <Switch 
          checked={props.showControls} 
          onCheckedChange={(checked) => onChange({ showControls: checked })} 
        />
      </div>
    </div>
  );
};
