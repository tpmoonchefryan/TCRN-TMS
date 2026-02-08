// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Bell, Book, Database, Globe, Link as LinkIcon, Loader2, Mail, Save, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { SystemDictionary } from '@/components/admin/system-dictionary';
import { RateLimitStats } from '@/components/security/RateLimitStats';
import { EmailConfigPanel } from '@/components/settings/EmailConfigPanel';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { platformConfigApi } from '@/lib/api/client';

// Config keys for platform settings
const CONFIG_KEYS = {
  baseDomain: 'system.baseDomain',
  platformName: 'system.platformName',
  supportEmail: 'system.supportEmail',
  adminEmail: 'system.adminEmail',
  sessionTimeout: 'security.sessionTimeout',
  maxLoginAttempts: 'security.maxLoginAttempts',
  logRetention: 'data.logRetention',
} as const;

interface PlatformSettings {
  platformName: string;
  supportEmail: string;
  adminEmail: string;
  sessionTimeout: number;
  maxLoginAttempts: number;
  logRetention: number;
}

export default function PlatformSettingsPage() {
  const t = useTranslations('adminConsole.settings');
  const tCommon = useTranslations('common');
  const [activeTab, setActiveTab] = useState('general');
  
  // Domain settings state
  const [systemBaseDomain, setSystemBaseDomain] = useState('tcrn.app');
  const [isDomainLoading, setIsDomainLoading] = useState(true);
  const [isDomainSaving, setIsDomainSaving] = useState(false);

  // Platform settings state
  const [settings, setSettings] = useState<PlatformSettings>({
    platformName: 'TCRN TMS',
    supportEmail: 'support@tcrn-tms.com',
    adminEmail: 'admin@tcrn-tms.com',
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    logRetention: 90,
  });
  const [originalSettings, setOriginalSettings] = useState<PlatformSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load all settings
  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsDomainLoading(true);
      
      // Load all settings in parallel
      const [
        domainRes,
        platformNameRes,
        supportEmailRes,
        adminEmailRes,
        sessionTimeoutRes,
        maxLoginAttemptsRes,
        logRetentionRes,
      ] = await Promise.all([
        platformConfigApi.get(CONFIG_KEYS.baseDomain),
        platformConfigApi.get(CONFIG_KEYS.platformName),
        platformConfigApi.get(CONFIG_KEYS.supportEmail),
        platformConfigApi.get(CONFIG_KEYS.adminEmail),
        platformConfigApi.get(CONFIG_KEYS.sessionTimeout),
        platformConfigApi.get(CONFIG_KEYS.maxLoginAttempts),
        platformConfigApi.get(CONFIG_KEYS.logRetention),
      ]);

      // Extract domain
      if (domainRes.success && domainRes.data?.value) {
        const domainConfig = domainRes.data.value as { domain?: string };
        if (domainConfig.domain) {
          setSystemBaseDomain(domainConfig.domain);
        }
      }

      // Build settings object
      const loadedSettings: PlatformSettings = {
        platformName: (platformNameRes.data?.value as string) || 'TCRN TMS',
        supportEmail: (supportEmailRes.data?.value as string) || 'support@tcrn-tms.com',
        adminEmail: (adminEmailRes.data?.value as string) || 'admin@tcrn-tms.com',
        sessionTimeout: (sessionTimeoutRes.data?.value as number) || 30,
        maxLoginAttempts: (maxLoginAttemptsRes.data?.value as number) || 5,
        logRetention: (logRetentionRes.data?.value as number) || 90,
      };

      setSettings(loadedSettings);
      setOriginalSettings(loadedSettings);
    } catch {
      // Use defaults on error
    } finally {
      setIsLoading(false);
      setIsDomainLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Check if settings have changed
  const hasChanges = originalSettings && (
    settings.platformName !== originalSettings.platformName ||
    settings.supportEmail !== originalSettings.supportEmail ||
    settings.adminEmail !== originalSettings.adminEmail ||
    settings.sessionTimeout !== originalSettings.sessionTimeout ||
    settings.maxLoginAttempts !== originalSettings.maxLoginAttempts ||
    settings.logRetention !== originalSettings.logRetention
  );

  // Save all settings
  const handleSaveSettings = async () => {
    if (!hasChanges) return;
    
    try {
      setIsSaving(true);
      
      // Save changed settings
      const savePromises: Promise<unknown>[] = [];
      
      if (settings.platformName !== originalSettings?.platformName) {
        savePromises.push(platformConfigApi.set(CONFIG_KEYS.platformName, settings.platformName));
      }
      if (settings.supportEmail !== originalSettings?.supportEmail) {
        savePromises.push(platformConfigApi.set(CONFIG_KEYS.supportEmail, settings.supportEmail));
      }
      if (settings.adminEmail !== originalSettings?.adminEmail) {
        savePromises.push(platformConfigApi.set(CONFIG_KEYS.adminEmail, settings.adminEmail));
      }
      if (settings.sessionTimeout !== originalSettings?.sessionTimeout) {
        savePromises.push(platformConfigApi.set(CONFIG_KEYS.sessionTimeout, settings.sessionTimeout));
      }
      if (settings.maxLoginAttempts !== originalSettings?.maxLoginAttempts) {
        savePromises.push(platformConfigApi.set(CONFIG_KEYS.maxLoginAttempts, settings.maxLoginAttempts));
      }
      if (settings.logRetention !== originalSettings?.logRetention) {
        savePromises.push(platformConfigApi.set(CONFIG_KEYS.logRetention, settings.logRetention));
      }

      await Promise.all(savePromises);
      setOriginalSettings({ ...settings });
      toast.success(tCommon('success'));
    } catch {
      toast.error(tCommon('error'));
    } finally {
      setIsSaving(false);
    }
  };

  // Save domain setting (separate button)
  const handleSaveDomain = async () => {
    if (!systemBaseDomain.trim()) {
      toast.error(t('domainRequired') || 'Domain is required');
      return;
    }

    // Basic domain validation
    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(systemBaseDomain.trim())) {
      toast.error(t('invalidDomain') || 'Invalid domain format');
      return;
    }

    try {
      setIsDomainSaving(true);
      await platformConfigApi.set(CONFIG_KEYS.baseDomain, { domain: systemBaseDomain.trim().toLowerCase() });
      toast.success(tCommon('success'));
    } catch {
      toast.error(tCommon('error'));
    } finally {
      setIsDomainSaving(false);
    }
  };

  // Handle input changes
  const updateSetting = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-purple-700 dark:text-purple-300">
            {t('title')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {t('description')}
          </p>
        </div>
        {activeTab !== 'dictionary' && activeTab !== 'email' && (
          <Button
            className="bg-purple-600 hover:bg-purple-700"
            onClick={handleSaveSettings}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <Save size={16} className="mr-2" />
            )}
            {tCommon('saveChanges')}
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-xl grid-cols-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Globe size={16} />
            {t('details')}
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail size={16} />
            {t('email') || 'Email'}
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield size={16} />
            Security
          </TabsTrigger>
          <TabsTrigger value="dictionary" className="flex items-center gap-2">
            <Book size={16} />
            {t('dictionary')}
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-white/50 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe size={20} className="text-purple-600" />
                  General
                </CardTitle>
                <CardDescription>Basic platform configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center gap-2 py-4">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm text-muted-foreground">{tCommon('loading')}</span>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Platform Name</Label>
                      <Input
                        value={settings.platformName}
                        onChange={(e) => updateSetting('platformName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Support Email</Label>
                      <Input
                        type="email"
                        value={settings.supportEmail}
                        onChange={(e) => updateSetting('supportEmail', e.target.value)}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/50 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell size={20} className="text-purple-600" />
                  Notifications
                </CardTitle>
                <CardDescription>Notification preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center gap-2 py-4">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm text-muted-foreground">{tCommon('loading')}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Admin Email</Label>
                    <Input
                      type="email"
                      value={settings.adminEmail}
                      onChange={(e) => updateSetting('adminEmail', e.target.value)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Domain Settings Card */}
            <Card className="border-white/50 bg-white/80 backdrop-blur-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon size={20} className="text-purple-600" />
                  {t('domainSettings')}
                </CardTitle>
                <CardDescription>{t('domainSettingsDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('systemBaseDomain')}</Label>
                  {isDomainLoading ? (
                    <div className="flex items-center gap-2 py-2">
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-sm text-muted-foreground">{tCommon('loading')}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        value={systemBaseDomain}
                        onChange={(e) => setSystemBaseDomain(e.target.value)}
                        placeholder="tcrn.app"
                        className="max-w-sm"
                      />
                      <Button
                        onClick={handleSaveDomain}
                        disabled={isDomainSaving}
                        size="sm"
                      >
                        {isDomainSaving ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Save size={14} />
                        )}
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {t('systemBaseDomainHint')}
                  </p>
                  <div className="mt-3 p-3 bg-muted rounded-lg text-sm">
                    <p className="font-medium mb-2">{t('urlPreview') || 'URL Preview'}</p>
                    <div className="space-y-1 text-muted-foreground font-mono text-xs">
                      <p>Homepage: <span className="text-foreground">{systemBaseDomain}/p/{'{talentCode}'}</span></p>
                      <p>Marshmallow: <span className="text-foreground">{systemBaseDomain}/m/{'{talentCode}'}</span></p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email" className="mt-6">
          <EmailConfigPanel />
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-white/50 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield size={20} className="text-purple-600" />
                  Security
                </CardTitle>
                <CardDescription>Security and access settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center gap-2 py-4">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm text-muted-foreground">{tCommon('loading')}</span>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Session Timeout (minutes)</Label>
                      <Input
                        type="number"
                        min={5}
                        max={480}
                        value={settings.sessionTimeout}
                        onChange={(e) => updateSetting('sessionTimeout', parseInt(e.target.value) || 30)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Login Attempts</Label>
                      <Input
                        type="number"
                        min={3}
                        max={20}
                        value={settings.maxLoginAttempts}
                        onChange={(e) => updateSetting('maxLoginAttempts', parseInt(e.target.value) || 5)}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/50 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database size={20} className="text-purple-600" />
                  Data
                </CardTitle>
                <CardDescription>Data retention and backup</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center gap-2 py-4">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm text-muted-foreground">{tCommon('loading')}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Log Retention (days)</Label>
                    <Input
                      type="number"
                      min={7}
                      max={365}
                      value={settings.logRetention}
                      onChange={(e) => updateSetting('logRetention', parseInt(e.target.value) || 90)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Rate Limit Stats */}
          <div className="mt-6">
            <RateLimitStats />
          </div>
        </TabsContent>

        {/* Dictionary Tab */}
        <TabsContent value="dictionary" className="mt-6">
          <SystemDictionary />
        </TabsContent>
      </Tabs>
    </div>
  );
}
