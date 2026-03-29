// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { useTranslations } from 'next-intl';
import React from 'react';

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

import { isOptionValue } from '../../lib/option-guards';
import { VideoEmbedProps } from './schema';

const VIDEO_ASPECT_RATIO_OPTIONS = ['16:9', '4:3', '1:1', '9:16'] as const satisfies readonly VideoEmbedProps['aspectRatio'][];

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

      {/* New: Title */}
      <div className="space-y-2">
        <Label>{t('videoTitle')}</Label>
        <Input 
          value={props.title || ''} 
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder={t('videoTitlePlaceholder')}
        />
      </div>

      {/* New: Cover URL */}
      <div className="space-y-2">
        <Label>{t('coverUrl')}</Label>
        <Input 
          value={props.coverUrl || ''} 
          onChange={(e) => onChange({ coverUrl: e.target.value })}
          placeholder="https://..."
        />
        <p className="text-xs text-muted-foreground">
          {t('coverUrlHint')}
        </p>
      </div>

      <div className="space-y-2">
        <Label>{t('aspectRatio')}</Label>
        <Select 
          value={props.aspectRatio} 
          onValueChange={(value) => {
            if (isOptionValue(VIDEO_ASPECT_RATIO_OPTIONS, value)) {
              onChange({ aspectRatio: value });
            }
          }}
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

      <div className="grid grid-cols-2 gap-4">
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

        {/* New: Loop */}
        <div className="flex items-center justify-between">
          <Label>{t('loop')}</Label>
          <Switch 
            checked={props.loop || false} 
            onCheckedChange={(checked) => onChange({ loop: checked })} 
          />
        </div>

        {/* New: Muted */}
        <div className="flex items-center justify-between">
          <Label>{t('muted')}</Label>
          <Switch 
            checked={props.muted || false} 
            onCheckedChange={(checked) => onChange({ muted: checked })} 
          />
        </div>
      </div>
    </div>
  );
};
