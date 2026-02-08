/* eslint-disable @typescript-eslint/no-explicit-any */
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

import { RichTextProps } from './schema';

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
          onValueChange={(v: any) => onChange({ textAlign: v })}
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
