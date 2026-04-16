// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { ArrowLeft, Eye, History, Monitor, MoreHorizontal, Redo2, Save, Settings, Smartphone, Tablet, Undo2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ConfirmActionDialog } from '@/platform/ui';
import { useEditorStore } from '@/stores/homepage/editor-store';

import { Canvas } from './Canvas';
import { ComponentPanel } from './ComponentPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { SettingsDialog } from './SettingsDialog';
import { VersionHistory } from './VersionHistory';

interface HomepageEditorProps {
  talentId: string;
}

export function HomepageEditor({ talentId }: HomepageEditorProps) {
  const t = useTranslations('homepageEditor');
  const tc = useTranslations('common');
  const router = useRouter();
  const {
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
  const editingLocale = useEditorStore((state) => state.editingLocale);
  const previewDevice = useEditorStore((state) => state.previewDevice);
  const setEditingLocale = useEditorStore((state) => state.setEditingLocale);
  const setPreviewDevice = useEditorStore((state) => state.setPreviewDevice);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = React.useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = React.useState(false);
  const hasUnsavedChanges = saveStatus === 'unsaved';

  React.useEffect(() => {
    if (storeError) {
      toast.error(t(storeError as never));
    }
  }, [storeError, t]);

  React.useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

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

  const leaveEditor = React.useCallback(() => {
    router.back();
  }, [router]);

  const handleBack = React.useCallback(() => {
    if (hasUnsavedChanges) {
      setLeaveConfirmOpen(true);
      return;
    }

    leaveEditor();
  }, [hasUnsavedChanges, leaveEditor]);

  const handlePublish = React.useCallback(async () => {
    setPublishConfirmOpen(false);
    const success = await publish(talentId);
    if (!success) {
      return;
    }

    const path = settings?.homepagePath;
    if (path) {
      try {
        await fetch('/api-proxy/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path }),
        });
      } catch (error) {
        console.warn('Failed to revalidate cache:', error);
      }
    }

    toast.success(t('publishSuccess'));
  }, [publish, settings?.homepagePath, t, talentId]);

  const getEditingLocaleLabel = (locale: 'default' | 'en' | 'zh' | 'ja') => {
    switch (locale) {
      case 'default':
        return tc('default');
      case 'en':
        return tc('english');
      case 'zh':
        return tc('chinese');
      case 'ja':
        return tc('japanese');
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background">
      {/* Dialogs */}
      <VersionHistory open={historyOpen} onOpenChange={setHistoryOpen} talentId={talentId} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} talentId={talentId} />
      <ConfirmActionDialog
        open={leaveConfirmOpen}
        onOpenChange={setLeaveConfirmOpen}
        title={t('leaveEditorTitle')}
        description={t('leaveEditorDescription')}
        confirmLabel={t('leaveEditorConfirm')}
        cancelLabel={tc('cancel')}
        tone="default"
        onConfirm={() => {
          setLeaveConfirmOpen(false);
          leaveEditor();
        }}
      />
      <ConfirmActionDialog
        open={publishConfirmOpen}
        onOpenChange={setPublishConfirmOpen}
        title={t('publish')}
        description={t('confirmPublish')}
        confirmLabel={t('publish')}
        cancelLabel={tc('cancel')}
        isSubmitting={isPublishing}
        tone="default"
        onConfirm={handlePublish}
      />

      {/* Header */}
      <header className="h-14 border-b flex items-center justify-between px-4 bg-white dark:bg-slate-950 shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            aria-label={tc('back')}
          >
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
                    {editingLocale === 'default'
                      ? tc('default')
                      : editingLocale.toUpperCase()}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditingLocale('default')}>
                  {t('defaultOriginal')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditingLocale('en')}>
                  {getEditingLocaleLabel('en')} (EN)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditingLocale('zh')}>
                  {getEditingLocaleLabel('zh')} (ZH)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditingLocale('ja')}>
                  {getEditingLocaleLabel('ja')} (JA)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Device Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 mr-2">
            <Button
              variant={previewDevice === 'mobile' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setPreviewDevice('mobile')}
              title={t('mobile')}
              aria-label={t('mobile')}
            >
              <Smartphone size={14} />
            </Button>
            <Button
              variant={previewDevice === 'tablet' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setPreviewDevice('tablet')}
              title={t('tablet')}
              aria-label={t('tablet')}
            >
              <Tablet size={14} />
            </Button>
            <Button
              variant={previewDevice === 'desktop' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setPreviewDevice('desktop')}
              title={t('desktop')}
              aria-label={t('desktop')}
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
              aria-label={t('undoTitle')}
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
              aria-label={t('redoTitle')}
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

          <Button
            size="sm"
            onClick={() => setPublishConfirmOpen(true)}
            disabled={isPublishing || saveStatus === 'saving'}
          >
            {isPublishing ? (
               <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
            ) : (
               <Save size={14} className="mr-2" /> 
            )}
            {t('publish')}
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={tc('openMenu')}>
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
