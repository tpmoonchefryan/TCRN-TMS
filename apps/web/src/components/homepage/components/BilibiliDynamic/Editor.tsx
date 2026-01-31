import { useTranslations } from 'next-intl';
import React from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEditorStore } from '@/stores/homepage/editor-store';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const BilibiliDynamicEditor = ({ props, onChange }: { props: any, onChange: (props: any) => void }) => {
  const t = useTranslations('homepageEditor.bilibili');
  const { uid, title } = props as { uid?: string, title?: string };
  const { editingLocale, content, selectedComponentId } = useEditorStore();
  
  // Get full component to access raw values for other locales
  const component = content.components.find(c => c.id === selectedComponentId);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...props, uid: e.target.value });
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...props, title: e.target.value });
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
            value={title || ''} 
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
          value={uid || ''} 
          onChange={handleChange} 
          placeholder="e.g. 401742377" 
        />
        <p className="text-xs text-muted-foreground">
          {t('hint')}
        </p>
      </div>
    </div>
  );
};
