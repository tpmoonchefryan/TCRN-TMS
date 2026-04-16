// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Bell, Book, Database, Globe, Link as LinkIcon, Loader2, Mail, Save, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { SystemDictionary } from '@/components/admin/system-dictionary';
import { RateLimitStats } from '@/components/security/RateLimitStats';
import { EmailConfigPanel } from '@/components/settings/EmailConfigPanel';
import {
  PLATFORM_CONFIG_KEYS,
  platformSettingsDomainApi,
} from '@/domains/config-dictionary-settings/api/platform-settings.api';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/platform/ui';

interface PlatformSettings {
  platformName: string;
  supportEmail: string;
  adminEmail: string;
  sessionTimeout: number;
  maxLoginAttempts: number;
  logRetention: number;
}

export function AdminPlatformSettingsScreen() {
  const t = useTranslations('adminConsole.settings');
  const tCommon = useTranslations('common');
  const tForms = useTranslations('forms');
  const [activeTab, setActiveTab] = useState('general');
  const [systemBaseDomain, setSystemBaseDomain] = useState('tcrn.app');
  const [isDomainLoading, setIsDomainLoading] = useState(true);
  const [isDomainSaving, setIsDomainSaving] = useState(false);
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

  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsDomainLoading(true);

      const [
        domainRes,
        platformNameRes,
        supportEmailRes,
        adminEmailRes,
        sessionTimeoutRes,
        maxLoginAttemptsRes,
        logRetentionRes,
      ] = await Promise.all([
        platformSettingsDomainApi.getEntry<{ domain?: string }>(PLATFORM_CONFIG_KEYS.baseDomain),
        platformSettingsDomainApi.getEntry<string>(PLATFORM_CONFIG_KEYS.platformName),
        platformSettingsDomainApi.getEntry<string>(PLATFORM_CONFIG_KEYS.supportEmail),
        platformSettingsDomainApi.getEntry<string>(PLATFORM_CONFIG_KEYS.adminEmail),
        platformSettingsDomainApi.getEntry<number>(PLATFORM_CONFIG_KEYS.sessionTimeout),
        platformSettingsDomainApi.getEntry<number>(PLATFORM_CONFIG_KEYS.maxLoginAttempts),
        platformSettingsDomainApi.getEntry<number>(PLATFORM_CONFIG_KEYS.logRetention),
      ]);

      if (domainRes.success && domainRes.data?.value?.domain) {
        setSystemBaseDomain(domainRes.data.value.domain);
      }

      const loadedSettings: PlatformSettings = {
        platformName: platformNameRes.data?.value || 'TCRN TMS',
        supportEmail: supportEmailRes.data?.value || 'support@tcrn-tms.com',
        adminEmail: adminEmailRes.data?.value || 'admin@tcrn-tms.com',
        sessionTimeout: sessionTimeoutRes.data?.value || 30,
        maxLoginAttempts: maxLoginAttemptsRes.data?.value || 5,
        logRetention: logRetentionRes.data?.value || 90,
      };

      setSettings(loadedSettings);
      setOriginalSettings(loadedSettings);
    } catch {
      // keep defaults
    } finally {
      setIsLoading(false);
      setIsDomainLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const hasChanges = Boolean(
    originalSettings &&
      (
        settings.platformName !== originalSettings.platformName ||
        settings.supportEmail !== originalSettings.supportEmail ||
        settings.adminEmail !== originalSettings.adminEmail ||
        settings.sessionTimeout !== originalSettings.sessionTimeout ||
        settings.maxLoginAttempts !== originalSettings.maxLoginAttempts ||
        settings.logRetention !== originalSettings.logRetention
      ),
  );

  const handleSaveSettings = async () => {
    if (!originalSettings || !hasChanges) {
      return;
    }

    try {
      setIsSaving(true);
      const savePromises: Promise<unknown>[] = [];

      if (settings.platformName !== originalSettings.platformName) {
        savePromises.push(platformSettingsDomainApi.setEntry(PLATFORM_CONFIG_KEYS.platformName, settings.platformName));
      }
      if (settings.supportEmail !== originalSettings.supportEmail) {
        savePromises.push(platformSettingsDomainApi.setEntry(PLATFORM_CONFIG_KEYS.supportEmail, settings.supportEmail));
      }
      if (settings.adminEmail !== originalSettings.adminEmail) {
        savePromises.push(platformSettingsDomainApi.setEntry(PLATFORM_CONFIG_KEYS.adminEmail, settings.adminEmail));
      }
      if (settings.sessionTimeout !== originalSettings.sessionTimeout) {
        savePromises.push(platformSettingsDomainApi.setEntry(PLATFORM_CONFIG_KEYS.sessionTimeout, settings.sessionTimeout));
      }
      if (settings.maxLoginAttempts !== originalSettings.maxLoginAttempts) {
        savePromises.push(platformSettingsDomainApi.setEntry(PLATFORM_CONFIG_KEYS.maxLoginAttempts, settings.maxLoginAttempts));
      }
      if (settings.logRetention !== originalSettings.logRetention) {
        savePromises.push(platformSettingsDomainApi.setEntry(PLATFORM_CONFIG_KEYS.logRetention, settings.logRetention));
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

  const handleSaveDomain = async () => {
    if (!systemBaseDomain.trim()) {
      toast.error(t('domainRequired'));
      return;
    }

    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(systemBaseDomain.trim())) {
      toast.error(t('invalidDomain'));
      return;
    }

    try {
      setIsDomainSaving(true);
      await platformSettingsDomainApi.setEntry(PLATFORM_CONFIG_KEYS.baseDomain, {
        domain: systemBaseDomain.trim().toLowerCase(),
      });
      toast.success(tCommon('success'));
    } catch {
      toast.error(tCommon('error'));
    } finally {
      setIsDomainSaving(false);
    }
  };

  const updateSetting = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('description')}</p>
        </div>
        {activeTab !== 'dictionary' && activeTab !== 'email' ? (
          <Button onClick={handleSaveSettings} disabled={!hasChanges || isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {tCommon('saveChanges')}
          </Button>
        ) : null}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-xl grid-cols-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {t('details')}
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            {t('email')}
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {t('security')}
          </TabsTrigger>
          <TabsTrigger value="dictionary" className="flex items-center gap-2">
            <Book className="h-4 w-4" />
            {t('dictionary')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="border-border/70 bg-background/95">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  {t('general')}
                </CardTitle>
                <CardDescription>{t('generalDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {tCommon('loading')}
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>{t('platformName')}</Label>
                      <Input
                        value={settings.platformName}
                        onChange={(event) => updateSetting('platformName', event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('supportEmail')}</Label>
                      <Input
                        type="email"
                        value={settings.supportEmail}
                        onChange={(event) => updateSetting('supportEmail', event.target.value)}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-background/95">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  {t('notifications')}
                </CardTitle>
                <CardDescription>{t('notificationsDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {tCommon('loading')}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>{t('adminEmail')}</Label>
                    <Input
                      type="email"
                      value={settings.adminEmail}
                      onChange={(event) => updateSetting('adminEmail', event.target.value)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-background/95 lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5 text-primary" />
                  {t('domainSettings')}
                </CardTitle>
                <CardDescription>{t('domainSettingsDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('systemBaseDomain')}</Label>
                  {isDomainLoading ? (
                    <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {tCommon('loading')}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        value={systemBaseDomain}
                        onChange={(event) => setSystemBaseDomain(event.target.value)}
                        placeholder={tForms('placeholders.domain')}
                        className="max-w-sm"
                      />
                      <Button onClick={handleSaveDomain} disabled={isDomainSaving} size="sm">
                        {isDomainSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">{t('systemBaseDomainHint')}</p>
                  <div className="rounded-lg bg-muted p-3 text-sm">
                    <p className="mb-2 font-medium">{t('urlPreview')}</p>
                    <div className="space-y-1 font-mono text-xs text-muted-foreground">
                      <p>
                        {t('homepagePreview')}: <span className="text-foreground">{systemBaseDomain}/p/{'{talentCode}'}</span>
                      </p>
                      <p>
                        {t('marshmallowPreview')}: <span className="text-foreground">{systemBaseDomain}/m/{'{talentCode}'}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="email" className="mt-6">
          <EmailConfigPanel />
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="border-border/70 bg-background/95">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  {t('security')}
                </CardTitle>
                <CardDescription>{t('securityDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {tCommon('loading')}
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>{t('sessionTimeout')}</Label>
                      <Input
                        type="number"
                        min={5}
                        max={480}
                        value={settings.sessionTimeout}
                        onChange={(event) => updateSetting('sessionTimeout', parseInt(event.target.value, 10) || 30)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('maxLoginAttempts')}</Label>
                      <Input
                        type="number"
                        min={3}
                        max={20}
                        value={settings.maxLoginAttempts}
                        onChange={(event) => updateSetting('maxLoginAttempts', parseInt(event.target.value, 10) || 5)}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-background/95">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  {t('data')}
                </CardTitle>
                <CardDescription>{t('dataDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {tCommon('loading')}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>{t('logRetention')}</Label>
                    <Input
                      type="number"
                      min={7}
                      max={365}
                      value={settings.logRetention}
                      onChange={(event) => updateSetting('logRetention', parseInt(event.target.value, 10) || 90)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-6">
            <RateLimitStats />
          </div>
        </TabsContent>

        <TabsContent value="dictionary" className="mt-6">
          <SystemDictionary />
        </TabsContent>
      </Tabs>
    </div>
  );
}
