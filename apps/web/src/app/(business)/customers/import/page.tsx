// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { AlertCircle, CheckCircle2, Download, Loader2, Upload, Users, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button, Card } from '@/components/ui';
import { customerImportApi } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { useTalentStore } from '@/stores/talent-store';

interface ImportJob {
  id: string;
  status: 'pending' | 'running' | 'success' | 'partial' | 'failed' | 'cancelled';
  fileName: string;
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

type ImportType = 'individuals' | 'companies';

export default function ImportCustomersPage() {
  const t = useTranslations('customerImport');
  const te = useTranslations('errors');
  const { currentTalent } = useTalentStore();

  // Helper to get translated error message from API error
  const getErrorMessage = useCallback((error: any): string => {
    const errorCode = error?.code;
    if (errorCode && typeof errorCode === 'string') {
      try {
        const translated = te(errorCode as any);
        if (translated && translated !== errorCode && !translated.startsWith('MISSING_MESSAGE')) {
          return translated;
        }
      } catch {
        // Fall through
      }
    }
    return error?.message || te('generic');
  }, [te]);
  
  const [step, setStep] = useState(1); // 1: Select/Upload, 2: Processing, 3: Result
  const [selectedType, setSelectedType] = useState<ImportType>('individuals');
  const [activeJob, setActiveJob] = useState<ImportJob | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Poll for job status
  const pollJobStatus = useCallback(async (jobId: string, type: ImportType) => {
    try {
      const response = await customerImportApi.getJob(type, jobId);
      if (response.success && response.data) {
        const job = response.data;
        setActiveJob({
          id: job.id,
          status: job.status,
          fileName: job.file_name || job.fileName,
          totalRows: job.total_rows || job.totalRows || 0,
          processedRows: job.processed_rows || job.processedRows || 0,
          successCount: job.success_count || job.successCount || 0,
          errorCount: job.error_count || job.errorCount || 0,
          createdAt: job.created_at || job.createdAt,
          startedAt: job.started_at || job.startedAt,
          completedAt: job.completed_at || job.completedAt,
        });
        
        // Check if job is complete
        if (['success', 'partial', 'failed', 'cancelled'].includes(job.status)) {
          setStep(3);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      }
    } catch (error) {
      // Ignore polling errors
    }
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const handleDownloadTemplate = async (type: ImportType) => {
    try {
      if (type === 'individuals') {
        await customerImportApi.downloadIndividualTemplate();
      } else {
        await customerImportApi.downloadCompanyTemplate();
      }
      toast.success(t('templateDownloaded'));
    } catch (error: any) {
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
      const response = selectedType === 'individuals'
        ? await customerImportApi.uploadIndividual(file, currentTalent.id)
        : await customerImportApi.uploadCompany(file, currentTalent.id);

      if (response.id) {
        setActiveJob({
          id: response.id,
          status: response.status || 'pending',
          fileName: response.fileName || file.name,
          totalRows: response.totalRows || 0,
          processedRows: 0,
          successCount: 0,
          errorCount: 0,
          createdAt: response.createdAt || new Date().toISOString(),
        });

        // Start polling
        pollingRef.current = setInterval(() => {
          pollJobStatus(response.id, selectedType);
        }, 2000);

        // Initial poll
        pollJobStatus(response.id, selectedType);
      } else {
        throw new Error(response.error?.message || 'Failed to upload file');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload file');
      setStep(1);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDownloadErrors = async () => {
    if (!activeJob) return;
    
    try {
      await customerImportApi.downloadErrors(selectedType, activeJob.id);
      toast.success('Error report downloaded');
    } catch (error: any) {
      toast.error(error.message || 'Failed to download error report');
    }
  };

  const handleReset = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setActiveJob(null);
    setStep(1);
  };

  // Show message if no talent selected
  if (!currentTalent) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Users className="h-12 w-12 mb-4 opacity-50" />
        <p>Please select a talent to import customers</p>
      </div>
    );
  }

  const progress = activeJob && activeJob.totalRows > 0
    ? Math.round((activeJob.processedRows / activeJob.totalRows) * 100)
    : 0;

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      {/* Steps */}
      <div className="flex items-center justify-center gap-4 mb-12 text-sm font-medium">
        <div className={cn("flex items-center gap-2", step >= 1 ? "text-primary" : "text-muted-foreground")}>
          <div className={cn("w-6 h-6 rounded-full flex items-center justify-center border", step >= 1 ? "bg-primary text-white border-primary" : "border-slate-300")}>1</div>
          {t('uploadStep')}
        </div>
        <div className="w-12 h-px bg-slate-200" />
        <div className={cn("flex items-center gap-2", step >= 2 ? "text-primary" : "text-muted-foreground")}>
          <div className={cn("w-6 h-6 rounded-full flex items-center justify-center border", step >= 2 ? "bg-primary text-white border-primary" : "border-slate-300")}>2</div>
          {t('processStep')}
        </div>
        <div className="w-12 h-px bg-slate-200" />
        <div className={cn("flex items-center gap-2", step >= 3 ? "text-primary" : "text-muted-foreground")}>
          <div className={cn("w-6 h-6 rounded-full flex items-center justify-center border", step >= 3 ? "bg-primary text-white border-primary" : "border-slate-300")}>3</div>
          {t('finishStep')}
        </div>
      </div>

      {/* Content */}
      <Card className="p-8">
        {step === 1 && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <div 
                className={cn(
                  "p-4 border rounded-lg cursor-pointer transition-colors",
                  selectedType === 'individuals' 
                    ? "border-primary bg-primary/5" 
                    : "hover:border-primary bg-slate-50 dark:bg-slate-900"
                )}
                onClick={() => setSelectedType('individuals')}
              >
                <h3 className="font-semibold mb-1">{t('individuals')}</h3>
                <p className="text-xs text-muted-foreground mb-4">{t('individualsDesc')}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadTemplate('individuals');
                  }}
                >
                  <Download size={14} /> {t('downloadTemplate')}
                </Button>
              </div>
              <div 
                className={cn(
                  "p-4 border rounded-lg cursor-pointer transition-colors",
                  selectedType === 'companies' 
                    ? "border-primary bg-primary/5" 
                    : "hover:border-primary bg-slate-50 dark:bg-slate-900"
                )}
                onClick={() => setSelectedType('companies')}
              >
                <h3 className="font-semibold mb-1">{t('companies')}</h3>
                <p className="text-xs text-muted-foreground mb-4">{t('companiesDesc')}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadTemplate('companies');
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
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />

            <div 
              className={cn(
                "border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer",
                isDragging 
                  ? "border-primary bg-primary/5" 
                  : "border-slate-200 hover:bg-slate-50"
              )}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload size={32} />
              </div>
              <h3 className="text-lg font-medium mb-1">{t('clickToUpload')}</h3>
              <p className="text-sm text-muted-foreground">{t('dragAndDrop')}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Importing: <span className="font-medium">{selectedType === 'individuals' ? 'Individual Customers' : 'Company Customers'}</span>
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="py-12 text-center space-y-6">
            <div className="relative w-20 h-20 mx-auto">
              <Loader2 className="w-full h-full animate-spin text-primary" />
              <div className="absolute inset-0 flex items-center justify-center font-bold text-sm">
                {progress}%
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-medium mb-2">
                {isUploading ? 'Uploading...' : t('processing', { fileName: activeJob?.fileName || 'file' })}
              </h3>
              {activeJob && (
                <p className="text-muted-foreground">
                  {t('processedRows', { processed: activeJob.processedRows, total: activeJob.totalRows })}
                </p>
              )}
            </div>

            <div className="w-full max-w-md mx-auto bg-slate-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-primary h-full transition-all duration-300 ease-out" 
                style={{ width: `${progress}%` }} 
              />
            </div>

            {activeJob?.status === 'pending' && (
              <p className="text-xs text-muted-foreground">Waiting in queue...</p>
            )}
          </div>
        )}

        {step === 3 && activeJob && (
          <div className="text-center space-y-6">
            <div className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4",
              activeJob.status === 'success' ? "bg-green-100 text-green-600" :
              activeJob.status === 'partial' ? "bg-yellow-100 text-yellow-600" :
              "bg-red-100 text-red-600"
            )}>
              {activeJob.status === 'success' && <CheckCircle2 size={40} />}
              {activeJob.status === 'partial' && <AlertCircle size={40} />}
              {activeJob.status === 'failed' && <XCircle size={40} />}
            </div>
            
            <h3 className="text-2xl font-bold">
              {activeJob.status === 'success' && t('complete')}
              {activeJob.status === 'partial' && 'Import Completed with Errors'}
              {activeJob.status === 'failed' && 'Import Failed'}
            </h3>
            
            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto py-6">
              <div className="bg-green-50 p-4 rounded-lg text-green-700">
                <div className="text-2xl font-bold">{activeJob.successCount}</div>
                <div className="text-xs font-medium uppercase tracking-wider opacity-70">{t('successful')}</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-red-700">
                <div className="text-2xl font-bold">{activeJob.errorCount}</div>
                <div className="text-xs font-medium uppercase tracking-wider opacity-70">{t('failed')}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg text-slate-700">
                <div className="text-2xl font-bold">{activeJob.totalRows}</div>
                <div className="text-xs font-medium uppercase tracking-wider opacity-70">{t('totalRows')}</div>
              </div>
            </div>

            {activeJob.errorCount > 0 && (
              <Button 
                variant="outline" 
                className="gap-2 text-red-600 hover:text-red-700 border-red-200 bg-red-50 hover:bg-red-100"
                onClick={handleDownloadErrors}
              >
                <Download size={16} />
                {t('downloadErrorReport')}
              </Button>
            )}

            <div className="pt-8 border-t">
              <Button size="lg" onClick={handleReset}>{t('importAnother')}</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
