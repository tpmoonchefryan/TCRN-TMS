'use client';

import type { PublicPresencePhaseVisibility, PublicPresenceProjection } from '@tcrn/shared';
import { DEFAULT_THEME, normalizeTheme } from '@tcrn/shared';
import {
  ArrowLeft,
  Eye,
  LayoutTemplate,
  Monitor,
  PanelRightOpen,
  RefreshCcw,
  Smartphone,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useId, useMemo, useState } from 'react';

import { preloadPublicHomepageProjectionMedia } from '@/domains/public-homepage/components/public-homepage-projection-media';
import { PublicHomepageProjectionRenderer } from '@/domains/public-homepage/components/PublicHomepageProjectionRenderer';
import { getHomepageCanvasStyle } from '@/domains/public-homepage/components/PublicHomepageRenderer';
import {
  PublicPresenceBadge,
  PublicPresenceShell,
  PublicPresenceStateView,
  PublicPresenceSurface,
} from '@/domains/public-presence';
import {
  type PublicPresenceStudioTemplateSummary,
  type PublicPresenceStudioWorkspaceResponse,
  readPublicPresenceDraftPreview,
  readPublicPresenceWorkspace,
} from '@/domains/public-presence-studio/api/public-presence-studio.api';
import {
  getPublicPresencePreviewPhaseLabel,
  getPublicPresenceStageSectionLabel,
  getPublicPresenceTemplateLabel,
  getPublicPresenceTemplateUseCase,
  PUBLIC_PRESENCE_PREVIEW_PHASES,
  usePublicPresenceStudioCopy,
} from '@/domains/public-presence-studio/screens/public-presence-studio.copy';
import { withPublicPresenceRouteTimeout } from '@/domains/public-presence-studio/screens/public-presence-studio.loading';
import { useOverlayFocusManager } from '@/domains/public-presence-studio/screens/public-presence-studio-overlay';
import {
  mergeUrlSearchParams,
  parseBooleanSearchParam,
  parseEnumSearchParam,
} from '@/domains/public-presence-studio/screens/public-presence-studio-url-state';
import { ApiRequestError } from '@/platform/http/api';
import {
  buildPublicPresenceStudioEditorPath,
  buildTalentWorkspaceSectionPath,
  mergePathSearchParams,
} from '@/platform/routing/workspace-paths';
import { pickLocaleText } from '@/platform/runtime/locale/locale-text';
import { useSession } from '@/platform/runtime/session/session-provider';

interface PreviewViewportMode {
  frameClassName: string;
  id: 'desktop' | 'mobile';
}

const PREVIEW_VIEWPORTS: PreviewViewportMode[] = [
  { id: 'desktop', frameClassName: 'min-h-[36rem] w-full' },
  { id: 'mobile', frameClassName: 'mx-auto min-h-[42rem] w-full max-w-[24rem]' },
];
const PREVIEW_VIEWPORT_QUERY_VALUES = ['desktop', 'mobile'] as const;
const PREVIEW_MOBILE_SHEET_VALUES = ['tools'] as const;

function getPreviewSectionIdentity(
  locale: string,
  section: PublicPresenceProjection['sections'][number],
  index: number
) {
  const label = getPublicPresenceStageSectionLabel(locale, section);
  const roleTitle = (() => {
    switch (section.kind) {
      case 'firstEncounter':
        return pickLocaleText(locale, {
          en: 'Hero',
          zh_HANS: '首屏',
          zh_HANT: '首屏',
          ja: 'ヒーロー',
          ko: '히어로',
          fr: 'Hero',
        });
      case 'officialChannels':
        return pickLocaleText(locale, {
          en: 'Social links',
          zh_HANS: '社交链接',
          zh_HANT: '社交連結',
          ja: 'ソーシャルリンク',
          ko: '소셜 링크',
          fr: 'Liens sociaux',
        });
      case 'fanActions':
        return pickLocaleText(locale, {
          en: 'Fan action',
          zh_HANS: '粉丝动作',
          zh_HANT: '粉絲動作',
          ja: 'ファンアクション',
          ko: '팬 액션',
          fr: 'Action fan',
        });
      case 'agencyNotes':
        return pickLocaleText(locale, {
          en: 'Agency note',
          zh_HANS: '运营备注',
          zh_HANT: '營運備註',
          ja: '運用メモ',
          ko: '운영 메모',
          fr: 'Note d’operation',
        });
      default:
        return 'title' in section &&
          typeof section.title === 'string' &&
          section.title.trim().length > 0
          ? section.title.trim()
          : label;
    }
  })();

  return {
    badge: pickLocaleText(locale, {
      en: `Section ${index + 1}`,
      zh_HANS: `分区 ${index + 1}`,
      zh_HANT: `分區 ${index + 1}`,
      ja: `セクション ${index + 1}`,
      ko: `섹션 ${index + 1}`,
      fr: `Section ${index + 1}`,
    }),
    buttonLabel: `${index + 1}. ${roleTitle}: ${label}`,
    title: roleTitle,
  };
}

function getErrorMessage(reason: unknown, fallback: string) {
  if (reason instanceof ApiRequestError || reason instanceof Error) {
    return reason.message;
  }

  return fallback;
}

function resolveCurrentTemplate(
  workspace: PublicPresenceStudioWorkspaceResponse | null,
  selectedTemplateId: string
): PublicPresenceStudioTemplateSummary | null {
  return (
    workspace?.templates.find(
      (template) => template.templateId === (workspace.selectedTemplateId ?? selectedTemplateId)
    ) ?? null
  );
}

function getHomepagePolicyBlockedState(locale: string) {
  return {
    description: pickLocaleText(locale, {
      en: 'The current Artist Stage policy does not allow this Homepage Template Type in Fan Preview.',
      zh_HANS: '当前 Artist Stage 策略不允许此 Homepage Template Type 进入粉丝预览。',
      zh_HANT: '目前 Artist Stage 策略不允許此 Homepage Template Type 進入粉絲預覽。',
      ja: '現在の Artist Stage ポリシーでは、この Homepage Template Type をファンプレビューで表示できません。',
      ko: '현재 Artist Stage 정책은 이 Homepage Template Type의 팬 미리보기를 허용하지 않습니다.',
      fr: 'La politique Artist Stage actuelle n’autorise pas ce Homepage Template Type dans le Fan Preview.',
    }),
    title: pickLocaleText(locale, {
      en: 'Fan preview blocked by Artist Stage policy',
      zh_HANS: '粉丝预览已被 Artist Stage 策略阻止',
      zh_HANT: '粉絲預覽已被 Artist Stage 策略阻止',
      ja: 'Artist Stage ポリシーによりファンプレビューがブロックされています',
      ko: 'Artist Stage 정책이 팬 미리보기를 차단했습니다',
      fr: 'Fan Preview bloqué par la politique Artist Stage',
    }),
  };
}

export function PublicPresencePreviewScreen({
  initialTemplateId,
  talentId,
  tenantId,
}: Readonly<{
  initialTemplateId?: string | null;
  talentId: string;
  tenantId: string;
}>) {
  const { copy, locale } = usePublicPresenceStudioCopy();
  const { request, session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const [workspace, setWorkspace] = useState<PublicPresenceStudioWorkspaceResponse | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewProjection, setPreviewProjection] = useState<PublicPresenceProjection | null>(null);
  const [previewPhase, setPreviewPhase] = useState<PublicPresencePhaseVisibility | 'current'>(
    'current'
  );
  const [previewViewport, setPreviewViewport] = useState<PreviewViewportMode['id']>('desktop');
  const [selectedPreviewSectionId, setSelectedPreviewSectionId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [mobilePreviewToolsOpen, setMobilePreviewToolsOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    initialTemplateId ?? 'activeTalentHub'
  );
  const mobilePreviewToolsSheetId = useId();
  const detailsSurfaceId = useId();
  const queryState = useMemo(
    () => ({
      detailsOpen: parseBooleanSearchParam(searchParams.get('details')) ?? false,
      mobileSheet: parseEnumSearchParam(searchParams.get('sheet'), PREVIEW_MOBILE_SHEET_VALUES),
      previewPhase:
        parseEnumSearchParam(searchParams.get('phase'), [
          'current',
          ...PUBLIC_PRESENCE_PREVIEW_PHASES,
        ] as const) ?? 'current',
      previewViewport:
        parseEnumSearchParam(searchParams.get('viewport'), PREVIEW_VIEWPORT_QUERY_VALUES) ??
        'desktop',
      selectedPreviewSectionId: searchParams.get('section'),
    }),
    [searchKey, searchParams]
  );

  useEffect(() => {
    let cancelled = false;

    const loadWorkspace = async () => {
      setLoading(true);
      setWorkspaceError(null);

      try {
        const result = await withPublicPresenceRouteTimeout(
          readPublicPresenceWorkspace(request, talentId, selectedTemplateId),
          pickLocaleText(locale, {
            en: 'Preview route took too long to load. Refresh the page or confirm the local API is running.',
            zh_HANS: '预览路由加载时间过长。请刷新页面，或确认本地 API 已启动。',
            zh_HANT: '預覽路由載入時間過長。請重新整理頁面，或確認本地 API 已啟動。',
            ja: 'プレビュールートの読み込みに時間がかかりすぎています。再読み込みするか、ローカル API が起動しているか確認してください。',
            ko: '미리보기 라우트 로딩이 너무 오래 걸립니다. 페이지를 새로고침하거나 로컬 API가 실행 중인지 확인하세요.',
            fr: 'La route d’aperçu met trop de temps à charger. Actualisez la page ou vérifiez que l’API locale tourne bien.',
          })
        );

        if (cancelled) {
          return;
        }

        setWorkspace(result);
        setSelectedTemplateId(result.selectedTemplateId || selectedTemplateId);
      } catch (reason) {
        if (cancelled) {
          return;
        }

        setWorkspace(null);
        setWorkspaceError(getErrorMessage(reason, copy.state.loadWorkspaceError));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [copy.state.loadWorkspaceError, request, selectedTemplateId, talentId]);

  useEffect(() => {
    if (!workspace?.draftVersion || workspace.homepagePolicy.status !== 'ready') {
      setPreviewProjection(null);
      setSelectedPreviewSectionId(null);
      return;
    }

    let cancelled = false;

    const loadPreview = async () => {
      setPreviewLoading(true);
      setPreviewError(null);

      try {
        const result = await withPublicPresenceRouteTimeout(
          readPublicPresenceDraftPreview(
            request,
            talentId,
            previewPhase,
            workspace.selectedTemplateId ?? selectedTemplateId
          ),
          pickLocaleText(locale, {
            en: 'Fan preview took too long to refresh. Refresh the page or confirm the local API is running.',
            zh_HANS: '粉丝预览刷新时间过长。请刷新页面，或确认本地 API 已启动。',
            zh_HANT: '粉絲預覽刷新時間過長。請重新整理頁面，或確認本地 API 已啟動。',
            ja: 'ファンプレビューの更新に時間がかかりすぎています。再読み込みするか、ローカル API が起動しているか確認してください。',
            ko: '팬 미리보기 새로고침이 너무 오래 걸립니다. 페이지를 새로고침하거나 로컬 API가 실행 중인지 확인하세요.',
            fr: 'Le fan preview met trop de temps à se rafraîchir. Actualisez la page ou vérifiez que l’API locale tourne bien.',
          })
        );

        await preloadPublicHomepageProjectionMedia(result);

        if (cancelled) {
          return;
        }

        setPreviewProjection(result);
        setSelectedPreviewSectionId((current) => current ?? result.sections[0]?.id ?? null);
      } catch (reason) {
        if (cancelled) {
          return;
        }

        setPreviewProjection(null);
        setSelectedPreviewSectionId(null);
        setPreviewError(getErrorMessage(reason, copy.state.previewBuildError));
      } finally {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      }
    };

    void loadPreview();

    return () => {
      cancelled = true;
    };
  }, [
    copy.state.previewBuildError,
    previewPhase,
    request,
    selectedTemplateId,
    talentId,
    workspace?.draftVersion,
    workspace?.homepagePolicy.status,
    workspace?.selectedTemplateId,
  ]);

  useEffect(() => {
    setPreviewViewport((current) =>
      current === queryState.previewViewport ? current : queryState.previewViewport
    );
    setPreviewPhase((current) =>
      current === queryState.previewPhase ? current : queryState.previewPhase
    );

    const nextMobilePreviewToolsOpen =
      queryState.previewViewport === 'mobile' &&
      !queryState.detailsOpen &&
      queryState.mobileSheet === 'tools';
    setMobilePreviewToolsOpen((current) =>
      current === nextMobilePreviewToolsOpen ? current : nextMobilePreviewToolsOpen
    );
    setDetailsOpen((current) =>
      current === queryState.detailsOpen ? current : queryState.detailsOpen
    );
  }, [
    queryState.detailsOpen,
    queryState.mobileSheet,
    queryState.previewPhase,
    queryState.previewViewport,
  ]);

  useEffect(() => {
    if (previewViewport === 'mobile' && detailsOpen && mobilePreviewToolsOpen) {
      setMobilePreviewToolsOpen(false);
    }
  }, [detailsOpen, mobilePreviewToolsOpen, previewViewport]);

  const templateVersions = workspace?.pageVersions ?? [];
  const currentTemplate = resolveCurrentTemplate(workspace, selectedTemplateId);
  const homepagePolicyBlocked = workspace?.homepagePolicy.status === 'blocked';
  const homepagePolicyBlockedState = getHomepagePolicyBlockedState(locale);
  const mobilePreviewToolsOverlay = useOverlayFocusManager({
    onClose: () => setMobilePreviewToolsOpen(false),
    open: mobilePreviewToolsOpen,
  });
  const detailsOverlay = useOverlayFocusManager({
    onClose: () => setDetailsOpen(false),
    open: detailsOpen,
  });
  const selectedPreviewSection =
    previewProjection?.sections.find((section) => section.id === selectedPreviewSectionId) ?? null;
  const viewportFrameClass =
    PREVIEW_VIEWPORTS.find((viewport) => viewport.id === previewViewport)?.frameClassName ??
    PREVIEW_VIEWPORTS[0].frameClassName;
  const previewTheme = normalizeTheme(previewProjection?.appearance.theme || DEFAULT_THEME);
  const previewCanvasStyle = useMemo(
    () => ({
      ...getHomepageCanvasStyle(previewTheme),
      minHeight: '100%',
    }),
    [previewTheme]
  );
  const previewPhaseOptions = useMemo(
    () =>
      PUBLIC_PRESENCE_PREVIEW_PHASES.map((value) => ({
        value,
        label: getPublicPresencePreviewPhaseLabel(locale, value),
      })),
    [locale]
  );
  const editorHref = buildPublicPresenceStudioEditorPath(
    tenantId,
    talentId,
    workspace?.selectedTemplateId ?? selectedTemplateId
  );
  const managementHref = buildTalentWorkspaceSectionPath(tenantId, talentId, 'homepage');
  const currentTemplateId = workspace?.selectedTemplateId ?? selectedTemplateId;
  const persistTemplateQuery =
    searchParams.has('templateId') || currentTemplateId !== 'activeTalentHub';
  const selectedSectionEditorHref = selectedPreviewSection
    ? mergePathSearchParams(
        buildPublicPresenceStudioEditorPath(tenantId, talentId, currentTemplateId),
        {
          leftPanel: 'sections',
          stagePanel: `edit:${selectedPreviewSection.kind}`,
        }
      )
    : editorHref;

  useEffect(() => {
    if (!previewProjection?.sections.length) {
      if (selectedPreviewSectionId !== null) {
        setSelectedPreviewSectionId(null);
      }

      return;
    }

    const requestedSectionId = queryState.selectedPreviewSectionId;
    const nextSectionId =
      requestedSectionId &&
      previewProjection.sections.some((section) => section.id === requestedSectionId)
        ? requestedSectionId
        : (previewProjection.sections[0]?.id ?? null);

    if (selectedPreviewSectionId !== nextSectionId) {
      setSelectedPreviewSectionId(nextSectionId);
    }
  }, [previewProjection, queryState.selectedPreviewSectionId, selectedPreviewSectionId]);

  useEffect(() => {
    if (!workspace?.draftVersion) {
      return;
    }

    const nextSearch = mergeUrlSearchParams(searchParams, {
      details: detailsOpen ? '1' : null,
      phase: previewPhase === 'current' ? null : previewPhase,
      section: selectedPreviewSectionId,
      sheet:
        mobilePreviewToolsOpen && previewViewport === 'mobile' && !detailsOpen ? 'tools' : null,
      templateId: persistTemplateQuery ? currentTemplateId : null,
      viewport: previewViewport === 'desktop' ? null : previewViewport,
    }).toString();

    if (nextSearch === searchKey) {
      return;
    }

    router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, {
      scroll: false,
    });
  }, [
    currentTemplateId,
    detailsOpen,
    mobilePreviewToolsOpen,
    pathname,
    previewPhase,
    previewViewport,
    router,
    searchKey,
    searchParams,
    selectedPreviewSectionId,
    persistTemplateQuery,
    workspace?.draftVersion,
  ]);
  const previewStatusLabel = previewLoading
    ? pickLocaleText(locale, {
        en: 'Refreshing preview',
        zh_HANS: '正在刷新预览',
        zh_HANT: '正在刷新預覽',
        ja: 'プレビューを更新しています',
        ko: '미리보기를 새로고침하는 중입니다',
        fr: 'Actualisation de l’aperçu',
      })
    : copy.fanPreview.savedState;
  const previewStatusCompactLabel = previewLoading
    ? pickLocaleText(locale, {
        en: 'Refreshing',
        zh_HANS: '刷新中',
        zh_HANT: '刷新中',
        ja: '更新中',
        ko: '새로고침 중',
        fr: 'Actualisation',
      })
    : copy.common.saved;
  const pageVersionLabel = pickLocaleText(locale, {
    en: 'Page version',
    zh_HANS: '页面版本',
    zh_HANT: '頁面版本',
    ja: 'ページバージョン',
    ko: '페이지 버전',
    fr: 'Version de page',
  });
  const inspectSectionsLabel = pickLocaleText(locale, {
    en: 'Inspect sections',
    zh_HANS: '查看分区',
    zh_HANT: '查看分區',
    ja: 'セクション確認',
    ko: '섹션 보기',
    fr: 'Inspecter les sections',
  });
  const previewToolsLabel = pickLocaleText(locale, {
    en: 'Preview tools',
    zh_HANS: '预览工具',
    zh_HANT: '預覽工具',
    ja: 'プレビュー操作',
    ko: '미리보기 도구',
    fr: 'Outils aperçu',
  });
  const backToManagementLabel = pickLocaleText(locale, {
    en: 'Back to management',
    zh_HANS: '返回管理页',
    zh_HANT: '返回管理頁',
    ja: '管理ページへ戻る',
    ko: '관리 페이지로 돌아가기',
    fr: 'Retour a la gestion',
  });
  const openEditorLabel = pickLocaleText(locale, {
    en: 'Open editor',
    zh_HANS: '打开编辑器',
    zh_HANT: '打開編輯器',
    ja: 'エディタを開く',
    ko: '편집기 열기',
    fr: 'Ouvrir l’editeur',
  });

  if (loading) {
    return (
      <PublicPresenceShell decorationDensity="calm" width="xl">
        <PublicPresenceStateView
          description={copy.state.previewLoadingDescription}
          icon={<RefreshCcw className="animate-spin" />}
          title={copy.state.previewLoadingTitle}
          tone="info"
        />
      </PublicPresenceShell>
    );
  }

  if (!workspace) {
    return (
      <PublicPresenceShell decorationDensity="calm" width="xl">
        <PublicPresenceStateView
          description={workspaceError ?? ''}
          title={copy.state.previewUnavailableTitle}
          tone="error"
        />
      </PublicPresenceShell>
    );
  }

  return (
    <PublicPresenceShell
      className="px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-3"
      contentClassName="max-w-none"
      decorationDensity="calm"
    >
      <div className="space-y-2">
        <PublicPresenceSurface
          className="sticky top-2 z-20 px-3 py-1.5 shadow-sm backdrop-blur sm:px-3 sm:py-1.5 lg:px-3 lg:py-1.5"
          data-testid="preview-topbar"
        >
          <div className="space-y-2 sm:hidden">
            <div className="flex items-center justify-between gap-2">
              <PublicPresenceBadge icon={<Eye />} tone="rose">
                {copy.fanPreview.badge}
              </PublicPresenceBadge>
              <div className="flex items-center gap-2">
                <Link
                  href={managementHref}
                  aria-label={backToManagementLabel}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {pickLocaleText(locale, {
                      en: 'Back',
                      zh_HANS: '返回',
                      zh_HANT: '返回',
                      ja: '戻る',
                      ko: '뒤로',
                      fr: 'Retour',
                    })}
                  </span>
                </Link>
                <Link
                  href={editorHref}
                  aria-label={openEditorLabel}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-3 py-1.5 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
                >
                  <LayoutTemplate className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {pickLocaleText(locale, {
                      en: 'Editor',
                      zh_HANS: '编辑器',
                      zh_HANT: '編輯器',
                      ja: 'エディタ',
                      ko: '편집기',
                      fr: 'Editeur',
                    })}
                  </span>
                </Link>
              </div>
            </div>
            <label className="block text-sm text-slate-700">
              <span className="sr-only">{pageVersionLabel}</span>
              <select
                value={currentTemplateId}
                onChange={(event) => setSelectedTemplateId(event.target.value)}
                className="w-full rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 transition outline-none focus:border-rose-300"
              >
                {templateVersions.map((pageVersion) => {
                  const template = workspace.templates.find(
                    (entry) => entry.templateId === pageVersion.templateId
                  ) ?? {
                    label: pageVersion.templateId,
                    templateId: pageVersion.templateId,
                    useCase: pageVersion.templateId,
                  };

                  const suffix = pageVersion.liveVersion
                    ? pickLocaleText(locale, {
                        en: 'live',
                        zh_HANS: '线上',
                        zh_HANT: '線上',
                        ja: '公開中',
                        ko: '라이브',
                        fr: 'en ligne',
                      })
                    : pickLocaleText(locale, {
                        en: 'draft',
                        zh_HANS: '草稿',
                        zh_HANT: '草稿',
                        ja: 'ドラフト',
                        ko: '초안',
                        fr: 'brouillon',
                      });

                  return (
                    <option key={pageVersion.templateId} value={pageVersion.templateId}>
                      {getPublicPresenceTemplateLabel(locale, template)} · {suffix}
                    </option>
                  );
                })}
              </select>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PREVIEW_VIEWPORTS.map((viewport) => (
                <button
                  key={viewport.id}
                  type="button"
                  onClick={() => setPreviewViewport(viewport.id)}
                  aria-pressed={previewViewport === viewport.id}
                  className={`inline-flex items-center justify-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                    previewViewport === viewport.id
                      ? 'border-rose-300 bg-rose-50 text-rose-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {viewport.id === 'desktop' ? (
                    <Monitor className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Smartphone className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span>
                    {viewport.id === 'desktop'
                      ? copy.fanPreview.desktopMode
                      : copy.fanPreview.mobileMode}
                  </span>
                </button>
              ))}
              <button
                type="button"
                aria-label={previewToolsLabel}
                aria-controls={mobilePreviewToolsSheetId}
                aria-expanded={mobilePreviewToolsOpen}
                aria-haspopup="dialog"
                aria-pressed={mobilePreviewToolsOpen}
                ref={mobilePreviewToolsOverlay.fallbackTriggerRef}
                onClick={(event) => {
                  mobilePreviewToolsOverlay.registerTrigger(event.currentTarget);
                  setMobilePreviewToolsOpen(true);
                }}
                className={`inline-flex items-center justify-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  mobilePreviewToolsOpen
                    ? 'border-rose-300 bg-rose-50 text-rose-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <PanelRightOpen className="h-4 w-4" aria-hidden="true" />
                <span>
                  {pickLocaleText(locale, {
                    en: 'Tools',
                    zh_HANS: '工具',
                    zh_HANT: '工具',
                    ja: '操作',
                    ko: '도구',
                    fr: 'Outils',
                  })}
                </span>
              </button>
            </div>
          </div>

          <div className="hidden flex-wrap items-center gap-2 sm:flex">
            <PublicPresenceBadge icon={<Eye />} tone="rose">
              {copy.fanPreview.badge}
            </PublicPresenceBadge>
            <PublicPresenceBadge className="hidden xl:inline-flex" tone="slate" variant="outline">
              {session?.tenantName ?? tenantId}
            </PublicPresenceBadge>
            {currentTemplate ? (
              <PublicPresenceBadge className="hidden xl:inline-flex" tone="slate" variant="outline">
                {getPublicPresenceTemplateLabel(locale, currentTemplate)}
              </PublicPresenceBadge>
            ) : null}
            <label className="min-w-[12rem] shrink-0 text-sm text-slate-700 xl:min-w-[13rem]">
              <span className="sr-only">{pageVersionLabel}</span>
              <select
                value={currentTemplateId}
                onChange={(event) => setSelectedTemplateId(event.target.value)}
                className="w-full rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 transition outline-none focus:border-rose-300"
              >
                {templateVersions.map((pageVersion) => {
                  const template = workspace.templates.find(
                    (entry) => entry.templateId === pageVersion.templateId
                  ) ?? {
                    label: pageVersion.templateId,
                    templateId: pageVersion.templateId,
                    useCase: pageVersion.templateId,
                  };

                  const suffix = pageVersion.liveVersion
                    ? pickLocaleText(locale, {
                        en: 'live',
                        zh_HANS: '线上',
                        zh_HANT: '線上',
                        ja: '公開中',
                        ko: '라이브',
                        fr: 'en ligne',
                      })
                    : pickLocaleText(locale, {
                        en: 'draft',
                        zh_HANS: '草稿',
                        zh_HANT: '草稿',
                        ja: 'ドラフト',
                        ko: '초안',
                        fr: 'brouillon',
                      });

                  return (
                    <option key={pageVersion.templateId} value={pageVersion.templateId}>
                      {getPublicPresenceTemplateLabel(locale, template)} · {suffix}
                    </option>
                  );
                })}
              </select>
            </label>
            {PREVIEW_VIEWPORTS.map((viewport) => (
              <button
                key={viewport.id}
                type="button"
                onClick={() => setPreviewViewport(viewport.id)}
                aria-pressed={previewViewport === viewport.id}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  previewViewport === viewport.id
                    ? 'border-rose-300 bg-rose-50 text-rose-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {viewport.id === 'desktop' ? (
                  <Monitor className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Smartphone className="h-4 w-4" aria-hidden="true" />
                )}
                {viewport.id === 'desktop'
                  ? copy.fanPreview.desktopMode
                  : copy.fanPreview.mobileMode}
              </button>
            ))}
            <label className="shrink-0 text-sm text-slate-700">
              <span className="sr-only">{copy.fanPreview.simulatePhase}</span>
              <select
                value={previewPhase}
                onChange={(event) =>
                  setPreviewPhase(event.target.value as PublicPresencePhaseVisibility | 'current')
                }
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 transition outline-none focus:border-rose-300"
              >
                {previewPhaseOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              aria-controls={detailsSurfaceId}
              aria-expanded={detailsOpen}
              aria-label={inspectSectionsLabel}
              aria-pressed={detailsOpen}
              ref={detailsOverlay.fallbackTriggerRef}
              onClick={(event) => {
                detailsOverlay.registerTrigger(event.currentTarget);
                setDetailsOpen((current) => !current);
              }}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                detailsOpen
                  ? 'border-rose-300 bg-rose-50 text-rose-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <PanelRightOpen className="h-4 w-4" aria-hidden="true" />
              <span aria-hidden="true" className="xl:hidden">
                {pickLocaleText(locale, {
                  en: 'Inspect',
                  zh_HANS: '查看',
                  zh_HANT: '查看',
                  ja: '確認',
                  ko: '보기',
                  fr: 'Inspecter',
                })}
              </span>
              <span aria-hidden="true" className="hidden xl:inline">
                {inspectSectionsLabel}
              </span>
            </button>
            <div
              role="status"
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
                previewLoading
                  ? 'border-sky-200 bg-sky-50 text-sky-800'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800'
              }`}
            >
              <span className="xl:hidden">{previewStatusCompactLabel}</span>
              <span className="hidden xl:inline">{previewStatusLabel}</span>
            </div>
            <Link
              href={managementHref}
              aria-label={backToManagementLabel}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span aria-hidden="true" className="xl:hidden">
                {pickLocaleText(locale, {
                  en: 'Back',
                  zh_HANS: '返回',
                  zh_HANT: '返回',
                  ja: '戻る',
                  ko: '뒤로',
                  fr: 'Retour',
                })}
              </span>
              <span aria-hidden="true" className="hidden xl:inline">
                {backToManagementLabel}
              </span>
            </Link>
            <Link
              href={editorHref}
              aria-label={openEditorLabel}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-rose-200 bg-white px-3 py-1.5 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
            >
              <LayoutTemplate className="h-4 w-4" aria-hidden="true" />
              <span aria-hidden="true" className="xl:hidden">
                {pickLocaleText(locale, {
                  en: 'Editor',
                  zh_HANS: '编辑器',
                  zh_HANT: '編輯器',
                  ja: 'エディタ',
                  ko: '편집기',
                  fr: 'Editeur',
                })}
              </span>
              <span aria-hidden="true" className="hidden xl:inline">
                {openEditorLabel}
              </span>
            </Link>
          </div>
        </PublicPresenceSurface>

        {previewError ? (
          <PublicPresenceStateView
            description={previewError}
            title={copy.state.previewUnavailableTitle}
            tone="error"
          />
        ) : null}

        {homepagePolicyBlocked ? (
          <PublicPresenceStateView
            data-testid="preview-homepage-policy-blocked"
            description={homepagePolicyBlockedState.description}
            title={homepagePolicyBlockedState.title}
            tone="warning"
          />
        ) : null}

        {!homepagePolicyBlocked && !workspace.draftVersion ? (
          <PublicPresenceStateView
            description={copy.state.previewWaitingDescription}
            title={copy.state.previewWaitingTitle}
            tone="info"
          />
        ) : null}

        {workspace.draftVersion && !previewError && !homepagePolicyBlocked ? (
          <div className="relative">
            <PublicPresenceSurface
              className="relative flex min-h-[calc(100vh-4.75rem)] flex-col border border-slate-200/80 bg-white/95 p-0 sm:p-0 lg:p-0"
              data-testid="preview-canvas-stage"
            >
              <div
                aria-label={copy.fanPreview.frameLabel}
                className={`min-h-0 flex-1 overflow-hidden px-3 pt-3 pb-3 sm:px-4 sm:pt-4 sm:pb-4 ${viewportFrameClass}`}
              >
                <div className="h-full overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white/80 p-3">
                  <div
                    className="h-full overflow-auto rounded-[1.5rem] px-4 py-5 sm:px-6 sm:py-6"
                    style={previewCanvasStyle}
                  >
                    {previewProjection ? (
                      <div
                        className={
                          previewViewport === 'mobile' ? 'mx-auto w-full' : 'mx-auto max-w-4xl'
                        }
                      >
                        <PublicHomepageProjectionRenderer
                          projection={previewProjection}
                          responsiveMode={previewViewport}
                        />
                      </div>
                    ) : (
                      <div className="flex min-h-[28rem] items-center justify-center">
                        <PublicPresenceStateView
                          description={copy.state.previewLoadingDescription}
                          icon={<RefreshCcw className="animate-spin" />}
                          title={copy.state.previewLoadingTitle}
                          tone="info"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </PublicPresenceSurface>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/95 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <div
                  role="status"
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    previewLoading
                      ? 'border-sky-200 bg-sky-50 text-sky-800'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  }`}
                >
                  {previewStatusCompactLabel}
                </div>
                {previewProjection ? (
                  <PublicPresenceBadge
                    className="hidden sm:inline-flex"
                    tone="slate"
                    variant="outline"
                  >
                    {copy.fanPreview.resolvedPhaseLabel}:{' '}
                    {getPublicPresencePreviewPhaseLabel(
                      locale,
                      previewProjection.resolvedRevealPhase
                    )}
                  </PublicPresenceBadge>
                ) : null}
                {selectedPreviewSection ? (
                  <PublicPresenceBadge
                    className="hidden sm:inline-flex"
                    tone="slate"
                    variant="outline"
                  >
                    {copy.fanPreview.selectedSectionLabel}:{' '}
                    {getPublicPresenceStageSectionLabel(locale, selectedPreviewSection)}
                  </PublicPresenceBadge>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="min-w-[10rem] text-sm text-slate-700 sm:min-w-[12rem]">
                  <span className="sr-only">{copy.fanPreview.simulatePhase}</span>
                  <select
                    value={previewPhase}
                    onChange={(event) =>
                      setPreviewPhase(
                        event.target.value as PublicPresencePhaseVisibility | 'current'
                      )
                    }
                    className="w-full rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 transition outline-none focus:border-rose-300"
                  >
                    {previewPhaseOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            {mobilePreviewToolsOpen ? (
              <PublicPresenceSurface
                aria-label={pickLocaleText(locale, {
                  en: 'Preview tools sheet',
                  zh_HANS: '预览工具抽屉',
                  zh_HANT: '預覽工具抽屜',
                  ja: 'プレビュー操作シート',
                  ko: '미리보기 도구 시트',
                  fr: 'Feuille outils aperçu',
                })}
                aria-modal
                className="!fixed inset-x-3 bottom-3 z-40 max-h-[72vh] overflow-auto rounded-[2rem] border border-slate-200/90 bg-white/97 p-4 shadow-xl sm:hidden"
                data-testid="preview-mobile-tools-sheet"
                id={mobilePreviewToolsSheetId}
                role="dialog"
                variant="inset"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold text-slate-950">{previewToolsLabel}</h2>
                    <p className="text-sm text-slate-600">
                      {pickLocaleText(locale, {
                        en: 'Use this sheet to inspect sections, switch phase, and check preview status.',
                        zh_HANS: '在这里查看分区、切换阶段并确认预览状态。',
                        zh_HANT: '在這裡查看分區、切換階段並確認預覽狀態。',
                        ja: 'ここでセクション確認、フェーズ切替、プレビュー状態の確認を行います。',
                        ko: '이 시트에서 섹션 확인, 단계 전환, 미리보기 상태 확인을 진행합니다.',
                        fr: "Utilisez cette feuille pour inspecter les sections, changer de phase et vérifier l'état de l’aperçu.",
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobilePreviewToolsOpen(false)}
                    ref={mobilePreviewToolsOverlay.mobileInitialFocusRef}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    {pickLocaleText(locale, {
                      en: 'Close',
                      zh_HANS: '关闭',
                      zh_HANT: '關閉',
                      ja: '閉じる',
                      ko: '닫기',
                      fr: 'Fermer',
                    })}
                  </button>
                </div>
                <div className="grid gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      detailsOverlay.registerTrigger(null);
                      setDetailsOpen((current) => !current);
                      setMobilePreviewToolsOpen(false);
                    }}
                    className={`inline-flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                      detailsOpen
                        ? 'border-rose-300 bg-rose-50 text-rose-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span>{inspectSectionsLabel}</span>
                    <PanelRightOpen className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <label className="text-sm text-slate-700">
                    <span className="mb-2 block font-medium text-slate-700">
                      {copy.fanPreview.simulatePhase}
                    </span>
                    <select
                      value={previewPhase}
                      onChange={(event) =>
                        setPreviewPhase(
                          event.target.value as PublicPresencePhaseVisibility | 'current'
                        )
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 transition outline-none focus:border-rose-300"
                    >
                      {previewPhaseOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div
                    role="status"
                    className={`rounded-2xl border px-4 py-3 text-sm ${
                      previewLoading
                        ? 'border-sky-200 bg-sky-50 text-sky-800'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    }`}
                  >
                    {previewStatusLabel}
                  </div>
                  {previewProjection ? (
                    <PublicPresenceBadge tone="slate" variant="outline">
                      {copy.fanPreview.resolvedPhaseLabel}:{' '}
                      {getPublicPresencePreviewPhaseLabel(
                        locale,
                        previewProjection.resolvedRevealPhase
                      )}
                    </PublicPresenceBadge>
                  ) : null}
                  {selectedPreviewSection ? (
                    <PublicPresenceBadge tone="slate" variant="outline">
                      {copy.fanPreview.selectedSectionLabel}:{' '}
                      {getPublicPresenceStageSectionLabel(locale, selectedPreviewSection)}
                    </PublicPresenceBadge>
                  ) : null}
                </div>
              </PublicPresenceSurface>
            ) : null}
            {detailsOpen ? (
              <PublicPresenceSurface
                aria-label={pickLocaleText(locale, {
                  en: 'Preview inspector',
                  zh_HANS: '预览查看面板',
                  zh_HANT: '預覽查看面板',
                  ja: 'プレビュー確認パネル',
                  ko: '미리보기 검사 패널',
                  fr: 'Inspecteur aperçu',
                })}
                aria-modal={false}
                className="!fixed inset-x-3 bottom-3 z-40 max-h-[70vh] overflow-auto rounded-[2rem] border border-slate-200/90 bg-white/97 p-4 shadow-xl lg:sticky lg:top-20 lg:ml-auto lg:w-[20rem]"
                data-testid="preview-side-rail"
                id={detailsSurfaceId}
                role="dialog"
                variant="inset"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold text-slate-950">
                      {copy.fanPreview.previewSectionsTitle}
                    </h2>
                    <p className="text-sm text-slate-600">
                      {currentTemplate
                        ? getPublicPresenceTemplateUseCase(locale, currentTemplate)
                        : copy.fanPreview.selectedSectionEmpty}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDetailsOpen(false)}
                    ref={detailsOverlay.desktopInitialFocusRef}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">
                      {pickLocaleText(locale, {
                        en: 'Close inspector',
                        zh_HANS: '关闭查看面板',
                        zh_HANT: '關閉查看面板',
                        ja: 'インスペクターを閉じる',
                        ko: '검사 패널 닫기',
                        fr: 'Fermer l’inspecteur',
                      })}
                    </span>
                  </button>
                </div>
                {previewProjection?.sections.length ? (
                  <div className="space-y-3">
                    {previewProjection.sections.map((section, index) => {
                      const identity = getPreviewSectionIdentity(locale, section, index);

                      return (
                        <button
                          key={section.id}
                          type="button"
                          onClick={() => setSelectedPreviewSectionId(section.id)}
                          aria-label={identity.buttonLabel}
                          aria-pressed={selectedPreviewSectionId === section.id}
                          className={`w-full rounded-3xl border px-4 py-3 text-left transition ${
                            selectedPreviewSectionId === section.id
                              ? 'border-rose-300 bg-rose-50'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <PublicPresenceBadge tone="slate" variant="outline">
                                {identity.badge}
                              </PublicPresenceBadge>
                              <PublicPresenceBadge tone="rose">
                                {getPublicPresenceStageSectionLabel(locale, section)}
                              </PublicPresenceBadge>
                              <PublicPresenceBadge tone="slate" variant="outline">
                                {copy.fanPreview.validationMarkersPrefix}{' '}
                                {section.validationIssueIds.length}
                              </PublicPresenceBadge>
                            </div>
                            <p className="text-sm font-semibold text-slate-950">{identity.title}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-slate-600">{copy.fanPreview.noSections}</p>
                )}

                {selectedPreviewSection ? (
                  <div className="mt-4 space-y-3 rounded-3xl border border-slate-200 bg-white px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <PublicPresenceBadge tone="rose">
                        {copy.fanPreview.selectedSectionLabel}
                      </PublicPresenceBadge>
                      <PublicPresenceBadge tone="slate" variant="outline">
                        {getPublicPresenceStageSectionLabel(locale, selectedPreviewSection)}
                      </PublicPresenceBadge>
                    </div>
                    <p className="text-sm leading-6 text-slate-600">
                      {copy.fanPreview.validationMarkersPrefix}:{' '}
                      {selectedPreviewSection.validationIssueIds.length}
                    </p>
                    <Link
                      href={selectedSectionEditorHref}
                      className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
                    >
                      <LayoutTemplate className="h-4 w-4" aria-hidden="true" />
                      {pickLocaleText(locale, {
                        en: 'Edit this section',
                        zh_HANS: '编辑这个分区',
                        zh_HANT: '編輯這個分區',
                        ja: 'このセクションを編集',
                        ko: '이 섹션 편집',
                        fr: 'Éditer cette section',
                      })}
                    </Link>
                    {selectedPreviewSection.fallbackBehavior === 'lockedSourceOwned' ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        {copy.fanPreview.lockedOverlay}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </PublicPresenceSurface>
            ) : null}
          </div>
        ) : null}
      </div>
    </PublicPresenceShell>
  );
}
