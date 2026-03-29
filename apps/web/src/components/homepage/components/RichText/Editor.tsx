// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { useTranslations } from 'next-intl';
import React from 'react';

import { TipTapEditor } from '@/components/shared/TipTapEditor';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import { isOptionValue } from '../../lib/option-guards';
import { RichTextProps } from './schema';

const RICH_TEXT_ALIGN_OPTIONS = ['left', 'center', 'right', 'justify'] as const satisfies readonly RichTextProps['textAlign'][];

interface RichTextEditorProps {
  props: RichTextProps;
  onChange: (props: Partial<RichTextProps>) => void;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ props, onChange }) => {
  const t = useTranslations('homepageComponentEditor');
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t('content')}</Label>
        <TipTapEditor
          content={props.contentHtml}
          onChange={(html) => onChange({ contentHtml: html })}
        />
      </div>

      <div className="space-y-2">
        <Label>{t('textAlign')}</Label>
        <Select 
          value={props.textAlign} 
          onValueChange={(value) => {
            if (isOptionValue(RICH_TEXT_ALIGN_OPTIONS, value)) {
              onChange({ textAlign: value });
            }
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">{t('left')}</SelectItem>
            <SelectItem value="center">{t('center')}</SelectItem>
            <SelectItem value="right">{t('right')}</SelectItem>
            <SelectItem value="justify">{t('justify')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
