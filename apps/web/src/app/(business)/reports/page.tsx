/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { ReportJobStatus } from '@tcrn/shared';
import { Download, FileSpreadsheet, Loader2, Plus, RefreshCw, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { MfrConfigDialog } from '@/components/report/MfrConfigDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { reportApi } from '@/lib/api/client';
import { useTalentStore } from '@/stores/talent-store';

// Report job interface matching backend API response (camelCase)
interface ReportJob {
  id: string;
  reportType: string;
  status: ReportJobStatus;
  totalRows: number | null;
  processedRows?: number;
  progressPercentage?: number;
  fileName: string | null;
  fileSizeBytes?: number | null;
  createdAt: string;
  completedAt: string | null;
  expiresAt: string | null;
  error?: {
    code: string;
    message: string;
  };
}

// Status badge configuration
const STATUS_CONFIG: Record<ReportJobStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'pending', variant: 'secondary' },
  running: { label: 'running', variant: 'default' },
  success: { label: 'success', variant: 'default' },
  consumed: { label: 'consumed', variant: 'default' },
  expired: { label: 'expired', variant: 'outline' },
  failed: { label: 'failed', variant: 'destructive' },
  retrying: { label: 'retrying', variant: 'secondary' },
  cancelled: { label: 'cancelled', variant: 'outline' },
};

export default function ReportsPage() {
  const { currentTalent } = useTalentStore();
  const t = useTranslations('report');
  const tCommon = useTranslations('common');
  const [jobs, setJobs] = useState<ReportJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [downloadingJobId, setDownloadingJobId] = useState<string | null>(null);
  const [cancellingJobId, setCancellingJobId] = useState<string | null>(null);

  // Fetch report jobs
  const fetchJobs = useCallback(async (showLoader = true) => {
    if (!currentTalent?.id) return;
    
    if (showLoader) setIsLoading(true);
    else setIsRefreshing(true);
    
    try {
      const response = await reportApi.list(currentTalent.id);
      if (response.success && response.data) {
        const data = response.data as { items?: ReportJob[] };
        setJobs(data.items || []);
      }
    } catch (error) {
      toast.error(t('loadFailed'));
      setJobs([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentTalent?.id, t]);

  // Load jobs on mount
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Poll for job updates when there are running jobs
  useEffect(() => {
    const hasRunningJobs = jobs.some(j => j.status === 'pending' || j.status === 'running' || j.status === 'retrying');
    
    if (!hasRunningJobs) return;
    
    const interval = setInterval(() => {
      fetchJobs(false);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [jobs, fetchJobs]);

  // Handle job creation
  const handleCreateJob = async (filters: Record<string, unknown>, format: 'xlsx' | 'csv' = 'xlsx') => {
    if (!currentTalent?.id) return;
    
    try {
      await reportApi.create({
        reportType: 'mfr',
        talentId: currentTalent.id,
        filters,
        format,
      });
      toast.success(t('jobCreated'));
      setConfigDialogOpen(false);
      fetchJobs();
    } catch (error: any) {
      toast.error(error.message || t('createFailed'));
    }
  };

  // Handle download
  const handleDownload = async (jobId: string) => {
    if (!currentTalent?.id) return;
    
    setDownloadingJobId(jobId);
    try {
      const response = await reportApi.getDownloadUrl(jobId, currentTalent.id);
      if (response.success && response.data?.downloadUrl) {
        window.open(response.data.downloadUrl, '_blank');
        fetchJobs(false);
      }
    } catch (error: any) {
      toast.error(error.message || t('downloadFailed'));
    } finally {
      setDownloadingJobId(null);
    }
  };

  // Handle cancel
  const handleCancel = async (jobId: string) => {
    if (!currentTalent?.id) return;
    
    setCancellingJobId(jobId);
    try {
      await reportApi.cancel(jobId, currentTalent.id);
      toast.success(t('jobCancelled'));
      fetchJobs();
    } catch (error: any) {
      toast.error(error.message || t('cancelFailed'));
    } finally {
      setCancellingJobId(null);
    }
  };

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  // Format file size
  const formatFileSize = (bytes: number | null | undefined) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get status badge
  const getStatusBadge = (job: ReportJob) => {
    const config = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
    const label = t(`status.${config.label}`, { defaultValue: config.label });
    
    if (job.status === 'running' && job.progressPercentage !== undefined) {
      return (
        <div className="flex items-center gap-2">
          <Badge variant={config.variant} className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            {label}
          </Badge>
          <span className="text-xs text-muted-foreground">{job.progressPercentage}%</span>
        </div>
      );
    }

    // Show error info for failed jobs
    if (job.status === 'failed' && job.error) {
      return (
        <div className="space-y-1">
          <Badge variant={config.variant}>{label}</Badge>
          <p className="text-xs text-destructive" title={job.error.message}>
            {job.error.code}: {job.error.message.substring(0, 50)}
            {job.error.message.length > 50 ? '...' : ''}
          </p>
        </div>
      );
    }
    
    return <Badge variant={config.variant}>{label}</Badge>;
  };

  // Check if job can be downloaded
  const canDownload = (job: ReportJob) => {
    return job.status === 'success' || job.status === 'consumed';
  };

  // Check if job can be cancelled
  const canCancel = (job: ReportJob) => {
    return job.status === 'pending' || job.status === 'failed';
  };

  if (!currentTalent) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t('selectTalent')}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              {t('title')}
            </CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchJobs(false)}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              {tCommon('refresh')}
            </Button>
            <Button onClick={() => setConfigDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              {t('createReport')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <FileSpreadsheet className="h-8 w-8 mb-2 opacity-50" />
              <p>{t('noJobs')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('reportType')}</TableHead>
                  <TableHead>{t('statusLabel')}</TableHead>
                  <TableHead>{t('rows')}</TableHead>
                  <TableHead>{t('fileSize')}</TableHead>
                  <TableHead>{t('createdAt')}</TableHead>
                  <TableHead>{t('expiresAt')}</TableHead>
                  <TableHead className="text-right">{tCommon('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">
                      {t(`types.${job.reportType}`, { defaultValue: job.reportType.toUpperCase() })}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(job)}
                      {job.status === 'running' && job.progressPercentage !== undefined && (
                        <Progress value={job.progressPercentage} className="h-1 mt-1 w-20" />
                      )}
                    </TableCell>
                    <TableCell>
                      {job.totalRows?.toLocaleString() || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatFileSize(job.fileSizeBytes)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(job.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(job.expiresAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canDownload(job) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(job.id)}
                            disabled={downloadingJobId === job.id}
                          >
                            {downloadingJobId === job.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                            <span className="ml-1">{t('download')}</span>
                          </Button>
                        )}
                        {canCancel(job) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancel(job.id)}
                            disabled={cancellingJobId === job.id}
                          >
                            {cancellingJobId === job.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                            <span className="ml-1">{tCommon('cancel')}</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <MfrConfigDialog
        isOpen={configDialogOpen}
        onClose={() => setConfigDialogOpen(false)}
        onSubmit={handleCreateJob}
      />
    </div>
  );
}
