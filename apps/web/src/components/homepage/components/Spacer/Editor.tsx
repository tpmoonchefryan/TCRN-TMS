// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { useTranslations } from 'next-intl';
import React from 'react';

import { SpacerProps } from './schema';

import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface SpacerEditorProps {
  props: SpacerProps;
  onChange: (props: Partial<SpacerProps>) => void;
}

export const SpacerEditor: React.FC<SpacerEditorProps> = ({ props, onChange }) => {
  const t = useTranslations('homepageComponentEditor');
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t('height')}</Label>
        <Select 
          value={props.height} 
          onValueChange={(v: any) => onChange({ height: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="small">{t('small')} (1rem)</SelectItem>
            <SelectItem value="medium">{t('medium')} (2rem)</SelectItem>
            <SelectItem value="large">{t('large')} (4rem)</SelectItem>
            <SelectItem value="xl">XL (6rem)</SelectItem>
            <SelectItem value="xxl">XXL (8rem)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
