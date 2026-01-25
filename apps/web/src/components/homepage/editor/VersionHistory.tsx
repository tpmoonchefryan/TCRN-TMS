// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Clock, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../ui/sheet';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { homepageApi } from '@/lib/api/client';
import { useEditorStore } from '@/stores/homepage/editor-store';


interface VersionHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  talentId: string;
}

interface Version {
  id: string;
  versionNumber: number;
  status: string;
  createdAt: string;
  createdBy: { username: string } | null;
  publishedAt: string | null;
}

export function VersionHistory({ open, onOpenChange, talentId }: VersionHistoryProps) {
  const t = useTranslations('homepageEditor');
  const { load } = useEditorStore();
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    if (open && talentId) {
      loadVersions();
    }
  }, [open, talentId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const res = await homepageApi.listVersions(talentId);
      // Ensure we handle both snake_case (from DB/API usually) and camelCase (client transform)
      // The client.ts returns <any>, so we should be careful. 
      // Assuming API returns camelCase if using class-transformer or snake_case if raw. 
      // Let's assume standard API response structure from NestJS DTOs which are usually preserved or transformed globally.
      // Based on controller it returns `result.items`.
      setVersions(res.data.items || []);
    } catch (error) {
      console.error('Failed to load versions', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    if (!confirm(t('confirmRestore'))) return;
    
    setRestoringId(versionId);
    try {
      await homepageApi.restoreVersion(talentId, versionId);
      await load(talentId); // Reload editor content
      onOpenChange(false);
      alert(t('restoreSuccess'));
    } catch (error) {
      console.error('Failed to restore version', error);
      alert(t('restoreFailed'));
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px]">
        <SheetHeader>
          <SheetTitle>{t('versionHistory')}</SheetTitle>
          <SheetDescription>{t('versionHistoryDesc')}</SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="h-full mt-4 pr-4">
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : versions.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">{t('noVersions')}</p>
            ) : (
              versions.map((version) => (
                <div key={version.id} className="border rounded-lg p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">v{version.versionNumber}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(version.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                      {version.createdBy?.username || 'System'}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8"
                      onClick={() => handleRestore(version.id)}
                      disabled={restoringId === version.id}
                    >
                      <RotateCcw size={14} className={`mr-2 ${restoringId === version.id ? 'animate-spin' : ''}`} />
                      {t('restore')}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
