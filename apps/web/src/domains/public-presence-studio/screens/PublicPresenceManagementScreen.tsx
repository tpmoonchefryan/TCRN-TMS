'use client';

import {
  ArrowLeftRight,
  CalendarClock,
  CircleGauge,
  Globe2,
  LayoutTemplate,
  MonitorPlay,
  Rocket,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';

import type { PublicPresenceValidationSnapshot } from '@tcrn/shared';

import {
  PublicPresenceBadge,
  PublicPresenceShell,
  PublicPresenceStateView,
  PublicPresenceSurface,
} from '@/domains/public-presence';
import {
  type PublicPresenceStudioPageVersionSummary,
  type PublicPresenceStudioWorkspaceResponse,
  readPublicPresenceWorkspace,
} from '@/domains/public-presence-studio/api/public-presence-studio.api';
import {
  formatPublicPresenceStudioDateTime,
  formatPublicPresenceStudioValidationSummary,
  getHomepageSurfaceActionLabel,
  getHomepageSurfaceLabel,
  getPublicPresenceDocumentStateLabel,
  getPublicPresencePreviewPhaseLabel,
  getPublicPresenceTemplateLabel,
  getPublicPresenceTemplateUseCase,
  getPublicPresenceWorkflowEventLabel,
} from '@/domains/public-presence-studio/screens/public-presence-studio.copy';
import { withPublicPresenceRouteTimeout } from '@/domains/public-presence-studio/screens/public-presence-studio.loading';
import { ApiRequestError } from '@/platform/http/api';
import {
  buildPublicPresenceStudioEditorPath,
  buildPublicPresenceStudioPreviewPath,
  buildTalentSettingsPath,
} from '@/platform/routing/workspace-paths';
import { useUiLocale } from '@/platform/runtime/locale/locale-provider';
import { pickLocaleText } from '@/platform/runtime/locale/locale-text';
import { useSession } from '@/platform/runtime/session/session-provider';

interface NoticeState {
  message: string;
  tone: 'error' | 'info';
}

type LegacyHomepageSurface = 'components' | 'templates';
type BadgeTone = 'error' | 'info' | 'success' | 'warning' | 'slate';

function getErrorMessage(reason: unknown, fallback: string) {
  if (reason instanceof ApiRequestError || reason instanceof Error) {
    return reason.message;
  }

  return fallback;
}

function getValidationTone(snapshot: PublicPresenceValidationSnapshot | null): BadgeTone {
  if (!snapshot) {
    return 'info';
  }

  if (snapshot.issueCounts.fatal > 0 || snapshot.issueCounts.blocker > 0) {
    return 'error';
  }

  if (snapshot.issueCounts.warning > 0) {
    return 'warning';
  }

  return 'success';
}

function getCountdownRevealState(pageVersion: PublicPresenceStudioPageVersionSummary) {
  const countdownSection = pageVersion.latestVersion?.document.sections.find(
    (section) => section.kind === 'countdownReveal'
  );
  const phaseField = countdownSection?.fields?.phase;

  if (phaseField && typeof phaseField === 'object' && 'value' in phaseField) {
    return String(phaseField.value);
  }

  return null;
}

function getLatestWorkflowEvent(
  workspace: PublicPresenceStudioWorkspaceResponse,
  pageVersion: PublicPresenceStudioPageVersionSummary
) {
  const latestVersionId = pageVersion.latestVersion?.id;
  const relatedIds = new Set(
    [
      latestVersionId,
      pageVersion.liveVersion?.id ?? null,
      pageVersion.scheduledVersion?.id ?? null,
    ].filter((value): value is string => Boolean(value))
  );

  return (
    workspace.workflowEvents
      .filter((event) => (event.versionId ? relatedIds.has(event.versionId) : false))
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))[0] ?? null
  );
}

function getLegacySurfaceFallbackHeading(locale: string, surface: LegacyHomepageSurface) {
  if (surface === 'templates') {
    return pickLocaleText(locale, {
      en: 'Template asset records now open through Entity Management and focused IDE flows.',
      zh_HANS: '模板中心现已并入资产管理与聚焦 IDE 流程。',
      zh_HANT: '模板中心現已併入資產管理與聚焦 IDE 流程。',
      ja: 'テンプレート資産レコードはアセット管理と集中 IDE フローへ統合されました。',
      ko: '템플릿 자산 레코드는 자산 관리와 집중형 IDE 흐름으로 통합되었습니다.',
      fr: 'Le centre de templates passe désormais par la gestion d’assets et les flux IDE ciblés.',
    });
  }

  return pickLocaleText(locale, {
    en: 'Component asset records now open through Entity Management and focused IDE flows.',
    zh_HANS: '组件中心现已并入资产管理与聚焦 IDE 流程。',
    zh_HANT: '元件中心現已併入資產管理與聚焦 IDE 流程。',
    ja: 'コンポーネント資産レコードはアセット管理と集中 IDE フローへ統合されました。',
    ko: '컴포넌트 자산 레코드는 자산 관리와 집중형 IDE 흐름으로 통합되었습니다.',
    fr: 'Le store de composants passe désormais par la gestion d’assets et les flux IDE ciblés.',
  });
}

function ManagementActionLink({
  href,
  icon,
  label,
  tone = 'default',
}: Readonly<{
  href: string;
  icon: ReactNode;
  label: string;
  tone?: 'default' | 'primary';
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

function ManagementActionButton({
  icon,
  label,
  onClick,
}: Readonly<{
  icon: ReactNode;
  label: string;
  onClick: () => void;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
    >
      {icon}
      {label}
    </button>
  );
}

function SummaryCard({
  hint,
  label,
  value,
}: Readonly<{
  hint: string;
  label: string;
  value: string;
}>) {
  return (
    <PublicPresenceSurface className="p-4" variant="inset">
      <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{hint}</p>
    </PublicPresenceSurface>
  );
}

function VersionStatusBadges({
  locale,
  version,
}: Readonly<{
  locale: string;
  version: PublicPresenceStudioPageVersionSummary;
}>) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {version.liveVersion ? (
        <PublicPresenceBadge tone="success" variant="outline">
          {pickLocaleText(locale, {
            en: 'Live now',
            zh_HANS: '当前在线',
            zh_HANT: '目前上線',
            ja: '現在公開中',
            ko: '현재 공개 중',
            fr: 'En ligne',
          })}
        </PublicPresenceBadge>
      ) : null}
      {version.scheduledVersion ? (
        <PublicPresenceBadge tone="info" variant="outline">
          {pickLocaleText(locale, {
            en: 'Scheduled',
            zh_HANS: '已排程',
            zh_HANT: '已排程',
            ja: '予約済み',
            ko: '예약됨',
            fr: 'Planifiee',
          })}
        </PublicPresenceBadge>
      ) : null}
      {version.latestVersion ? (
        <PublicPresenceBadge tone="slate" variant="outline">
          {getPublicPresenceDocumentStateLabel(locale, version.latestVersion.documentState)}
        </PublicPresenceBadge>
      ) : (
        <PublicPresenceBadge tone="warning" variant="outline">
          {pickLocaleText(locale, {
            en: 'Not started',
            zh_HANS: '尚未开始',
            zh_HANT: '尚未開始',
            ja: '未開始',
            ko: '아직 시작하지 않음',
            fr: 'Pas encore commence',
          })}
        </PublicPresenceBadge>
      )}
    </div>
  );
}

export function PublicPresenceManagementScreen({
  surface,
  talentId,
  tenantId,
}: Readonly<{
  surface?: string;
  talentId: string;
  tenantId: string;
}>) {
  const { request, session } = useSession();
  const { locale } = useUiLocale();
  const [workspace, setWorkspace] = useState<PublicPresenceStudioWorkspaceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const requestedLegacySurface: LegacyHomepageSurface | null =
    surface === 'templates' || surface === 'components' ? surface : null;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setNotice(null);

      try {
        const nextWorkspace = await withPublicPresenceRouteTimeout(
          readPublicPresenceWorkspace(request, talentId),
          pickLocaleText(locale, {
            en: 'Homepage Management took too long to load. Refresh the page or confirm the local API is running.',
            zh_HANS: '主页管理页加载时间过长。请刷新页面，或确认本地 API 已启动。',
            zh_HANT: '主頁管理頁載入時間過長。請重新整理頁面，或確認本地 API 已啟動。',
            ja: 'Homepage Management の読み込みに時間がかかりすぎています。再読み込みするか、ローカル API が起動しているか確認してください。',
            ko: 'Homepage Management 로딩이 너무 오래 걸립니다. 페이지를 새로고침하거나 로컬 API가 실행 중인지 확인하세요.',
            fr: 'Homepage Management met trop de temps à charger. Actualisez la page ou vérifiez que l’API locale tourne bien.',
          })
        );

        if (cancelled) {
          return;
        }

        setWorkspace(nextWorkspace);
      } catch (reason) {
        if (cancelled) {
          return;
        }

        setWorkspace(null);
        setNotice({
          message: getErrorMessage(
            reason,
            pickLocaleText(locale, {
              en: 'Unable to load Public Presence management.',
              zh_HANS: '无法加载 Public Presence 管理页。',
              zh_HANT: '無法載入 Public Presence 管理頁。',
              ja: 'Public Presence 管理画面を読み込めません。',
              ko: 'Public Presence 관리 화면을 불러오지 못했습니다.',
              fr: 'Impossible de charger la gestion Public Presence.',
            })
          ),
          tone: 'error',
        });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [request, locale, talentId]);

  const livePageVersion = workspace?.pageVersions.find((version) => version.liveVersion) ?? null;
  const scheduledPageVersion =
    workspace?.pageVersions.find((version) => version.scheduledVersion) ?? null;
  const lastUpdatedAt = useMemo(() => {
    const candidates = (workspace?.pageVersions ?? [])
      .map((version) => version.latestVersion?.updatedAt ?? null)
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => left.localeCompare(right));

    return candidates.at(-1) ?? null;
  }, [workspace]);
  const liveTitle =
    livePageVersion?.liveVersion?.document.metadata?.title ??
    workspace?.liveVersion?.document.metadata?.title ??
    pickLocaleText(locale, {
      en: 'Not live',
      zh_HANS: '尚未上线',
      zh_HANT: '尚未上線',
      ja: '未公開',
      ko: '아직 라이브 아님',
      fr: 'Pas encore en ligne',
    });
  const liveDescription =
    livePageVersion?.liveVersion?.document.metadata?.description ??
    workspace?.liveVersion?.document.metadata?.description ??
    pickLocaleText(locale, {
      en: 'No live public page is selected yet.',
      zh_HANS: '当前还没有选中的线上公共页面。',
      zh_HANT: '目前尚未選定線上公開頁面。',
      ja: '現在ライブ公開中のページはまだありません。',
      ko: '현재 라이브 공개된 페이지가 아직 없습니다.',
      fr: 'Aucune page publique en ligne n’est encore selectionnee.',
    });
  const seoReadiness = livePageVersion?.liveVersion?.document.metadata;
  const nextScheduledAt = scheduledPageVersion?.scheduledVersion?.scheduledFor ?? null;
  const revealAutoSwitchVersion =
    workspace?.pageVersions.find((version) => version.revealAutoSwitchAt) ?? null;
  const revealAutoSwitchAt = revealAutoSwitchVersion?.revealAutoSwitchAt ?? null;
  const lastWorkflowEvent = workspace
    ? ([...workspace.workflowEvents].sort((left, right) =>
        right.occurredAt.localeCompare(left.occurredAt)
      )[0] ?? null)
    : null;
  const activeManagementVersion =
    livePageVersion ??
    workspace?.pageVersions.find(
      (version) => version.templateId === workspace.selectedTemplateId
    ) ??
    workspace?.pageVersions[0] ??
    null;
  const activeManagementTemplate = activeManagementVersion
    ? workspace?.templates.find(
        (template) => template.templateId === activeManagementVersion.templateId
      )
    : null;
  const managementRouteSettingsHref = buildTalentSettingsPath(tenantId, talentId, {
    section: 'settings',
    focus: 'homepage-routing',
  });
  const activeManagementEditorHref = activeManagementVersion
    ? buildPublicPresenceStudioEditorPath(tenantId, talentId, activeManagementVersion.templateId)
    : buildPublicPresenceStudioEditorPath(tenantId, talentId);
  const activeManagementPreviewHref = activeManagementVersion
    ? buildPublicPresenceStudioPreviewPath(tenantId, talentId, activeManagementVersion.templateId)
    : buildPublicPresenceStudioPreviewPath(tenantId, talentId);
  const activeManagementReleaseHref = activeManagementVersion
    ? buildPublicPresenceStudioEditorPath(
        tenantId,
        talentId,
        activeManagementVersion.templateId,
        'release'
      )
    : buildPublicPresenceStudioEditorPath(tenantId, talentId, undefined, 'release');
  const liveRouteValue = workspace?.publicRoute?.canonicalPath ?? '-';

  const handleCopyLiveRoute = () => {
    const canonicalPath = workspace?.publicRoute?.canonicalPath;

    if (!canonicalPath || !navigator.clipboard?.writeText) {
      setNotice({
        message: pickLocaleText(locale, {
          en: 'Unable to copy the live route from this browser.',
          zh_HANS: '当前浏览器无法复制线上路由。',
          zh_HANT: '目前瀏覽器無法複製線上路由。',
          ja: 'このブラウザーでは公開ルートをコピーできません。',
          ko: '이 브라우저에서는 라이브 라우트를 복사할 수 없습니다.',
          fr: 'Impossible de copier la route en ligne depuis ce navigateur.',
        }),
        tone: 'error',
      });
      return;
    }

    void navigator.clipboard
      .writeText(canonicalPath)
      .then(() => {
        setNotice({
          message: pickLocaleText(locale, {
            en: 'Live route copied.',
            zh_HANS: '已复制线上路由。',
            zh_HANT: '已複製線上路由。',
            ja: '公開ルートをコピーしました。',
            ko: '라이브 라우트를 복사했습니다.',
            fr: 'La route en ligne a ete copiee.',
          }),
          tone: 'info',
        });
      })
      .catch(() => {
        setNotice({
          message: pickLocaleText(locale, {
            en: 'Unable to copy the live route from this browser.',
            zh_HANS: '当前浏览器无法复制线上路由。',
            zh_HANT: '目前瀏覽器無法複製線上路由。',
            ja: 'このブラウザーでは公開ルートをコピーできません。',
            ko: '이 브라우저에서는 라이브 라우트를 복사할 수 없습니다.',
            fr: 'Impossible de copier la route en ligne depuis ce navigateur.',
          }),
          tone: 'error',
        });
      });
  };

  if (loading) {
    return (
      <PublicPresenceShell decorationDensity="calm">
        <PublicPresenceStateView
          tone="info"
          title={pickLocaleText(locale, {
            en: 'Loading homepage management',
            zh_HANS: '正在加载主页管理页',
            zh_HANT: '正在載入主頁管理頁',
            ja: 'ホームページ管理を読み込んでいます',
            ko: '홈페이지 관리를 불러오는 중입니다',
            fr: 'Chargement de la gestion de la page publique',
          })}
          description={pickLocaleText(locale, {
            en: 'Collecting route, release, and page-version status for this talent.',
            zh_HANS: '正在汇总该艺人的路由、发布与页面版本状态。',
            zh_HANT: '正在彙整此藝人的路由、發佈與頁面版本狀態。',
            ja: 'このタレントのルート、公開、ページバージョン状態を集約しています。',
            ko: '이 탤런트의 라우트, 공개, 페이지 버전 상태를 모으는 중입니다.',
            fr: 'Rassemblement de l’itineraire, de la publication et de l’etat des versions de page.',
          })}
        />
      </PublicPresenceShell>
    );
  }

  if (!workspace) {
    return (
      <PublicPresenceShell decorationDensity="calm">
        <PublicPresenceStateView
          tone="error"
          title={pickLocaleText(locale, {
            en: 'Homepage management unavailable',
            zh_HANS: '主页管理页不可用',
            zh_HANT: '主頁管理頁不可用',
            ja: 'ホームページ管理を利用できません',
            ko: '홈페이지 관리를 사용할 수 없습니다',
            fr: 'Gestion de la page publique indisponible',
          })}
          description={notice?.message ?? ''}
        />
      </PublicPresenceShell>
    );
  }

  return (
    <PublicPresenceShell decorationDensity="calm">
      <div className="space-y-6">
        <PublicPresenceSurface className="space-y-4" data-testid="management-command-strip">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <PublicPresenceBadge icon={<Sparkles />} tone="rose">
                  {pickLocaleText(locale, {
                    en: 'Public Presence Management',
                    zh_HANS: 'Public Presence 管理',
                    zh_HANT: 'Public Presence 管理',
                    ja: 'Public Presence 管理',
                    ko: 'Public Presence 관리',
                    fr: 'Gestion Public Presence',
                  })}
                </PublicPresenceBadge>
                <PublicPresenceBadge tone="slate" variant="outline">
                  {session?.tenantName ?? tenantId}
                </PublicPresenceBadge>
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  {getHomepageSurfaceLabel(locale, 'management')}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <PublicPresenceBadge tone="rose" variant="outline">
                  {activeManagementTemplate
                    ? getPublicPresenceTemplateLabel(locale, activeManagementTemplate)
                    : pickLocaleText(locale, {
                        en: 'Current operator route',
                        zh_HANS: '当前运营主线',
                        zh_HANT: '目前營運主線',
                        ja: '現在の運用導線',
                        ko: '현재 운영 경로',
                        fr: 'Parcours opérateur actuel',
                      })}
                </PublicPresenceBadge>
                {livePageVersion ? (
                  <PublicPresenceBadge tone="success" variant="outline">
                    {pickLocaleText(locale, {
                      en: 'Live now',
                      zh_HANS: '当前在线',
                      zh_HANT: '目前上線',
                      ja: '現在公開中',
                      ko: '현재 공개 중',
                      fr: 'En ligne',
                    })}
                  </PublicPresenceBadge>
                ) : null}
                {scheduledPageVersion ? (
                  <PublicPresenceBadge tone="info" variant="outline">
                    {pickLocaleText(locale, {
                      en: 'Scheduled handoff ready',
                      zh_HANS: '已准备排程切换',
                      zh_HANT: '已準備排程切換',
                      ja: '予約切替の準備完了',
                      ko: '예약 전환 준비됨',
                      fr: 'Bascule planifiée prête',
                    })}
                  </PublicPresenceBadge>
                ) : null}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold tracking-[0.18em] text-slate-500 uppercase">
                    {pickLocaleText(locale, {
                      en: 'Live route',
                      zh_HANS: '线上路由',
                      zh_HANT: '線上路由',
                      ja: '公開ルート',
                      ko: '라이브 라우트',
                      fr: 'Route en ligne',
                    })}
                  </span>
                  <code
                    className="block max-w-full truncate rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-900 sm:max-w-[28rem]"
                    data-testid="management-live-route-value"
                    title={liveRouteValue}
                  >
                    {liveRouteValue}
                  </code>
                  <ManagementActionButton
                    icon={<CalendarClock className="h-4 w-4" aria-hidden="true" />}
                    label={pickLocaleText(locale, {
                      en: 'Copy live route',
                      zh_HANS: '复制线上路由',
                      zh_HANT: '複製線上路由',
                      ja: '公開ルートをコピー',
                      ko: '라이브 라우트 복사',
                      fr: 'Copier la route live',
                    })}
                    onClick={handleCopyLiveRoute}
                  />
                </div>
                <p className="max-w-3xl text-sm leading-6 text-slate-600">
                  {pickLocaleText(locale, {
                    en: 'Handle the live route, public preview, editing, and review actions here before drilling into version details.',
                    zh_HANS: '在进入版本细节前，先在这里处理线上路由、公开预览、编辑与审核动作。',
                    zh_HANT: '在進入版本細節前，先在這裡處理線上路由、公開預覽、編輯與審核動作。',
                    ja: '版の詳細へ入る前に、公開ルート、公開プレビュー、編集、レビューの操作をここでまとめて進めます。',
                    ko: '버전 상세로 들어가기 전에 라이브 라우트, 공개 미리보기, 편집, 검토 작업을 여기에서 먼저 처리합니다.',
                    fr: 'Traitez ici la route live, l’aperçu public, l’édition et la review avant d’ouvrir le détail des versions.',
                  })}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ManagementActionLink
                href={workspace.publicRoute?.canonicalPath ?? '#'}
                icon={<Globe2 className="h-4 w-4" aria-hidden="true" />}
                label={pickLocaleText(locale, {
                  en: 'Open live public page',
                  zh_HANS: '打开线上公共页',
                  zh_HANT: '打開線上公開頁',
                  ja: '公開中のページを開く',
                  ko: '라이브 공개 페이지 열기',
                  fr: 'Ouvrir la page publique live',
                })}
              />
              <ManagementActionLink
                href={activeManagementEditorHref}
                icon={<LayoutTemplate className="h-4 w-4" aria-hidden="true" />}
                label={pickLocaleText(locale, {
                  en: 'Edit current draft',
                  zh_HANS: '编辑当前草稿',
                  zh_HANT: '編輯目前草稿',
                  ja: '現在のドラフトを編集',
                  ko: '현재 드래프트 편집',
                  fr: 'Éditer le brouillon actuel',
                })}
                tone="primary"
              />
              <ManagementActionLink
                href={activeManagementPreviewHref}
                icon={<MonitorPlay className="h-4 w-4" aria-hidden="true" />}
                label={pickLocaleText(locale, {
                  en: 'Preview current draft',
                  zh_HANS: '预览当前草稿',
                  zh_HANT: '預覽目前草稿',
                  ja: '現在のドラフトをプレビュー',
                  ko: '현재 드래프트 미리보기',
                  fr: 'Prévisualiser le brouillon actuel',
                })}
              />
              <ManagementActionLink
                href={activeManagementReleaseHref}
                icon={<Rocket className="h-4 w-4" aria-hidden="true" />}
                label={getHomepageSurfaceActionLabel(locale, 'reviewPublish')}
              />
              <ManagementActionLink
                href={managementRouteSettingsHref}
                icon={<ArrowLeftRight className="h-4 w-4" aria-hidden="true" />}
                label={getHomepageSurfaceActionLabel(locale, 'routeSettings')}
              />
              <ManagementActionLink
                href={activeManagementEditorHref}
                icon={<CircleGauge className="h-4 w-4" aria-hidden="true" />}
                label={getHomepageSurfaceActionLabel(locale, 'seoBasics')}
              />
            </div>
          </div>
        </PublicPresenceSurface>

        {notice ? (
          <div
            role="alert"
            className={`rounded-3xl border px-4 py-3 text-sm ${
              notice.tone === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-800'
                : 'border-sky-200 bg-sky-50 text-sky-800'
            }`}
          >
            {notice.message}
          </div>
        ) : null}

        {requestedLegacySurface ? (
          <PublicPresenceSurface
            className="border-sky-200 bg-sky-50 text-sky-900"
            data-testid="homepage-surface-fallback-notice"
            variant="inset"
          >
            <div className="flex flex-wrap items-start gap-3">
              <PublicPresenceBadge tone="info" variant="outline">
                {pickLocaleText(locale, {
                  en: 'Homepage workbench',
                  zh_HANS: '主页工作面',
                  zh_HANT: '主頁工作面',
                  ja: 'ホームページ作業面',
                  ko: '홈페이지 워크벤치',
                  fr: 'Atelier homepage',
                })}
              </PublicPresenceBadge>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-semibold">
                  {getLegacySurfaceFallbackHeading(locale, requestedLegacySurface)}
                </p>
                <p className="text-sm leading-6 text-sky-900/90">
                  {pickLocaleText(locale, {
                    en: 'Template and component catalogs are no longer first-step homepage tabs. Continue from this management workspace, then open the asset inventory or full-screen IDE only when the task calls for it.',
                    zh_HANS:
                      '模板中心和组件中心不再作为主页的一线标签。请从这个管理工作面继续，需要时再进入资产清单或全屏 IDE。',
                    zh_HANT:
                      '模板中心和元件中心不再作為主頁的一線標籤。請從這個管理工作面繼續，需要時再進入資產清單或全螢幕 IDE。',
                    ja: 'テンプレートセンターとコンポーネントストアは、ホームページの第一タブではなくなりました。この管理ワークベンチから続行し、必要な時だけアセット一覧や全画面 IDE を開いてください。',
                    ko: '템플릿 센터와 컴포넌트 스토어는 더 이상 홈페이지의 1차 탭이 아닙니다. 이 관리 워크벤치에서 계속 진행하고, 필요할 때만 자산 목록이나 전체 화면 IDE를 여세요.',
                    fr: 'Le centre de templates et le store de composants ne sont plus des onglets de premier niveau. Continuez depuis cet espace de gestion, puis ouvrez l’inventaire des assets ou l’IDE plein écran seulement si nécessaire.',
                  })}
                </p>
              </div>
            </div>
          </PublicPresenceSurface>
        ) : null}

        <PublicPresenceSurface
          className="space-y-2"
          data-testid="management-header"
          variant="inset"
        >
          <h2 className="text-lg font-semibold text-slate-950">
            {pickLocaleText(locale, {
              en: 'Quick management guide',
              zh_HANS: '快速操作说明',
              zh_HANT: '快速操作說明',
              ja: 'クイック操作ガイド',
              ko: '빠른 운영 안내',
              fr: 'Guide d’action rapide',
            })}
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            {pickLocaleText(locale, {
              en: 'Check release state, route settings, and SEO summaries here, then open the standalone editor or preview when you need deeper work.',
              zh_HANS:
                '先在这里检查发布状态、路由设置与 SEO 摘要，需要深入处理时再进入独立编辑器或独立预览。',
              zh_HANT:
                '先在這裡檢查發佈狀態、路由設定與 SEO 摘要，需要深入處理時再進入獨立編輯器或獨立預覽。',
              ja: 'まずここで公開状態、ルート設定、SEO 概要を確認し、深い作業が必要な時だけ全画面エディタやプレビューへ進みます。',
              ko: '먼저 여기에서 공개 상태, 라우트 설정, SEO 요약을 확인하고, 더 깊은 작업이 필요할 때만 독립 편집기나 미리보기로 이동합니다.',
              fr: 'Vérifiez ici l’état de publication, les routes et le résumé SEO, puis ouvrez l’éditeur ou l’aperçu autonome seulement pour le travail détaillé.',
            })}
          </p>
        </PublicPresenceSurface>

        <div className="grid gap-4 lg:grid-cols-3">
          <SummaryCard
            label={pickLocaleText(locale, {
              en: 'Public route',
              zh_HANS: '公开路由',
              zh_HANT: '公開路由',
              ja: '公開ルート',
              ko: '공개 라우트',
              fr: 'Route publique',
            })}
            value={workspace.publicRoute?.canonicalPath ?? '-'}
            hint={pickLocaleText(locale, {
              en: 'This is the shared route fans receive when the page is live.',
              zh_HANS: '这是页面上线后粉丝访问的共享路由。',
              zh_HANT: '這是頁面上線後粉絲訪問的共享路由。',
              ja: 'ページ公開後にファンがアクセスする共有ルートです。',
              ko: '페이지가 라이브가 되면 팬이 접근하는 공유 라우트입니다.',
              fr: 'Il s’agit de la route partagee que les fans utilisent quand la page est en ligne.',
            })}
          />
          <SummaryCard
            label={pickLocaleText(locale, {
              en: 'Live selection',
              zh_HANS: '当前线上版本',
              zh_HANT: '目前線上版本',
              ja: '現在のライブ選択',
              ko: '현재 라이브 선택',
              fr: 'Version en ligne',
            })}
            value={
              livePageVersion
                ? getPublicPresenceTemplateLabel(
                    locale,
                    workspace.templates.find(
                      (template) => template.templateId === livePageVersion.templateId
                    ) ?? {
                      label: livePageVersion.templateId,
                      templateId: livePageVersion.templateId,
                    }
                  )
                : pickLocaleText(locale, {
                    en: 'Not live',
                    zh_HANS: '尚未上线',
                    zh_HANT: '尚未上線',
                    ja: '未公開',
                    ko: '아직 라이브 아님',
                    fr: 'Pas encore en ligne',
                  })
            }
            hint={pickLocaleText(locale, {
              en: 'Shows which page version currently owns the public route.',
              zh_HANS: '显示当前占用公开路由的页面版本。',
              zh_HANT: '顯示目前佔用公開路由的頁面版本。',
              ja: '現在公開ルートを所有しているページバージョンです。',
              ko: '현재 공개 라우트를 소유한 페이지 버전입니다.',
              fr: 'Indique quelle version de page controle actuellement la route publique.',
            })}
          />
          <SummaryCard
            label={pickLocaleText(locale, {
              en: 'Last workspace update',
              zh_HANS: '最近更新',
              zh_HANT: '最近更新',
              ja: '最終更新',
              ko: '최근 업데이트',
              fr: 'Derniere mise a jour',
            })}
            value={formatPublicPresenceStudioDateTime(locale, lastUpdatedAt)}
            hint={pickLocaleText(locale, {
              en: 'Use this to confirm the latest saved version activity across both page variants.',
              zh_HANS: '用它确认两个页面版本最近一次保存活动的时间。',
              zh_HANT: '用它確認兩個頁面版本最近一次保存活動的時間。',
              ja: '2 つのページバージョン全体で最後に保存された更新時刻です。',
              ko: '두 페이지 버전 전반에서 마지막 저장 활동 시각을 확인합니다.',
              fr: 'Permet de confirmer la derniere activite de sauvegarde sur les deux variantes.',
            })}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <PublicPresenceSurface className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-950">
                {pickLocaleText(locale, {
                  en: 'Release status',
                  zh_HANS: '发布状态',
                  zh_HANT: '發佈狀態',
                  ja: '公開状態',
                  ko: '공개 상태',
                  fr: 'Etat de publication',
                })}
              </h2>
              <p className="text-sm leading-6 text-slate-600">
                {pickLocaleText(locale, {
                  en: 'Check the live page, any scheduled change, and the current public-facing SEO summary without opening the editor.',
                  zh_HANS: '无需打开编辑器，就能查看当前线上页面、已排程变更和公开 SEO 摘要。',
                  zh_HANT: '不需開啟編輯器，就能查看目前線上頁面、已排程變更與公開 SEO 摘要。',
                  ja: 'エディタを開かなくても、現在の公開ページ、予約済み変更、公開 SEO 概要を確認できます。',
                  ko: '편집기를 열지 않고도 현재 라이브 페이지, 예약된 변경, 공개 SEO 요약을 확인할 수 있습니다.',
                  fr: 'Permet de verifier la page en ligne, les changements planifies et le resume SEO public sans ouvrir l’editeur.',
                })}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <SummaryCard
                label={pickLocaleText(locale, {
                  en: 'Live title',
                  zh_HANS: '线上标题',
                  zh_HANT: '線上標題',
                  ja: '公開タイトル',
                  ko: '라이브 제목',
                  fr: 'Titre en ligne',
                })}
                value={liveTitle}
                hint={liveDescription}
              />
              <SummaryCard
                label={pickLocaleText(locale, {
                  en: 'Scheduled handoff',
                  zh_HANS: '已排程切换',
                  zh_HANT: '已排程切換',
                  ja: '予約済み切替',
                  ko: '예약된 전환',
                  fr: 'Bascule planifiee',
                })}
                value={
                  scheduledPageVersion
                    ? getPublicPresenceTemplateLabel(
                        locale,
                        workspace.templates.find(
                          (template) => template.templateId === scheduledPageVersion.templateId
                        ) ?? {
                          label: scheduledPageVersion.templateId,
                          templateId: scheduledPageVersion.templateId,
                        }
                      )
                    : pickLocaleText(locale, {
                        en: 'No scheduled publish',
                        zh_HANS: '暂无排程发布',
                        zh_HANT: '暫無排程發佈',
                        ja: '公開予約なし',
                        ko: '예약된 공개 없음',
                        fr: 'Aucune publication planifiee',
                      })
                }
                hint={
                  scheduledPageVersion?.scheduledVersion?.scheduledFor
                    ? formatPublicPresenceStudioDateTime(
                        locale,
                        scheduledPageVersion.scheduledVersion.scheduledFor
                      )
                    : pickLocaleText(locale, {
                        en: 'Schedule and publish decisions are handled in Review & Publish inside the standalone editor.',
                        zh_HANS: '排程与发布决策在独立编辑器的 Review & Publish 中完成。',
                        zh_HANT: '排程與發佈決策在獨立編輯器的 Review & Publish 中完成。',
                        ja: '公開予約と公開判断は全画面エディタの Review & Publish で行います。',
                        ko: '예약과 공개 결정은 독립 편집기의 Review & Publish 에서 처리합니다.',
                        fr: 'Les decisions de planification et de publication se font dans Review & Publish de l’editeur autonome.',
                      })
                }
              />
              <SummaryCard
                label={pickLocaleText(locale, {
                  en: 'Next scheduled action',
                  zh_HANS: '下一次已排程动作',
                  zh_HANT: '下一次已排程動作',
                  ja: '次の予約アクション',
                  ko: '다음 예약 작업',
                  fr: 'Prochaine action planifiee',
                })}
                value={formatPublicPresenceStudioDateTime(locale, nextScheduledAt)}
                hint={pickLocaleText(locale, {
                  en: 'Shows the next server-authoritative publish handoff time, if one is queued.',
                  zh_HANS: '显示下一次由服务器权威执行的发布切换时间（如果已排队）。',
                  zh_HANT: '顯示下一次由伺服器權威執行的發佈切換時間（若已排隊）。',
                  ja: 'サーバー権限で実行される次の公開切替時刻を示します。',
                  ko: '서버 권한으로 실행될 다음 공개 전환 시각을 보여줍니다.',
                  fr: 'Affiche l’heure du prochain basculement planifie par le serveur, s’il existe.',
                })}
              />
            </div>
            {revealAutoSwitchAt ? (
              <div className="rounded-3xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-900">
                <p className="font-semibold">
                  {pickLocaleText(locale, {
                    en: 'Automatic switch to Active Talent Hub is armed.',
                    zh_HANS: '切换回 Active Talent Hub 的自动切换已就绪。',
                    zh_HANT: '切換回 Active Talent Hub 的自動切換已就緒。',
                    ja: 'Active Talent Hub への自動切替が待機中です。',
                    ko: 'Active Talent Hub 로의 자동 전환이 대기 중입니다.',
                    fr: 'Le basculement automatique vers Active Talent Hub est programme.',
                  })}
                </p>
                <p className="mt-2">
                  {formatPublicPresenceStudioDateTime(locale, revealAutoSwitchAt)}
                </p>
              </div>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <SummaryCard
                label={pickLocaleText(locale, {
                  en: 'Last publish activity',
                  zh_HANS: '最近一次发布动作',
                  zh_HANT: '最近一次發佈動作',
                  ja: '直近の公開アクション',
                  ko: '최근 공개 작업',
                  fr: 'Derniere action de publication',
                })}
                value={
                  lastWorkflowEvent
                    ? getPublicPresenceWorkflowEventLabel(locale, lastWorkflowEvent.eventType)
                    : pickLocaleText(locale, {
                        en: 'No activity yet',
                        zh_HANS: '尚无动作',
                        zh_HANT: '尚無動作',
                        ja: 'まだ履歴がありません',
                        ko: '아직 활동이 없습니다',
                        fr: 'Aucune activite pour le moment',
                      })
                }
                hint={
                  lastWorkflowEvent
                    ? formatPublicPresenceStudioDateTime(locale, lastWorkflowEvent.occurredAt)
                    : pickLocaleText(locale, {
                        en: 'Review, publish, and auto-switch history appears here once operators start the workflow.',
                        zh_HANS: '运营开始走审核、发布或自动切换后，历史会显示在这里。',
                        zh_HANT: '營運開始走審核、發佈或自動切換後，歷史會顯示在這裡。',
                        ja: 'レビュー、公開、自動切替の履歴はワークフロー開始後にここへ表示されます。',
                        ko: '검토, 공개, 자동 전환 기록은 워크플로가 시작되면 여기에 표시됩니다.',
                        fr: 'L’historique review / publish / auto-switch s’affiche ici une fois le workflow lance.',
                      })
                }
              />
              <SummaryCard
                label={pickLocaleText(locale, {
                  en: 'SEO and share readiness',
                  zh_HANS: 'SEO 与分享就绪度',
                  zh_HANT: 'SEO 與分享就緒度',
                  ja: 'SEO / シェア準備',
                  ko: 'SEO 및 공유 준비도',
                  fr: 'Readiness SEO / partage',
                })}
                value={
                  seoReadiness?.title && seoReadiness.description
                    ? pickLocaleText(locale, {
                        en: 'Ready',
                        zh_HANS: '已就绪',
                        zh_HANT: '已就緒',
                        ja: '準備完了',
                        ko: '준비 완료',
                        fr: 'Pret',
                      })
                    : pickLocaleText(locale, {
                        en: 'Needs details',
                        zh_HANS: '需要补充',
                        zh_HANT: '需要補充',
                        ja: '補足が必要',
                        ko: '보강 필요',
                        fr: 'A completer',
                      })
                }
                hint={
                  seoReadiness?.title && seoReadiness.description
                    ? liveDescription
                    : pickLocaleText(locale, {
                        en: 'Add a title and description before sending the page through final review and publish.',
                        zh_HANS: '在最终审核与发布前，请先补齐标题和描述。',
                        zh_HANT: '在最終審核與發佈前，請先補齊標題與描述。',
                        ja: '最終レビューと公開の前に、タイトルと説明を補ってください。',
                        ko: '최종 검토와 공개 전에 제목과 설명을 보강하세요.',
                        fr: 'Ajoutez un titre et une description avant la revue finale et la publication.',
                      })
                }
              />
              <SummaryCard
                label={pickLocaleText(locale, {
                  en: 'Auto-switch after reveal',
                  zh_HANS: '揭晓后自动切换',
                  zh_HANT: '揭曉後自動切換',
                  ja: '公開後の自動切替',
                  ko: '리빌 후 자동 전환',
                  fr: 'Auto-switch apres reveal',
                })}
                value={
                  revealAutoSwitchAt
                    ? pickLocaleText(locale, {
                        en: 'Armed',
                        zh_HANS: '已启用',
                        zh_HANT: '已啟用',
                        ja: '待機中',
                        ko: '대기 중',
                        fr: 'Arme',
                      })
                    : pickLocaleText(locale, {
                        en: 'Not armed',
                        zh_HANS: '未启用',
                        zh_HANT: '未啟用',
                        ja: '未設定',
                        ko: '설정되지 않음',
                        fr: 'Non arme',
                      })
                }
                hint={
                  revealAutoSwitchAt
                    ? formatPublicPresenceStudioDateTime(locale, revealAutoSwitchAt)
                    : pickLocaleText(locale, {
                        en: 'This becomes available from the Debut / Reveal release workflow when a reveal handoff is defined.',
                        zh_HANS:
                          '当 Debut / Reveal 发布工作流定义了揭晓切换时，这里会显示自动切换。',
                        zh_HANT:
                          '當 Debut / Reveal 發佈工作流程定義了揭曉切換時，這裡會顯示自動切換。',
                        ja: 'Debut / Reveal 公開フローで reveal handoff が定義されると、ここに自動切替が表示されます。',
                        ko: 'Debut / Reveal 공개 워크플로에 reveal handoff가 정의되면 여기에서 자동 전환이 보입니다.',
                        fr: 'Cette option apparait ici lorsque le workflow Debut / Reveal definit un handoff apres reveal.',
                      })
                }
              />
            </div>
          </PublicPresenceSurface>

          <PublicPresenceSurface className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-950">
                {pickLocaleText(locale, {
                  en: 'Route and share settings',
                  zh_HANS: '路由与分享设置',
                  zh_HANT: '路由與分享設定',
                  ja: 'ルートと共有設定',
                  ko: '라우트 및 공유 설정',
                  fr: 'Route et partage',
                })}
              </h2>
              <p className="text-sm leading-6 text-slate-600">
                {pickLocaleText(locale, {
                  en: 'These values summarize the public path and custom-domain state that fans will see.',
                  zh_HANS: '这些值概括了粉丝会看到的公开路径与自定义域名状态。',
                  zh_HANT: '這些值概括了粉絲會看到的公開路徑與自訂網域狀態。',
                  ja: 'ファンに見える公開パスとカスタムドメイン状態の要約です。',
                  ko: '팬이 보게 되는 공개 경로와 커스텀 도메인 상태를 요약합니다.',
                  fr: 'Ces valeurs resumment le chemin public et l’etat du domaine personnalise visibles par les fans.',
                })}
              </p>
            </div>
            <SummaryCard
              label={pickLocaleText(locale, {
                en: 'Canonical path',
                zh_HANS: '规范路径',
                zh_HANT: '規範路徑',
                ja: '正規パス',
                ko: '표준 경로',
                fr: 'Chemin canonique',
              })}
              value={workspace.publicRoute?.canonicalPath ?? '-'}
              hint={pickLocaleText(locale, {
                en: 'This path stays fan-facing and must not expose internal workflow details.',
                zh_HANS: '这个路径面向粉丝，不应暴露内部工作流细节。',
                zh_HANT: '這個路徑面向粉絲，不應暴露內部工作流程細節。',
                ja: 'このパスはファン向けであり、内部ワークフローの詳細を見せません。',
                ko: '이 경로는 팬을 위한 것이며 내부 워크플로 세부 정보를 노출하지 않습니다.',
                fr: 'Ce chemin reste cote fan et ne doit pas exposer les details internes du workflow.',
              })}
            />
            <SummaryCard
              label={pickLocaleText(locale, {
                en: 'Custom domain',
                zh_HANS: '自定义域名',
                zh_HANT: '自訂網域',
                ja: 'カスタムドメイン',
                ko: '커스텀 도메인',
                fr: 'Domaine personnalise',
              })}
              value={
                workspace.publicRoute?.domainHostname ??
                pickLocaleText(locale, {
                  en: 'Not configured',
                  zh_HANS: '未配置',
                  zh_HANT: '未設定',
                  ja: '未設定',
                  ko: '설정되지 않음',
                  fr: 'Non configure',
                })
              }
              hint={pickLocaleText(locale, {
                en: 'When present, fans may enter through the custom domain instead of the shared route.',
                zh_HANS: '配置后，粉丝可以通过自定义域名而不是共享路由进入页面。',
                zh_HANT: '設定後，粉絲可以透過自訂網域而不是共享路由進入頁面。',
                ja: '設定されている場合、ファンは共有ルートではなくカスタムドメインから入れます。',
                ko: '설정되면 팬은 공유 라우트 대신 커스텀 도메인으로 진입할 수 있습니다.',
                fr: 'Lorsqu’il est present, les fans peuvent entrer par le domaine personnalise plutot que par la route partagee.',
              })}
            />
            <Link
              href={workspace.publicRoute?.canonicalPath ?? '#'}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <Globe2 className="h-4 w-4" aria-hidden="true" />
              {pickLocaleText(locale, {
                en: 'Open route in new tab',
                zh_HANS: '在新标签页打开路由',
                zh_HANT: '在新分頁開啟路由',
                ja: '新しいタブでルートを開く',
                ko: '새 탭에서 라우트 열기',
                fr: 'Ouvrir la route dans un nouvel onglet',
              })}
            </Link>
          </PublicPresenceSurface>
        </div>

        <PublicPresenceSurface className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-950">
              {pickLocaleText(locale, {
                en: 'Page versions',
                zh_HANS: '页面版本',
                zh_HANT: '頁面版本',
                ja: 'ページバージョン',
                ko: '페이지 버전',
                fr: 'Versions de page',
              })}
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              {pickLocaleText(locale, {
                en: 'Each built-in version stays editable at any time. Launch the dedicated editor or preview for each version, then use the release entry points here to choose, schedule, or inspect the live handoff.',
                zh_HANS:
                  '每个内建页面版本都可以随时继续编辑。先进入各自的独立编辑器或预览，再通过这里的发布入口选择、排程或检查线上切换。',
                zh_HANT:
                  '每個內建頁面版本都可以隨時繼續編輯。先進入各自的獨立編輯器或預覽，再透過這裡的發佈入口選擇、排程或檢查線上切換。',
                ja: '各ビルトイン版はいつでも編集を再開できます。専用エディタやプレビューを開き、このページの公開入口から live 選択、予約、切替状態を確認します。',
                ko: '각 내장 버전은 언제든 다시 편집할 수 있습니다. 전용 편집기/미리보기를 연 뒤, 여기의 공개 진입점으로 라이브 선택, 예약, 전환 상태를 확인하세요.',
                fr: 'Chaque version integree reste editable a tout moment. Ouvrez l’editeur ou l’aperçu dedie, puis utilisez ici les entrees de release pour choisir, planifier ou verifier le basculement live.',
              })}
            </p>
          </div>
          <div className="grid gap-4" data-testid="management-version-list">
            {workspace.pageVersions.map((pageVersion) => {
              const pageVersionTemplateId =
                pageVersion.templateId ??
                pageVersion.latestVersion?.id ??
                pageVersion.liveVersion?.id ??
                pageVersion.scheduledVersion?.id ??
                'unknown-template';
              const template = workspace.templates.find(
                (entry) => entry.templateId === pageVersionTemplateId
              ) ?? {
                label: pageVersionTemplateId,
                templateId: pageVersionTemplateId,
                useCase: pageVersionTemplateId,
              };
              const validationSnapshot = pageVersion.latestVersion?.validationSnapshot ?? null;
              const validationSummary = formatPublicPresenceStudioValidationSummary(
                locale,
                validationSnapshot?.issueCounts ?? null
              );
              const countdownPhase = getCountdownRevealState(pageVersion);
              const latestEvent = getLatestWorkflowEvent(workspace, pageVersion);
              const versionName = getPublicPresenceTemplateLabel(locale, template);
              const editLabel =
                pageVersionTemplateId === 'activeTalentHub'
                  ? pickLocaleText(locale, {
                      en: 'Edit Active Hub',
                      zh_HANS: '编辑 Active Hub',
                      zh_HANT: '編輯 Active Hub',
                      ja: 'Active Hub を編集',
                      ko: 'Active Hub 편집',
                      fr: 'Editer Active Hub',
                    })
                  : pickLocaleText(locale, {
                      en: 'Edit Debut / Reveal',
                      zh_HANS: '编辑 Debut / Reveal',
                      zh_HANT: '編輯 Debut / Reveal',
                      ja: 'Debut / Reveal を編集',
                      ko: 'Debut / Reveal 편집',
                      fr: 'Editer Debut / Reveal',
                    });
              const previewLabel =
                pageVersionTemplateId === 'activeTalentHub'
                  ? pickLocaleText(locale, {
                      en: 'Preview Active Hub',
                      zh_HANS: '预览 Active Hub',
                      zh_HANT: '預覽 Active Hub',
                      ja: 'Active Hub をプレビュー',
                      ko: 'Active Hub 미리보기',
                      fr: 'Apercu Active Hub',
                    })
                  : pickLocaleText(locale, {
                      en: 'Preview Debut / Reveal',
                      zh_HANS: '预览 Debut / Reveal',
                      zh_HANT: '預覽 Debut / Reveal',
                      ja: 'Debut / Reveal をプレビュー',
                      ko: 'Debut / Reveal 미리보기',
                      fr: 'Apercu Debut / Reveal',
                    });
              const setLiveLabel = pickLocaleText(locale, {
                en: 'Set live version',
                zh_HANS: '设置线上版本',
                zh_HANT: '設定線上版本',
                ja: 'ライブ版を設定',
                ko: '라이브 버전 설정',
                fr: 'Definir la version live',
              });
              const autoSwitchLabel = pickLocaleText(locale, {
                en: 'Auto-switch after reveal',
                zh_HANS: '揭晓后自动切换',
                zh_HANT: '揭曉後自動切換',
                ja: '公開後の自動切替',
                ko: '리빌 후 자동 전환',
                fr: 'Auto-switch apres reveal',
              });

              return (
                <div
                  key={pageVersionTemplateId}
                  className="space-y-4 rounded-3xl border border-slate-200 bg-white/80 p-4"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <PublicPresenceBadge tone="rose" variant="outline">
                          {versionName}
                        </PublicPresenceBadge>
                        <VersionStatusBadges locale={locale} version={pageVersion} />
                        <PublicPresenceBadge
                          tone={getValidationTone(validationSnapshot)}
                          variant="outline"
                        >
                          {validationSummary}
                        </PublicPresenceBadge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-950">
                          {pageVersion.latestVersion
                            ? `v${pageVersion.latestVersion.versionNumber}`
                            : pickLocaleText(locale, {
                                en: 'No page version yet',
                                zh_HANS: '还没有页面版本',
                                zh_HANT: '還沒有頁面版本',
                                ja: 'まだページバージョンがありません',
                                ko: '아직 페이지 버전이 없습니다',
                                fr: 'Aucune version de page pour le moment',
                              })}
                        </p>
                        <p className="text-sm leading-6 text-slate-600">
                          {getPublicPresenceTemplateUseCase(locale, template)}
                        </p>
                        {pageVersion.latestVersion?.updatedAt ? (
                          <p className="text-xs tracking-[0.18em] text-slate-500 uppercase">
                            {formatPublicPresenceStudioDateTime(
                              locale,
                              pageVersion.latestVersion.updatedAt
                            )}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <ManagementActionLink
                        href={buildPublicPresenceStudioEditorPath(
                          tenantId,
                          talentId,
                          pageVersionTemplateId
                        )}
                        icon={<LayoutTemplate className="h-4 w-4" aria-hidden="true" />}
                        label={editLabel}
                        tone="primary"
                      />
                      <ManagementActionLink
                        href={buildPublicPresenceStudioPreviewPath(
                          tenantId,
                          talentId,
                          pageVersionTemplateId
                        )}
                        icon={<MonitorPlay className="h-4 w-4" aria-hidden="true" />}
                        label={previewLabel}
                      />
                      <ManagementActionLink
                        href={buildPublicPresenceStudioEditorPath(
                          tenantId,
                          talentId,
                          pageVersionTemplateId,
                          'release'
                        )}
                        icon={<Rocket className="h-4 w-4" aria-hidden="true" />}
                        label={setLiveLabel}
                      />
                      {pageVersionTemplateId === 'debutReveal' ? (
                        <ManagementActionLink
                          href={buildPublicPresenceStudioEditorPath(
                            tenantId,
                            talentId,
                            pageVersionTemplateId,
                            'countdown'
                          )}
                          icon={<CalendarClock className="h-4 w-4" aria-hidden="true" />}
                          label={autoSwitchLabel}
                        />
                      ) : null}
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard
                      label={pickLocaleText(locale, {
                        en: 'Readiness',
                        zh_HANS: '就绪度',
                        zh_HANT: '就緒度',
                        ja: '準備状況',
                        ko: '준비도',
                        fr: 'Readiness',
                      })}
                      value={validationSummary}
                      hint={pickLocaleText(locale, {
                        en: 'Use this to judge whether this version can move into review, schedule, or publish.',
                        zh_HANS: '用它判断该版本是否可以进入审核、排程或发布。',
                        zh_HANT: '用它判斷此版本是否可以進入審核、排程或發佈。',
                        ja: 'この版をレビュー、予約、公開へ進められるかをここで判断します。',
                        ko: '이 버전을 검토, 예약, 공개로 넘길 수 있는지 여기서 판단합니다.',
                        fr: 'Permet de juger si cette version peut avancer vers review, schedule ou publish.',
                      })}
                    />
                    <SummaryCard
                      label={pickLocaleText(locale, {
                        en: 'Current live route',
                        zh_HANS: '当前线上路由',
                        zh_HANT: '目前線上路由',
                        ja: '現在の公開ルート',
                        ko: '현재 라이브 라우트',
                        fr: 'Route live actuelle',
                      })}
                      value={
                        pageVersion.liveVersion
                          ? (workspace.publicRoute?.canonicalPath ?? '-')
                          : pickLocaleText(locale, {
                              en: 'Not selected',
                              zh_HANS: '未选中',
                              zh_HANT: '未選中',
                              ja: '未選択',
                              ko: '선택되지 않음',
                              fr: 'Non selectionnee',
                            })
                      }
                      hint={
                        pageVersion.liveVersion
                          ? liveDescription
                          : pickLocaleText(locale, {
                              en: 'This version does not currently own the public route.',
                              zh_HANS: '这个版本当前没有占用公开路由。',
                              zh_HANT: '這個版本目前沒有佔用公開路由。',
                              ja: 'この版は現在公開ルートを所有していません。',
                              ko: '이 버전은 현재 공개 라우트를 소유하지 않습니다.',
                              fr: 'Cette version ne controle pas actuellement la route publique.',
                            })
                      }
                    />
                    <SummaryCard
                      label={
                        pageVersionTemplateId === 'debutReveal'
                          ? pickLocaleText(locale, {
                              en: 'Debut / Reveal phase',
                              zh_HANS: 'Debut / Reveal 阶段',
                              zh_HANT: 'Debut / Reveal 階段',
                              ja: 'Debut / Reveal フェーズ',
                              ko: 'Debut / Reveal 단계',
                              fr: 'Phase Debut / Reveal',
                            })
                          : pickLocaleText(locale, {
                              en: 'Active Hub release state',
                              zh_HANS: 'Active Hub 发布状态',
                              zh_HANT: 'Active Hub 發佈狀態',
                              ja: 'Active Hub 公開状態',
                              ko: 'Active Hub 공개 상태',
                              fr: 'Etat release Active Hub',
                            })
                      }
                      value={
                        pageVersionTemplateId === 'debutReveal'
                          ? countdownPhase
                            ? getPublicPresencePreviewPhaseLabel(locale, countdownPhase as never)
                            : pickLocaleText(locale, {
                                en: 'Not configured',
                                zh_HANS: '未配置',
                                zh_HANT: '未配置',
                                ja: '未設定',
                                ko: '설정되지 않음',
                                fr: 'Non configuree',
                              })
                          : getPublicPresenceDocumentStateLabel(
                              locale,
                              pageVersion.latestVersion?.documentState ?? 'draft'
                            )
                      }
                      hint={
                        pageVersionTemplateId === 'debutReveal'
                          ? pageVersion.revealAutoSwitchAt
                            ? formatPublicPresenceStudioDateTime(
                                locale,
                                pageVersion.revealAutoSwitchAt
                              )
                            : pickLocaleText(locale, {
                                en: 'Define the reveal timing in the countdown section to arm auto-switch.',
                                zh_HANS: '在倒计时分区定义揭晓时间后，这里会启用自动切换。',
                                zh_HANT: '在倒數分區定義揭曉時間後，這裡會啟用自動切換。',
                                ja: 'カウントダウン区画で reveal 時刻を定義すると、自動切替が待機状態になります。',
                                ko: '카운트다운 섹션에서 리빌 시각을 정의하면 자동 전환이 대기 상태가 됩니다.',
                                fr: 'Definissez l’heure de reveal dans le countdown pour armer l’auto-switch.',
                              })
                          : pickLocaleText(locale, {
                              en: 'Active Hub is the fixed post-reveal destination when Debut / Reveal hands off.',
                              zh_HANS: 'Active Hub 是 Debut / Reveal 揭晓后固定切回的常驻页面。',
                              zh_HANT: 'Active Hub 是 Debut / Reveal 揭曉後固定切回的常駐頁面。',
                              ja: 'Active Hub は Debut / Reveal からの handoff 後に戻る固定の常設先です。',
                              ko: 'Active Hub는 Debut / Reveal 이후 고정으로 돌아오는 상시 목적지입니다.',
                              fr: 'Active Hub est la destination fixe apres reveal lorsque Debut / Reveal rend la main.',
                            })
                      }
                    />
                    <SummaryCard
                      label={pickLocaleText(locale, {
                        en: 'Last workflow activity',
                        zh_HANS: '最近工作流动作',
                        zh_HANT: '最近工作流程動作',
                        ja: '直近ワークフロー操作',
                        ko: '최근 워크플로 작업',
                        fr: 'Derniere activite workflow',
                      })}
                      value={
                        latestEvent
                          ? getPublicPresenceWorkflowEventLabel(locale, latestEvent.eventType)
                          : pickLocaleText(locale, {
                              en: 'No history yet',
                              zh_HANS: '尚无历史',
                              zh_HANT: '尚無歷史',
                              ja: 'まだ履歴がありません',
                              ko: '아직 기록이 없습니다',
                              fr: 'Pas encore d’historique',
                            })
                      }
                      hint={
                        latestEvent
                          ? formatPublicPresenceStudioDateTime(locale, latestEvent.occurredAt)
                          : pickLocaleText(locale, {
                              en: 'Review, approval, schedule, publish, and auto-switch actions will appear here.',
                              zh_HANS: '审核、批准、排程、发布与自动切换动作会显示在这里。',
                              zh_HANT: '審核、批准、排程、發佈與自動切換動作會顯示在這裡。',
                              ja: 'レビュー、承認、予約、公開、自動切替の操作がここへ表示されます。',
                              ko: '검토, 승인, 예약, 공개, 자동 전환 작업이 여기에 표시됩니다.',
                              fr: 'Les actions review, approve, schedule, publish et auto-switch apparaissent ici.',
                            })
                      }
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ManagementActionLink
                      href={buildTalentSettingsPath(tenantId, talentId, {
                        section: 'config-entities',
                      })}
                      icon={<LayoutTemplate className="h-4 w-4" aria-hidden="true" />}
                      label={pickLocaleText(locale, {
                        en: 'Manage template/component assets',
                        zh_HANS: '管理主页模板/组件资产',
                        zh_HANT: '管理主頁模板/元件資產',
                        ja: 'ホームページ資産を管理',
                        ko: '홈페이지 자산 관리',
                        fr: 'Gérer les assets de homepage',
                      })}
                    />
                    {pageVersionTemplateId === 'debutReveal' ? (
                      <ManagementActionLink
                        href={buildPublicPresenceStudioEditorPath(
                          tenantId,
                          talentId,
                          'activeTalentHub',
                          'release'
                        )}
                        icon={<ArrowLeftRight className="h-4 w-4" aria-hidden="true" />}
                        label={pickLocaleText(locale, {
                          en: 'Review Active Hub handoff',
                          zh_HANS: '检查 Active Hub 切换目标',
                          zh_HANT: '檢查 Active Hub 切換目標',
                          ja: 'Active Hub handoff を確認',
                          ko: 'Active Hub handoff 검토',
                          fr: 'Verifier le handoff Active Hub',
                        })}
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </PublicPresenceSurface>
      </div>
    </PublicPresenceShell>
  );
}
