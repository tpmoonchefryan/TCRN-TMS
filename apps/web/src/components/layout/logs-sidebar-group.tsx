// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import {
    Activity,
    History,
    Network,
    Search
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Link, usePathname } from '@/navigation';

export function LogsSidebarGroup() {
  const t = useTranslations('logsSidebar');
  const pathname = usePathname();
  const isActive = (path: string) => pathname?.startsWith(path);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t('title')}</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={isActive('/admin/logs/changes')}>
            <Link href="/admin/logs/changes">
              <History />
              <span>{t('changeLogs')}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={isActive('/admin/logs/events')}>
            <Link href="/admin/logs/events">
              <Activity />
              <span>{t('systemEvents')}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={isActive('/admin/logs/integrations')}>
            <Link href="/admin/logs/integrations">
              <Network />
              <span>{t('integrationLogs')}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={isActive('/admin/logs/search')}>
            <Link href="/admin/logs/search">
              <Search />
              <span>{t('logExplorer')}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
