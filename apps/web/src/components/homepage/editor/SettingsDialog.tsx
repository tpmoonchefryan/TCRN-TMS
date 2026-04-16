import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Input, Label } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useEditorStore } from '@/stores/homepage/editor-store';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  talentId: string;
  onSave?: () => void;
}

export function SettingsDialog({ open, onOpenChange, talentId, onSave }: SettingsDialogProps) {
  const t = useTranslations('homepageEditor');
  const { settings, updateSettings, isSaving, load, isLoading, dbVersion } = useEditorStore();

  const [localSettings, setLocalSettings] = useState({
    seoTitle: '',
    seoDescription: '',
    ogImageUrl: '',
    analyticsId: '',
  });

  useEffect(() => {
    if (open && talentId && (!settings || dbVersion === 0)) {
      void load(talentId);
    }
  }, [dbVersion, load, open, settings, talentId]);

  useEffect(() => {
    if (open && settings) {
      setLocalSettings({
        seoTitle: settings.seoTitle || '',
        seoDescription: settings.seoDescription || '',
        ogImageUrl: settings.ogImageUrl || '',
        analyticsId: settings.analyticsId || '',
      });
    }
  }, [open, settings]);

  const handleSave = async () => {
    await updateSettings(talentId, localSettings);
    onOpenChange(false);
    onSave?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('pageSettings')}</DialogTitle>
          <DialogDescription>{t('pageSettingsDesc')}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="space-y-4 py-4">
              <h4 className="font-medium text-sm">{t('seoSection')}</h4>
              <div className="space-y-2">
                <Label>{t('metaTitle')}</Label>
                <Input
                  value={localSettings.seoTitle}
                  onChange={(e) => setLocalSettings((prev) => ({ ...prev, seoTitle: e.target.value }))}
                  placeholder={t('metaTitlePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('metaDescription')}</Label>
                <Input
                  value={localSettings.seoDescription}
                  onChange={(e) => setLocalSettings((prev) => ({ ...prev, seoDescription: e.target.value }))}
                  placeholder={t('metaDescriptionPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('ogImageUrl')}</Label>
                <Input
                  value={localSettings.ogImageUrl}
                  onChange={(e) => setLocalSettings((prev) => ({ ...prev, ogImageUrl: e.target.value }))}
                  placeholder={t('ogImageUrlPlaceholder')}
                />
                <p className="text-xs text-muted-foreground">{t('ogImageUrlHint')}</p>
              </div>

              <div className="border-t my-4" />

              <h4 className="font-medium text-sm">{t('analyticsSection')}</h4>
              <div className="space-y-2">
                <Label>{t('analyticsId')}</Label>
                <Input
                  value={localSettings.analyticsId}
                  onChange={(e) => setLocalSettings((prev) => ({ ...prev, analyticsId: e.target.value }))}
                  placeholder={t('analyticsIdPlaceholder')}
                />
                <p className="text-xs text-muted-foreground">{t('analyticsIdHint')}</p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
              <Button onClick={handleSave} disabled={isSaving}>{isSaving ? t('saving') : t('save')}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
