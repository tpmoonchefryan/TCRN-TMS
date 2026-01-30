// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { AlertCircle, CheckCircle2, Copy, Globe, Loader2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

export interface CustomDomainDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'homepage' | 'marshmallow';
  currentDomain: string | null;
  verified: boolean;
  verificationToken: string | null;
  onSave: (domain: string | null) => Promise<{ token?: string; txtRecord?: string } | void>;
  onVerify: () => Promise<{ verified: boolean; message: string }>;
}

export function CustomDomainDialog({
  open,
  onOpenChange,
  type,
  currentDomain,
  verified,
  verificationToken,
  onSave,
  onVerify,
}: CustomDomainDialogProps) {
  const t = useTranslations('talentSettings');
  const tCommon = useTranslations('common');

  const [domain, setDomain] = useState(currentDomain || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [localToken, setLocalToken] = useState(verificationToken);
  const [localVerified, setLocalVerified] = useState(verified);

  // Reset state when dialog opens
  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (isOpen) {
      setDomain(currentDomain || '');
      setLocalToken(verificationToken);
      setLocalVerified(verified);
    }
    onOpenChange(isOpen);
  }, [currentDomain, verificationToken, verified, onOpenChange]);

  const handleSave = async () => {
    if (!domain.trim()) {
      toast.error(t('enterDomain'));
      return;
    }

    // Basic domain validation
    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain.trim())) {
      toast.error(t('invalidDomain') || 'Invalid domain format');
      return;
    }

    setIsSaving(true);
    try {
      const result = await onSave(domain.trim().toLowerCase());
      if (result?.token) {
        setLocalToken(result.token);
        setLocalVerified(false);
      }
      toast.success(t('domainSaved') || 'Domain saved');
    } catch {
      toast.error(tCommon('error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const result = await onVerify();
      if (result.verified) {
        setLocalVerified(true);
        toast.success(t('verificationSuccess'));
        onOpenChange(false);
      } else {
        toast.error(result.message || t('verificationFailed'));
      }
    } catch {
      toast.error(t('verificationFailed'));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRemove = async () => {
    setIsSaving(true);
    try {
      await onSave(null);
      setDomain('');
      setLocalToken(null);
      setLocalVerified(false);
      toast.success(t('domainRemoved') || 'Domain removed');
      onOpenChange(false);
    } catch {
      toast.error(tCommon('error'));
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('copiedToClipboard'));
  };

  const txtRecordValue = localToken ? `tcrn-verify=${localToken}` : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe size={20} />
            {currentDomain ? t('editCustomDomain') : t('addCustomDomain')}
          </DialogTitle>
          <DialogDescription>
            {t('customDomainDialogDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Domain Input */}
          <div className="space-y-2">
            <Label>{t('enterDomain')}</Label>
            <div className="flex items-center gap-2">
              <Input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder={t('domainPlaceholder')}
                disabled={isSaving}
              />
              {domain && (
                localVerified ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-orange-500 shrink-0" />
                )
              )}
            </div>
            {domain && (
              <Badge variant={localVerified ? 'default' : 'secondary'} className="text-xs">
                {localVerified ? t('verified') : t('unverified')}
              </Badge>
            )}
          </div>

          {/* Verification Instructions */}
          {domain && !localVerified && (
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <p className="font-medium text-sm">{t('verificationRequired')}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('verificationInstructions')}
              </p>
              
              {txtRecordValue ? (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t('txtRecordName')}</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-background rounded text-xs font-mono">
                        {domain}
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => copyToClipboard(domain)}
                      >
                        <Copy size={12} />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t('txtRecordValue')}</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-background rounded text-xs font-mono break-all">
                        {txtRecordValue}
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => copyToClipboard(txtRecordValue)}
                      >
                        <Copy size={12} />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t('saveToGetToken') || 'Save the domain first to get the verification token.'}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {currentDomain && (
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={isSaving || isVerifying}
              className="w-full sm:w-auto"
            >
              <Trash2 size={14} className="mr-2" />
              {t('removeDomain')}
            </Button>
          )}
          <div className="flex-1" />
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving || isVerifying}
          >
            {tCommon('cancel')}
          </Button>
          {domain && !localVerified && txtRecordValue && (
            <Button
              variant="secondary"
              onClick={handleVerify}
              disabled={isVerifying || isSaving}
            >
              {isVerifying ? (
                <>
                  <Loader2 size={14} className="mr-2 animate-spin" />
                  {t('verifying')}
                </>
              ) : (
                t('verifyNow')
              )}
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving || isVerifying || !domain.trim()}>
            {isSaving ? (
              <>
                <Loader2 size={14} className="mr-2 animate-spin" />
                {tCommon('saving')}
              </>
            ) : (
              tCommon('save')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
