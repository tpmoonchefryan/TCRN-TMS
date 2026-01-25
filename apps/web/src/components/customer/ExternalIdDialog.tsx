// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Input,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui';
import { configurationEntityApi, externalIdApi, type ExternalIdRecord } from '@/lib/api/client';

interface Consumer {
  id: string;
  code: string;
  nameEn: string;
}

interface ExternalIdDialogProps {
  customerId: string;
  talentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ExternalIdDialog({
  customerId,
  talentId,
  open,
  onOpenChange,
  onSuccess,
}: ExternalIdDialogProps) {
  const t = useTranslations('externalIdDialog');
  const tCommon = useTranslations('common');
  
  const [consumers, setConsumers] = useState<Consumer[]>([]);
  const [existingIds, setExistingIds] = useState<ExternalIdRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Form state
  const [consumerCode, setConsumerCode] = useState('');
  const [externalId, setExternalId] = useState('');

  // Load consumers and existing external IDs
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load consumers
      const consumerResponse = await configurationEntityApi.list('consumer');
      if (consumerResponse.success && consumerResponse.data) {
        setConsumers(consumerResponse.data.map((item: any) => ({
          id: item.id,
          code: item.code,
          nameEn: item.nameEn || item.name_en || item.code,
        })));
      }

      // Load existing external IDs
      const externalIdResponse = await externalIdApi.list(customerId, talentId);
      if (externalIdResponse.success && externalIdResponse.data) {
        setExistingIds(externalIdResponse.data);
      }
    } catch (error) {
      // Use default consumers if API fails
      setConsumers([
        { id: '1', code: 'LEGACY_CRM', nameEn: 'Legacy CRM' },
        { id: '2', code: 'DISCORD_BOT', nameEn: 'Discord Bot' },
        { id: '3', code: 'BILLING', nameEn: 'Billing System' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [customerId, talentId]);

  useEffect(() => {
    if (open) {
      loadData();
      // Reset form
      setConsumerCode('');
      setExternalId('');
    }
  }, [open, loadData]);

  const handleSubmit = async () => {
    if (!consumerCode) {
      toast.error(t('selectConsumerError'));
      return;
    }
    if (!externalId.trim()) {
      toast.error(t('externalIdRequired'));
      return;
    }

    setIsSaving(true);

    try {
      await externalIdApi.create(
        customerId,
        {
          consumerCode,
          externalId: externalId.trim(),
        },
        talentId
      );
      toast.success(t('addSuccess'));
      
      // Reload data to show new entry
      await loadData();
      
      // Reset form
      setConsumerCode('');
      setExternalId('');
      
      onSuccess?.();
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        toast.error(t('duplicateError'));
      } else {
        toast.error(error.message || t('addFailed'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await externalIdApi.delete(customerId, id, talentId);
      toast.success(t('deleteSuccess'));
      
      // Remove from local state
      setExistingIds(prev => prev.filter(item => item.id !== id));
      
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || t('deleteFailed'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Existing External IDs */}
            {existingIds.length > 0 && (
              <div className="space-y-2">
                <Label>{t('existingIds')}</Label>
                <div className="rounded-md border">
                  {existingIds.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between px-3 py-2 border-b last:border-b-0"
                    >
                      <div>
                        <span className="font-medium text-sm">{item.consumer.name}</span>
                        <span className="mx-2 text-muted-foreground">:</span>
                        <span className="text-sm font-mono">{item.externalId}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add New */}
            <div className="space-y-4 pt-2 border-t">
              <Label className="text-base font-medium">{t('addNew')}</Label>
              
              <div className="space-y-2">
                <Label htmlFor="consumer">{t('consumer')} *</Label>
                <Select
                  value={consumerCode}
                  onValueChange={setConsumerCode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectConsumer')} />
                  </SelectTrigger>
                  <SelectContent>
                    {consumers.map((consumer) => (
                      <SelectItem key={consumer.code} value={consumer.code}>
                        {consumer.nameEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="externalId">{t('externalId')} *</Label>
                <Input
                  id="externalId"
                  value={externalId}
                  onChange={(e) => setExternalId(e.target.value)}
                  placeholder={t('externalIdPlaceholder')}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            {tCommon('close')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || isLoading}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
