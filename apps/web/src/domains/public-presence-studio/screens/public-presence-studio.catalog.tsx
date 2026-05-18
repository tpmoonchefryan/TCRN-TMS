'use client';

import {
  PUBLIC_PRESENCE_COMPONENT_DEFINITIONS,
  PUBLIC_PRESENCE_TEMPLATE_DEFINITIONS,
  SUPPORTED_UI_LOCALES,
  type HomepageComponentType,
  type LocalizedText,
  type PublicPresenceTemplateId,
  type SupportedUiLocale,
} from '@tcrn/shared';
import {
  Code2,
  Eye,
  LayoutTemplate,
  Package2,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { PublicPresenceBadge, PublicPresenceShell, PublicPresenceSurface } from '@/domains/public-presence';
import {
  getHomepageSurfaceActionLabel,
  getHomepageSurfaceLabel,
  getPublicPresenceStageSectionLabel,
  getPublicPresenceTemplateLabel,
  getPublicPresenceTemplateUseCase,
} from '@/domains/public-presence-studio/screens/public-presence-studio.copy';
import {
  buildPublicPresenceComponentAuthoringPath,
  buildPublicPresenceHomepageSurfacePath,
  buildPublicPresenceStudioEditorPath,
  buildPublicPresenceStudioPreviewPath,
  buildPublicPresenceTemplateAuthoringPath,
} from '@/platform/routing/workspace-paths';
import { pickLocaleText } from '@/platform/runtime/locale/locale-text';
import { useUiLocale } from '@/platform/runtime/locale/locale-provider';

type HomepageSurfaceId = 'management' | 'templates' | 'components';

interface SurfaceNavItem {
  description: string;
  href: string;
  id: HomepageSurfaceId;
  label: string;
}

function buildExactText(
  en: string,
  zh_HANS: string,
  zh_HANT: string,
  ja: string,
  ko: string,
  fr: string,
): LocalizedText {
  return {
    en,
    fr,
    ja,
    ko,
    zh_HANS,
    zh_HANT,
  };
}

const COMPONENT_PREVIEW_COPY: Record<HomepageComponentType, LocalizedText> = {
  ProfileCard: buildExactText(
    'Profile-led first impression card',
    '以档案为主的首屏身份卡',
    '以檔案為主的首屏身份卡',
    'プロフィール主導のファーストビューカード',
    '프로필 중심의 첫인상 카드',
    'Carte de premiere impression centree sur le profil',
  ),
  SocialLinks: buildExactText(
    'Trusted official channel cluster',
    '可信的官方渠道集合',
    '可信的官方渠道集合',
    '信頼できる公式チャンネル群',
    '신뢰 가능한 공식 채널 묶음',
    'Groupe de canaux officiels de confiance',
  ),
  ImageGallery: buildExactText(
    'Visual teaser and reveal gallery',
    '视觉预告与揭晓图集',
    '視覺預告與揭曉圖集',
    'ビジュアル告知と公開用ギャラリー',
    '비주얼 티저와 공개 갤러리',
    'Galerie visuelle pour teaser et reveal',
  ),
  VideoEmbed: buildExactText(
    'Official video embed block',
    '官方视频嵌入模块',
    '官方影片嵌入模組',
    '公式動画の埋め込みブロック',
    '공식 영상 임베드 블록',
    'Bloc video integre officiel',
  ),
  RichText: buildExactText(
    'Reference note block kept read-only',
    '保持只读的参考备注块',
    '保持唯讀的參考備註塊',
    '読み取り専用で保つ参考ノート',
    '읽기 전용으로 유지되는 참고 노트 블록',
    'Bloc de note de reference conserve en lecture seule',
  ),
  LinkButton: buildExactText(
    'Action link with typed destination rules',
    '带有类型化目标规则的动作链接',
    '帶有型別化目標規則的動作連結',
    '宛先ルール付きアクションリンク',
    '유형화된 목적지 규칙이 있는 액션 링크',
    'Lien d’action avec regles de destination typees',
  ),
  MarshmallowWidget: buildExactText(
    'Fan interaction bridge with bounded controls',
    '带边界控制的粉丝互动桥接组件',
    '帶邊界控制的粉絲互動橋接元件',
    '制御範囲つきファン交流モジュール',
    '경계 제어가 있는 팬 상호작용 브리지',
    'Pont d’interaction fan avec controles bornes',
  ),
  Schedule: buildExactText(
    'Structured stage schedule list',
    '结构化舞台日程列表',
    '結構化舞台行程列表',
    '構造化された出演スケジュール',
    '구조화된 스테이지 일정 목록',
    'Liste de planning de scene structuree',
  ),
  MusicPlayer: buildExactText(
    'Locked audio module managed outside Studio editing',
    '锁定的音频模块，在 Studio 编辑之外管理',
    '鎖定的音訊模組，在 Studio 編輯之外管理',
    'Studio 編集の外側で管理するロック済み音声モジュール',
    'Studio 편집 밖에서 관리되는 잠금 오디오 모듈',
    'Module audio verrouille gere hors de l’edition Studio',
  ),
  LiveStatus: buildExactText(
    'Live or launch state banner',
    '直播或上线状态横幅',
    '直播或上線狀態橫幅',
    '配信・公開状況バナー',
    '라이브 또는 런치 상태 배너',
    'Banniere d’etat live ou lancement',
  ),
  Divider: buildExactText(
    'Locked separator',
    '锁定分隔线',
    '鎖定分隔線',
    'ロック済み区切り線',
    '잠금 구분선',
    'Separateur verrouille',
  ),
  Spacer: buildExactText(
    'Locked spacing block',
    '锁定留白模块',
    '鎖定留白模組',
    'ロック済み余白ブロック',
    '잠금 여백 블록',
    'Bloc d’espacement verrouille',
  ),
  BilibiliDynamic: buildExactText(
    'Locked official updates feed',
    '锁定的官方动态流',
    '鎖定的官方動態流',
    'ロック済み公式更新フィード',
    '잠금 상태의 공식 업데이트 피드',
    'Flux de mises a jour officielles verrouille',
  ),
};

function resolveText(locale: SupportedUiLocale, text: LocalizedText) {
  return text[locale];
}

function getLocaleCoverageLabel(locale: SupportedUiLocale) {
  return pickLocaleText(locale, {
    en: `${SUPPORTED_UI_LOCALES.length} locales ready`,
    zh_HANS: `已覆盖 ${SUPPORTED_UI_LOCALES.length} 个界面语言`,
    zh_HANT: `已覆蓋 ${SUPPORTED_UI_LOCALES.length} 個介面語言`,
    ja: `${SUPPORTED_UI_LOCALES.length} 言語をカバー`,
    ko: `${SUPPORTED_UI_LOCALES.length}개 UI 언어 지원`,
    fr: `${SUPPORTED_UI_LOCALES.length} langues prises en charge`,
  });
}

function SurfaceCommandLink({
  href,
  icon,
  label,
  tone = 'neutral',
}: Readonly<{
  href: string;
  icon: React.ReactNode;
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

export function useHomepageSurfaceNavigation(
  tenantId: string,
  talentId: string,
) {
  const { locale } = useUiLocale();

  return useMemo<SurfaceNavItem[]>(
    () => [
      {
        id: 'management',
        href: buildPublicPresenceHomepageSurfacePath(tenantId, talentId, 'management'),
        label: getHomepageSurfaceLabel(locale, 'management'),
        description: pickLocaleText(locale, {
          en: 'Route, readiness, release state, and launch actions.',
          zh_HANS: '路由、就绪度、发布状态与启动动作。',
          zh_HANT: '路由、就緒度、發佈狀態與啟動動作。',
          ja: 'ルート、準備状況、公開状態、起動アクション。',
          ko: '라우트, 준비도, 공개 상태, 실행 액션.',
          fr: 'Route, preparation, etat de publication et actions de lancement.',
        }),
      },
      {
        id: 'templates',
        href: buildPublicPresenceHomepageSurfacePath(tenantId, talentId, 'templates'),
        label: getHomepageSurfaceLabel(locale, 'templates'),
        description: pickLocaleText(locale, {
          en: 'Curated page layouts, preview samples, and template authoring entry.',
          zh_HANS: '精选页面布局、预览样例与模板创作入口。',
          zh_HANT: '精選頁面版型、預覽樣例與模板創作入口。',
          ja: '厳選レイアウト、プレビュー用サンプル、テンプレート制作入口。',
          ko: '큐레이션된 페이지 레이아웃, 프리뷰 샘플, 템플릿 제작 진입점.',
          fr: 'Layouts choisis, apercus d’exemple et entree d’auteur de template.',
        }),
      },
      {
        id: 'components',
        href: buildPublicPresenceHomepageSurfacePath(tenantId, talentId, 'components'),
        label: getHomepageSurfaceLabel(locale, 'components'),
        description: pickLocaleText(locale, {
          en: 'Curated building blocks, protected behavior, and component authoring entry.',
          zh_HANS: '精选构件、受保护行为与组件创作入口。',
          zh_HANT: '精選構件、受保護行為與元件創作入口。',
          ja: '厳選コンポーネント、保護された挙動、コンポーネント制作入口。',
          ko: '큐레이션된 컴포넌트, 보호된 동작, 컴포넌트 제작 진입점.',
          fr: 'Composants choisis, comportement protege et entree d’auteur de composant.',
        }),
      },
    ],
    [locale, talentId, tenantId],
  );
}

export function HomepageSurfaceMenu({
  activeSurface,
  tenantId,
  talentId,
}: Readonly<{
  activeSurface: HomepageSurfaceId;
  talentId: string;
  tenantId: string;
}>) {
  const { locale } = useUiLocale();
  const items = useHomepageSurfaceNavigation(tenantId, talentId);

  return (
    <PublicPresenceSurface className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <PublicPresenceBadge icon={<LayoutTemplate className="h-4 w-4" aria-hidden="true" />} tone="rose">
            {pickLocaleText(locale, {
              en: 'Homepage',
              zh_HANS: '主页',
              zh_HANT: '主頁',
              ja: 'ホームページ',
              ko: '홈페이지',
              fr: 'Homepage',
            })}
          </PublicPresenceBadge>
        </div>
        <h2 className="text-lg font-semibold text-slate-950">
          {getHomepageSurfaceActionLabel(locale, 'homepageMenu')}
        </h2>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            aria-current={activeSurface === item.id ? 'page' : undefined}
            className={`rounded-3xl border px-4 py-4 text-left transition ${
              activeSurface === item.id
                ? 'border-rose-300 bg-rose-50'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <p className="text-sm font-semibold text-slate-950">{item.label}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
          </Link>
        ))}
      </div>
    </PublicPresenceSurface>
  );
}

export function TemplateCenterScreen({
  talentId,
  tenantId,
}: Readonly<{
  talentId: string;
  tenantId: string;
}>) {
  const { locale } = useUiLocale();
  const [inspectTemplateId, setInspectTemplateId] = useState<PublicPresenceTemplateId | null>(null);
  const templates = Object.values(PUBLIC_PRESENCE_TEMPLATE_DEFINITIONS);
  const inspectTemplate = inspectTemplateId
    ? PUBLIC_PRESENCE_TEMPLATE_DEFINITIONS[inspectTemplateId]
    : null;

  return (
    <PublicPresenceShell decorationDensity="calm">
      <div className="space-y-6">
        <HomepageSurfaceMenu activeSurface="templates" talentId={talentId} tenantId={tenantId} />

        <PublicPresenceSurface className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <PublicPresenceBadge icon={<LayoutTemplate className="h-4 w-4" aria-hidden="true" />} tone="rose">
                  {getHomepageSurfaceLabel(locale, 'templates')}
                </PublicPresenceBadge>
                <PublicPresenceBadge tone="slate" variant="outline">
                  {getLocaleCoverageLabel(locale)}
                </PublicPresenceBadge>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                {getHomepageSurfaceLabel(locale, 'templates')}
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                {pickLocaleText(locale, {
                  en: 'Browse homepage layouts, inspect section order, and open the full-screen authoring IDE when you need a new layout package.',
                  zh_HANS: '浏览主页布局、检查分区顺序，并在需要新布局包时打开全屏创作 IDE。',
                  zh_HANT: '瀏覽主頁版型、檢查分區順序，並在需要新布局包時打開全螢幕創作 IDE。',
                  ja: 'ホームページレイアウトを確認し、セクション順を点検し、新しいレイアウトパッケージが必要なときは全画面 IDE を開きます。',
                  ko: '홈페이지 레이아웃을 살펴보고 섹션 순서를 점검한 뒤, 새 레이아웃 패키지가 필요할 때 전체 화면 IDE를 엽니다.',
                  fr: 'Parcourez les layouts de homepage, inspectez l’ordre des sections et ouvrez l’IDE plein ecran lorsqu’un nouveau package de layout est necessaire.',
                })}
              </p>
            </div>
            <SurfaceCommandLink
              href={buildPublicPresenceTemplateAuthoringPath(tenantId, talentId)}
              icon={<Plus className="h-4 w-4" aria-hidden="true" />}
              label={getHomepageSurfaceActionLabel(locale, 'addTemplate')}
              tone="primary"
            />
          </div>
        </PublicPresenceSurface>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="grid gap-4 lg:grid-cols-2">
            {templates.map((template) => (
              <PublicPresenceSurface key={template.templateId} className="space-y-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <PublicPresenceBadge tone="rose" variant="outline">
                      {getPublicPresenceTemplateLabel(locale, template)}
                    </PublicPresenceBadge>
                    <PublicPresenceBadge tone="success" variant="outline">
                      {pickLocaleText(locale, {
                        en: 'Registered',
                        zh_HANS: '已注册',
                        zh_HANT: '已註冊',
                        ja: '登録済み',
                        ko: '등록됨',
                        fr: 'Enregistre',
                      })}
                    </PublicPresenceBadge>
                  </div>
                  <h2 className="text-xl font-semibold text-slate-950">
                    {getPublicPresenceTemplateUseCase(locale, template)}
                  </h2>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                    <p className="font-semibold text-slate-900">
                      {pickLocaleText(locale, {
                        en: 'Preview anatomy',
                        zh_HANS: '预览结构',
                        zh_HANT: '預覽結構',
                        ja: 'プレビュー構造',
                        ko: '프리뷰 구조',
                        fr: 'Aperçu de l’anatomie',
                      })}
                    </p>
                    <p className="mt-2">
                      {template.defaultSectionOrder
                        .slice(0, 4)
                        .map((section) =>
                          getPublicPresenceStageSectionLabel(locale, { kind: section }),
                        )
                        .join(' · ')}
                    </p>
                  </div>
                  <div className="grid gap-2 text-sm text-slate-600">
                    <p>
                      <span className="font-semibold text-slate-900">
                        {pickLocaleText(locale, {
                          en: 'Required sections:',
                          zh_HANS: '必填分区：',
                          zh_HANT: '必填分區：',
                          ja: '必須セクション:',
                          ko: '필수 섹션:',
                          fr: 'Sections requises :',
                        })}
                      </span>{' '}
                      {template.requiredSections
                        .map((section) =>
                          getPublicPresenceStageSectionLabel(locale, { kind: section }),
                        )
                        .join(', ')}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">
                        {pickLocaleText(locale, {
                          en: 'Page type:',
                          zh_HANS: '页面类型：',
                          zh_HANT: '頁面類型：',
                          ja: 'ページ種別:',
                          ko: '페이지 유형:',
                          fr: 'Type de page :',
                        })}
                      </span>{' '}
                      {getPublicPresenceTemplateUseCase(locale, template)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <SurfaceCommandLink
                    href={buildPublicPresenceStudioPreviewPath(tenantId, talentId, template.templateId)}
                    icon={<Eye className="h-4 w-4" aria-hidden="true" />}
                    label={getHomepageSurfaceActionLabel(locale, 'viewPreview')}
                  />
                  <button
                    type="button"
                    onClick={() => setInspectTemplateId(template.templateId)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    {getHomepageSurfaceActionLabel(locale, 'inspect')}
                  </button>
                  <SurfaceCommandLink
                    href={buildPublicPresenceTemplateAuthoringPath(tenantId, talentId, template.templateId)}
                    icon={<Code2 className="h-4 w-4" aria-hidden="true" />}
                    label={getHomepageSurfaceActionLabel(locale, 'addTemplate')}
                    tone="primary"
                  />
                </div>
              </PublicPresenceSurface>
            ))}
          </div>

          <PublicPresenceSurface className="space-y-4" variant="inset">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-950">
                {getHomepageSurfaceActionLabel(locale, 'inspectTemplate')}
              </h2>
              <p className="text-sm leading-6 text-slate-600">
                {inspectTemplate
                  ? getPublicPresenceTemplateUseCase(locale, inspectTemplate)
                  : pickLocaleText(locale, {
                      en: 'Choose a template card to inspect section order, editable persona kit fields, and readiness rules.',
                      zh_HANS: '选择一个模板卡片，检查分区顺序、可编辑的人设字段与就绪规则。',
                      zh_HANT: '選擇一個模板卡片，檢查分區順序、可編輯的人設欄位與就緒規則。',
                      ja: 'テンプレートカードを選択すると、セクション順、編集可能な Persona Kit 項目、準備ルールを確認できます。',
                      ko: '템플릿 카드를 선택하면 섹션 순서, 편집 가능한 Persona Kit 필드, 준비 규칙을 확인할 수 있습니다.',
                      fr: 'Choisissez une carte de template pour inspecter l’ordre des sections, les champs Persona Kit modifiables et les regles de readiness.',
                    })}
              </p>
            </div>

            {inspectTemplate ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <PublicPresenceBadge tone="rose">
                    {getPublicPresenceTemplateLabel(locale, inspectTemplate)}
                  </PublicPresenceBadge>
                  <PublicPresenceBadge tone="slate" variant="outline">
                    {pickLocaleText(locale, {
                      en: 'Curated layout',
                      zh_HANS: '精选布局',
                      zh_HANT: '精選版型',
                      ja: '厳選レイアウト',
                      ko: '큐레이션된 레이아웃',
                      fr: 'Layout choisi',
                    })}
                  </PublicPresenceBadge>
                </div>
                <div className="space-y-3 text-sm text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-900">
                      {pickLocaleText(locale, {
                        en: 'Section order:',
                        zh_HANS: '分区顺序：',
                        zh_HANT: '分區順序：',
                        ja: 'セクション順:',
                        ko: '섹션 순서:',
                        fr: 'Ordre des sections :',
                      })}
                    </span>{' '}
                    {inspectTemplate.defaultSectionOrder
                      .map((section) =>
                        getPublicPresenceStageSectionLabel(locale, { kind: section }),
                      )
                      .join(' -> ')}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">
                      {pickLocaleText(locale, {
                        en: 'Persona Kit fields:',
                        zh_HANS: '人设字段：',
                        zh_HANT: '人設欄位：',
                        ja: 'Persona Kit 項目:',
                        ko: 'Persona Kit 필드:',
                        fr: 'Champs Persona Kit :',
                      })}
                    </span>{' '}
                    {inspectTemplate.personaKitFields.join(', ')}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">
                      {pickLocaleText(locale, {
                        en: 'Readiness rules:',
                        zh_HANS: '就绪规则：',
                        zh_HANT: '就緒規則：',
                        ja: '準備ルール:',
                        ko: '준비 규칙:',
                        fr: 'Regles de readiness :',
                      })}
                    </span>{' '}
                    {inspectTemplate.validationRules.join(', ')}
                  </p>
                </div>
              </div>
            ) : null}
          </PublicPresenceSurface>
        </div>
      </div>
    </PublicPresenceShell>
  );
}

export function ComponentStoreScreen({
  talentId,
  tenantId,
}: Readonly<{
  talentId: string;
  tenantId: string;
}>) {
  const { locale } = useUiLocale();
  const [inspectComponentType, setInspectComponentType] = useState<HomepageComponentType | null>(null);
  const components = Object.values(PUBLIC_PRESENCE_COMPONENT_DEFINITIONS);
  const inspectComponent = inspectComponentType
    ? PUBLIC_PRESENCE_COMPONENT_DEFINITIONS[inspectComponentType]
    : null;

  return (
    <PublicPresenceShell decorationDensity="calm">
      <div className="space-y-6">
        <HomepageSurfaceMenu activeSurface="components" talentId={talentId} tenantId={tenantId} />

        <PublicPresenceSurface className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <PublicPresenceBadge icon={<Package2 className="h-4 w-4" aria-hidden="true" />} tone="rose">
                  {getHomepageSurfaceLabel(locale, 'components')}
                </PublicPresenceBadge>
                <PublicPresenceBadge tone="slate" variant="outline">
                  {getLocaleCoverageLabel(locale)}
                </PublicPresenceBadge>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                {getHomepageSurfaceLabel(locale, 'components')}
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                {pickLocaleText(locale, {
                  en: 'Review building blocks, confirm how far Studio editing reaches, and open the full-screen authoring IDE for new component work.',
                  zh_HANS: '检查构件，确认 Studio 编辑可到达的范围，并为新组件工作打开全屏创作 IDE。',
                  zh_HANT: '檢查構件，確認 Studio 編輯可到達的範圍，並為新元件工作打開全螢幕創作 IDE。',
                  ja: 'コンポーネントを確認し、Studio 編集の届く範囲を把握し、新しいコンポーネント作業では全画面 IDE を開きます。',
                  ko: '컴포넌트를 검토하고 Studio 편집이 닿는 범위를 확인한 뒤, 새 컴포넌트 작업을 위해 전체 화면 IDE를 엽니다.',
                  fr: 'Examinez les composants, confirmez jusqu’ou va l’edition Studio et ouvrez l’IDE plein ecran pour un nouveau composant.',
                })}
              </p>
            </div>
            <SurfaceCommandLink
              href={buildPublicPresenceComponentAuthoringPath(tenantId, talentId)}
              icon={<Plus className="h-4 w-4" aria-hidden="true" />}
              label={getHomepageSurfaceActionLabel(locale, 'addComponent')}
              tone="primary"
            />
          </div>
        </PublicPresenceSurface>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="grid gap-4 lg:grid-cols-2">
            {components.map((component) => (
              <PublicPresenceSurface key={component.componentType} className="space-y-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <PublicPresenceBadge tone="rose" variant="outline">
                      {component.componentType}
                    </PublicPresenceBadge>
                    <PublicPresenceBadge
                      tone={component.visualSupport === 'supported' ? 'success' : 'warning'}
                      variant="outline"
                    >
                      {component.visualSupport === 'supported'
                        ? pickLocaleText(locale, {
                            en: 'Studio editing ready',
                            zh_HANS: '可视编辑可用',
                            zh_HANT: '視覺編輯可用',
                            ja: 'Studio 編集対応',
                            ko: 'Studio 편집 지원',
                            fr: 'Pret pour l’edition Studio',
                          })
                        : pickLocaleText(locale, {
                            en: 'Advanced only',
                            zh_HANS: '仅限高级区',
                            zh_HANT: '僅限進階區',
                            ja: 'Advanced のみ',
                            ko: 'Advanced 전용',
                            fr: 'Advanced uniquement',
                          })}
                    </PublicPresenceBadge>
                  </div>
                  <h2 className="text-xl font-semibold text-slate-950">
                    {resolveText(locale, COMPONENT_PREVIEW_COPY[component.componentType])}
                  </h2>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                    <p className="font-semibold text-slate-900">
                      {pickLocaleText(locale, {
                        en: 'Preview role',
                        zh_HANS: '预览角色',
                        zh_HANT: '預覽角色',
                        ja: 'プレビュー上の役割',
                        ko: '프리뷰 역할',
                        fr: 'Rôle dans l’aperçu',
                      })}
                    </p>
                    <p className="mt-2">{resolveText(locale, COMPONENT_PREVIEW_COPY[component.componentType])}</p>
                  </div>
                  <div className="grid gap-2 text-sm text-slate-600">
                    <p>
                      <span className="font-semibold text-slate-900">
                        {pickLocaleText(locale, {
                          en: 'Editable fields:',
                          zh_HANS: '可编辑字段：',
                          zh_HANT: '可編輯欄位：',
                          ja: '編集可能項目:',
                          ko: '편집 가능한 필드:',
                          fr: 'Champs modifiables :',
                        })}
                      </span>{' '}
                      {component.fieldDefinitions.filter((field) => field.visualEditable).length}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">
                        {pickLocaleText(locale, {
                          en: 'Editing boundary:',
                          zh_HANS: '编辑边界：',
                          zh_HANT: '編輯邊界：',
                          ja: '編集境界:',
                          ko: '편집 경계:',
                          fr: 'Limite d’edition :',
                        })}
                      </span>{' '}
                      {component.visualSupport === 'supported'
                        ? pickLocaleText(locale, {
                            en: 'Editable in Studio',
                            zh_HANS: '可在 Studio 编辑',
                            zh_HANT: '可在 Studio 編輯',
                            ja: 'Studio で編集可能',
                            ko: 'Studio에서 편집 가능',
                            fr: 'Modifiable dans Studio',
                          })
                        : pickLocaleText(locale, {
                            en: 'Handled in Advanced',
                            zh_HANS: '在 Advanced 中处理',
                            zh_HANT: '在 Advanced 中處理',
                            ja: 'Advanced で扱います',
                            ko: 'Advanced에서 처리',
                            fr: 'Traite dans Advanced',
                          })}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <SurfaceCommandLink
                    href={buildPublicPresenceStudioPreviewPath(tenantId, talentId)}
                    icon={<Eye className="h-4 w-4" aria-hidden="true" />}
                    label={getHomepageSurfaceActionLabel(locale, 'viewPreview')}
                  />
                  <button
                    type="button"
                    onClick={() => setInspectComponentType(component.componentType)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    {getHomepageSurfaceActionLabel(locale, 'inspect')}
                  </button>
                  <SurfaceCommandLink
                    href={buildPublicPresenceComponentAuthoringPath(tenantId, talentId, component.componentType)}
                    icon={<Code2 className="h-4 w-4" aria-hidden="true" />}
                    label={getHomepageSurfaceActionLabel(locale, 'addComponent')}
                    tone="primary"
                  />
                </div>
              </PublicPresenceSurface>
            ))}
          </div>

          <PublicPresenceSurface className="space-y-4" variant="inset">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-950">
                {getHomepageSurfaceActionLabel(locale, 'inspectComponent')}
              </h2>
              <p className="text-sm leading-6 text-slate-600">
                {inspectComponent
                  ? resolveText(locale, COMPONENT_PREVIEW_COPY[inspectComponent.componentType])
                  : pickLocaleText(locale, {
                      en: 'Choose a component card to inspect its editing range, preview role, and protected behavior.',
                      zh_HANS: '选择一个组件卡片，检查它的编辑范围、预览角色与受保护行为。',
                      zh_HANT: '選擇一個元件卡片，檢查它的編輯範圍、預覽角色與受保護行為。',
                      ja: 'コンポーネントカードを選択すると、編集範囲、プレビュー上の役割、保護された挙動を確認できます。',
                      ko: '컴포넌트 카드를 선택하면 편집 범위, 프리뷰 역할, 보호된 동작을 확인할 수 있습니다.',
                      fr: 'Choisissez une carte de composant pour inspecter sa portée d’edition, son rôle d’aperçu et son comportement protégé.',
                    })}
              </p>
            </div>

            {inspectComponent ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <PublicPresenceBadge tone="rose">{inspectComponent.componentType}</PublicPresenceBadge>
                  <PublicPresenceBadge tone="slate" variant="outline">
                    {inspectComponent.visualSupport === 'supported'
                      ? pickLocaleText(locale, {
                          en: 'Studio ready',
                          zh_HANS: 'Studio 就绪',
                          zh_HANT: 'Studio 就緒',
                          ja: 'Studio 対応',
                          ko: 'Studio 지원',
                          fr: 'Pret pour Studio',
                        })
                      : pickLocaleText(locale, {
                          en: 'Advanced handling',
                          zh_HANS: 'Advanced 处理',
                          zh_HANT: 'Advanced 處理',
                          ja: 'Advanced 対応',
                          ko: 'Advanced 처리',
                          fr: 'Gestion Advanced',
                        })}
                  </PublicPresenceBadge>
                </div>
                <div className="space-y-3 text-sm text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-900">
                      {pickLocaleText(locale, {
                        en: 'Live preview:',
                        zh_HANS: '实时预览：',
                        zh_HANT: '即時預覽：',
                        ja: 'ライブプレビュー:',
                        ko: '라이브 프리뷰:',
                        fr: 'Aperçu live :',
                      })}
                    </span>{' '}
                    {inspectComponent.rendererSupport ? 'yes' : 'no'}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">
                      {pickLocaleText(locale, {
                        en: 'Editable fields:',
                        zh_HANS: '可编辑字段：',
                        zh_HANT: '可編輯欄位：',
                        ja: '編集可能項目:',
                        ko: '편집 가능한 필드:',
                        fr: 'Champs modifiables :',
                      })}
                    </span>{' '}
                    {inspectComponent.fieldDefinitions.filter((field) => field.visualEditable).length}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">
                      {pickLocaleText(locale, {
                        en: 'Protected behavior:',
                        zh_HANS: '受保护行为：',
                        zh_HANT: '受保護行為：',
                        ja: '保護された挙動:',
                        ko: '보호된 동작:',
                        fr: 'Comportement protégé :',
                      })}
                    </span>{' '}
                    {inspectComponent.visualSupport === 'supported'
                      ? pickLocaleText(locale, {
                          en: 'Studio edits stay within approved fields.',
                          zh_HANS: 'Studio 编辑保持在已批准字段内。',
                          zh_HANT: 'Studio 編輯保持在已批准欄位內。',
                          ja: 'Studio 編集は承認済み項目の範囲に留まります。',
                          ko: 'Studio 편집은 승인된 필드 범위 안에 머뭅니다.',
                          fr: 'Les modifications Studio restent dans les champs approuvés.',
                        })
                      : pickLocaleText(locale, {
                          en: 'This block stays protected and is handled from Advanced.',
                          zh_HANS: '这个模块保持受保护状态，并从 Advanced 处理。',
                          zh_HANT: '這個模組保持受保護狀態，並從 Advanced 處理。',
                          ja: 'このブロックは保護されたまま Advanced から扱います。',
                          ko: '이 블록은 보호된 상태로 Advanced에서 다룹니다.',
                          fr: 'Ce bloc reste protégé et se traite depuis Advanced.',
                        })}
                  </p>
                </div>
              </div>
            ) : null}
          </PublicPresenceSurface>
        </div>
      </div>
    </PublicPresenceShell>
  );
}
