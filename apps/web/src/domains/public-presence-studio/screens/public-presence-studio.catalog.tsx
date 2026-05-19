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
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useId, useMemo, useState } from 'react';

import { PublicPresenceBadge, PublicPresenceShell, PublicPresenceSurface } from '@/domains/public-presence';
import { useOverlayFocusManager } from '@/domains/public-presence-studio/screens/public-presence-studio-overlay';
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

function buildScopedActionLabel(
  _locale: SupportedUiLocale,
  action: string,
  subject: string,
) {
  return `${action}: ${subject}`;
}

function getComponentDisplayName(
  _locale: SupportedUiLocale,
  componentType: HomepageComponentType,
) {
  return componentType.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
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
    <PublicPresenceSurface className="space-y-3 px-4 py-4" data-testid="homepage-surface-menu">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
          <p className="text-sm text-slate-600">
            {pickLocaleText(locale, {
              en: 'Switch between live operations, templates, and components.',
              zh_HANS: '在运营、模板与组件之间快速切换。',
              zh_HANT: '在營運、模板與元件之間快速切換。',
              ja: '運用、テンプレート、コンポーネントを素早く切り替えます。',
              ko: '운영, 템플릿, 컴포넌트 사이를 빠르게 전환합니다.',
              fr: 'Basculez rapidement entre opérations, templates et composants.',
            })}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            aria-current={activeSurface === item.id ? 'page' : undefined}
            className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition ${
              activeSurface === item.id
                ? 'border-rose-300 bg-rose-50'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
            title={item.description}
          >
            <span className="text-slate-950">{item.label}</span>
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
  const inspectTemplateDrawerId = useId();
  const templates = Object.values(PUBLIC_PRESENCE_TEMPLATE_DEFINITIONS);
  const inspectTemplate = inspectTemplateId
    ? PUBLIC_PRESENCE_TEMPLATE_DEFINITIONS[inspectTemplateId]
    : null;
  const inspectTemplateOpen = Boolean(inspectTemplate);
  const inspectTemplateOverlay = useOverlayFocusManager({
    onClose: () => setInspectTemplateId(null),
    open: inspectTemplateOpen,
  });

  return (
    <PublicPresenceShell decorationDensity="calm">
      <div className="space-y-6">
        <HomepageSurfaceMenu activeSurface="templates" talentId={talentId} tenantId={tenantId} />

        <PublicPresenceSurface className="space-y-3 px-4 py-4" data-testid="template-center-topbar">
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
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                {pickLocaleText(locale, {
                  en: 'Inspect section order, compare launch use cases, and jump straight into authoring when you need a new template pass.',
                  zh_HANS: '检查分区顺序、比较上线用途，并在需要新模板时直接进入创作。',
                  zh_HANT: '檢查分區順序、比較上線用途，並在需要新模板時直接進入創作。',
                  ja: 'セクション順と公開用途を確認し、新しいテンプレートが必要ならそのまま制作へ進みます。',
                  ko: '섹션 순서와 공개 용도를 비교하고, 새 템플릿이 필요하면 바로 제작으로 이동합니다.',
                  fr: 'Inspectez l’ordre des sections, comparez les usages de lancement et passez directement à l’authoring quand un nouveau template est nécessaire.',
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

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="grid gap-4 lg:grid-cols-2" data-testid="template-center-catalog">
            {templates.map((template) => (
              <PublicPresenceSurface
                key={template.templateId}
                className="space-y-4"
                data-testid={`template-card-${template.templateId}`}
              >
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
                    label={buildScopedActionLabel(
                      locale,
                      getHomepageSurfaceActionLabel(locale, 'viewPreview'),
                      getPublicPresenceTemplateLabel(locale, template),
                    )}
                  />
                  <button
                    type="button"
                    aria-controls={inspectTemplateDrawerId}
                    aria-expanded={inspectTemplateId === template.templateId}
                    ref={inspectTemplateId === template.templateId ? inspectTemplateOverlay.fallbackTriggerRef : undefined}
                    onClick={(event) => {
                      inspectTemplateOverlay.registerTrigger(event.currentTarget);
                      setInspectTemplateId(template.templateId);
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    {buildScopedActionLabel(
                      locale,
                      getHomepageSurfaceActionLabel(locale, 'inspect'),
                      getPublicPresenceTemplateLabel(locale, template),
                    )}
                  </button>
                  <SurfaceCommandLink
                    href={buildPublicPresenceTemplateAuthoringPath(tenantId, talentId, template.templateId)}
                    icon={<Code2 className="h-4 w-4" aria-hidden="true" />}
                    label={buildScopedActionLabel(
                      locale,
                      getHomepageSurfaceActionLabel(locale, 'openTemplateIde'),
                      getPublicPresenceTemplateLabel(locale, template),
                    )}
                    tone="primary"
                  />
                </div>
              </PublicPresenceSurface>
            ))}
          </div>

          {inspectTemplate ? (
            <PublicPresenceSurface
              aria-label={getHomepageSurfaceActionLabel(locale, 'inspectTemplate')}
              aria-modal={false}
              className="fixed inset-x-3 bottom-3 z-40 max-h-[72vh] overflow-auto rounded-[2rem] border border-slate-200/90 bg-white/97 p-4 shadow-xl xl:sticky xl:top-24 xl:z-10 xl:max-h-[calc(100vh-7rem)] xl:w-full"
              data-testid="template-inspect-drawer"
              id={inspectTemplateDrawerId}
              role="dialog"
              variant="inset"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-slate-950">
                    {getHomepageSurfaceActionLabel(locale, 'inspectTemplate')}
                  </h2>
                  <p className="text-sm leading-6 text-slate-600">
                    {getPublicPresenceTemplateUseCase(locale, inspectTemplate)}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={pickLocaleText(locale, {
                    en: 'Close template inspection',
                    zh_HANS: '关闭模板检查',
                    zh_HANT: '關閉模板檢查',
                    ja: 'テンプレート確認を閉じる',
                    ko: '템플릿 검토 닫기',
                    fr: 'Fermer l’inspection du template',
                  })}
                  onClick={() => setInspectTemplateId(null)}
                  ref={inspectTemplateOverlay.desktopInitialFocusRef}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

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
            </PublicPresenceSurface>
          ) : (
            <PublicPresenceSurface className="space-y-4" variant="inset">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-slate-950">
                  {getHomepageSurfaceActionLabel(locale, 'inspectTemplate')}
                </h2>
                <p className="text-sm leading-6 text-slate-600">
                  {pickLocaleText(locale, {
                    en: 'Choose a template card to inspect section order, editable persona kit fields, and readiness rules.',
                    zh_HANS: '选择一个模板卡片，检查分区顺序、可编辑的人设字段与就绪规则。',
                    zh_HANT: '選擇一個模板卡片，檢查分區順序、可編輯的人設欄位與就緒規則。',
                    ja: 'テンプレートカードを選択すると、セクション順、編集可能な Persona Kit 項目、準備ルールを確認できます。',
                    ko: '템플릿 카드를 선택하면 섹션 순서, 편집 가능한 Persona Kit 필드, 준비 규칙을 확인할 수 있습니다.',
                    fr: 'Choisissez une carte de template pour inspecter l’ordre des sections, les champs Persona Kit modifiables et les regles de readiness.',
                  })}
                </p>
              </div>
            </PublicPresenceSurface>
          )}
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
  const inspectComponentDrawerId = useId();
  const components = Object.values(PUBLIC_PRESENCE_COMPONENT_DEFINITIONS);
  const inspectComponent = inspectComponentType
    ? PUBLIC_PRESENCE_COMPONENT_DEFINITIONS[inspectComponentType]
    : null;
  const inspectComponentOpen = Boolean(inspectComponentType);
  const inspectComponentOverlay = useOverlayFocusManager({
    onClose: () => setInspectComponentType(null),
    open: inspectComponentOpen,
  });

  return (
    <PublicPresenceShell decorationDensity="calm">
      <div className="space-y-6">
        <HomepageSurfaceMenu activeSurface="components" talentId={talentId} tenantId={tenantId} />

        <PublicPresenceSurface className="space-y-3 px-4 py-4" data-testid="component-store-topbar">
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
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                {pickLocaleText(locale, {
                  en: 'Browse fan-facing building blocks, compare their preview roles, and open authoring only when a new component pass is needed.',
                  zh_HANS: '浏览面向粉丝的构件，对比它们在预览中的角色，并只在需要新组件时进入创作。',
                  zh_HANT: '瀏覽面向粉絲的構件，比對它們在預覽中的角色，並只在需要新元件時進入創作。',
                  ja: 'ファン向けの構成要素を確認し、プレビューでの役割を比べ、新しいコンポーネントが必要な時だけ制作へ進みます。',
                  ko: '팬 대상 빌딩 블록을 살펴보고 프리뷰 역할을 비교한 뒤, 새 컴포넌트가 필요할 때만 제작으로 이동합니다.',
                  fr: 'Parcourez les briques fan-facing, comparez leur rôle dans l’aperçu et ouvrez l’authoring seulement lorsqu’un nouveau composant est nécessaire.',
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

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="grid gap-4 lg:grid-cols-2" data-testid="component-store-catalog">
            {components.map((component) => (
              <PublicPresenceSurface
                key={component.componentType}
                className="space-y-4"
                data-testid={`component-card-${component.componentType}`}
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <PublicPresenceBadge tone="rose" variant="outline">
                      {getComponentDisplayName(locale, component.componentType)}
                    </PublicPresenceBadge>
                    <PublicPresenceBadge tone="slate" variant="outline">
                      {component.visualSupport === 'supported'
                        ? pickLocaleText(locale, {
                            en: 'Launch staple',
                            zh_HANS: '常用主页组件',
                            zh_HANT: '常用主頁元件',
                            ja: '定番ホームページ要素',
                            ko: '기본 홈페이지 요소',
                            fr: 'Composant de base pour la page',
                          })
                        : pickLocaleText(locale, {
                            en: 'Special moment',
                            zh_HANS: '特殊场景组件',
                            zh_HANT: '特殊場景元件',
                            ja: '特別な場面向け',
                            ko: '특수 장면용',
                            fr: 'Composant pour moment special',
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
                          en: 'Fan moment:',
                          zh_HANS: '适合场景：',
                          zh_HANT: '適合場景：',
                          ja: '向いている場面:',
                          ko: '잘 맞는 장면:',
                          fr: 'Moment fan :',
                        })}
                      </span>{' '}
                      {component.visualSupport === 'supported'
                        ? pickLocaleText(locale, {
                            en: 'Fast homepage assembly for everyday fan visits',
                            zh_HANS: '适合日常粉丝访问场景的快速主页搭建',
                            zh_HANT: '適合日常粉絲造訪場景的快速主頁搭建',
                            ja: '日常的なファン訪問向けホームページを素早く整える場面',
                            ko: '일상적인 팬 방문용 홈페이지를 빠르게 꾸릴 때',
                            fr: 'Monter rapidement une page pour les visites fan du quotidien',
                          })
                        : pickLocaleText(locale, {
                            en: 'Protected reveals, embeds, or specialized fan moments',
                            zh_HANS: '适合受保护的揭晓内容、嵌入模块或特殊粉丝场景',
                            zh_HANT: '適合受保護的揭曉內容、嵌入模組或特殊粉絲場景',
                            ja: '保護された公開コンテンツ、埋め込み、特別なファン向け演出',
                            ko: '보호된 공개 콘텐츠, 임베드, 특수 팬 장면에 적합',
                            fr: 'Conçu pour les reveals protégés, les embeds ou les moments fan spécialisés',
                          })}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <SurfaceCommandLink
                    href={buildPublicPresenceStudioPreviewPath(tenantId, talentId)}
                    icon={<Eye className="h-4 w-4" aria-hidden="true" />}
                    label={buildScopedActionLabel(
                      locale,
                      getHomepageSurfaceActionLabel(locale, 'viewPreview'),
                      getComponentDisplayName(locale, component.componentType),
                    )}
                  />
                  <button
                    type="button"
                    aria-controls={inspectComponentDrawerId}
                    aria-expanded={inspectComponentType === component.componentType}
                    ref={inspectComponentType === component.componentType ? inspectComponentOverlay.fallbackTriggerRef : undefined}
                    onClick={(event) => {
                      inspectComponentOverlay.registerTrigger(event.currentTarget);
                      setInspectComponentType(component.componentType);
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    {buildScopedActionLabel(
                      locale,
                      getHomepageSurfaceActionLabel(locale, 'inspect'),
                      getComponentDisplayName(locale, component.componentType),
                    )}
                  </button>
                  <SurfaceCommandLink
                    href={buildPublicPresenceComponentAuthoringPath(tenantId, talentId, component.componentType)}
                    icon={<Code2 className="h-4 w-4" aria-hidden="true" />}
                    label={buildScopedActionLabel(
                      locale,
                      getHomepageSurfaceActionLabel(locale, 'openComponentIde'),
                      getComponentDisplayName(locale, component.componentType),
                    )}
                    tone="primary"
                  />
                </div>
              </PublicPresenceSurface>
            ))}
          </div>

          {inspectComponent ? (
            <PublicPresenceSurface
              aria-label={getHomepageSurfaceActionLabel(locale, 'inspectComponent')}
              aria-modal={false}
              className="fixed inset-x-3 bottom-3 z-40 max-h-[72vh] overflow-auto rounded-[2rem] border border-slate-200/90 bg-white/97 p-4 shadow-xl xl:sticky xl:top-24 xl:z-10 xl:max-h-[calc(100vh-7rem)] xl:w-full"
              data-testid="component-inspect-drawer"
              id={inspectComponentDrawerId}
              role="dialog"
              variant="inset"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-slate-950">
                    {getHomepageSurfaceActionLabel(locale, 'inspectComponent')}
                  </h2>
                  <p className="text-sm leading-6 text-slate-600">
                    {resolveText(locale, COMPONENT_PREVIEW_COPY[inspectComponent.componentType])}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={pickLocaleText(locale, {
                    en: 'Close component inspection',
                    zh_HANS: '关闭组件检查',
                    zh_HANT: '關閉元件檢查',
                    ja: 'コンポーネント確認を閉じる',
                    ko: '컴포넌트 검토 닫기',
                    fr: 'Fermer l’inspection du composant',
                  })}
                  onClick={() => setInspectComponentType(null)}
                  ref={inspectComponentOverlay.desktopInitialFocusRef}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <PublicPresenceBadge tone="rose">
                    {getComponentDisplayName(locale, inspectComponent.componentType)}
                  </PublicPresenceBadge>
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
                        en: 'Component ID:',
                        zh_HANS: '组件标识：',
                        zh_HANT: '元件識別：',
                        ja: 'コンポーネント ID:',
                        ko: '컴포넌트 ID:',
                        fr: 'ID du composant :',
                      })}
                    </span>{' '}
                    {inspectComponent.componentType}
                  </p>
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
            </PublicPresenceSurface>
          ) : (
            <PublicPresenceSurface className="space-y-4" variant="inset">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-slate-950">
                  {getHomepageSurfaceActionLabel(locale, 'inspectComponent')}
                </h2>
                <p className="text-sm leading-6 text-slate-600">
                  {pickLocaleText(locale, {
                    en: 'Choose a component card to inspect its editing range, preview role, and protected behavior.',
                    zh_HANS: '选择一个组件卡片，检查它的编辑范围、预览角色与受保护行为。',
                    zh_HANT: '選擇一個元件卡片，檢查它的編輯範圍、預覽角色與受保護行為。',
                    ja: 'コンポーネントカードを選択すると、編集範囲、プレビュー上の役割、保護された挙動を確認できます。',
                    ko: '컴포넌트 카드를 선택하면 편집 범위, 프리뷰 역할, 보호된 동작을 확인할 수 있습니다.',
                    fr: 'Choisissez une carte de composant pour inspecter sa portée d’edition, son rôle d’aperçu et son comportement protégé.',
                  })}
                </p>
              </div>
            </PublicPresenceSurface>
          )}
        </div>
      </div>
    </PublicPresenceShell>
  );
}
