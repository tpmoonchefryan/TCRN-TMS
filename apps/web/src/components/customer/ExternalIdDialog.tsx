// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { configurationEntityApi, type ConfigurationEntityRecord } from '@/lib/api/modules/configuration';
import { externalIdApi, type ExternalIdRecord } from '@/lib/api/modules/customer';

import {
  buildDefaultConsumerOptions,
  type DialogConsumerOption,
  mapConsumerOptions,
} from './dialog-option-mappers';

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

  const [consumers, setConsumers] = useState<DialogConsumerOption[]>([]);
  const [existingIds, setExistingIds] = useState<ExternalIdRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [consumerCode, setConsumerCode] = useState('');
  const [externalId, setExternalId] = useState('');

  const fallbackConsumers = useMemo(
    () =>
      buildDefaultConsumerOptions({
        legacyCrm: t('fallbackConsumers.legacyCrm'),
        discordBot: t('fallbackConsumers.discordBot'),
        billingSystem: t('fallbackConsumers.billingSystem'),
      }),
    [t],
  );

  // Load consumers and existing external IDs
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load consumers
      const consumerResponse = await configurationEntityApi.list<ConfigurationEntityRecord>('consumer');
      if (consumerResponse.success && consumerResponse.data) {
        setConsumers(mapConsumerOptions(consumerResponse.data));
      }

      // Load existing external IDs
      const externalIdResponse = await externalIdApi.list(customerId, talentId);
      if (externalIdResponse.success && externalIdResponse.data) {
        setExistingIds(externalIdResponse.data);
      }
    } catch {
      setConsumers(fallbackConsumers);
    } finally {
      setIsLoading(false);
    }
  }, [customerId, fallbackConsumers, talentId]);

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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('addFailed');
      if (errorMessage.includes('already exists')) {
        toast.error(t('duplicateError'));
      } else {
        toast.error(errorMessage);
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
      setExistingIds((prev) => prev.filter((item) => item.id !== id));

      onSuccess?.();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t('deleteFailed'));
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
