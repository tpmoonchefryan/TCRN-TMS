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

import { isOptionValue } from '../../lib/option-guards';
import { SpacerProps } from './schema';

const SPACER_HEIGHT_OPTIONS = ['small', 'medium', 'large', 'xl', 'xxl', 'custom'] as const satisfies readonly SpacerProps['height'][];

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
          onValueChange={(value) => {
            if (isOptionValue(SPACER_HEIGHT_OPTIONS, value)) {
              onChange({ height: value });
            }
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="small">{t('small')} (1rem)</SelectItem>
            <SelectItem value="medium">{t('medium')} (2rem)</SelectItem>
            <SelectItem value="large">{t('large')} (4rem)</SelectItem>
            <SelectItem value="xl">{t('xl')}</SelectItem>
            <SelectItem value="xxl">{t('xxl')}</SelectItem>
            <SelectItem value="custom">{t('custom')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Custom Height - shown only when height is 'custom' */}
      {props.height === 'custom' && (
        <div className="space-y-2">
          <Label>{t('customHeight')}</Label>
          <div className="flex gap-2 items-center">
            <Input 
              type="number"
              min={0}
              max={500}
              value={props.customHeight ?? 64}
              onChange={(e) => onChange({ customHeight: parseInt(e.target.value) || 0 })}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">px</span>
          </div>
        </div>
      )}

      {/* Responsive Height for mobile */}
      <div className="space-y-2">
        <Label>{t('responsiveHeight')}</Label>
        <div className="flex gap-2 items-center">
          <Input 
            type="number"
            min={0}
            max={300}
            value={props.responsiveHeight ?? ''}
            onChange={(e) => {
              const val = e.target.value ? parseInt(e.target.value) : undefined;
              onChange({ responsiveHeight: val });
            }}
            placeholder={t('auto')}
            className="w-24"
          />
          <span className="text-sm text-muted-foreground">px</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('responsiveHeightHint')}
        </p>
      </div>
    </div>
  );
};
