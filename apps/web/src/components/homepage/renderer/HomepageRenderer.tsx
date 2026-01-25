// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { useTranslations } from 'next-intl';
import { HomepageContent, ThemeConfig } from '@tcrn/shared';

import { COMPONENT_REGISTRY } from '../lib/component-registry';
import { migrateComponentTypes } from '../lib/types';

import { cn } from '@/lib/utils';

interface HomepageRendererProps {
  content: HomepageContent;
  theme: ThemeConfig;
  className?: string;
}

export function HomepageRenderer({ content, theme, className }: HomepageRendererProps) {
  const t = useTranslations('homepageEditor');
  // Migrate legacy component types to current types
  const migratedContent = migrateComponentTypes(content);
  // Handle both snake_case (from @tcrn/shared) and camelCase (from backend DTO) naming
  const typography = theme?.typography || {};
  const fontFamily = (typography as any).font_family || (typography as any).fontFamily || 'system';
  
  // Inject CSS variables for theme
  const style = {
    '--color-primary': theme?.colors?.primary || '#5599FF',
    '--color-accent': theme?.colors?.accent || '#FF88CC',
    '--color-bg': theme?.colors?.background || '#F5F7FA',
    '--color-text': theme?.colors?.text || '#1A1A1A',
    backgroundColor: theme?.background?.type === 'solid' ? theme.background.value : undefined,
    backgroundImage: theme?.background?.type !== 'solid' ? theme?.background?.value : undefined,
    color: theme?.colors?.text || '#1A1A1A',
    fontFamily: fontFamily === 'system' ? 'system-ui, sans-serif' : fontFamily
  } as React.CSSProperties;

  return (
    <div 
      className={cn("min-h-full w-full overflow-y-auto overflow-x-hidden", className)} 
      style={style}
    >
      <div className="max-w-md mx-auto min-h-full pb-20 pt-8">
        {migratedContent?.components && migratedContent.components.length > 0 ? (
          migratedContent.components.map(comp => {
            if (!comp.visible) return null;
            const definition = COMPONENT_REGISTRY[comp.type];
            if (!definition) return null;
            
            const Component = definition.preview;
            
            return (
              <div key={comp.id} className="relative group/render">
                <Component {...comp.props} />
              </div>
            );
          })
        ) : (
          <div className="flex items-center justify-center h-64 text-sm opacity-50">
            {migratedContent ? t('emptyPage') : t('noContentAvailable')}
          </div>
        )}
      </div>
    </div>
  );
}
