import { useTranslations } from 'next-intl';
import React from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useEditorStore } from '@/stores/homepage/editor-store';

import { BilibiliCardStyle, BilibiliDynamicProps, BilibiliFilterType } from './Preview';

export const BilibiliDynamicEditor = ({ props, onChange }: { props: BilibiliDynamicProps, onChange: (props: Partial<BilibiliDynamicProps>) => void }) => {
  const t = useTranslations('homepageEditor.bilibili');
  const tEditor = useTranslations('homepageComponentEditor');
  const { 
    uid = '', 
    title = '', 
    maxItems = 5, 
    filterType = 'all', 
    cardStyle = 'standard' 
  } = props;
  const { editingLocale, content, selectedComponentId } = useEditorStore();
  
  // Get full component to access raw values for other locales
  const component = content.components.find(c => c.id === selectedComponentId);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ uid: e.target.value });
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ title: e.target.value });
  };

  // Helper to get fallback hint text
  const getPlaceholderHint = () => {
    if (editingLocale === 'default') return null;
    if (!component) return null;

    const def = component.props.title || t('defaultTitle');
    const en = component.i18n?.en?.title;
    const zh = component.i18n?.zh?.title;
    const ja = component.i18n?.ja?.title;

    // Priority display: "English: ... | Chinese: ... "
    const parts = [];
    if (en) parts.push(`EN: ${en}`);
    if (zh) parts.push(`ZH: ${zh}`);
    if (ja) parts.push(`JA: ${ja}`);
    parts.push(`Default: ${def}`);

    return parts.join(' | ');
  };

  return (
    <div className="space-y-4">
      {/* Title Field with i18n support */}
      <div className="space-y-2">
        <Label>{t('title')}</Label>
        <Input 
            value={title} 
            onChange={handleTitleChange} 
            placeholder={t('defaultTitle')} 
        />
        {editingLocale !== 'default' && (
             <p className="text-xs text-muted-foreground break-all">
                Reference: {getPlaceholderHint()}
             </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>{t('uid')}</Label>
        <Input 
          value={uid} 
          onChange={handleChange} 
          placeholder="e.g. 401742377" 
        />
        <p className="text-xs text-muted-foreground">
          {t('hint')}
        </p>
      </div>

      {/* Max Items */}
      <div className="space-y-2">
        <Label>{t('maxItems')}</Label>
        <Input
          type="number"
          min={1}
          max={10}
          value={maxItems}
          onChange={(e) => {
            const value = Math.min(10, Math.max(1, parseInt(e.target.value) || 1));
            onChange({ maxItems: value });
          }}
          className="w-20"
        />
      </div>

      {/* Filter Type */}
      <div className="space-y-2">
        <Label>{t('filterType')}</Label>
        <Select 
          value={filterType} 
          onValueChange={(v: BilibiliFilterType) => onChange({ filterType: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tEditor('all')}</SelectItem>
            <SelectItem value="video">{t('typeVideo')}</SelectItem>
            <SelectItem value="image">{t('typeImage')}</SelectItem>
            <SelectItem value="article">{t('typeArticle')}</SelectItem>
            <SelectItem value="live">{t('typeLive')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Card Style */}
      <div className="space-y-2">
        <Label>{t('cardStyle')}</Label>
        <Select 
          value={cardStyle} 
          onValueChange={(v: BilibiliCardStyle) => onChange({ cardStyle: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="compact">{t('styleCompact')}</SelectItem>
            <SelectItem value="standard">{t('styleStandard')}</SelectItem>
            <SelectItem value="expanded">{t('styleExpanded')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Advanced Options */}
      <div className="border-t pt-4 mt-4 space-y-4">
        <div className="space-y-2">
          <Label>{tEditor('refreshInterval')}</Label>
          <div className="flex gap-2 items-center">
            <Input
              type="number"
              min={0}
              max={60}
              value={props.refreshInterval ?? 0}
              onChange={(e) => {
                const value = Math.min(60, Math.max(0, parseInt(e.target.value) || 0));
                onChange({ refreshInterval: value });
              }}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">{tEditor('minutes')}</span>
          </div>
          <p className="text-xs text-muted-foreground">{tEditor('refreshIntervalHint')}</p>
        </div>

        <div className="flex items-center justify-between">
          <Label>{tEditor('showHeader')}</Label>
          <Switch 
            checked={props.showHeader ?? true} 
            onCheckedChange={(checked) => onChange({ showHeader: checked })} 
          />
        </div>
      </div>
    </div>
  );
};
