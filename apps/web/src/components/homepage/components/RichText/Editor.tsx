// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { useTranslations } from 'next-intl';
import React from 'react';

import { RichTextProps } from './schema';

import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

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
        <Textarea 
          value={props.contentHtml} 
          onChange={(e) => onChange({ contentHtml: e.target.value })}
          placeholder="<p>Enter HTML here...</p>"
          rows={10}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Supports basic HTML tags (p, b, i, ul, ol, etc.).
        </p>
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
            <SelectItem value="justify">Justify</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
