// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { ReportJobStatus } from '@tcrn/shared';
import { Download, FileSpreadsheet, Loader2, Plus, RefreshCw, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { MfrConfigDialog } from '@/components/report/MfrConfigDialog';
import {
  reportingDataflowDomainApi,
  type ReportingJobRecord,
} from '@/domains/reporting-dataflow/api/reports.api';
import type { ReportFilters, ReportFormat } from '@/lib/api/modules/content';
import { useTalentStore } from '@/platform/state/talent-store';
import {
  Badge,
  Button,
  ConfirmActionDialog,
  StateView,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableShell,
} from '@/platform/ui';

const STATUS_CONFIG: Record<
  ReportJobStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  pending: { label: 'pending', variant: 'secondary' },
  running: { label: 'running', variant: 'default' },
  success: { label: 'success', variant: 'default' },
  consumed: { label: 'consumed', variant: 'default' },
  expired: { label: 'expired', variant: 'outline' },
  failed: { label: 'failed', variant: 'destructive' },
  retrying: { label: 'retrying', variant: 'secondary' },
  cancelled: { label: 'cancelled', variant: 'outline' },
};

export function ReportsScreen() {
  const { currentTalent } = useTalentStore();
  const t = useTranslations('report');
  const tCommon = useTranslations('common');

  const [jobs, setJobs] = useState<ReportingJobRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [downloadingJobId, setDownloadingJobId] = useState<string | null>(null);
  const [cancellingJobId, setCancellingJobId] = useState<string | null>(null);
  const [jobPendingCancel, setJobPendingCancel] = useState<ReportingJobRecord | null>(null);

  const fetchJobs = useCallback(async (showLoader = true) => {
    if (!currentTalent?.id) {
      setJobs([]);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    if (showLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const response = await reportingDataflowDomainApi.listJobs(currentTalent.id);
      if (response.success && response.data) {
        setJobs(response.data.items);
      }
    } catch {
      toast.error(t('loadFailed'));
      setJobs([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentTalent?.id, t]);

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    const hasRunningJobs = jobs.some((job) =>
      job.status === 'pending' || job.status === 'running' || job.status === 'retrying');

    if (!hasRunningJobs) {
      return;
    }

    const interval = setInterval(() => {
      void fetchJobs(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchJobs, jobs]);

  const handleCreateJob = async (filters: ReportFilters, format: ReportFormat = 'xlsx') => {
    if (!currentTalent?.id) {
      return;
    }

    try {
      const response = await reportingDataflowDomainApi.createJob({
        talentId: currentTalent.id,
        filters,
        format,
      });

      if (!response.success || !response.data) {
        throw new Error(t('createFailed'));
      }

      toast.success(t('jobCreated'));
      setConfigDialogOpen(false);

      if (response.data.deliveryMode === 'pii_platform_portal') {
        const reportPortal = window.open(
          response.data.redirectUrl,
          '_blank',
          'noopener,noreferrer',
        );

        if (!reportPortal) {
          window.location.assign(response.data.redirectUrl);
        }

        return;
      }

      await fetchJobs();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t('createFailed'));
    }
  };

  const handleDownload = async (jobId: string) => {
    if (!currentTalent?.id) {
      return;
    }

    setDownloadingJobId(jobId);

    try {
      const response = await reportingDataflowDomainApi.getDownloadUrl(jobId, currentTalent.id);
      if (response.success && response.data?.downloadUrl) {
        window.open(response.data.downloadUrl, '_blank');
        void fetchJobs(false);
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t('downloadFailed'));
    } finally {
      setDownloadingJobId(null);
    }
  };

  const handleConfirmCancel = async () => {
    if (!currentTalent?.id || !jobPendingCancel) {
      return;
    }

    setCancellingJobId(jobPendingCancel.id);

    try {
      await reportingDataflowDomainApi.cancelJob(jobPendingCancel.id, currentTalent.id);
      toast.success(t('jobCancelled'));
      setJobPendingCancel(null);
      await fetchJobs();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t('cancelFailed'));
    } finally {
      setCancellingJobId(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) {
      return '-';
    }

    return new Date(dateStr).toLocaleString();
  };

  const canDownload = (job: ReportingJobRecord) => job.status === 'success' || job.status === 'consumed';

  const canCancel = (job: ReportingJobRecord) => job.status === 'pending' || job.status === 'failed';

  const getStatusBadge = (job: ReportingJobRecord) => {
    const config = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
    const label = t(`status.${config.label}`, { defaultValue: config.label });

    return <Badge variant={config.variant}>{label}</Badge>;
  };

  if (!currentTalent) {
    return (
      <StateView
        state="empty"
        empty={{
          title: t('selectTalent'),
          description: t('description'),
        }}
        emptyIcon={<FileSpreadsheet className="h-8 w-8 text-muted-foreground" aria-hidden="true" />}
      />
    );
  }

  const viewState = isLoading ? 'loading' : jobs.length === 0 ? 'empty' : 'ready';

  return (
    <div className="space-y-6">
      <TableShell
        title={t('title')}
        description={t('description')}
        icon={<FileSpreadsheet className="h-5 w-5 text-primary" />}
        count={jobs.length}
        actions={(
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchJobs(false)}
              disabled={isRefreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {tCommon('refresh')}
            </Button>
            <Button onClick={() => setConfigDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('createReport')}
            </Button>
          </>
        )}
      >
        <StateView
          state={viewState}
          loading={{
            title: tCommon('loading'),
            description: t('description'),
          }}
          empty={{
            title: t('noJobs'),
            description: t('description'),
          }}
          emptyIcon={<FileSpreadsheet className="h-8 w-8 text-muted-foreground" aria-hidden="true" />}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('reportType')}</TableHead>
                <TableHead>{t('statusLabel')}</TableHead>
                <TableHead>{t('rows')}</TableHead>
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
                  <TableCell>{getStatusBadge(job)}</TableCell>
                  <TableCell>{job.totalRows?.toLocaleString() || '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(job.createdAt)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(job.expiresAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canDownload(job) ? (
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={`${t('download')} ${job.reportType}`}
                          onClick={() => void handleDownload(job.id)}
                          disabled={downloadingJobId === job.id}
                        >
                          {downloadingJobId === job.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          <span className="ml-1">{t('download')}</span>
                        </Button>
                      ) : null}
                      {canCancel(job) ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`${tCommon('cancel')} ${job.reportType}`}
                          onClick={() => setJobPendingCancel(job)}
                          disabled={cancellingJobId === job.id}
                        >
                          {cancellingJobId === job.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                          <span className="ml-1">{tCommon('cancel')}</span>
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </StateView>
      </TableShell>

      <MfrConfigDialog
        isOpen={configDialogOpen}
        onClose={() => setConfigDialogOpen(false)}
        onSubmit={handleCreateJob}
      />

      <ConfirmActionDialog
        open={Boolean(jobPendingCancel)}
        onOpenChange={(open) => {
          if (!open) {
            setJobPendingCancel(null);
          }
        }}
        title={t('cancelJob')}
        description={jobPendingCancel ? t(`types.${jobPendingCancel.reportType}`, { defaultValue: jobPendingCancel.reportType }) : tCommon('cancel')}
        confirmLabel={tCommon('cancel')}
        cancelLabel={tCommon('close')}
        isSubmitting={Boolean(jobPendingCancel && cancellingJobId === jobPendingCancel.id)}
        onConfirm={handleConfirmCancel}
      />
    </div>
  );
}
