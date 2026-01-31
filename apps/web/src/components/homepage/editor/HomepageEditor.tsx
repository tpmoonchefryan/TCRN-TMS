/* eslint-disable @typescript-eslint/no-unused-vars */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { ArrowLeft, Eye, History, Monitor, MoreHorizontal, Redo2, Save, Settings, Smartphone, Tablet, Undo2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import React from 'react'; // Added for React.useState
import { toast } from 'sonner';

import { Canvas } from './Canvas';
import { ComponentPanel } from './ComponentPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { SettingsDialog } from './SettingsDialog'; // Added
import { VersionHistory } from './VersionHistory'; // Added

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'; // Added
import { useEditorStore } from '@/stores/homepage/editor-store';

interface HomepageEditorProps {
  talentId: string;
}

export function HomepageEditor({ talentId }: HomepageEditorProps) {
  const t = useTranslations('homepageEditor');
  const router = useRouter();
  const { 
    content, 
    theme, 
    saveStatus, 
    saveDraft, 
    publish, 
    isPublishing,
    settings,
    undo,
    redo,
    canUndo,
    canRedo,
    error: storeError
  } = useEditorStore();
  
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  React.useEffect(() => {
    if (storeError) {
      toast.error(t('errorMessage', { error: storeError }));
    }
  }, [storeError, t]);

  // Keyboard shortcuts for undo/redo
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo()) redo();
        } else {
          if (canUndo()) undo();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        if (canRedo()) redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  const handleSave = async () => {
    await saveDraft(talentId);
  };

  const handlePublish = async () => {
    if (confirm(t('confirmPublish'))) {
       const success = await publish(talentId);
       if (success) {
         // Invalidate ISR cache so visitors see the new content immediately
         const path = settings?.homepagePath;
         if (path) {
           try {
             await fetch('/api/revalidate', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ path }),
             });
           } catch (e) {
             console.warn('Failed to revalidate cache:', e);
           }
         }
         // Show toast success
         toast.success(t('publishSuccess'));
       }
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background">
      {/* Dialogs */}
      <VersionHistory open={historyOpen} onOpenChange={setHistoryOpen} talentId={talentId} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} talentId={talentId} />

      {/* Header */}
      <header className="h-14 border-b flex items-center justify-between px-4 bg-white dark:bg-slate-950 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft size={18} />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold">{t('editorTitle')}</h1>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              {saveStatus === 'saving' ? t('saving') : 
               saveStatus === 'saved' ? t('saved') : 
               t('unsaved_changes')}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <div className="flex items-center mr-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-2 px-2">
                  <span className="text-xs font-medium">
                    {useEditorStore(s => s.editingLocale) === 'default' 
                      ? 'Default' 
                      : useEditorStore.getState().editingLocale.toUpperCase()}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => useEditorStore.getState().setEditingLocale('default')}>
                  Default (Original)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => useEditorStore.getState().setEditingLocale('en')}>
                  English (EN)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => useEditorStore.getState().setEditingLocale('zh')}>
                  Chinese (ZH)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => useEditorStore.getState().setEditingLocale('ja')}>
                  Japanese (JA)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Device Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 mr-2">
            <Button
              variant={useEditorStore(s => s.previewDevice) === 'mobile' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => useEditorStore.getState().setPreviewDevice('mobile')}
              title={t('mobile')}
            >
              <Smartphone size={14} />
            </Button>
            <Button
              variant={useEditorStore(s => s.previewDevice) === 'tablet' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => useEditorStore.getState().setPreviewDevice('tablet')}
              title={t('tablet')}
            >
              <Tablet size={14} />
            </Button>
            <Button
              variant={useEditorStore(s => s.previewDevice) === 'desktop' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => useEditorStore.getState().setPreviewDevice('desktop')}
              title={t('desktop')}
            >
              <Monitor size={14} />
            </Button>
          </div>

          {/* Undo/Redo Buttons */}
          <div className="flex items-center gap-1 mr-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => undo()}
              disabled={!canUndo()}
              title={t('undoTitle')}
            >
              <Undo2 size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => redo()}
              disabled={!canRedo()}
              title={t('redoTitle')}
            >
              <Redo2 size={14} />
            </Button>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              const path = settings?.homepagePath;
              if (path) {
                window.open(`/p/${path}`, '_blank');
              } else {
                toast.error(t('noHomepagePath'));
              }
            }}
          >
            <Eye size={14} className="mr-2" />
            {t('preview')}
          </Button>
          
          <Button size="sm" variant="secondary" onClick={handleSave} disabled={saveStatus === 'saving' || isPublishing}>
            <Save size={14} className="mr-2" />
            {t('save')}
          </Button>

          <Button size="sm" onClick={handlePublish} disabled={isPublishing || saveStatus === 'saving'}>
            {isPublishing ? (
               <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
            ) : (
               <Save size={14} className="mr-2" /> 
            )}
            {t('publish')}
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setHistoryOpen(true)}>
                <History className="mr-2 h-4 w-4" />
                {t('history')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                <Settings className="mr-2 h-4 w-4" />
                {t('settings')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Components */}
        <div className="w-64 border-r shrink-0">
          <ComponentPanel />
        </div>

        {/* Center: Canvas / Preview */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <Canvas />
        </div>
        
        {/* Right: Properties & Theme */}
        <div className="w-80 border-l shrink-0">
          <PropertiesPanel />
        </div>
      </div>
    </div>
  );
}
