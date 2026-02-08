// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { ChevronRight, LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Navigation item configuration
export interface NavItemConfig {
  href: string;
  icon: LucideIcon;
  label: string;
  badge?: string | number;
  external?: boolean;
}

// Navigation group configuration
export interface NavGroupConfig {
  title?: string;
  items: NavItemConfig[];
}

// Sidebar configuration
export interface SidebarConfig {
  logo: {
    icon: React.ReactNode;
    title: string;
    variant?: 'default' | 'admin';
  };
  groups: NavGroupConfig[];
  footer?: {
    items: NavItemConfig[];
  };
  headerContent?: React.ReactNode;
  variant?: 'default' | 'admin';
}

interface UnifiedSidebarProps {
  config: SidebarConfig;
  topOffset?: number;
}

function NavItem({ item, variant = 'default' }: { item: NavItemConfig; variant?: 'default' | 'admin' }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
  const Icon = item.icon;

  const baseClasses = 'flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 mx-2';
  const activeClasses = variant === 'admin'
    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
    : 'bg-primary text-white shadow-md shadow-primary/30';
  const inactiveClasses = 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800';

  const content = (
    <>
      <Icon size={18} />
      <span className="flex-1">{item.label}</span>
      {item.badge !== undefined && (
        <Badge variant="secondary" className="text-xs">
          {item.badge}
        </Badge>
      )}
      {item.external && <ChevronRight size={16} className="opacity-50" />}
    </>
  );

  if (item.external) {
    return (
      <button className={cn(baseClasses, inactiveClasses)}>
        {content}
      </button>
    );
  }

  return (
    <Link href={item.href} className={cn(baseClasses, isActive ? activeClasses : inactiveClasses)}>
      {content}
    </Link>
  );
}

function NavGroup({ group, variant }: { group: NavGroupConfig; variant?: 'default' | 'admin' }) {
  return (
    <div className="mb-4">
      {group.title && (
        <p className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {group.title}
        </p>
      )}
      <div className="flex flex-col gap-1">
        {group.items.map((item) => (
          <NavItem key={item.href} item={item} variant={variant} />
        ))}
      </div>
    </div>
  );
}

export function UnifiedSidebar({ config, topOffset = 0 }: UnifiedSidebarProps) {
  const variant = config.variant || 'default';
  const logoGradient = variant === 'admin'
    ? 'from-purple-400 to-pink-400'
    : 'from-blue-400 to-pink-400';

  return (
    <aside
      className="fixed left-0 z-40 w-64 border-r bg-white/80 backdrop-blur-xl transition-transform dark:bg-slate-950/80 dark:border-slate-800 hidden md:block"
      style={{
        top: topOffset,
        height: `calc(100vh - ${topOffset}px)`,
      }}
    >
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 font-bold text-xl text-primary">
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center text-white bg-gradient-to-br',
            logoGradient
          )}>
            {config.logo.icon}
          </div>
          <span>{config.logo.title}</span>
        </div>
      </div>

      <div className="flex flex-col h-[calc(100%-4rem)]">
        {/* Header Content (e.g., Talent Switcher) */}
        {config.headerContent && (
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            {config.headerContent}
          </div>
        )}

        {/* Navigation Groups */}
        <ScrollArea className="flex-1 p-4">
          {config.groups.map((group, index) => (
            <NavGroup key={index} group={group} variant={variant} />
          ))}
        </ScrollArea>

        {/* Footer Items */}
        {config.footer && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-1">
            {config.footer.items.map((item) => (
              <NavItem key={item.href} item={item} variant={variant} />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
