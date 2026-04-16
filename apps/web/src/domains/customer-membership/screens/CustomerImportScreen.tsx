// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { AlertCircle, CheckCircle2, Download, Loader2, Upload, Users, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  customerImportDomainApi,
  type CustomerImportJobSummary,
  type CustomerImportType,
  toCreatedCustomerImportJobSummary,
  toCustomerImportJobSummary,
} from '@/domains/customer-membership/api/customer-import.api';
import { cn } from '@/lib/utils';
import { getTranslatedApiErrorMessage } from '@/platform/http/error-message';
import { useTalentStore } from '@/platform/state/talent-store';
import { Button, Card } from '@/platform/ui';

export function CustomerImportScreen() {
  const t = useTranslations('customerImport');
  const te = useTranslations('errors');
  const { currentTalent } = useTalentStore();

  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<CustomerImportType>('individuals');
  const [activeJob, setActiveJob] = useState<CustomerImportJobSummary | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const getErrorMessage = useCallback(
    (error: unknown): string => getTranslatedApiErrorMessage(error, te, te('generic')),
    [te],
  );

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const pollJobStatus = useCallback(
    async (talentId: string, jobId: string, type: CustomerImportType) => {
      try {
        const response = await customerImportDomainApi.getJob(type, jobId, talentId);
        if (response.success && response.data) {
          const nextJob = toCustomerImportJobSummary(talentId, response.data);
          setActiveJob(nextJob);

          if (['success', 'partial', 'failed', 'cancelled'].includes(nextJob.status)) {
            setStep(3);
            stopPolling();
          }
        }
      } catch {
        // Polling should fail soft so transient errors do not break the screen flow.
      }
    },
    [stopPolling],
  );

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  const handleDownloadTemplate = async (type: CustomerImportType) => {
    if (!currentTalent) {
      toast.error(t('selectTalentFirst'));
      return;
    }

    try {
      await customerImportDomainApi.downloadTemplate(type, currentTalent.id);
      toast.success(t('templateDownloaded'));
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!currentTalent) {
      toast.error(t('selectTalentFirst'));
      return;
    }

    if (!file.name.endsWith('.csv')) {
      toast.error(te('IMP_INVALID_FILE_FORMAT'));
      return;
    }

    setIsUploading(true);
    setStep(2);

    try {
      const talentId = currentTalent.id;
      const response = await customerImportDomainApi.uploadFile(selectedType, file, talentId);

      if (!response.success || !response.data) {
        throw response.error || new Error(t('uploadFailed'));
      }

      const createdJob = response.data;
      setActiveJob(toCreatedCustomerImportJobSummary(talentId, file.name, createdJob));

      pollingRef.current = setInterval(() => {
        void pollJobStatus(talentId, createdJob.id, selectedType);
      }, 2000);

      await pollJobStatus(talentId, createdJob.id, selectedType);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
      setStep(1);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      void handleFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDownloadErrors = async () => {
    if (!activeJob) {
      return;
    }

    try {
      await customerImportDomainApi.downloadErrors(selectedType, activeJob.id, activeJob.talentId);
      toast.success(t('errorReportDownloaded'));
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleReset = () => {
    stopPolling();
    setActiveJob(null);
    setStep(1);
  };

  if (!currentTalent) {
    return (
      <div className="text-muted-foreground flex h-64 flex-col items-center justify-center">
        <Users className="mb-4 h-12 w-12 opacity-50" />
        <p>{t('selectTalentToImport')}</p>
      </div>
    );
  }

  const progress =
    activeJob && activeJob.totalRows > 0
      ? Math.round((activeJob.processedRows / activeJob.totalRows) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-10 text-center">
        <h1 className="mb-2 text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <div className="mb-12 flex items-center justify-center gap-4 text-sm font-medium">
        <div
          className={cn(
            'flex items-center gap-2',
            step >= 1 ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          <div
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full border',
              step >= 1 ? 'border-primary bg-primary text-white' : 'border-slate-300',
            )}
          >
            1
          </div>
          {t('uploadStep')}
        </div>
        <div className="h-px w-12 bg-slate-200" />
        <div
          className={cn(
            'flex items-center gap-2',
            step >= 2 ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          <div
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full border',
              step >= 2 ? 'border-primary bg-primary text-white' : 'border-slate-300',
            )}
          >
            2
          </div>
          {t('processStep')}
        </div>
        <div className="h-px w-12 bg-slate-200" />
        <div
          className={cn(
            'flex items-center gap-2',
            step >= 3 ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          <div
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full border',
              step >= 3 ? 'border-primary bg-primary text-white' : 'border-slate-300',
            )}
          >
            3
          </div>
          {t('finishStep')}
        </div>
      </div>

      <Card className="p-8">
        {step === 1 && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <div
                className={cn(
                  'cursor-pointer rounded-lg border p-4 transition-colors',
                  selectedType === 'individuals'
                    ? 'border-primary bg-primary/5'
                    : 'bg-slate-50 hover:border-primary dark:bg-slate-900',
                )}
                onClick={() => setSelectedType('individuals')}
              >
                <h3 className="mb-1 font-semibold">{t('individuals')}</h3>
                <p className="text-muted-foreground mb-4 text-xs">{t('individualsDesc')}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleDownloadTemplate('individuals');
                  }}
                >
                  <Download size={14} /> {t('downloadTemplate')}
                </Button>
              </div>

              <div
                className={cn(
                  'cursor-pointer rounded-lg border p-4 transition-colors',
                  selectedType === 'companies'
                    ? 'border-primary bg-primary/5'
                    : 'bg-slate-50 hover:border-primary dark:bg-slate-900',
                )}
                onClick={() => setSelectedType('companies')}
              >
                <h3 className="mb-1 font-semibold">{t('companies')}</h3>
                <p className="text-muted-foreground mb-4 text-xs">{t('companiesDesc')}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleDownloadTemplate('companies');
                  }}
                >
                  <Download size={14} /> {t('downloadTemplate')}
                </Button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleFileSelect(file);
                }
              }}
            />

            <div
              className={cn(
                'cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition-colors',
                isDragging ? 'border-primary bg-primary/5' : 'border-slate-200 hover:bg-slate-50',
              )}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-500">
                <Upload size={32} />
              </div>
              <h3 className="mb-1 text-lg font-medium">{t('clickToUpload')}</h3>
              <p className="text-muted-foreground text-sm">{t('dragAndDrop')}</p>
              <p className="text-muted-foreground mt-2 text-xs">
                {t('importingSelection', {
                  type: selectedType === 'individuals' ? t('individuals') : t('companies'),
                })}
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 py-12 text-center">
            <div className="relative mx-auto h-20 w-20">
              <Loader2 className="text-primary h-full w-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                {progress}%
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-xl font-medium">
                {isUploading
                  ? t('uploading')
                  : t('processing', { fileName: activeJob?.fileName || t('file') })}
              </h3>
              {activeJob && (
                <p className="text-muted-foreground">
                  {t('processedRows', {
                    processed: activeJob.processedRows,
                    total: activeJob.totalRows,
                  })}
                </p>
              )}
            </div>

            <div className="mx-auto h-2 w-full max-w-md overflow-hidden rounded-full bg-slate-100">
              <div
                className="bg-primary h-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            {activeJob?.status === 'pending' && (
              <p className="text-muted-foreground text-xs">{t('waitingInQueue')}</p>
            )}
          </div>
        )}

        {step === 3 && activeJob && (
          <div className="space-y-6 text-center">
            <div
              className={cn(
                'mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full',
                activeJob.status === 'success'
                  ? 'bg-green-100 text-green-600'
                  : activeJob.status === 'partial'
                    ? 'bg-yellow-100 text-yellow-600'
                    : 'bg-red-100 text-red-600',
              )}
            >
              {activeJob.status === 'success' && <CheckCircle2 size={40} />}
              {activeJob.status === 'partial' && <AlertCircle size={40} />}
              {activeJob.status === 'failed' && <XCircle size={40} />}
            </div>

            <h3 className="text-2xl font-bold">
              {activeJob.status === 'success' && t('complete')}
              {activeJob.status === 'partial' && t('completeWithErrors')}
              {activeJob.status === 'failed' && t('importFailed')}
            </h3>

            <div className="mx-auto grid max-w-lg grid-cols-3 gap-4 py-6">
              <div className="rounded-lg bg-green-50 p-4 text-green-700">
                <div className="text-2xl font-bold">{activeJob.successCount}</div>
                <div className="text-xs font-medium uppercase tracking-wider opacity-70">
                  {t('successful')}
                </div>
              </div>
              <div className="rounded-lg bg-red-50 p-4 text-red-700">
                <div className="text-2xl font-bold">{activeJob.errorCount}</div>
                <div className="text-xs font-medium uppercase tracking-wider opacity-70">
                  {t('failed')}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-4 text-slate-700">
                <div className="text-2xl font-bold">{activeJob.totalRows}</div>
                <div className="text-xs font-medium uppercase tracking-wider opacity-70">
                  {t('totalRows')}
                </div>
              </div>
            </div>

            {activeJob.errorCount > 0 && (
              <Button
                variant="outline"
                className="gap-2 border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
                onClick={() => {
                  void handleDownloadErrors();
                }}
              >
                <Download size={16} />
                {t('downloadErrorReport')}
              </Button>
            )}

            <div className="border-t pt-8">
              <Button size="lg" onClick={handleReset}>
                {t('importAnother')}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
