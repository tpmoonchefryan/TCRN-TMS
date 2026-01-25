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
    homepagePath: '',
    seoTitle: '',
    seoDescription: '',
    customDomain: '',
  });

  // Load data when dialog opens if not already loaded
  useEffect(() => {
    if (open && talentId && (!settings || dbVersion === 0)) {
      load(talentId);
    }
  }, [open, talentId, settings, dbVersion, load]);

  useEffect(() => {
    if (open && settings) {
      setLocalSettings({
        homepagePath: settings.homepagePath || '',
        seoTitle: settings.seoTitle || '',
        seoDescription: settings.seoDescription || '',
        customDomain: settings.customDomain || '',
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
      <DialogContent>
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
            <div className="space-y-2">
              <Label>{t('customPath')}</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">tcrn.com/p/</span>
                <Input 
                  value={localSettings.homepagePath} 
                  onChange={(e) => {
                    // Only allow lowercase alphanumeric, hyphens, and underscores
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9\-_]/g, '');
                    setLocalSettings(prev => ({ ...prev, homepagePath: value }));
                  }}
                  placeholder="username" 
                />
              </div>
              <p className="text-xs text-muted-foreground">{t('pathHint')}</p>
            </div>
              
              <div className="border-t my-4" />
              
              <h4 className="font-medium text-sm">SEO</h4>
              <div className="space-y-2">
                <Label>{t('metaTitle')}</Label>
                <Input 
                  value={localSettings.seoTitle}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, seoTitle: e.target.value }))}
                  placeholder="My Official Homepage" 
                />
              </div>
              <div className="space-y-2">
                <Label>{t('metaDescription')}</Label>
                <Input 
                  value={localSettings.seoDescription}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, seoDescription: e.target.value }))}
                  placeholder="Description for search engines..." 
                />
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
