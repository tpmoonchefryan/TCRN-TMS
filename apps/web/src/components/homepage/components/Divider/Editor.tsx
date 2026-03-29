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

import { isOptionValue } from '../../lib/option-guards';
import { DividerProps } from './schema';

const DIVIDER_STYLE_OPTIONS = ['solid', 'dashed', 'dotted'] as const satisfies readonly DividerProps['style'][];
const DIVIDER_SPACING_OPTIONS = ['small', 'medium', 'large'] as const satisfies readonly DividerProps['spacing'][];
const DIVIDER_COLOR_OPTIONS = ['default', 'primary', 'accent'] as const satisfies readonly DividerProps['color'][];

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
          onValueChange={(value) => {
            if (isOptionValue(DIVIDER_STYLE_OPTIONS, value)) {
              onChange({ style: value });
            }
          }}
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
          onValueChange={(value) => {
            if (isOptionValue(DIVIDER_SPACING_OPTIONS, value)) {
              onChange({ spacing: value });
            }
          }}
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
          onValueChange={(value) => {
            if (isOptionValue(DIVIDER_COLOR_OPTIONS, value)) {
              onChange({ color: value });
            }
          }}
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
