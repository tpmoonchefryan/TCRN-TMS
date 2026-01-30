// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

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
import { integrationApi } from '@/lib/api/client';

interface WebhookEventDef {
  event: string;
  name: string;
  description: string;
  category: string;
}

interface WebhookItem {
  id: string;
  code: string;
  nameEn: string;
  nameZh?: string;
  nameJa?: string;
  url: string;
  events: string[];
  version?: number;
}

interface WebhookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webhook: WebhookItem | null;
  onSuccess: () => void;
}

export function WebhookDialog({
  open,
  onOpenChange,
  webhook,
  onSuccess,
}: WebhookDialogProps) {
  const t = useTranslations('integrationManagement');
  const tCommon = useTranslations('common');
  const tForms = useTranslations('forms');
  const tToast = useTranslations('toast');

  const isEdit = !!webhook;

  const [eventDefinitions, setEventDefinitions] = useState<WebhookEventDef[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    nameEn: '',
    nameZh: '',
    nameJa: '',
    url: '',
    secret: '',
    events: [] as string[],
  });

  // Load event definitions
  const fetchEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    try {
      const response = await integrationApi.getWebhookEvents?.();
      if (response?.success && response.data) {
        setEventDefinitions(response.data);
      }
    } catch (error) {
      // Use empty list
    } finally {
      setIsLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchEvents();
      if (webhook) {
        setFormData({
          code: webhook.code,
          nameEn: webhook.nameEn,
          nameZh: webhook.nameZh || '',
          nameJa: webhook.nameJa || '',
          url: webhook.url,
          secret: '',
          events: webhook.events,
        });
      } else {
        setFormData({
          code: '',
          nameEn: '',
          nameZh: '',
          nameJa: '',
          url: '',
          secret: '',
          events: [],
        });
      }
    }
  }, [open, webhook, fetchEvents]);

  const handleEventToggle = (event: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      events: checked
        ? [...prev.events, event]
        : prev.events.filter((e) => e !== event),
    }));
  };

  const handleSubmit = async () => {
    if (!formData.code || !formData.nameEn || !formData.url || formData.events.length === 0) {
      toast.error(t('requiredFieldsMissing'));
      return;
    }

    // Validate URL
    try {
      new URL(formData.url);
    } catch {
      toast.error(t('invalidUrl'));
      return;
    }

    setIsSaving(true);
    try {
      if (isEdit && webhook) {
        const response = await integrationApi.updateWebhook(webhook.id, {
          name: formData.nameEn,
          targetUrl: formData.url,
          events: formData.events,
          version: webhook.version || 1,
        });
        if (response.success) {
          toast.success(tToast('success.updated'));
          onSuccess();
        }
      } else {
        const response = await integrationApi.createWebhook({
          name: formData.nameEn,
          targetUrl: formData.url,
          events: formData.events,
          secret: formData.secret || undefined,
        });
        if (response.success) {
          toast.success(tToast('success.created'));
          onSuccess();
        }
      }
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(tToast('error.update'), { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // Group events by category
  const eventsByCategory = eventDefinitions.reduce((acc, event) => {
    if (!acc[event.category]) acc[event.category] = [];
    acc[event.category].push(event);
    return acc;
  }, {} as Record<string, WebhookEventDef[]>);

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
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
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
            />
          </div>

          <div className="space-y-2">
            <Label>{t('webhookUrl')} *</Label>
            <Input
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder={t('placeholderWebhookUrl')}
              type="url"
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
                            checked={formData.events.includes(event.event)}
                            onCheckedChange={(checked) =>
                              handleEventToggle(event.event, !!checked)
                            }
                          />
                          <div className="grid gap-0.5">
                            <label
                              htmlFor={event.event}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {event.name}
                            </label>
                            <p className="text-xs text-muted-foreground">
                              {event.description}
                            </p>
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
                {formData.events.map((e) => (
                  <Badge key={e} variant="secondary" className="text-xs">
                    {e}
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
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? tCommon('save') : tCommon('create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
