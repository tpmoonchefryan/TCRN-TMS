import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Input, Label } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { talentDomainApi } from '@/lib/api/client';
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
    ogImageUrl: '',
    analyticsId: '',
  });

  // Domain verification state
  const [domainVerification, setDomainVerification] = useState<{
    token: string | null;
    txtRecord: string | null;
    verified: boolean;
  }>({ token: null, txtRecord: null, verified: false });
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

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
        ogImageUrl: settings.ogImageUrl || '',
        analyticsId: settings.analyticsId || '',
      });
      // Reset verification state when dialog opens
      setDomainVerification({ token: null, txtRecord: null, verified: false });
    }
  }, [open, settings]);

  const handleSave = async () => {
    await updateSettings(talentId, localSettings);
    onOpenChange(false);
    onSave?.();
  };

  const handleGenerateToken = async () => {
    if (!localSettings.customDomain) {
      toast.error('Please enter a custom domain first');
      return;
    }
    
    setIsGeneratingToken(true);
    try {
      const response = await talentDomainApi.setHomepageDomain(talentId, localSettings.customDomain);
      if (response.data) {
        setDomainVerification({
          token: response.data.token,
          txtRecord: response.data.txtRecord,
          verified: false,
        });
        toast.success('Verification token generated');
      }
    } catch {
      toast.error('Failed to generate verification token');
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const handleVerifyDomain = async () => {
    setIsVerifying(true);
    try {
      const response = await talentDomainApi.verifyHomepageDomain(talentId);
      if (response.data?.verified) {
        setDomainVerification(prev => ({ ...prev, verified: true }));
        toast.success(t('verificationSuccess'));
      } else {
        toast.error(response.data?.message || t('verificationFailed'));
      }
    } catch {
      toast.error(t('verificationFailed'));
    } finally {
      setIsVerifying(false);
    }
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
              {/* Custom Path */}
              <div className="space-y-2">
                <Label>{t('customPath')}</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">tcrn.com/p/</span>
                  <Input 
                    value={localSettings.homepagePath} 
                    onChange={(e) => {
                      const value = e.target.value.toLowerCase().replace(/[^a-z0-9\-_]/g, '');
                      setLocalSettings(prev => ({ ...prev, homepagePath: value }));
                    }}
                    placeholder="username" 
                  />
                </div>
                <p className="text-xs text-muted-foreground">{t('pathHint')}</p>
              </div>
              
              <div className="border-t my-4" />
              
              {/* SEO Section */}
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
              <div className="space-y-2">
                <Label>{t('ogImageUrl')}</Label>
                <Input 
                  value={localSettings.ogImageUrl}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, ogImageUrl: e.target.value }))}
                  placeholder="https://example.com/og-image.jpg" 
                />
                <p className="text-xs text-muted-foreground">{t('ogImageUrlHint')}</p>
              </div>
              
              <div className="border-t my-4" />
              
              {/* Analytics Section */}
              <h4 className="font-medium text-sm">Analytics</h4>
              <div className="space-y-2">
                <Label>{t('analyticsId')}</Label>
                <Input 
                  value={localSettings.analyticsId}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, analyticsId: e.target.value }))}
                  placeholder="G-XXXXXXXXXX" 
                />
                <p className="text-xs text-muted-foreground">{t('analyticsIdHint')}</p>
              </div>
              
              <div className="border-t my-4" />
              
              {/* Custom Domain Section */}
              <h4 className="font-medium text-sm">{t('customDomainSection')}</h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Domain</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={localSettings.customDomain}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, customDomain: e.target.value.toLowerCase() }))}
                      placeholder="example.com" 
                    />
                    {domainVerification.verified ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm whitespace-nowrap">
                        <CheckCircle2 className="h-4 w-4" />
                        {t('domainVerified')}
                      </span>
                    ) : localSettings.customDomain ? (
                      <span className="flex items-center gap-1 text-yellow-600 text-sm whitespace-nowrap">
                        <XCircle className="h-4 w-4" />
                        {t('domainNotVerified')}
                      </span>
                    ) : null}
                  </div>
                </div>
                
                {localSettings.customDomain && !domainVerification.verified && (
                  <div className="space-y-2 p-3 bg-muted rounded-md">
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleGenerateToken}
                        disabled={isGeneratingToken}
                      >
                        {isGeneratingToken ? t('generating') : t('generateToken')}
                      </Button>
                      {domainVerification.txtRecord && (
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={handleVerifyDomain}
                          disabled={isVerifying}
                        >
                          {isVerifying ? t('verifying') : t('verifyDomain')}
                        </Button>
                      )}
                    </div>
                    
                    {domainVerification.txtRecord && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">{t('txtRecordHint')}</p>
                        <code className="block p-2 bg-background rounded text-xs font-mono break-all">
                          {domainVerification.txtRecord}
                        </code>
                      </div>
                    )}
                  </div>
                )}
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
