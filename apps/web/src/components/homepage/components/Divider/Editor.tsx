/* eslint-disable @typescript-eslint/no-explicit-any */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { useTranslations } from 'next-intl';
import React from 'react';

import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import { DividerProps } from './schema';

interface DividerEditorProps {
  props: DividerProps;
  onChange: (props: Partial<DividerProps>) => void;
}

export const DividerEditor: React.FC<DividerEditorProps> = ({ props, onChange }) => {
  const t = useTranslations('homepageComponentEditor');
  
  return (
    <div className="space-y-4">
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
            <SelectItem value="solid">{t('line')}</SelectItem>
            <SelectItem value="dashed">{t('dashed')}</SelectItem>
            <SelectItem value="dotted">{t('dotted')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t('spacing')}</Label>
        <Select 
          value={props.spacing} 
          onValueChange={(v: any) => onChange({ spacing: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="small">{t('small')}</SelectItem>
            <SelectItem value="medium">{t('medium')}</SelectItem>
            <SelectItem value="large">{t('large')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label>{t('color')}</Label>
        <Select 
          value={props.color} 
          onValueChange={(v: any) => onChange({ color: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">{t('presetDefault')}</SelectItem>
            <SelectItem value="primary">{t('primaryColor')}</SelectItem>
            <SelectItem value="accent">{t('secondaryColor')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
