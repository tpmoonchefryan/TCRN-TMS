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
  Trash2
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { platformConfigApi, talentDomainApi } from '@/lib/api/client';

import { DnsSetupGuide } from './DnsSetupGuide';
import { type SslMode,SslModeSelector } from './SslModeSelector';

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

export function UnifiedCustomDomainCard({
  talentId,
  talentCode,
  onDomainChange,
}: UnifiedCustomDomainCardProps) {
  const t = useTranslations('talentSettings');
  const tc = useTranslations('common');

  const [config, setConfig] = useState<DomainConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Editable state
  const [domainInput, setDomainInput] = useState('');
  const [homepagePath, setHomepagePath] = useState('/');
  const [marshmallowPath, setMarshmallowPath] = useState('/ask');
  const [isEditing, setIsEditing] = useState(false);
  const [showDnsInstructions, setShowDnsInstructions] = useState(false);
  const [platformBaseDomain, setPlatformBaseDomain] = useState<string>('proxy.tcrn.app');
  const [sslMode, setSslMode] = useState<SslMode>('auto');
  const [isSavingSslMode, setIsSavingSslMode] = useState(false);

  // Fetch config
  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await talentDomainApi.getConfig(talentId);
      if (response.success && response.data) {
        const data = response.data as DomainConfig & { customDomainSslMode?: SslMode };
        setConfig({ ...data, customDomainSslMode: data.customDomainSslMode || 'auto' });
        setDomainInput(data.customDomain || '');
        setHomepagePath(data.homepageCustomPath || '/');
        setMarshmallowPath(data.marshmallowCustomPath || '/ask');
        setSslMode(data.customDomainSslMode || 'auto');
        // Show DNS instructions if domain set but not verified
        if (data.customDomain && !data.customDomainVerified) {
          setShowDnsInstructions(true);
        }
      }
    } catch {
      toast.error(tc('error'));
    } finally {
      setIsLoading(false);
    }
  }, [talentId, tc]);

  useEffect(() => {
    fetchConfig();
    // Fetch platform base domain for CNAME target
    platformConfigApi.get('system.baseDomain').then((res) => {
      if (res.success && res.data?.value) {
        const domainConfig = res.data.value as { domain?: string };
        if (domainConfig.domain) {
          setPlatformBaseDomain(`proxy.${domainConfig.domain}`);
        }
      }
    }).catch(() => {
      // Use default if fetch fails
    });
  }, [fetchConfig]);

  // Save domain
  const handleSaveDomain = async () => {
    setIsSaving(true);
    try {
      const response = await talentDomainApi.setDomain(
        talentId,
        domainInput.trim() || null
      );
      if (response.success) {
        toast.success(t('domainSaved'));
        if (response.data?.token) {
          setShowDnsInstructions(true);
        }
        fetchConfig();
        onDomainChange?.();
        setIsEditing(false);
      }
    } catch {
      toast.error(tc('error'));
    } finally {
      setIsSaving(false);
    }
  };

  // Verify domain
  const handleVerifyDomain = async () => {
    setIsVerifying(true);
    try {
      const response = await talentDomainApi.verifyDomain(talentId);
      if (response.success && response.data) {
        if (response.data.verified) {
          toast.success(t('domainVerified'));
          setShowDnsInstructions(false);
          fetchConfig();
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

  // Remove domain
  const handleRemoveDomain = async () => {
    setIsSaving(true);
    try {
      const response = await talentDomainApi.setDomain(talentId, null);
      if (response.success) {
        toast.success(t('domainRemoved'));
        setDomainInput('');
        setShowDnsInstructions(false);
        fetchConfig();
        onDomainChange?.();
        setIsEditing(false);
      }
    } catch {
      toast.error(tc('error'));
    } finally {
      setIsSaving(false);
    }
  };

  // Save paths
  const handleSavePaths = async () => {
    setIsSaving(true);
    try {
      const response = await talentDomainApi.updatePaths(talentId, {
        homepageCustomPath: homepagePath,
        marshmallowCustomPath: marshmallowPath,
      });
      if (response.success) {
        toast.success(t('pathsSaved'));
        fetchConfig();
      }
    } catch (error: unknown) {
      toast.error((error as Error)?.message || tc('error'));
    } finally {
      setIsSaving(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('copiedToClipboard'));
  };

  // Handle SSL mode change
  const handleSslModeChange = async (newMode: SslMode) => {
    setSslMode(newMode);
    setIsSavingSslMode(true);
    try {
      const response = await talentDomainApi.updateSslMode(talentId, newMode);
      if (response.success) {
        toast.success(t('sslMode.saved'));
        fetchConfig();
      }
    } catch (error: unknown) {
      toast.error((error as Error)?.message || tc('error'));
      // Revert on error
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

  // txtRecord is computed inside DnsSetupGuide component

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
        {/* Current Domain Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">{t('currentDomain')}</Label>
            {config?.customDomain && (
              <Badge variant={config.customDomainVerified ? 'default' : 'secondary'}>
                {config.customDomainVerified ? (
                  <><CheckCircle2 size={12} className="mr-1" /> {t('verified')}</>
                ) : (
                  <><AlertCircle size={12} className="mr-1" /> {t('pendingVerification')}</>
                )}
              </Badge>
            )}
          </div>

          {config?.customDomain && !isEditing ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 bg-muted rounded-md font-mono text-sm">
                {config.customDomain}
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit size={14} className="mr-1" /> {tc('edit')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(`https://${config.customDomain}`)}
              >
                <Copy size={14} />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="example.com"
                className="flex-1"
              />
              <Button
                onClick={handleSaveDomain}
                disabled={isSaving || !domainInput.trim()}
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <><Plus size={14} className="mr-1" /> {tc('save')}</>}
              </Button>
              {isEditing && (
                <Button variant="ghost" onClick={() => setIsEditing(false)}>
                  {tc('cancel')}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* DNS Verification Instructions - Using new DnsSetupGuide component */}
        {showDnsInstructions && config?.customDomain && !config.customDomainVerified && (
          <div className="pt-4 border-t">
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
        )}

        {/* Service Path Configuration (only shown when domain is verified) */}
        {config?.customDomain && config.customDomainVerified && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{t('servicePathConfig')}</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(`https://${config.customDomain}`)}
              >
                <ExternalLink size={14} className="mr-1" /> {t('visitSite')}
              </Button>
            </div>

            <div className="grid gap-4">
              {/* Homepage Path */}
              <div className="flex items-center gap-4 p-3 border rounded-lg">
                <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded">
                  <Globe size={18} className="text-pink-500" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="font-medium text-sm">{t('homepagePath')}</div>
                  <div className="text-xs text-muted-foreground">
                    https://{config.customDomain}{homepagePath}
                  </div>
                </div>
                <Input
                  value={homepagePath}
                  onChange={(e) => setHomepagePath(e.target.value)}
                  className="w-24 font-mono text-sm"
                  placeholder="/"
                />
              </div>

              {/* Marshmallow Path */}
              <div className="flex items-center gap-4 p-3 border rounded-lg">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded">
                  <MessageSquareHeart size={18} className="text-purple-500" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="font-medium text-sm">{t('marshmallowPath')}</div>
                  <div className="text-xs text-muted-foreground">
                    https://{config.customDomain}{marshmallowPath}
                  </div>
                </div>
                <Input
                  value={marshmallowPath}
                  onChange={(e) => setMarshmallowPath(e.target.value)}
                  className="w-24 font-mono text-sm"
                  placeholder="/ask"
                />
              </div>
            </div>

            {/* SSL Mode Selector */}
            <div className="pt-4 border-t">
              <SslModeSelector
                value={sslMode}
                onChange={handleSslModeChange}
                disabled={isSavingSslMode}
              />
            </div>

            {/* Save Paths Button */}
            {(homepagePath !== config.homepageCustomPath || marshmallowPath !== config.marshmallowCustomPath) && (
              <Button onClick={handleSavePaths} disabled={isSaving} className="w-full">
                {isSaving ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                {t('savePathConfig')}
              </Button>
            )}

            {/* Remove Domain */}
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
        )}

        {/* System URLs - Editable Path Segment */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg space-y-4">
          <Label className="text-sm font-medium">{t('systemUrls')}</Label>
          <p className="text-xs text-muted-foreground">{t('systemUrlsInfo')}</p>
          
          {/* Homepage Path - fixed /p/ prefix, editable path segment */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-blue-500" />
              <span className="text-sm font-medium">Homepage</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground font-mono">/p/</span>
              <Input
                value={homepagePath.replace(/^\//, '')}
                onChange={(e) => setHomepagePath(e.target.value.toLowerCase().replace(/[^a-z0-9\-_]/g, ''))}
                placeholder={talentCode.toLowerCase()}
                className="flex-1 font-mono text-sm h-8"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(`/p/${homepagePath.replace(/^\//, '') || talentCode.toLowerCase()}`)}
              >
                <Copy size={14} />
              </Button>
            </div>
          </div>

          {/* Marshmallow Path - fixed /m/ prefix, editable path segment */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MessageSquareHeart size={16} className="text-pink-500" />
              <span className="text-sm font-medium">Marshmallow</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground font-mono">/m/</span>
              <Input
                value={marshmallowPath.replace(/^\//, '')}
                onChange={(e) => setMarshmallowPath(e.target.value.toLowerCase().replace(/[^a-z0-9\-_]/g, ''))}
                placeholder={talentCode.toLowerCase()}
                className="flex-1 font-mono text-sm h-8"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(`/m/${marshmallowPath.replace(/^\//, '') || talentCode.toLowerCase()}`)}
              >
                <Copy size={14} />
              </Button>
            </div>
          </div>

          {/* Save Paths Button */}
          {config && (homepagePath !== (config.homepageCustomPath || '') || marshmallowPath !== (config.marshmallowCustomPath || '')) && (
            <Button onClick={handleSavePaths} disabled={isSaving} size="sm" className="w-full">
              {isSaving ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
              {t('savePathConfig')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
