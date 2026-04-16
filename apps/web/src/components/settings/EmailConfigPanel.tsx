// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { AlertCircle, CheckCircle2, Cloud, Loader2, Mail, Save, Send, Server } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  emailConfigApi,
  type EmailConfigResponse,
  type EmailTestResult,
  type SaveEmailConfigPayload,
} from '@/lib/api/modules/configuration';

type EmailProvider = EmailConfigResponse['provider'];

function isEmailProvider(value: string): value is EmailProvider {
  return value === 'tencent_ses' || value === 'smtp';
}

export function EmailConfigPanel() {
  const t = useTranslations('emailConfig');
  const tCommon = useTranslations('common');
  const sesRegions = [
    { value: 'ap-hongkong', label: t('regions.apHongkong') },
    { value: 'ap-singapore', label: t('regions.apSingapore') },
    { value: 'ap-guangzhou', label: t('regions.apGuangzhou') },
    { value: 'ap-shanghai', label: t('regions.apShanghai') },
    { value: 'ap-beijing', label: t('regions.apBeijing') },
  ] as const;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const [provider, setProvider] = useState<EmailProvider>('tencent_ses');
  const [isConfigured, setIsConfigured] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | undefined>();

  // Tencent SES fields
  const [sesSecretId, setSesSecretId] = useState('');
  const [sesSecretKey, setSesSecretKey] = useState('');
  const [sesRegion, setSesRegion] = useState('ap-hongkong');
  const [sesFromAddress, setSesFromAddress] = useState('');
  const [sesFromName, setSesFromName] = useState(tCommon('appName'));
  const [sesReplyTo, setSesReplyTo] = useState('');

  // SMTP fields
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(465);
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpFromAddress, setSmtpFromAddress] = useState('');
  const [smtpFromName, setSmtpFromName] = useState(tCommon('appName'));

  // Test email
  const [testEmail, setTestEmail] = useState('');

  // Load configuration
  const loadConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await emailConfigApi.get();
      if (response.success && response.data) {
        const config = response.data;
        setProvider(config.provider || 'tencent_ses');
        setIsConfigured(config.isConfigured);
        setLastUpdated(config.lastUpdated);

        if (config.tencentSes) {
          setSesSecretId(config.tencentSes.secretId || '');
          setSesSecretKey(config.tencentSes.secretKey || '');
          setSesRegion(config.tencentSes.region || 'ap-hongkong');
          setSesFromAddress(config.tencentSes.fromAddress || '');
          setSesFromName(config.tencentSes.fromName || tCommon('appName'));
          setSesReplyTo(config.tencentSes.replyTo || '');
        }

        if (config.smtp) {
          setSmtpHost(config.smtp.host || '');
          setSmtpPort(config.smtp.port || 465);
          setSmtpSecure(config.smtp.secure ?? true);
          setSmtpUsername(config.smtp.username || '');
          setSmtpPassword(config.smtp.password || '');
          setSmtpFromAddress(config.smtp.fromAddress || '');
          setSmtpFromName(config.smtp.fromName || tCommon('appName'));
        }
      }
    } catch {
      toast.error(t('loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [t, tCommon]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Save configuration
  const handleSave = async () => {
    try {
      setIsSaving(true);

      const config: SaveEmailConfigPayload = {
        provider,
      };

      if (provider === 'tencent_ses') {
        if (!sesSecretId || !sesSecretKey || !sesFromAddress) {
          toast.error(t('sesRequired'));
          return;
        }
        config.tencentSes = {
          secretId: sesSecretId,
          secretKey: sesSecretKey,
          region: sesRegion,
          fromAddress: sesFromAddress,
          fromName: sesFromName,
          replyTo: sesReplyTo || undefined,
        };
      } else {
        if (!smtpHost || !smtpUsername || !smtpPassword || !smtpFromAddress) {
          toast.error(t('smtpRequired'));
          return;
        }
        config.smtp = {
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          username: smtpUsername,
          password: smtpPassword,
          fromAddress: smtpFromAddress,
          fromName: smtpFromName,
        };
      }

      const response = await emailConfigApi.save(config);
      if (response.success) {
        setIsConfigured(true);
        setLastUpdated(new Date().toISOString());
        toast.success(t('saveSuccess'));
      } else {
        throw new Error('Save failed');
      }
    } catch {
      toast.error(t('saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  // Test connection
  const handleTestConnection = async () => {
    try {
      setIsTestingConnection(true);
      const response = await emailConfigApi.testConnection();
      if (response.success && response.data) {
        const result: EmailTestResult = response.data;
        if (result.success) {
          toast.success(result.message || t('connectionSuccess'));
        } else {
          toast.error(result.error || result.message || t('connectionFailed'));
        }
      }
    } catch {
      toast.error(t('connectionError'));
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Send test email
  const handleSendTestEmail = async () => {
    if (!testEmail) {
      toast.error(t('enterTestEmail'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      toast.error(t('invalidEmail'));
      return;
    }

    try {
      setIsTesting(true);
      const response = await emailConfigApi.test(testEmail);
      if (response.success && response.data) {
        const result: EmailTestResult = response.data;
        if (result.success) {
          toast.success(result.message || t('testSuccess'));
        } else {
          toast.error(result.error || result.message || t('testFailed'));
        }
      }
    } catch {
      toast.error(t('testError'));
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status */}
      <Card className="border-white/50 bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-purple-600" />
              <CardTitle>{t('title')}</CardTitle>
            </div>
            {isConfigured ? (
              <Badge variant="outline" className="border-green-500 text-green-600">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                {t('configured')}
              </Badge>
            ) : (
              <Badge variant="outline" className="border-orange-500 text-orange-600">
                <AlertCircle className="mr-1 h-3 w-3" />
                {t('notConfigured')}
              </Badge>
            )}
          </div>
          <CardDescription>
            {t('description')}
          </CardDescription>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-2">
              {t('lastUpdated')}: {new Date(lastUpdated).toLocaleString()}
            </p>
          )}
        </CardHeader>
      </Card>

      {/* Provider Selection */}
      <Card className="border-white/50 bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">{t('provider')}</CardTitle>
          <CardDescription>
            {t('providerDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={provider}
            onValueChange={(value) => {
              if (isEmailProvider(value)) {
                setProvider(value);
              }
            }}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tencent_ses" className="flex items-center gap-2">
                <Cloud className="h-4 w-4" />
                {t('tencentSes')}
              </TabsTrigger>
              <TabsTrigger value="smtp" className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                {t('smtp')}
              </TabsTrigger>
            </TabsList>

            {/* Tencent SES Configuration */}
            <TabsContent value="tencent_ses" className="mt-6 space-y-4">
              <Alert>
                <Cloud className="h-4 w-4" />
                <AlertTitle>{t('sesInfo')}</AlertTitle>
                <AlertDescription>
                  {t('sesInfoDesc')}
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="secretId">{t('secretId')} *</Label>
                  <Input
                    id="secretId"
                    type="password"
                    value={sesSecretId}
                    onChange={(e) => setSesSecretId(e.target.value)}
                    placeholder={t('secretIdPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secretKey">{t('secretKey')} *</Label>
                  <Input
                    id="secretKey"
                    type="password"
                    value={sesSecretKey}
                    onChange={(e) => setSesSecretKey(e.target.value)}
                    placeholder={t('secretKeyPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">{t('region')}</Label>
                  <Select value={sesRegion} onValueChange={setSesRegion}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sesRegions.map((region) => (
                        <SelectItem key={region.value} value={region.value}>
                          {region.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sesFromAddress">{t('fromAddress')} *</Label>
                  <Input
                    id="sesFromAddress"
                    type="email"
                    value={sesFromAddress}
                    onChange={(e) => setSesFromAddress(e.target.value)}
                    placeholder={t('fromAddressPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sesFromName">{t('fromName')}</Label>
                  <Input
                    id="sesFromName"
                    value={sesFromName}
                    onChange={(e) => setSesFromName(e.target.value)}
                    placeholder={t('fromNamePlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sesReplyTo">{t('replyTo')}</Label>
                  <Input
                    id="sesReplyTo"
                    type="email"
                    value={sesReplyTo}
                    onChange={(e) => setSesReplyTo(e.target.value)}
                    placeholder={t('replyToPlaceholder')}
                  />
                </div>
              </div>
            </TabsContent>

            {/* SMTP Configuration */}
            <TabsContent value="smtp" className="mt-6 space-y-4">
              <Alert>
                <Server className="h-4 w-4" />
                <AlertTitle>{t('smtpInfo')}</AlertTitle>
                <AlertDescription>
                  {t('smtpInfoDesc')}
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">{t('smtpHost')} *</Label>
                  <Input
                    id="smtpHost"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder={t('smtpHostPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">{t('smtpPort')}</Label>
                  <Input
                    id="smtpPort"
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(parseInt(e.target.value) || 465)}
                    placeholder="465"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="smtpSecure"
                    checked={smtpSecure}
                    onCheckedChange={setSmtpSecure}
                  />
                  <Label htmlFor="smtpSecure">{t('smtpSecure')}</Label>
                </div>
                <div />
                <div className="space-y-2">
                  <Label htmlFor="smtpUsername">{t('smtpUsername')} *</Label>
                  <Input
                    id="smtpUsername"
                    value={smtpUsername}
                    onChange={(e) => setSmtpUsername(e.target.value)}
                    placeholder={t('smtpUsernamePlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPassword">{t('smtpPassword')} *</Label>
                  <Input
                    id="smtpPassword"
                    type="password"
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpFromAddress">{t('fromAddress')} *</Label>
                  <Input
                    id="smtpFromAddress"
                    type="email"
                    value={smtpFromAddress}
                    onChange={(e) => setSmtpFromAddress(e.target.value)}
                    placeholder={t('fromAddressPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpFromName">{t('fromName')}</Label>
                  <Input
                    id="smtpFromName"
                    value={smtpFromName}
                    onChange={(e) => setSmtpFromName(e.target.value)}
                    placeholder={t('fromNamePlaceholder')}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Test Email */}
      <Card className="border-white/50 bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">{t('testEmail')}</CardTitle>
          <CardDescription>
            {t('testEmailDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder={t('testEmailPlaceholder')}
              className="max-w-sm"
            />
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTestingConnection || !isConfigured}
            >
              {isTestingConnection ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Server className="mr-2 h-4 w-4" />
              )}
              {t('testConnection')}
            </Button>
            <Button
              variant="outline"
              onClick={handleSendTestEmail}
              disabled={isTesting || !isConfigured}
            >
              {isTesting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {t('sendTestEmail')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="bg-purple-600 hover:bg-purple-700">
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {tCommon('saveChanges')}
        </Button>
      </div>
    </div>
  );
}
