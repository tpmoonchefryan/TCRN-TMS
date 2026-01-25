// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Bell, Book, Database, Globe, Link as LinkIcon, Loader2, Mail, Save, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { SystemDictionary } from '@/components/admin/system-dictionary';
import { EmailConfigPanel } from '@/components/settings/EmailConfigPanel';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { platformConfigApi } from '@/lib/api/client';

export default function PlatformSettingsPage() {
  const t = useTranslations('adminConsole.settings');
  const tCommon = useTranslations('common');
  const [activeTab, setActiveTab] = useState('general');
  
  // Domain settings state
  const [systemBaseDomain, setSystemBaseDomain] = useState('tcrn.app');
  const [isDomainLoading, setIsDomainLoading] = useState(true);
  const [isDomainSaving, setIsDomainSaving] = useState(false);

  // Load domain setting
  const loadDomainSetting = useCallback(async () => {
    try {
      setIsDomainLoading(true);
      const response = await platformConfigApi.get('system.baseDomain');
      if (response.success && response.data?.value) {
        const domainConfig = response.data.value as { domain?: string };
        if (domainConfig.domain) {
          setSystemBaseDomain(domainConfig.domain);
        }
      }
    } catch {
      // Use default if not found
    } finally {
      setIsDomainLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDomainSetting();
  }, [loadDomainSetting]);

  // Save domain setting
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
      await platformConfigApi.set('system.baseDomain', { domain: systemBaseDomain.trim().toLowerCase() });
      toast.success(tCommon('success'));
    } catch {
      toast.error(tCommon('error'));
    } finally {
      setIsDomainSaving(false);
    }
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
          <Button className="bg-purple-600 hover:bg-purple-700">
            <Save size={16} className="mr-2" />
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
                <div className="space-y-2">
                  <Label>Platform Name</Label>
                  <Input defaultValue="TCRN TMS" />
                </div>
                <div className="space-y-2">
                  <Label>Support Email</Label>
                  <Input defaultValue="support@tcrn-tms.com" />
                </div>
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
                <div className="space-y-2">
                  <Label>Admin Email</Label>
                  <Input defaultValue="admin@tcrn-tms.com" />
                </div>
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
                    <p className="font-medium mb-2">{t('subdomainPreview') || 'Subdomain Preview'}</p>
                    <div className="space-y-1 text-muted-foreground font-mono text-xs">
                      <p>Homepage: <span className="text-foreground">{'{talentCode}'}.p.{systemBaseDomain}</span></p>
                      <p>Marshmallow: <span className="text-foreground">{'{talentCode}'}.m.{systemBaseDomain}</span></p>
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
                <div className="space-y-2">
                  <Label>Session Timeout (minutes)</Label>
                  <Input type="number" defaultValue="30" />
                </div>
                <div className="space-y-2">
                  <Label>Max Login Attempts</Label>
                  <Input type="number" defaultValue="5" />
                </div>
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
                <div className="space-y-2">
                  <Label>Log Retention (days)</Label>
                  <Input type="number" defaultValue="90" />
                </div>
              </CardContent>
            </Card>
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
