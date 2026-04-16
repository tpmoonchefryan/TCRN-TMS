// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Edit,
  ExternalLink,
  Globe,
  Loader2,
  MessageSquareHeart,
  Plus,
  Trash2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { platformConfigApi, talentDomainApi } from '@/lib/api/modules/configuration';

import { DnsSetupGuide } from './DnsSetupGuide';
import { type SslMode, SslModeSelector } from './SslModeSelector';

interface UnifiedCustomDomainCardProps {
  talentId: string;
  talentCode: string;
  onDomainChange?: () => void;
}

interface DomainConfig {
  customDomain: string | null;
  customDomainVerified: boolean;
  customDomainVerificationToken: string | null;
  customDomainSslMode: SslMode;
  homepageCustomPath: string | null;
  marshmallowCustomPath: string | null;
}

const normalizePublicPathInput = (value: string): string =>
  value.toLowerCase().trim().replace(/[^a-z0-9\-_]/g, '');

const resolveHomepagePath = (value: string | null | undefined, talentCode: string): string =>
  normalizePublicPathInput(value || talentCode);

const resolveMarshmallowPath = (value: string | null | undefined): string =>
  normalizePublicPathInput(value || 'ask');

export function UnifiedCustomDomainCard({
  talentId,
  talentCode,
  onDomainChange,
}: UnifiedCustomDomainCardProps) {
  const t = useTranslations('talentSettings');
  const tc = useTranslations('common');
  const tForms = useTranslations('forms');

  const [config, setConfig] = useState<DomainConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const [domainInput, setDomainInput] = useState('');
  const [homepagePath, setHomepagePath] = useState(resolveHomepagePath(null, talentCode));
  const [marshmallowPath, setMarshmallowPath] = useState(resolveMarshmallowPath(null));
  const [isEditing, setIsEditing] = useState(false);
  const [showDnsInstructions, setShowDnsInstructions] = useState(false);
  const [platformBaseDomain, setPlatformBaseDomain] = useState<string>('proxy.tcrn.app');
  const [sslMode, setSslMode] = useState<SslMode>('auto');
  const [isSavingSslMode, setIsSavingSslMode] = useState(false);

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await talentDomainApi.getConfig(talentId);
      if (response.success && response.data) {
        const data = response.data as DomainConfig & { customDomainSslMode?: SslMode };
        setConfig({ ...data, customDomainSslMode: data.customDomainSslMode || 'auto' });
        setDomainInput(data.customDomain || '');
        setHomepagePath(resolveHomepagePath(data.homepageCustomPath, talentCode));
        setMarshmallowPath(resolveMarshmallowPath(data.marshmallowCustomPath));
        setSslMode(data.customDomainSslMode || 'auto');
        setShowDnsInstructions(Boolean(data.customDomain && !data.customDomainVerified));
      }
    } catch {
      toast.error(tc('error'));
    } finally {
      setIsLoading(false);
    }
  }, [talentCode, talentId, tc]);

  useEffect(() => {
    void fetchConfig();

    void platformConfigApi
      .get<{ domain?: string }>('system.baseDomain')
      .then((res) => {
        if (res.success && res.data?.value?.domain) {
          setPlatformBaseDomain(`proxy.${res.data.value.domain}`);
        }
      })
      .catch(() => {
        // Keep fallback domain.
      });
  }, [fetchConfig]);

  const handleSaveDomain = async () => {
    setIsSaving(true);
    try {
      const response = await talentDomainApi.setDomain(talentId, domainInput.trim() || null);
      if (response.success) {
        toast.success(t('domainSaved'));
        if (response.data?.token) {
          setShowDnsInstructions(true);
        }
        await fetchConfig();
        onDomainChange?.();
        setIsEditing(false);
      }
    } catch {
      toast.error(tc('error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerifyDomain = async () => {
    setIsVerifying(true);
    try {
      const response = await talentDomainApi.verifyDomain(talentId);
      if (response.success && response.data) {
        if (response.data.verified) {
          toast.success(t('domainVerified'));
          setShowDnsInstructions(false);
          await fetchConfig();
          onDomainChange?.();
        } else {
          toast.error(response.data.message || t('verificationFailed'));
        }
      }
    } catch {
      toast.error(tc('error'));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRemoveDomain = async () => {
    setIsSaving(true);
    try {
      const response = await talentDomainApi.setDomain(talentId, null);
      if (response.success) {
        toast.success(t('domainRemoved'));
        setDomainInput('');
        setShowDnsInstructions(false);
        await fetchConfig();
        onDomainChange?.();
        setIsEditing(false);
      }
    } catch {
      toast.error(tc('error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePaths = async () => {
    setIsSaving(true);
    try {
      const response = await talentDomainApi.updatePaths(talentId, {
        homepageCustomPath: normalizePublicPathInput(homepagePath),
        marshmallowCustomPath: normalizePublicPathInput(marshmallowPath),
      });
      if (response.success) {
        toast.success(t('pathsSaved'));
        await fetchConfig();
        onDomainChange?.();
      }
    } catch (error: unknown) {
      toast.error((error as Error)?.message || tc('error'));
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('copiedToClipboard'));
    } catch {
      toast.error(tc('error'));
    }
  };

  const handleSslModeChange = async (newMode: SslMode) => {
    setSslMode(newMode);
    setIsSavingSslMode(true);
    try {
      const response = await talentDomainApi.updateSslMode(talentId, newMode);
      if (response.success) {
        toast.success(t('sslMode.saved'));
        await fetchConfig();
      }
    } catch (error: unknown) {
      toast.error((error as Error)?.message || tc('error'));
      setSslMode(config?.customDomainSslMode || 'auto');
    } finally {
      setIsSavingSslMode(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const originalHomepagePath = resolveHomepagePath(config?.homepageCustomPath, talentCode);
  const originalMarshmallowPath = resolveMarshmallowPath(config?.marshmallowCustomPath);
  const homepageInternalUrl = `/p/${homepagePath}`;
  const marshmallowInternalUrl = `/m/${marshmallowPath}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe size={20} />
          {t('unifiedCustomDomain')}
        </CardTitle>
        <CardDescription>{t('unifiedCustomDomainDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">{t('currentDomain')}</Label>
            {config?.customDomain ? (
              <Badge variant={config.customDomainVerified ? 'default' : 'secondary'}>
                {config.customDomainVerified ? (
                  <>
                    <CheckCircle2 size={12} className="mr-1" /> {t('verified')}
                  </>
                ) : (
                  <>
                    <AlertCircle size={12} className="mr-1" /> {t('pendingVerification')}
                  </>
                )}
              </Badge>
            ) : null}
          </div>

          {config?.customDomain && !isEditing ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-md bg-muted px-3 py-2 font-mono text-sm">
                {config.customDomain}
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit size={14} className="mr-1" /> {tc('edit')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void copyToClipboard(`https://${config.customDomain}`)}
              >
                <Copy size={14} />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder={tForms('placeholders.domain')}
                className="flex-1"
              />
              <Button onClick={handleSaveDomain} disabled={isSaving || !domainInput.trim()}>
                {isSaving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    <Plus size={14} className="mr-1" /> {tc('save')}
                  </>
                )}
              </Button>
              {isEditing ? (
                <Button variant="ghost" onClick={() => setIsEditing(false)}>
                  {tc('cancel')}
                </Button>
              ) : null}
            </div>
          )}
        </div>

        {showDnsInstructions && config?.customDomain && !config.customDomainVerified ? (
          <div className="border-t pt-4">
            <DnsSetupGuide
              domain={config.customDomain}
              verificationToken={config.customDomainVerificationToken || ''}
              isVerified={config.customDomainVerified}
              isVerifying={isVerifying}
              onVerify={handleVerifyDomain}
              targetCname={platformBaseDomain}
            />
            <div className="mt-4 flex justify-end">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemoveDomain}
                disabled={isSaving}
              >
                <Trash2 size={14} className="mr-1" /> {t('removeDomain')}
              </Button>
            </div>
          </div>
        ) : null}

        {config?.customDomain && config.customDomainVerified ? (
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{t('servicePathConfig')}</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://${config.customDomain}`, '_blank')}
              >
                <ExternalLink size={14} className="mr-1" /> {t('visitSite')}
              </Button>
            </div>

            <div className="grid gap-4">
              <div className="flex items-center gap-4 rounded-lg border p-3">
                <div className="rounded bg-pink-100 p-2 dark:bg-pink-900/30">
                  <Globe size={18} className="text-pink-500" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="font-medium text-sm">{t('homepage')}</div>
                  <div className="text-xs text-muted-foreground">
                    https://{config.customDomain}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void copyToClipboard(`https://${config.customDomain}`)}
                >
                  <Copy size={14} />
                </Button>
              </div>

              <div className="flex items-center gap-4 rounded-lg border p-3">
                <div className="rounded bg-purple-100 p-2 dark:bg-purple-900/30">
                  <MessageSquareHeart size={18} className="text-purple-500" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="font-medium text-sm">{t('marshmallow')}</div>
                  <div className="text-xs text-muted-foreground">
                    https://{config.customDomain}/ask
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void copyToClipboard(`https://${config.customDomain}/ask`)}
                >
                  <Copy size={14} />
                </Button>
              </div>
            </div>

            <div className="border-t pt-4">
              <SslModeSelector
                value={sslMode}
                onChange={handleSslModeChange}
                disabled={isSavingSslMode}
              />
            </div>

            <div className="pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={handleRemoveDomain}
                disabled={isSaving}
              >
                <Trash2 size={14} className="mr-1" /> {t('removeDomain')}
              </Button>
            </div>
          </div>
        ) : null}

        <div className="rounded-lg bg-slate-50 p-4 space-y-4 dark:bg-slate-900">
          <Label className="text-sm font-medium">{t('systemUrls')}</Label>
          <p className="text-xs text-muted-foreground">{t('systemUrlsInfo')}</p>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-blue-500" />
              <span className="text-sm font-medium">{t('homepage')}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-mono text-sm text-muted-foreground">/p/</span>
              <Input
                value={homepagePath}
                onChange={(e) => setHomepagePath(normalizePublicPathInput(e.target.value))}
                placeholder={originalHomepagePath}
                className="h-8 flex-1 font-mono text-sm"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void copyToClipboard(homepageInternalUrl)}
              >
                <Copy size={14} />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MessageSquareHeart size={16} className="text-pink-500" />
              <span className="text-sm font-medium">{t('marshmallow')}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-mono text-sm text-muted-foreground">/m/</span>
              <Input
                value={marshmallowPath}
                onChange={(e) => setMarshmallowPath(normalizePublicPathInput(e.target.value))}
                placeholder={originalMarshmallowPath}
                className="h-8 flex-1 font-mono text-sm"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void copyToClipboard(marshmallowInternalUrl)}
              >
                <Copy size={14} />
              </Button>
            </div>
          </div>

          {homepagePath !== originalHomepagePath || marshmallowPath !== originalMarshmallowPath ? (
            <Button onClick={handleSavePaths} disabled={isSaving} size="sm" className="w-full">
              {isSaving ? <Loader2 size={14} className="mr-1 animate-spin" /> : null}
              {t('savePathConfig')}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
