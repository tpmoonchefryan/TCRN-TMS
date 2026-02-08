// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Activity, History, Network, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

const logTabs = [
  { href: '/admin/logs/changes', label: 'Change Logs', icon: History },
  { href: '/admin/logs/events', label: 'System Events', icon: Activity },
  { href: '/admin/logs/integrations', label: 'Integration Logs', icon: Network },
  { href: '/admin/logs/search', label: 'Log Explorer', icon: Search },
];

export default function LogsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations('adminConsole');
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('logs.title') || 'Logs & Audit'}</h1>
        <p className="text-muted-foreground mt-1">
          {t('logs.description') || 'View system logs, change history, and audit trails'}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="-mb-px flex space-x-8">
          {logTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex items-center gap-2 py-3 px-1 text-sm font-medium border-b-2 transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div>{children}</div>
    </div>
  );
}
