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
import { emailConfigApi } from '@/lib/api/client';

type EmailProvider = 'tencent_ses' | 'smtp';

interface TencentSesConfig {
  secretId: string;
  secretKey: string;
  region: string;
  fromAddress: string;
  fromName: string;
  replyTo?: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromAddress: string;
  fromName: string;
}

interface EmailConfig {
  provider: EmailProvider;
  tencentSes?: TencentSesConfig;
  smtp?: SmtpConfig;
  isConfigured: boolean;
  lastUpdated?: string;
}

const TENCENT_SES_REGIONS = [
  { value: 'ap-hongkong', label: 'Hong Kong (ap-hongkong)' },
  { value: 'ap-singapore', label: 'Singapore (ap-singapore)' },
  { value: 'ap-guangzhou', label: 'Guangzhou (ap-guangzhou)' },
  { value: 'ap-shanghai', label: 'Shanghai (ap-shanghai)' },
  { value: 'ap-beijing', label: 'Beijing (ap-beijing)' },
];

export function EmailConfigPanel() {
  const t = useTranslations('emailConfig');
  const tCommon = useTranslations('common');

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
  const [sesFromName, setSesFromName] = useState('TCRN TMS');
  const [sesReplyTo, setSesReplyTo] = useState('');

  // SMTP fields
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(465);
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpFromAddress, setSmtpFromAddress] = useState('');
  const [smtpFromName, setSmtpFromName] = useState('TCRN TMS');

  // Test email
  const [testEmail, setTestEmail] = useState('');

  // Load configuration
  const loadConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await emailConfigApi.get();
      if (response.success && response.data) {
        const config = response.data as EmailConfig;
        setProvider(config.provider || 'tencent_ses');
        setIsConfigured(config.isConfigured);
        setLastUpdated(config.lastUpdated);

        if (config.tencentSes) {
          setSesSecretId(config.tencentSes.secretId || '');
          setSesSecretKey(config.tencentSes.secretKey || '');
          setSesRegion(config.tencentSes.region || 'ap-hongkong');
          setSesFromAddress(config.tencentSes.fromAddress || '');
          setSesFromName(config.tencentSes.fromName || 'TCRN TMS');
          setSesReplyTo(config.tencentSes.replyTo || '');
        }

        if (config.smtp) {
          setSmtpHost(config.smtp.host || '');
          setSmtpPort(config.smtp.port || 465);
          setSmtpSecure(config.smtp.secure ?? true);
          setSmtpUsername(config.smtp.username || '');
          setSmtpPassword(config.smtp.password || '');
          setSmtpFromAddress(config.smtp.fromAddress || '');
          setSmtpFromName(config.smtp.fromName || 'TCRN TMS');
        }
      }
    } catch {
      toast.error(t('loadError') || 'Failed to load email configuration');
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Save configuration
  const handleSave = async () => {
    try {
      setIsSaving(true);

      const config: {
        provider: EmailProvider;
        tencentSes?: TencentSesConfig;
        smtp?: SmtpConfig;
      } = {
        provider,
      };

      if (provider === 'tencent_ses') {
        if (!sesSecretId || !sesSecretKey || !sesFromAddress) {
          toast.error(t('sesRequired') || 'Please fill in all required SES fields');
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
          toast.error(t('smtpRequired') || 'Please fill in all required SMTP fields');
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
        toast.success(t('saveSuccess') || 'Email configuration saved');
      } else {
        throw new Error('Save failed');
      }
    } catch {
      toast.error(t('saveError') || 'Failed to save email configuration');
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
        const result = response.data as { success: boolean; message: string; error?: string };
        if (result.success) {
          toast.success(result.message || t('connectionSuccess') || 'Connection successful');
        } else {
          toast.error(result.error || result.message || t('connectionFailed') || 'Connection failed');
        }
      }
    } catch {
      toast.error(t('connectionError') || 'Failed to test connection');
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Send test email
  const handleSendTestEmail = async () => {
    if (!testEmail) {
      toast.error(t('enterTestEmail') || 'Please enter a test email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      toast.error(t('invalidEmail') || 'Invalid email address');
      return;
    }

    try {
      setIsTesting(true);
      const response = await emailConfigApi.test(testEmail);
      if (response.success && response.data) {
        const result = response.data as { success: boolean; message: string; error?: string };
        if (result.success) {
          toast.success(result.message || t('testSuccess') || 'Test email sent');
        } else {
          toast.error(result.error || result.message || t('testFailed') || 'Failed to send test email');
        }
      }
    } catch {
      toast.error(t('testError') || 'Failed to send test email');
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
              <CardTitle>{t('title') || 'Email Configuration'}</CardTitle>
            </div>
            {isConfigured ? (
              <Badge variant="outline" className="border-green-500 text-green-600">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                {t('configured') || 'Configured'}
              </Badge>
            ) : (
              <Badge variant="outline" className="border-orange-500 text-orange-600">
                <AlertCircle className="mr-1 h-3 w-3" />
                {t('notConfigured') || 'Not Configured'}
              </Badge>
            )}
          </div>
          <CardDescription>
            {t('description') || 'Configure email sending service for system notifications and business emails.'}
          </CardDescription>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-2">
              {t('lastUpdated') || 'Last updated'}: {new Date(lastUpdated).toLocaleString()}
            </p>
          )}
        </CardHeader>
      </Card>

      {/* Provider Selection */}
      <Card className="border-white/50 bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">{t('provider') || 'Email Provider'}</CardTitle>
          <CardDescription>
            {t('providerDesc') || 'Select your email sending method.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={provider} onValueChange={(v) => setProvider(v as EmailProvider)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tencent_ses" className="flex items-center gap-2">
                <Cloud className="h-4 w-4" />
                {t('tencentSes') || 'Tencent Cloud SES'}
              </TabsTrigger>
              <TabsTrigger value="smtp" className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                {t('smtp') || 'SMTP'}
              </TabsTrigger>
            </TabsList>

            {/* Tencent SES Configuration */}
            <TabsContent value="tencent_ses" className="mt-6 space-y-4">
              <Alert>
                <Cloud className="h-4 w-4" />
                <AlertTitle>{t('sesInfo') || 'Tencent Cloud SES'}</AlertTitle>
                <AlertDescription>
                  {t('sesInfoDesc') || 'Use Tencent Cloud Simple Email Service API for reliable email delivery.'}
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="secretId">{t('secretId') || 'Secret ID'} *</Label>
                  <Input
                    id="secretId"
                    type="password"
                    value={sesSecretId}
                    onChange={(e) => setSesSecretId(e.target.value)}
                    placeholder="Enter your Secret ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secretKey">{t('secretKey') || 'Secret Key'} *</Label>
                  <Input
                    id="secretKey"
                    type="password"
                    value={sesSecretKey}
                    onChange={(e) => setSesSecretKey(e.target.value)}
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">{t('region') || 'Region'}</Label>
                  <Select value={sesRegion} onValueChange={setSesRegion}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TENCENT_SES_REGIONS.map((region) => (
                        <SelectItem key={region.value} value={region.value}>
                          {region.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sesFromAddress">{t('fromAddress') || 'From Address'} *</Label>
                  <Input
                    id="sesFromAddress"
                    type="email"
                    value={sesFromAddress}
                    onChange={(e) => setSesFromAddress(e.target.value)}
                    placeholder="noreply@yourdomain.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sesFromName">{t('fromName') || 'From Name'}</Label>
                  <Input
                    id="sesFromName"
                    value={sesFromName}
                    onChange={(e) => setSesFromName(e.target.value)}
                    placeholder="TCRN TMS"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sesReplyTo">{t('replyTo') || 'Reply-To Address'}</Label>
                  <Input
                    id="sesReplyTo"
                    type="email"
                    value={sesReplyTo}
                    onChange={(e) => setSesReplyTo(e.target.value)}
                    placeholder="support@yourdomain.com"
                  />
                </div>
              </div>
            </TabsContent>

            {/* SMTP Configuration */}
            <TabsContent value="smtp" className="mt-6 space-y-4">
              <Alert>
                <Server className="h-4 w-4" />
                <AlertTitle>{t('smtpInfo') || 'SMTP'}</AlertTitle>
                <AlertDescription>
                  {t('smtpInfoDesc') || 'Connect to any SMTP server to send emails.'}
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">{t('smtpHost') || 'SMTP Server'} *</Label>
                  <Input
                    id="smtpHost"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">{t('smtpPort') || 'Port'}</Label>
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
                  <Label htmlFor="smtpSecure">{t('smtpSecure') || 'Use SSL/TLS'}</Label>
                </div>
                <div />
                <div className="space-y-2">
                  <Label htmlFor="smtpUsername">{t('smtpUsername') || 'Username'} *</Label>
                  <Input
                    id="smtpUsername"
                    value={smtpUsername}
                    onChange={(e) => setSmtpUsername(e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPassword">{t('smtpPassword') || 'Password'} *</Label>
                  <Input
                    id="smtpPassword"
                    type="password"
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpFromAddress">{t('fromAddress') || 'From Address'} *</Label>
                  <Input
                    id="smtpFromAddress"
                    type="email"
                    value={smtpFromAddress}
                    onChange={(e) => setSmtpFromAddress(e.target.value)}
                    placeholder="noreply@yourdomain.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpFromName">{t('fromName') || 'From Name'}</Label>
                  <Input
                    id="smtpFromName"
                    value={smtpFromName}
                    onChange={(e) => setSmtpFromName(e.target.value)}
                    placeholder="TCRN TMS"
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
          <CardTitle className="text-base">{t('testEmail') || 'Test Email'}</CardTitle>
          <CardDescription>
            {t('testEmailDesc') || 'Send a test email to verify your configuration.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
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
              {t('testConnection') || 'Test Connection'}
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
              {t('sendTestEmail') || 'Send Test Email'}
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
          {tCommon('saveChanges') || 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
