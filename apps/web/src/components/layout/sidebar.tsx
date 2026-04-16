// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { ActionType } from '@tcrn/shared';
import {
    Building,
    Building2,
    ChevronDown,
    ChevronRight,
    LayoutDashboard,
    Loader2,
    PieChart,
    Settings,
    ShieldAlert,
    Sparkles,
    Users
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { buildSidebarTree, getSidebarHref, type SidebarTreeNode } from '@/components/layout/sidebar-tree';
import { usePermission } from '@/hooks/use-permission';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useTalentStore } from '@/stores/talent-store';

type TreeNodeProps = {
  node: SidebarTreeNode;
  level?: number;
};

const TreeNode = ({ node, level = 0 }: TreeNodeProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const pathname = usePathname();
  const hasChildren = node.children && node.children.length > 0;
  
  // Determine if active based on path
  const isActive = pathname.includes(node.id) || (node.type === 'tenant' && pathname === '/organization');

  const Icon = node.type === 'talent' ? Sparkles : (node.type === 'tenant' ? Building2 : Users);
  
  const href = getSidebarHref(node);

  return (
    <div className="select-none">
      <Link href={href}>
        <div 
          className={cn(
            "group flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 cursor-pointer mx-2",
            isActive 
              ? "bg-primary/10 text-primary" 
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
          )}
          style={{ paddingLeft: `${level * 12 + 12}px` }}
        >
          <div 
            className="flex items-center justify-center w-5 h-5 opacity-70 hover:opacity-100 transition-opacity"
            onClick={(e) => {
              if (hasChildren) {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(!isOpen);
              }
            }}
          >
             {hasChildren ? (
               isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
             ) : <span className="w-[14px]" />}
          </div>
          
          <Icon size={16} className={cn(node.type === 'talent' ? "text-pink-400" : "text-blue-400")} />
          
          <span className="truncate flex-1">{node.name}</span>
        </div>
      </Link>

      {hasChildren && isOpen && (
        <div className="animate-slide-up origin-top">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export function Sidebar() {
  const pathname = usePathname();
  const tNav = useTranslations('navigation');
  const tCommon = useTranslations('common');
  const tAdmin = useTranslations('adminConsole.sidebar');
  const { hasPermission } = usePermission();
  const { tenantCode, user, tenantId } = useAuthStore();
  const { organizationTree } = useTalentStore();
  const [isLoading] = useState(false);

  // Convert organizationTree to sidebar tree format
  const treeData = useMemo(
    () => buildSidebarTree(organizationTree, tenantId, tCommon('tenant')),
    [organizationTree, tenantId, tCommon],
  );

  // Check for AC Tenant Access
  const isAcAdmin = tenantCode === 'AC' || user?.email?.includes('admin');

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white/80 backdrop-blur-xl transition-transform dark:bg-slate-950/80 dark:border-slate-800 hidden md:block">
      <div className="flex h-16 items-center px-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 font-bold text-xl text-primary">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-pink-400 rounded-lg flex items-center justify-center text-white">
            T
          </div>
          <span>{tCommon('appName')}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1 p-4 h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar">
        <div className="mb-6">
          <h3 className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            {tNav('main')}
          </h3>
          <Link href="/dashboard" className={cn(
            "flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 mx-2",
            pathname === '/dashboard' 
              ? "bg-primary text-white shadow-lg shadow-primary/30" 
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          )}>
            <LayoutDashboard size={18} />
            {tNav('dashboard')}
          </Link>
          
          {hasPermission('customer.profile', ActionType.READ) && (
            <Link href="/dashboard/customers" className={cn(
               "flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 mx-2 mt-1",
               pathname.includes('/customers')
                 ? "bg-primary/10 text-primary" 
                 : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            )}>
              <Users size={18} />
              {tNav('customers')}
            </Link>
          )}
          
          {hasPermission('report.mfr', ActionType.READ) && (
            <Link href="/dashboard/reports" className={cn(
               "flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 mx-2 mt-1",
               pathname.includes('/reports')
                 ? "bg-primary/10 text-primary" 
                 : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            )}>
              <PieChart size={18} />
              {tNav('reports')}
            </Link>
          )}
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between px-4 mb-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {tNav('organization')}
            </h3>
            {isLoading && <Loader2 size={12} className="animate-spin text-primary" />}
          </div>
          
          {treeData.map(node => (
            <TreeNode key={node.id} node={node} />
          ))}
        </div>

        <div className="mt-auto">
          {/* AC Tenant Admin Section */}
          {isAcAdmin && (
            <div className="mb-6 animate-fade-in">
              <h3 className="px-4 text-xs font-semibold text-purple-600 uppercase tracking-wider mb-2">
                {tAdmin('platformAdmin')}
              </h3>
              <Link href="/dashboard/admin/tenants" className={cn(
                "flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 mx-2",
                pathname.includes('/admin/tenants')
                  ? "bg-purple-50 text-purple-700" 
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              )}>
                <Building size={18} />
                {tAdmin('tenants')}
              </Link>
              <Link href="/dashboard/admin/consumers" className={cn(
                "flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 mx-2",
                pathname.includes('/admin/consumers')
                  ? "bg-purple-50 text-purple-700" 
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              )}>
                <ShieldAlert size={18} />
                {tAdmin('apiConsumers')}
              </Link>
            </div>
          )}

          <h3 className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            {tAdmin('system')}
          </h3>

          <Link href="/dashboard/settings" className={cn(
            "flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 mx-2",
            pathname.includes('/settings')
              ? "bg-slate-100 text-slate-900" 
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          )}>
            <Settings size={18} />
            {tNav('settings')}
          </Link>

          {/* 
          Note: Logs & Audit pages are planned but not yet implemented.
          These links are commented out until the pages are created.
          
          <h3 className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4">
            Logs & Audit
          </h3>

          <Link href="/dashboard/logs/changes" className={cn(...)}>
            <History size={18} />
            Change Logs
          </Link>
          ...
          */}

        </div>
      </div>
    </aside>
  );
}
