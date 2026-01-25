// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { useTranslations } from 'next-intl';
import React from 'react';

import { LinkButtonProps } from './schema';

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

      <div className="space-y-2">
        <Label>{t('iconName')}</Label>
        <Input 
          value={props.icon || ''} 
          onChange={(e) => onChange({ icon: e.target.value || undefined })}
          placeholder={t('iconHint')}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label>{t('fullWidth')}</Label>
        <Switch 
          checked={props.fullWidth} 
          onCheckedChange={(checked) => onChange({ fullWidth: checked })} 
        />
      </div>
    </div>
  );
};
