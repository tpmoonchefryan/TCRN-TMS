'use client';

import { Eye, LayoutTemplate, Package2 } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { PublicPresenceAssetWorkspace } from '@/domains/config-dictionary-settings/components/PublicPresenceAssetWorkspace';
import {
  PublicPresenceBadge,
  PublicPresenceShell,
  PublicPresenceSurface,
} from '@/domains/public-presence';
import { getHomepageSurfaceLabel } from '@/domains/public-presence-studio/screens/public-presence-studio.copy';
import {
  buildPublicPresenceStudioEditorPath,
  buildTalentSettingsPath,
} from '@/platform/routing/workspace-paths';
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

function CatalogCompatibilityNotice({
  href,
  kind,
}: Readonly<{
  href: string;
  kind: 'component' | 'template';
}>) {
  const { locale } = useUiLocale();
  const heading =
    kind === 'template'
	      ? pickLocaleText(locale, {
	          en: 'Template asset records now open as a compatibility stop, not a homepage tab.',
	          zh_HANS: '模板中心现在是兼容入口，不再是主页一级标签。',
	          zh_HANT: '模板中心現在是相容入口，不再是主頁一級標籤。',
	          ja: 'テンプレート資産レコードは互換用の入口であり、ホームページの第一タブではありません。',
	          ko: '템플릿 자산 레코드는 호환용 진입점이며 더 이상 홈페이지 1차 탭이 아닙니다.',
	          fr: 'Le centre de templates est désormais un point de compatibilité, plus un onglet homepage.',
	        })
	      : pickLocaleText(locale, {
	          en: 'Component asset records now open as a compatibility stop, not a homepage tab.',
	          zh_HANS: '组件中心现在是兼容入口，不再是主页一级标签。',
	          zh_HANT: '元件中心現在是相容入口，不再是主頁一級標籤。',
	          ja: 'コンポーネント資産レコードは互換用の入口であり、ホームページの第一タブではありません。',
	          ko: '컴포넌트 자산 레코드는 호환용 진입점이며 더 이상 홈페이지 1차 탭이 아닙니다.',
	          fr: 'Le store de composants est désormais un point de compatibilité, plus un onglet homepage.',
	        });
  const body =
    kind === 'template'
      ? pickLocaleText(locale, {
          en: 'Use Homepage Management for everyday routing and release work, then open Template IDE only when you need focused asset authoring.',
          zh_HANS: '日常路由与发布工作请使用主页管理；只有在需要聚焦资产创作时再进入模板 IDE。',
          zh_HANT: '日常路由與發佈工作請使用主頁管理；只有在需要聚焦資產創作時再進入模板 IDE。',
          ja: '日常のルーティングと公開作業は Homepage Management で進め、アセット制作に集中したい時だけ Template IDE を開いてください。',
          ko: '일상적인 라우팅과 공개 작업은 Homepage Management 에서 진행하고, 자산 제작에 집중해야 할 때만 Template IDE 를 여세요.',
          fr: 'Utilisez Homepage Management pour le routage et la publication au quotidien, puis ouvrez le Template IDE seulement quand un travail d’asset ciblé est nécessaire.',
        })
      : pickLocaleText(locale, {
          en: 'Use Homepage Management for everyday routing and release work, then open Component IDE only when you need focused asset authoring.',
          zh_HANS: '日常路由与发布工作请使用主页管理；只有在需要聚焦资产创作时再进入组件 IDE。',
          zh_HANT: '日常路由與發佈工作請使用主頁管理；只有在需要聚焦資產創作時再進入元件 IDE。',
          ja: '日常のルーティングと公開作業は Homepage Management で進め、アセット制作に集中したい時だけ Component IDE を開いてください。',
          ko: '일상적인 라우팅과 공개 작업은 Homepage Management 에서 진행하고, 자산 제작에 집중해야 할 때만 Component IDE 를 여세요.',
          fr: 'Utilisez Homepage Management pour le routage et la publication au quotidien, puis ouvrez le Component IDE seulement quand un travail d’asset ciblé est nécessaire.',
        });

  return (
    <PublicPresenceSurface
      className="border-sky-200 bg-sky-50 px-4 py-3 text-sky-900"
      data-testid="catalog-compatibility-notice"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <PublicPresenceBadge tone="info" variant="outline">
            {pickLocaleText(locale, {
              en: 'Compatibility path',
              zh_HANS: '兼容路径',
              zh_HANT: '相容路徑',
              ja: '互換パス',
              ko: '호환 경로',
              fr: 'Parcours de compatibilité',
            })}
          </PublicPresenceBadge>
          <p className="text-sm font-semibold">{heading}</p>
          <p className="text-sm leading-6 text-sky-900/90">{body}</p>
        </div>
        <SurfaceCommandLink
          href={href}
          icon={<Eye className="h-4 w-4" aria-hidden="true" />}
          label={pickLocaleText(locale, {
            en: 'Open Homepage Management',
            zh_HANS: '打开主页管理',
            zh_HANT: '打開主頁管理',
            ja: 'Homepage Management を開く',
            ko: 'Homepage Management 열기',
            fr: 'Ouvrir Homepage Management',
          })}
        />
      </div>
    </PublicPresenceSurface>
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
        <CatalogCompatibilityNotice
          href={buildPublicPresenceStudioEditorPath(tenantId, talentId)}
          kind="template"
        />
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
        <CatalogCompatibilityNotice
          href={buildPublicPresenceStudioEditorPath(tenantId, talentId)}
          kind="component"
        />
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
