// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { ChevronLeft, ChevronRight, Clock, Eye, RotateCcw, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { homepageApi } from '@/lib/api/client';
import { useEditorStore } from '@/stores/homepage/editor-store';

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../ui/sheet';
import { HomepageRenderer } from '../renderer/HomepageRenderer';


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

interface VersionDetail {
  id: string;
  versionNumber: number;
  content: unknown;
  theme: unknown;
}

type StatusFilter = 'all' | 'draft' | 'published' | 'archived';

const PAGE_SIZE = 5;

export function VersionHistory({ open, onOpenChange, talentId }: VersionHistoryProps) {
  const t = useTranslations('homepageEditor');
  const { load } = useEditorStore();
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  
  // Filter and pagination state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Preview state
  const [previewVersion, setPreviewVersion] = useState<VersionDetail | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  useEffect(() => {
    if (open && talentId) {
      loadVersions();
    }
  }, [open, talentId]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const res = await homepageApi.listVersions(talentId);
      setVersions(res.data.items || []);
    } catch (error) {
      console.error('Failed to load versions', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter versions by status
  const filteredVersions = versions.filter((v) => {
    if (statusFilter === 'all') return true;
    return v.status === statusFilter;
  });

  // Pagination
  const totalPages = Math.ceil(filteredVersions.length / PAGE_SIZE);
  const paginatedVersions = filteredVersions.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleRestore = async (versionId: string) => {
    if (!confirm(t('confirmRestore'))) return;
    
    setRestoringId(versionId);
    try {
      await homepageApi.restoreVersion(talentId, versionId);
      // Reload current content after restore
      const res = await homepageApi.get(talentId);
      if (res.data) {
        load(talentId);
      }
      // Close the sheet after successful restore
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to restore version', error);
    } finally {
      setRestoringId(null);
    }
  };

  const handlePreview = async (versionId: string) => {
    setIsLoadingPreview(true);
    try {
      const res = await homepageApi.getVersion(talentId, versionId);
      if (res.data) {
        setPreviewVersion({
          id: res.data.id,
          versionNumber: res.data.versionNumber,
          content: res.data.content,
          theme: res.data.theme,
        });
      }
    } catch (error) {
      console.error('Failed to load version for preview', error);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'archived':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-slate-100 dark:bg-slate-800';
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[420px]">
          <SheetHeader>
            <SheetTitle>{t('versionHistory')}</SheetTitle>
            <SheetDescription>{t('versionHistoryDesc')}</SheetDescription>
          </SheetHeader>
          
          {/* Filter Tabs */}
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)} className="mt-4">
            <TabsList className="grid w-full grid-cols-4 h-9">
              <TabsTrigger value="all" className="text-xs">{t('filterAll')}</TabsTrigger>
              <TabsTrigger value="draft" className="text-xs">{t('filterDraft')}</TabsTrigger>
              <TabsTrigger value="published" className="text-xs">{t('filterPublished')}</TabsTrigger>
              <TabsTrigger value="archived" className="text-xs">{t('filterArchived')}</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <ScrollArea className="h-[calc(100vh-280px)] mt-4 pr-4">
            <div className="space-y-4">
              {loading ? (
                <div className="flex justify-center p-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : paginatedVersions.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">{t('noVersions')}</p>
              ) : (
                paginatedVersions.map((version) => (
                  <div key={version.id} className="border rounded-lg p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">v{version.versionNumber}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${getStatusBadgeClass(version.status)}`}>
                          {version.status}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(version.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                        {version.createdBy?.username || 'System'}
                      </span>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8"
                          onClick={() => handlePreview(version.id)}
                          disabled={isLoadingPreview}
                        >
                          <Eye size={14} className="mr-1" />
                          {t('preview')}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8"
                          onClick={() => handleRestore(version.id)}
                          disabled={restoringId === version.id}
                        >
                          <RotateCcw size={14} className={`mr-1 ${restoringId === version.id ? 'animate-spin' : ''}`} />
                          {t('restore')}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <span className="text-sm text-muted-foreground">
                {t('page')} {currentPage} / {totalPages}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Preview Modal */}
      <Dialog open={!!previewVersion} onOpenChange={() => setPreviewVersion(null)}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle>
                {t('preview')} - v{previewVersion?.versionNumber}
              </DialogTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setPreviewVersion(null)}
                className="h-8 w-8"
              >
                <X size={16} />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-muted/20">
            {previewVersion && (
              <HomepageRenderer 
                content={previewVersion.content as never} 
                theme={previewVersion.theme as never} 
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
