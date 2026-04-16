// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Building, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Button, StateView, TableShell } from '@/platform/ui';

export function AdminCustomersScreen() {
  const router = useRouter();
  const t = useTranslations('adminConsole.acCustomers');

  return (
    <TableShell
      title={t('title')}
      description={t('description')}
      icon={<Users className="h-5 w-5 text-primary" />}
      bodyClassName="pt-2"
    >
      <StateView
        state="empty"
        empty={{
          title: t('retiredTitle'),
          description: t('retiredDescription'),
        }}
        emptyIcon={<Building className="h-8 w-8 text-muted-foreground" aria-hidden="true" />}
        action={(
          <Button variant="outline" onClick={() => router.push('/admin/tenants')}>
            {t('openTenants')}
          </Button>
        )}
      />
    </TableShell>
  );
}
