// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import {
    AlertCircle,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Copy,
    ExternalLink,
    HelpCircle,
    Loader2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface DnsSetupGuideProps {
  domain: string;
  verificationToken: string;
  isVerified: boolean;
  isVerifying: boolean;
  onVerify: () => void;
  targetCname?: string;
}

export function DnsSetupGuide({
  domain,
  verificationToken,
  isVerified,
  isVerifying,
  onVerify,
  targetCname = 'proxy.tcrn.app',
}: DnsSetupGuideProps) {
  const t = useTranslations('talentSettings.dnsSetupGuide');
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('copySuccess'));
  };

  // Parse domain to get subdomain part for TXT record
  const getTxtRecordName = () => {
    return `_tcrn-verification.${domain}`;
  };

  const txtValue = `tcrn-verify=${verificationToken}`;

  // DNS Provider links
  const providerLinks = [
    { name: t('cloudflare'), url: 'https://dash.cloudflare.com/' },
    { name: t('alicloud'), url: 'https://dns.console.aliyun.com/' },
    { name: t('tencentCloud'), url: 'https://console.cloud.tencent.com/cns' },
    { name: t('godaddy'), url: 'https://dcc.godaddy.com/domains/' },
  ];

  if (isVerified) {
    return (
      <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800 dark:text-green-200">
          {t('verificationSuccess')}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">{t('title')}</h3>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>

      {/* Step 1: CNAME Record */}
      <div className="rounded-lg border bg-slate-50 dark:bg-slate-900 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
            1
          </div>
          <div>
            <h4 className="font-medium">{t('step1Title')}</h4>
            <p className="text-sm text-muted-foreground">{t('step1Desc')}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="font-medium text-muted-foreground">{t('cnameHost')}</div>
          <div className="col-span-2 flex items-center gap-2">
            <code className="flex-1 rounded bg-slate-200 dark:bg-slate-800 px-2 py-1 font-mono text-xs">
              {domain}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => copyToClipboard(domain)}
            >
              <Copy size={14} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="font-medium text-muted-foreground">{t('cnameValue')}</div>
          <div className="col-span-2 flex items-center gap-2">
            <code className="flex-1 rounded bg-slate-200 dark:bg-slate-800 px-2 py-1 font-mono text-xs">
              {targetCname}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => copyToClipboard(targetCname)}
            >
              <Copy size={14} />
            </Button>
          </div>
        </div>
      </div>

      {/* Step 2: TXT Record */}
      <div className="rounded-lg border bg-slate-50 dark:bg-slate-900 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
            2
          </div>
          <div>
            <h4 className="font-medium">{t('step2Title')}</h4>
            <p className="text-sm text-muted-foreground">{t('step2Desc')}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="font-medium text-muted-foreground">{t('txtHost')}</div>
          <div className="col-span-2 flex items-center gap-2">
            <code className="flex-1 rounded bg-slate-200 dark:bg-slate-800 px-2 py-1 font-mono text-xs truncate">
              {getTxtRecordName()}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => copyToClipboard(getTxtRecordName())}
            >
              <Copy size={14} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="font-medium text-muted-foreground">{t('txtValue')}</div>
          <div className="col-span-2 flex items-center gap-2">
            <code className="flex-1 rounded bg-slate-200 dark:bg-slate-800 px-2 py-1 font-mono text-xs truncate">
              {txtValue}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => copyToClipboard(txtValue)}
            >
              <Copy size={14} />
            </Button>
          </div>
        </div>
      </div>

      {/* Propagation Note */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          {t('propagationNote')}
        </AlertDescription>
      </Alert>

      {/* Common DNS Providers */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">{t('commonProviders')}</p>
        <div className="flex flex-wrap gap-2">
          {providerLinks.map((provider) => (
            <a
              key={provider.name}
              href={provider.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {provider.name}
              <ExternalLink size={10} />
            </a>
          ))}
        </div>
      </div>

      {/* Verification Status & Button */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{t('verificationStatus')}:</span>
          <Badge variant="outline" className="border-amber-200 text-amber-600">
            {t('notVerified')}
          </Badge>
        </div>
        <Button onClick={onVerify} disabled={isVerifying}>
          {isVerifying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('verifying')}
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              {t('verifyNow')}
            </>
          )}
        </Button>
      </div>

      {/* Troubleshooting */}
      <Collapsible open={showTroubleshooting} onOpenChange={setShowTroubleshooting}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <HelpCircle size={16} />
              {t('troubleshooting')}
            </span>
            {showTroubleshooting ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 rounded-lg border bg-slate-50 dark:bg-slate-900 p-4">
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            {(t.raw('troubleshootingTips') as string[]).map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
