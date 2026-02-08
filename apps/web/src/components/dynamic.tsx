// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Dynamic imports for large components to optimize bundle size

'use client';

import dynamic from 'next/dynamic';

import { Skeleton } from '@/components/ui/skeleton';

// Loading fallback for dialogs
const DialogLoading = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div className="bg-background rounded-lg p-6 space-y-4 w-[400px]">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-24 w-full" />
      <div className="flex justify-end gap-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-20" />
      </div>
    </div>
  </div>
);

// Loading fallback for panels
const PanelLoading = () => (
  <div className="space-y-4 p-4">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-64 w-full" />
  </div>
);

/**
 * Dynamically imported large components
 * These are loaded on-demand to reduce initial bundle size
 */

// Settings Components (1196+ lines)
export const DynamicTalentSettingsContent = dynamic(
  () => import('@/components/settings/TalentSettingsContent').then((mod) => mod.TalentSettingsContent),
  {
    loading: PanelLoading,
    ssr: false,
  }
);

// Report Components (782+ lines)
export const DynamicMfrConfigDialog = dynamic(
  () => import('@/components/report/MfrConfigDialog').then((mod) => mod.MfrConfigDialog),
  {
    loading: DialogLoading,
    ssr: false,
  }
);

// Admin Components (711+ lines)
export const DynamicSystemDictionary = dynamic(
  () => import('@/components/admin/system-dictionary').then((mod) => mod.SystemDictionary),
  {
    loading: PanelLoading,
    ssr: false,
  }
);

// Marshmallow Config (659+ lines)
export const DynamicMarshmallowConfigDialog = dynamic(
  () => import('@/components/marshmallow/admin/MarshmallowConfigDialog').then((mod) => mod.MarshmallowConfigDialog),
  {
    loading: DialogLoading,
    ssr: false,
  }
);

// Membership Dialog (516+ lines)
export const DynamicMembershipDialog = dynamic(
  () => import('@/components/customer/MembershipDialog').then((mod) => mod.MembershipDialog),
  {
    loading: DialogLoading,
    ssr: false,
  }
);

// Homepage Editor Canvas (490+ lines)
export const DynamicHomepageCanvas = dynamic(
  () => import('@/components/homepage/editor/Canvas').then((mod) => mod.Canvas),
  {
    loading: PanelLoading,
    ssr: false,
  }
);

// Organization Tree (461+ lines)
export const DynamicOrganizationTree = dynamic(
  () => import('@/components/organization/organization-tree').then((mod) => mod.OrganizationTree),
  {
    loading: PanelLoading,
    ssr: false,
  }
);
