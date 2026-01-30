// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Download, FileJson, FileSpreadsheet, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { marshmallowExportApi, type MarshmallowExportJob } from '@/lib/api/client';
import { cn } from '@/lib/utils';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  talentId: string;
}

type ExportFormat = 'csv' | 'json' | 'xlsx';

const formatOptions: Array<{ value: ExportFormat; label: string; icon: React.ReactNode }> = [
  { value: 'xlsx', label: 'Excel (.xlsx)', icon: <FileSpreadsheet size={20} className="text-green-600" /> },
  { value: 'csv', label: 'CSV (.csv)', icon: <FileText size={20} className="text-blue-600" /> },
  { value: 'json', label: 'JSON (.json)', icon: <FileJson size={20} className="text-yellow-600" /> },
];

export function ExportDialog({ open, onClose, talentId }: ExportDialogProps) {
  const t = useTranslations('marshmallowExport');
  const [format, setFormat] = useState<ExportFormat>('xlsx');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [includeRejected, setIncludeRejected] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [currentJob, setCurrentJob] = useState<MarshmallowExportJob | null>(null);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  // Cleanup on close
  useEffect(() => {
    if (!open && pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
      setCurrentJob(null);
    }
  }, [open, pollInterval]);

  const pollJobStatus = useCallback(async (jobId: string) => {
    try {
      const response = await marshmallowExportApi.get(talentId, jobId);
      if (response.success && response.data) {
        setCurrentJob(response.data);
        
        if (response.data.status === 'success' || response.data.status === 'failed') {
          if (pollInterval) {
            clearInterval(pollInterval);
            setPollInterval(null);
          }
          setIsExporting(false);
          
          if (response.data.status === 'success') {
            toast.success(t('exportComplete'));
          } else {
            toast.error(t('exportFailed'));
          }
        }
      }
    } catch (error) {
      console.error('Failed to poll job status:', error);
    }
  }, [talentId, pollInterval, t]);

  const handleExport = async () => {
    setIsExporting(true);
    setCurrentJob(null);

    try {
      const response = await marshmallowExportApi.create(talentId, {
        format,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        includeRejected,
      });

      if (response.success && response.data) {
        const jobId = response.data.jobId;
        toast.success(t('exportStarted'));

        // Start polling for status
        const interval = setInterval(() => pollJobStatus(jobId), 2000);
        setPollInterval(interval);
        
        // Initial poll
        pollJobStatus(jobId);
      }
    } catch (error: any) {
      console.error('Failed to create export:', error);
      toast.error(error?.message || t('exportError'));
      setIsExporting(false);
    }
  };

  const handleDownload = async () => {
    if (!currentJob) return;

    try {
      const response = await marshmallowExportApi.getDownloadUrl(talentId, currentJob.id);
      if (response.success && response.data?.url) {
        window.open(response.data.url, '_blank');
      }
    } catch (error: any) {
      console.error('Failed to get download URL:', error);
      toast.error(error?.message || t('downloadError'));
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
      pending: { variant: 'secondary', icon: <Loader2 size={12} className="animate-spin" /> },
      running: { variant: 'default', icon: <Loader2 size={12} className="animate-spin" /> },
      success: { variant: 'default', icon: <CheckCircle size={12} /> },
      failed: { variant: 'destructive', icon: <AlertCircle size={12} /> },
    };
    const config = variants[status] || { variant: 'secondary' as const, icon: null };
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {t(`status.${status}`)}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download size={20} />
            {t('title')}
          </DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>{t('format')}</Label>
            <div className="grid grid-cols-3 gap-2">
              {formatOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFormat(option.value)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors',
                    format === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/20'
                  )}
                  disabled={isExporting}
                >
                  {option.icon}
                  <span className="text-xs font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('startDate')}</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isExporting}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('endDate')}</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isExporting}
              />
            </div>
          </div>

          {/* Include Rejected */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>{t('includeRejected')}</Label>
              <p className="text-sm text-muted-foreground">{t('includeRejectedDesc')}</p>
            </div>
            <Switch
              checked={includeRejected}
              onCheckedChange={setIncludeRejected}
              disabled={isExporting}
            />
          </div>

          {/* Job Status */}
          {currentJob && (
            <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('jobStatus')}</span>
                {getStatusBadge(currentJob.status)}
              </div>
              
              {currentJob.status === 'running' && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t('progress')}</span>
                    <span>
                      {currentJob.processedRecords} / {currentJob.totalRecords}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width: `${currentJob.totalRecords ? (currentJob.processedRecords / currentJob.totalRecords) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {currentJob.status === 'success' && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {t('totalRecords', { count: currentJob.totalRecords })}
                  </p>
                  <Button onClick={handleDownload} className="w-full">
                    <Download size={16} className="mr-2" />
                    {t('download')}
                  </Button>
                </div>
              )}

              {currentJob.status === 'failed' && (
                <p className="text-sm text-red-500">{t('exportFailedMessage')}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            {t('close')}
          </Button>
          {!currentJob?.status || currentJob.status === 'failed' ? (
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  {t('exporting')}
                </>
              ) : (
                <>
                  <Download size={16} className="mr-2" />
                  {t('export')}
                </>
              )}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
