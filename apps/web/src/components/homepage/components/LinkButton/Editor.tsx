/* eslint-disable @typescript-eslint/no-explicit-any */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { useTranslations } from 'next-intl';
import React from 'react';

import { IconPicker } from '@/components/shared/IconPicker';
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

import { LinkButtonProps } from './schema';

interface LinkButtonEditorProps {
  props: LinkButtonProps;
  onChange: (props: Partial<LinkButtonProps>) => void;
}

export const LinkButtonEditor: React.FC<LinkButtonEditorProps> = ({ props, onChange }) => {
  const t = useTranslations('homepageComponentEditor');
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t('label')}</Label>
        <Input 
          value={props.label} 
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder={t('buttonText')}
        />
      </div>

      <div className="space-y-2">
        <Label>{t('url')}</Label>
        <Input 
          value={props.url} 
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder="https://..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('style')}</Label>
          <Select 
            value={props.style} 
            onValueChange={(v: any) => onChange({ style: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="solid">{t('solid')}</SelectItem>
              <SelectItem value="outline">{t('outline')}</SelectItem>
              <SelectItem value="ghost">{t('ghost')}</SelectItem>
              <SelectItem value="link">{t('link')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* New: Hover Effect */}
        <div className="space-y-2">
          <Label>{t('hoverEffect')}</Label>
          <Select 
            value={props.hoverEffect || 'none'} 
            onValueChange={(v: any) => onChange({ hoverEffect: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('none')}</SelectItem>
              <SelectItem value="scale">{t('hoverScale')}</SelectItem>
              <SelectItem value="glow">{t('hoverGlow')}</SelectItem>
              <SelectItem value="lift">{t('hoverLift')}</SelectItem>
              <SelectItem value="shake">{t('hoverShake')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('iconName')}</Label>
        <IconPicker 
          value={props.icon || ''} 
          onChange={(iconName) => onChange({ icon: iconName || undefined })}
        />
      </div>

      {/* New: Custom Color */}
      <div className="space-y-2">
        <Label>{t('customColor')}</Label>
        <div className="flex gap-2">
          <input
            type="color"
            value={props.customColor || '#3b82f6'}
            onChange={(e) => onChange({ customColor: e.target.value })}
            className="w-10 h-10 rounded border cursor-pointer"
          />
          <Input 
            value={props.customColor || ''} 
            onChange={(e) => onChange({ customColor: e.target.value })}
            placeholder="#3b82f6"
            className="flex-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center justify-between">
          <Label>{t('fullWidth')}</Label>
          <Switch 
            checked={props.fullWidth} 
            onCheckedChange={(checked) => onChange({ fullWidth: checked })} 
          />
        </div>

        {/* New: Open in New Tab */}
        <div className="flex items-center justify-between">
          <Label>{t('openInNewTab')}</Label>
          <Switch 
            checked={props.openInNewTab || false} 
            onCheckedChange={(checked) => onChange({ openInNewTab: checked })} 
          />
        </div>
      </div>
    </div>
  );
};
