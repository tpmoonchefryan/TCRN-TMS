// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Webhook } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function WebhooksPage() {
  const t = useTranslations('navigation');

  return (
    <div className="container mx-auto py-6 px-4 lg:px-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Webhook className="h-6 w-6" />
            <div>
              <CardTitle>{t('webhooks')}</CardTitle>
              <CardDescription>
                Configure webhook endpoints for event notifications
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Webhook className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Coming Soon</h3>
            <p className="text-muted-foreground max-w-md">
              Webhook management is under development.
              You can currently manage webhooks in the tenant settings page.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
