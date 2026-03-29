// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import type { WebhookEventDefinition, WebhookEventType } from '@tcrn/shared';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  integrationApi,
  type IntegrationWebhookDetailRecord,
  type IntegrationWebhookListItemRecord,
} from '@/lib/api/modules/integration';

interface WebhookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webhook: IntegrationWebhookListItemRecord | null;
  onSuccess: () => void;
}

interface WebhookFormState {
  code: string;
  nameEn: string;
  nameZh: string;
  nameJa: string;
  url: string;
  secret: string;
  events: WebhookEventType[];
}

const EMPTY_FORM: WebhookFormState = {
  code: '',
  nameEn: '',
  nameZh: '',
  nameJa: '',
  url: '',
  secret: '',
  events: [],
};

function toFormState(webhook: Pick<
  IntegrationWebhookDetailRecord,
  'code' | 'nameEn' | 'nameZh' | 'nameJa' | 'url' | 'events'
>): WebhookFormState {
  return {
    code: webhook.code,
    nameEn: webhook.nameEn,
    nameZh: webhook.nameZh || '',
    nameJa: webhook.nameJa || '',
    url: webhook.url,
    secret: '',
    events: webhook.events,
  };
}

export function WebhookDialog({
  open,
  onOpenChange,
  webhook,
  onSuccess,
}: WebhookDialogProps) {
  const t = useTranslations('integrationManagement');
  const tCommon = useTranslations('common');
  const tToast = useTranslations('toast');

  const isEdit = !!webhook;

  const [eventDefinitions, setEventDefinitions] = useState<WebhookEventDefinition[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isLoadingWebhook, setIsLoadingWebhook] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [version, setVersion] = useState<number | null>(null);
  const [formData, setFormData] = useState<WebhookFormState>(EMPTY_FORM);

  const fetchEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    try {
      const response = await integrationApi.getWebhookEvents();
      if (response.success && response.data) {
        setEventDefinitions(response.data);
      }
    } finally {
      setIsLoadingEvents(false);
    }
  }, []);

  const fetchWebhookDetail = useCallback(async (webhookId: string) => {
    setIsLoadingWebhook(true);
    try {
      const response = await integrationApi.getWebhook(webhookId);
      if (response.success && response.data) {
        setFormData(toFormState(response.data));
        setVersion(response.data.version);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : tCommon('error');
      toast.error(tCommon('error'), { description: message });
    } finally {
      setIsLoadingWebhook(false);
    }
  }, [tCommon]);

  useEffect(() => {
    if (!open) {
      return;
    }

    void fetchEvents();

    if (webhook) {
      setFormData(toFormState(webhook));
      setVersion(null);
      void fetchWebhookDetail(webhook.id);
      return;
    }

    setFormData(EMPTY_FORM);
    setVersion(null);
  }, [fetchEvents, fetchWebhookDetail, open, webhook]);

  const handleEventToggle = (event: WebhookEventType, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      events: checked ? [...prev.events, event] : prev.events.filter((item) => item !== event),
    }));
  };

  const handleSubmit = async () => {
    if (!formData.code || !formData.nameEn || !formData.url || formData.events.length === 0) {
      toast.error(t('requiredFieldsMissing'));
      return;
    }

    try {
      new URL(formData.url);
    } catch {
      toast.error(t('invalidUrl'));
      return;
    }

    const currentVersion = version;

    if (isEdit && currentVersion === null) {
      toast.error(tCommon('error'), {
        description: 'Webhook details are still loading. Please try again.',
      });
      return;
    }

    setIsSaving(true);
    try {
      if (isEdit) {
        if (!webhook || currentVersion === null) {
          return;
        }

        const response = await integrationApi.updateWebhook(webhook.id, {
          nameEn: formData.nameEn,
          nameZh: formData.nameZh || undefined,
          nameJa: formData.nameJa || undefined,
          url: formData.url,
          events: formData.events,
          version: currentVersion,
        });

        if (response.success) {
          toast.success(tToast('success.updated'));
          onSuccess();
        }
      } else {
        const response = await integrationApi.createWebhook({
          code: formData.code.toUpperCase().replace(/\s+/g, '_'),
          nameEn: formData.nameEn,
          nameZh: formData.nameZh || undefined,
          nameJa: formData.nameJa || undefined,
          url: formData.url,
          secret: formData.secret || undefined,
          events: formData.events,
        });

        if (response.success) {
          toast.success(tToast('success.created'));
          onSuccess();
        }
      }
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(tToast(isEdit ? 'error.update' : 'error.create'), { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const eventsByCategory = eventDefinitions.reduce<Record<string, WebhookEventDefinition[]>>(
    (acc, event) => {
      if (!acc[event.category]) {
        acc[event.category] = [];
      }
      acc[event.category].push(event);
      return acc;
    },
    {},
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('editWebhook') : t('createWebhook')}</DialogTitle>
          <DialogDescription>
            {isEdit ? t('editWebhookDescription') : t('createWebhookDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{tCommon('code')} *</Label>
            <Input
              value={formData.code}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''),
                })
              }
              placeholder={t('placeholderWebhookCodeExample')}
              disabled={isEdit}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('nameEn')} *</Label>
            <Input
              value={formData.nameEn}
              onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
              placeholder={t('placeholderWebhookName')}
              disabled={isLoadingWebhook}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('webhookUrl')} *</Label>
            <Input
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder={t('placeholderWebhookUrl')}
              type="url"
              disabled={isLoadingWebhook}
            />
            <p className="text-xs text-muted-foreground">{t('httpsRequired')}</p>
          </div>

          {!isEdit && (
            <div className="space-y-2">
              <Label>{t('webhookSecret')}</Label>
              <Input
                value={formData.secret}
                onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                placeholder={t('placeholderWebhookSecret')}
                type="password"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>{t('subscribedEvents')} *</Label>
            <p className="text-xs text-muted-foreground mb-2">{t('selectEvents')}</p>

            {isLoadingEvents ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="animate-spin text-muted-foreground" size={20} />
              </div>
            ) : (
              <ScrollArea className="h-[200px] border rounded-md p-3">
                {Object.entries(eventsByCategory).map(([category, events]) => (
                  <div key={category} className="mb-4">
                    <h4 className="text-sm font-medium capitalize mb-2">{category}</h4>
                    <div className="space-y-2 ml-2">
                      {events.map((event) => (
                        <div key={event.event} className="flex items-start gap-2">
                          <Checkbox
                            id={event.event}
                            checked={formData.events.includes(event.event as WebhookEventType)}
                            onCheckedChange={(checked) =>
                              handleEventToggle(event.event as WebhookEventType, !!checked)
                            }
                          />
                          <div className="grid gap-0.5">
                            <label htmlFor={event.event} className="text-sm font-medium cursor-pointer">
                              {event.name}
                            </label>
                            <p className="text-xs text-muted-foreground">{event.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </ScrollArea>
            )}

            {formData.events.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.events.map((event) => (
                  <Badge key={event} variant="secondary" className="text-xs">
                    {event}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || isLoadingWebhook}>
            {(isSaving || isLoadingWebhook) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? tCommon('save') : tCommon('create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
