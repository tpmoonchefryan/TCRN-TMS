'use client';

import { LayoutTemplate, Package2 } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { PublicPresenceAssetWorkspace } from '@/domains/config-dictionary-settings/components/PublicPresenceAssetWorkspace';
import {
  PublicPresenceBadge,
  PublicPresenceShell,
  PublicPresenceSurface,
} from '@/domains/public-presence';
import { getHomepageSurfaceLabel } from '@/domains/public-presence-studio/screens/public-presence-studio.copy';
import { buildTalentSettingsPath } from '@/platform/routing/workspace-paths';
import { useUiLocale } from '@/platform/runtime/locale/locale-provider';
import { pickLocaleText } from '@/platform/runtime/locale/locale-text';
import { useSession } from '@/platform/runtime/session/session-provider';

function SurfaceCommandLink({
  href,
  icon,
  label,
  tone = 'neutral',
}: Readonly<{
  href: string;
  icon: ReactNode;
  label: string;
  tone?: 'neutral' | 'primary';
}>) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
        tone === 'primary'
          ? 'border-rose-200 bg-white text-rose-700 hover:border-rose-300 hover:bg-rose-50'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

function CompatibilityTopbar({
  body,
  family,
  href,
  icon,
}: Readonly<{
  body: string;
  family: 'components' | 'templates';
  href: string;
  icon: ReactNode;
}>) {
  const { locale } = useUiLocale();

  return (
    <PublicPresenceSurface
      className="sticky top-4 z-20 px-4 py-3"
      data-testid={family === 'templates' ? 'template-center-topbar' : 'component-store-topbar'}
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="flex min-w-0 flex-wrap items-center gap-2 lg:flex-nowrap">
          <PublicPresenceBadge icon={icon} tone="rose">
            {getHomepageSurfaceLabel(locale, family)}
          </PublicPresenceBadge>
          <p className="min-w-0 text-sm font-medium text-slate-600 lg:flex-1">{body}</p>
        </div>
        <SurfaceCommandLink
          href={href}
          icon={icon}
          label={pickLocaleText(locale, {
            en: 'Open asset workspace',
            zh_HANS: '打开资产工作面',
            zh_HANT: '打開資產工作面',
            ja: '資産ワークスペースを開く',
            ko: '자산 워크스페이스 열기',
            fr: 'Ouvrir le workspace asset',
          })}
          tone="primary"
        />
      </div>
    </PublicPresenceSurface>
  );
}

export function LegacyTemplateCenterCompatibilityScreen({
  talentId,
  tenantId,
}: Readonly<{
  talentId: string;
  tenantId: string;
}>) {
  const { locale } = useUiLocale();
  const { request } = useSession();

  return (
    <PublicPresenceShell decorationDensity="calm">
      <div className="space-y-4">
        <CompatibilityTopbar
          body={pickLocaleText(locale, {
            en: 'Registered homepage template assets now live in the scoped asset workspace for this talent.',
            zh_HANS: '当前艺人范围已注册的主页模板资产，现在统一在该范围的资产工作面中维护。',
            zh_HANT: '目前藝人範圍已註冊的主頁模板資產，現在統一在該範圍的資產工作面中維護。',
            ja: 'このタレント範囲で登録されたホームページテンプレート資産は、現在このスコープの資産ワークスペースで管理します。',
            ko: '이 아티스트 범위에 등록된 홈페이지 템플릿 자산은 이제 이 범위의 자산 워크스페이스에서 관리합니다.',
            fr: 'Les assets template homepage enregistres pour ce talent sont desormais geres dans le workspace asset de cette portee.',
          })}
          family="templates"
          href={buildTalentSettingsPath(tenantId, talentId, { section: 'config-entities' })}
          icon={<LayoutTemplate className="h-4 w-4" aria-hidden="true" />}
        />
        <PublicPresenceAssetWorkspace
          families={['template']}
          locale={locale}
          request={request}
          scopeId={talentId}
          scopeType="talent"
          tenantId={tenantId}
        />
      </div>
    </PublicPresenceShell>
  );
}

export function LegacyComponentStoreCompatibilityScreen({
  talentId,
  tenantId,
}: Readonly<{
  talentId: string;
  tenantId: string;
}>) {
  const { locale } = useUiLocale();
  const { request } = useSession();

  return (
    <PublicPresenceShell decorationDensity="calm">
      <div className="space-y-4">
        <CompatibilityTopbar
          body={pickLocaleText(locale, {
            en: 'Registered homepage component assets now live in the scoped asset workspace for this talent.',
            zh_HANS: '当前艺人范围已注册的主页组件资产，现在统一在该范围的资产工作面中维护。',
            zh_HANT: '目前藝人範圍已註冊的主頁元件資產，現在統一在該範圍的資產工作面中維護。',
            ja: 'このタレント範囲で登録されたホームページコンポーネント資産は、現在このスコープの資産ワークスペースで管理します。',
            ko: '이 아티스트 범위에 등록된 홈페이지 컴포넌트 자산은 이제 이 범위의 자산 워크스페이스에서 관리합니다.',
            fr: 'Les assets composant homepage enregistres pour ce talent sont desormais geres dans le workspace asset de cette portee.',
          })}
          family="components"
          href={buildTalentSettingsPath(tenantId, talentId, { section: 'config-entities' })}
          icon={<Package2 className="h-4 w-4" aria-hidden="true" />}
        />
        <PublicPresenceAssetWorkspace
          families={['component']}
          locale={locale}
          request={request}
          scopeId={talentId}
          scopeType="talent"
          tenantId={tenantId}
        />
      </div>
    </PublicPresenceShell>
  );
}
