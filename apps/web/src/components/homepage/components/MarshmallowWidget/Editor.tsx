/* eslint-disable @typescript-eslint/no-explicit-any */
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

import { MarshmallowWidgetProps } from './schema';

interface MarshmallowWidgetEditorProps {
  props: MarshmallowWidgetProps;
  onChange: (props: Partial<MarshmallowWidgetProps>) => void;
}

export const MarshmallowWidgetEditor: React.FC<MarshmallowWidgetEditorProps> = ({ props, onChange }) => {
  const t = useTranslations('homepageComponentEditor');
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t('marshmallowPath')}</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">/m/</span>
          <Input 
            value={props.homepagePath} 
            onChange={(e) => onChange({ homepagePath: e.target.value })}
            placeholder="path"
            className="flex-1"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {t('pathHintMarshmallow')}
        </p>
      </div>

      <div className="space-y-2">
        <Label>{t('displayMode')}</Label>
        <Select 
          value={props.displayMode} 
          onValueChange={(v: any) => onChange({ displayMode: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="card">{t('card')}</SelectItem>
            <SelectItem value="button">{t('buttonOnly')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Label>{t('showSubmitButton')}</Label>
        <Switch 
          checked={props.showSubmitButton} 
          onCheckedChange={(checked) => onChange({ showSubmitButton: checked })} 
        />
      </div>

      <div className="space-y-2">
        <Label>{t('marshmallowTitle')}</Label>
        <Input 
          value={props.title || ''} 
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder={t('marshmallowPlaceholder')}
        />
      </div>

      <div className="space-y-2">
        <Label>{t('marshmallowDescription')}</Label>
        <Input 
          value={props.description || ''} 
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder={t('descPlaceholder')}
        />
      </div>

      <div className="space-y-2">
        <Label>{t('buttonLabel')}</Label>
        <Input 
          value={props.buttonText || ''} 
          onChange={(e) => onChange({ buttonText: e.target.value })}
          placeholder={t('buttonTextPlaceholder')}
        />
      </div>
    </div>
  );
};
