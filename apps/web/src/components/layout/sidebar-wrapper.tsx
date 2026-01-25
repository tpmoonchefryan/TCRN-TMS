// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import React from 'react';

import { AdminSidebar } from './admin-sidebar';
import { BusinessSidebar } from './business-sidebar';
import { ManagementSidebar } from './management-sidebar';

import { useSidebarMode } from '@/hooks/use-ui-mode';

export function SidebarWrapper() {
  const { sidebarType } = useSidebarMode();

  switch (sidebarType) {
    case 'admin':
      return <AdminSidebar />;
    case 'business':
      return <BusinessSidebar />;
    case 'management':
    default:
      return <ManagementSidebar />;
  }
}
