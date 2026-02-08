// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/stores/homepage/editor-store';

import { HomepageRenderer } from '../renderer/HomepageRenderer';


export function PreviewPanel() {
  const t = useTranslations('homepageEditor');
  const { content, theme, previewDevice, setPreviewDevice } = useEditorStore();
  
  const deviceSizes = {
    mobile: 'max-w-[375px]',
    tablet: 'max-w-[768px]',
    desktop: 'max-w-full',
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-900 border-l border-r overflow-hidden relative">
      <div className="flex items-center justify-center p-2 border-b bg-white dark:bg-slate-950 gap-2">
        <Button
          variant={previewDevice === 'mobile' ? 'default' : 'ghost'}
          size="icon"
          onClick={() => setPreviewDevice('mobile')}
          title={t('mobile')}
        >
          <Smartphone size={18} />
        </Button>
        <Button
          variant={previewDevice === 'tablet' ? 'default' : 'ghost'}
          size="icon"
          onClick={() => setPreviewDevice('tablet')}
          title={t('tablet')}
        >
          <Tablet size={18} />
        </Button>
        <Button
          variant={previewDevice === 'desktop' ? 'default' : 'ghost'}
          size="icon"
          onClick={() => setPreviewDevice('desktop')}
          title={t('desktop')}
        >
          <Monitor size={18} />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 flex items-start justify-center">
        <div 
          className={cn(
            "bg-white h-full transition-all duration-300 shadow-2xl overflow-hidden relative",
            deviceSizes[previewDevice],
            previewDevice === 'mobile' && "rounded-[40px] border-[8px] border-slate-800 h-[800px]",
            previewDevice === 'tablet' && "rounded-[20px] border-[8px] border-slate-800 h-[900px]",
            previewDevice === 'desktop' && "w-full h-full rounded-none border-none"
          )}
        >
          {previewDevice === 'mobile' && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-xl z-50"></div>
          )}
          
          <div className="w-full h-full overflow-y-auto">
             <HomepageRenderer content={content} theme={theme} />
          </div>
        </div>
      </div>
    </div>
  );
}
