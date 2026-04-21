'use client';

import { Globe2, History, Pencil, Rocket, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  type HomepageResponse,
  type HomepageVersionListItem,
  listHomepageVersions,
  publishHomepage,
  readHomepage,
  restoreHomepageVersion,
  unpublishHomepage,
} from '@/domains/homepage-management/api/homepage.api';
import {
  formatHomepageComponentCount,
  formatHomepageManagementDateTime,
  getHomepageVersionFilterLabel,
  getHomepageVersionStatusLabel,
  useHomepageManagementCopy,
} from '@/domains/homepage-management/screens/homepage-management.copy';
import {
  type ApiPaginationMeta,
  ApiRequestError,
  buildFallbackPagination,
} from '@/platform/http/api';
import {
  buildTalentHomepageEditorPath,
} from '@/platform/routing/workspace-paths';
import { pickLocaleText } from '@/platform/runtime/locale/locale-text';
import {
  buildPaginationMeta,
  getPaginationRange,
  PAGE_SIZE_OPTIONS,
  type PageSizeOption,
} from '@/platform/runtime/pagination/pagination';
import { useSession } from '@/platform/runtime/session/session-provider';
import { ConfirmActionDialog, FormSection, GlassSurface, StateView, TableShell } from '@/platform/ui';

type VersionFilter = 'all' | 'draft' | 'published' | 'archived';

interface VersionsPanelState {
  data: HomepageVersionListItem[];
  total: number;
  pagination: ApiPaginationMeta;
  loading: boolean;
  error: string | null;
}

interface NoticeState {
  tone: 'success' | 'error';
  message: string;
}

type DialogState =
  | {
      kind: 'publish';
      title: string;
      description: string;
      confirmText: string;
      pendingText: string;
      successMessage: string;
      errorFallback: string;
      intent: 'primary';
    }
  | {
      kind: 'unpublish';
      title: string;
      description: string;
      confirmText: string;
      pendingText: string;
      successMessage: string;
      errorFallback: string;
      intent: 'danger';
    }
  | {
      kind: 'restore';
      versionId: string;
      versionNumber: number;
      title: string;
      description: string;
      confirmText: string;
      pendingText: string;
      successMessage: string;
      errorFallback: string;
      intent: 'primary';
    };

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiRequestError ? reason.message : fallback;
}

function extractPathnameFromUrl(url: string) {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function SummaryCard({
  label,
  value,
  hint,
}: Readonly<{
  label: string;
  value: string;
  hint: string;
}>) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p>
    </div>
  );
}

function StatusBadge({
  status,
  label,
}: Readonly<{
  status: 'published' | 'draft' | 'archived' | 'inactive';
  label: string;
}>) {
  const toneClasses =
    status === 'published'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'draft'
        ? 'bg-amber-100 text-amber-800'
        : status === 'archived'
          ? 'bg-slate-100 text-slate-700'
          : 'bg-rose-100 text-rose-800';

  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${toneClasses}`}>
      {label}
    </span>
  );
}

function ActionButton({
  children,
  tone = 'neutral',
  disabled = false,
  onClick,
}: Readonly<{
  children: React.ReactNode;
  tone?: 'neutral' | 'primary' | 'danger';
  disabled?: boolean;
  onClick?: () => void;
}>) {
  const toneClasses =
    tone === 'primary'
      ? 'border-indigo-200 text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50'
      : tone === 'danger'
        ? 'border-rose-200 text-rose-700 hover:border-rose-300 hover:bg-rose-50'
        : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-white';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${toneClasses} disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {children}
    </button>
  );
}

function NoticeBanner({
  tone,
  message,
}: Readonly<{
  tone: 'success' | 'error';
  message: string;
}>) {
  const toneClasses =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : 'border-rose-200 bg-rose-50 text-rose-800';

  return <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${toneClasses}`}>{message}</div>;
}

export function HomepageManagementScreen({
  tenantId,
  talentId,
}: Readonly<{
  tenantId: string;
  talentId: string;
}>) {
  const { request, session } = useSession();
  const { selectedLocale, copy } = useHomepageManagementCopy();
  const [homepage, setHomepage] = useState<HomepageResponse | null>(null);
  const [versionsPanel, setVersionsPanel] = useState<VersionsPanelState>({
    data: [],
    total: 0,
    pagination: buildFallbackPagination(0, 1, PAGE_SIZE_OPTIONS[0]),
    loading: true,
    error: null,
  });
  const [filter, setFilter] = useState<VersionFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(PAGE_SIZE_OPTIONS[0]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [dialogState, setDialogState] = useState<DialogState | null>(null);
  const [dialogPending, setDialogPending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      setLoading(true);
      setLoadError(null);
      setVersionsPanel((current) => ({
        ...current,
        loading: true,
        error: null,
      }));

      const activeStatus = filter === 'all' ? undefined : filter;
      const [homepageResult, versionsResult] = await Promise.allSettled([
        readHomepage(request, talentId),
        listHomepageVersions(request, talentId, {
          page,
          pageSize,
          status: activeStatus,
        }),
      ]);

      if (cancelled) {
        return;
      }

      if (homepageResult.status !== 'fulfilled') {
        setLoadError(getErrorMessage(homepageResult.reason, copy.state.loadWorkspaceError));
        setLoading(false);
        return;
      }

      setHomepage(homepageResult.value);

      if (versionsResult.status === 'fulfilled') {
        setVersionsPanel({
          data: versionsResult.value.items,
          total: versionsResult.value.meta.total,
          pagination: buildPaginationMeta(versionsResult.value.meta.total, page, pageSize),
          loading: false,
          error: null,
        });
      } else {
        setVersionsPanel({
          data: [],
          total: 0,
          pagination: buildFallbackPagination(0, page, pageSize),
          loading: false,
          error: getErrorMessage(versionsResult.reason, copy.state.loadLedgerError),
        });
      }

      setLoading(false);
    }

    void loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [copy.state.loadLedgerError, copy.state.loadWorkspaceError, filter, page, pageSize, request, talentId]);

  async function refreshAfterMutation() {
    const activeStatus = filter === 'all' ? undefined : filter;
    const [nextHomepage, nextVersions] = await Promise.all([
      readHomepage(request, talentId),
      listHomepageVersions(request, talentId, {
        page,
        pageSize,
        status: activeStatus,
      }),
    ]);

    setHomepage(nextHomepage);
    setVersionsPanel({
      data: nextVersions.items,
      total: nextVersions.meta.total,
      pagination: buildPaginationMeta(nextVersions.meta.total, page, pageSize),
      loading: false,
      error: null,
    });
  }

  async function handleConfirmAction() {
    if (!dialogState) {
      return;
    }

    setDialogPending(true);
    setNotice(null);

    try {
      if (dialogState.kind === 'publish') {
        await publishHomepage(request, talentId);
      } else if (dialogState.kind === 'unpublish') {
        await unpublishHomepage(request, talentId);
      } else {
        await restoreHomepageVersion(request, talentId, dialogState.versionId);
      }

      await refreshAfterMutation();
      setNotice({
        tone: 'success',
        message: dialogState.successMessage,
      });
      setDialogState(null);
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, dialogState.errorFallback),
      });
    } finally {
      setDialogPending(false);
    }
  }

  if (loading && !homepage) {
    return (
      <div className="space-y-6">
          <GlassSurface className="p-8">
          <p className="text-sm font-medium text-slate-500">{copy.state.loading}</p>
        </GlassSurface>
      </div>
    );
  }

  if (loadError || !homepage) {
    return <StateView status="error" title={copy.state.unavailableTitle} description={loadError || undefined} />;
  }

  const totalVersions = versionsPanel.total;
  const draftVersionNumber = homepage.draftVersion?.versionNumber;
  const publishedVersionNumber = homepage.publishedVersion?.versionNumber;
  const currentPublicState = homepage.isPublished ? copy.summary.publicPublishedValue : copy.summary.publicDraftOnlyValue;
  const sharedHomepageRoute = extractPathnameFromUrl(homepage.homepageUrl);
  const pageRange = getPaginationRange(versionsPanel.pagination, versionsPanel.data.length);
  const paginationLabel = pickLocaleText(selectedLocale, {
    en: `Page ${versionsPanel.pagination.page} of ${versionsPanel.pagination.totalPages}`,
    zh_HANS: `第 ${versionsPanel.pagination.page} / ${versionsPanel.pagination.totalPages} 页`,
    zh_HANT: `第 ${versionsPanel.pagination.page} / ${versionsPanel.pagination.totalPages} 頁`,
    ja: `${versionsPanel.pagination.totalPages} ページ中 ${versionsPanel.pagination.page} ページ`,
    ko: `${versionsPanel.pagination.totalPages}페이지 중 ${versionsPanel.pagination.page}페이지`,
    fr: `Page ${versionsPanel.pagination.page} sur ${versionsPanel.pagination.totalPages}`,
  });
  const paginationRangeLabel =
    versionsPanel.pagination.totalCount === 0
      ? pickLocaleText(selectedLocale, {
          en: 'No versions are currently available.',
          zh_HANS: '当前没有版本记录。',
          zh_HANT: '目前沒有版本紀錄。',
          ja: '現在表示できるバージョンはありません。',
          ko: '표시할 버전 기록이 없습니다.',
          fr: "Aucune version n'est disponible pour le moment.",
        })
      : pickLocaleText(selectedLocale, {
          en: `Showing ${pageRange.start}-${pageRange.end} of ${versionsPanel.pagination.totalCount}`,
          zh_HANS: `显示第 ${pageRange.start}-${pageRange.end} 条，共 ${versionsPanel.pagination.totalCount} 条`,
          zh_HANT: `顯示第 ${pageRange.start}-${pageRange.end} 筆，共 ${versionsPanel.pagination.totalCount} 筆`,
          ja: `${versionsPanel.pagination.totalCount} 件中 ${pageRange.start}-${pageRange.end} 件を表示`,
          ko: `${versionsPanel.pagination.totalCount}개 중 ${pageRange.start}-${pageRange.end}개 표시`,
          fr: `Affichage de ${pageRange.start} à ${pageRange.end} sur ${versionsPanel.pagination.totalCount}`,
        });
  const pageSizeLabel = pickLocaleText(selectedLocale, {
    en: 'Rows per page',
    zh_HANS: '每页显示',
    zh_HANT: '每頁顯示',
    ja: '1ページあたり',
    ko: '페이지당 행 수',
    fr: 'Lignes par page',
  });

  return (
    <div className="space-y-6">
      <GlassSurface className="p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              <Globe2 className="h-3.5 w-3.5" />
              {copy.header.eyebrow}
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold text-slate-950">{copy.header.title}</h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">{copy.header.description}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={buildTalentHomepageEditorPath(tenantId, talentId)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
            >
              <Pencil className="h-4 w-4" />
              {copy.actions.openEditor}
            </Link>
            <ActionButton
              tone="primary"
              disabled={!homepage.draftVersion}
              onClick={() =>
                setDialogState({
                  kind: 'publish',
                  title: copy.dialogs.publishTitle,
                  description: copy.dialogs.publishDescription,
                  confirmText: copy.dialogs.publishConfirm,
                  pendingText: copy.dialogs.publishPending,
                  successMessage: copy.dialogs.publishSuccess,
                  errorFallback: copy.dialogs.publishError,
                  intent: 'primary',
                })
              }
            >
              <Rocket className="h-3.5 w-3.5" />
              {copy.actions.publishDraft}
            </ActionButton>
            <ActionButton
              tone="danger"
              disabled={!homepage.isPublished}
              onClick={() =>
                setDialogState({
                  kind: 'unpublish',
                  title: copy.dialogs.unpublishTitle,
                  description: copy.dialogs.unpublishDescription,
                  confirmText: copy.dialogs.unpublishConfirm,
                  pendingText: copy.dialogs.unpublishPending,
                  successMessage: copy.dialogs.unpublishSuccess,
                  errorFallback: copy.dialogs.unpublishError,
                  intent: 'danger',
                })
              }
            >
              <History className="h-3.5 w-3.5" />
              {copy.actions.unpublish}
            </ActionButton>
          </div>
        </div>
      </GlassSurface>

      <div className="grid gap-4 xl:grid-cols-4">
        <SummaryCard
          label={copy.summary.tenantLabel}
          value={session?.tenantName || copy.summary.tenantFallback}
          hint={copy.summary.tenantHint}
        />
        <SummaryCard
          label={copy.summary.publicStateLabel}
          value={currentPublicState}
          hint={homepage.isPublished ? copy.summary.publicPublishedHint : copy.summary.publicDraftOnlyHint}
        />
        <SummaryCard
          label={copy.summary.draftVersionLabel}
          value={draftVersionNumber ? `v${draftVersionNumber}` : copy.summary.noDraftVersion}
          hint={copy.summary.draftVersionHint}
        />
        <SummaryCard
          label={copy.summary.versionLedgerLabel}
          value={String(totalVersions)}
          hint={copy.summary.versionLedgerHint}
        />
      </div>

      {notice ? <NoticeBanner tone={notice.tone} message={notice.message} /> : null}

      <GlassSurface className="p-6">
        <FormSection
          title={copy.facts.title}
          description={copy.facts.description}
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <SummaryCard
              label={copy.facts.homepageUrlLabel}
              value={homepage.homepageUrl}
              hint={copy.facts.homepageUrlHint}
            />
            <SummaryCard
              label={copy.facts.customDomainLabel}
              value={homepage.customDomain || copy.facts.customDomainUnconfigured}
              hint={
                homepage.customDomain
                  ? homepage.customDomainVerified
                    ? copy.facts.customDomainVerifiedHint
                    : copy.facts.customDomainPendingHint
                  : copy.facts.customDomainPathOnlyHint
              }
            />
            <SummaryCard
              label={copy.facts.homepagePathLabel}
              value={sharedHomepageRoute || copy.facts.homepagePathUnconfigured}
              hint={copy.facts.homepagePathHint}
            />
            <SummaryCard
              label={copy.facts.publishedVersionLabel}
              value={publishedVersionNumber ? `v${publishedVersionNumber}` : copy.facts.noPublishedVersion}
              hint={`${copy.facts.updatedAtPrefix} ${formatHomepageManagementDateTime(
                selectedLocale,
                homepage.updatedAt,
                copy.facts.updatedAtUnknown,
              )}.`}
            />
          </div>
        </FormSection>
      </GlassSurface>

      <GlassSurface className="p-6">
        <FormSection
          title={copy.ledger.title}
          description={copy.ledger.description}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {(['all', 'draft', 'published', 'archived'] as const).map((candidate) => {
                const isActive = filter === candidate;

                return (
                  <button
                    key={candidate}
                    type="button"
                    onClick={() => {
                      setFilter(candidate);
                      setPage(1);
                    }}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] transition ${
                      isActive
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white/85 text-slate-700 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    {getHomepageVersionFilterLabel(selectedLocale, candidate)}
                  </button>
                );
              })}
            </div>

            {versionsPanel.error ? (
              <StateView
                status="error"
                title={copy.ledger.errorTitle}
                description={versionsPanel.error}
              />
            ) : (
              <TableShell
                columns={[
                  copy.ledger.columns.version,
                  copy.ledger.columns.status,
                  copy.ledger.columns.preview,
                  copy.ledger.columns.created,
                  copy.ledger.columns.published,
                  copy.ledger.columns.actions,
                ]}
                dataLength={versionsPanel.data.length}
                isLoading={versionsPanel.loading}
                isEmpty={!versionsPanel.loading && versionsPanel.data.length === 0}
                emptyTitle={copy.ledger.emptyTitle}
                emptyDescription={copy.ledger.emptyDescription}
              >
                {versionsPanel.data.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">v{item.versionNumber}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={item.status} label={getHomepageVersionStatusLabel(selectedLocale, item.status)} />
                    </td>
                    <td className="px-6 py-4 text-sm leading-6 text-slate-600">
                      <div className="space-y-1">
                        <p>{item.contentPreview || copy.ledger.noPreview}</p>
                        <p className="text-xs text-slate-500">{formatHomepageComponentCount(selectedLocale, item.componentCount)}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="space-y-1">
                        <p>{formatHomepageManagementDateTime(selectedLocale, item.createdAt, copy.common.never)}</p>
                        <p className="text-xs text-slate-500">
                          {copy.ledger.createdByPrefix} {item.createdBy?.username || copy.ledger.createdBySystem}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="space-y-1">
                        <p>{formatHomepageManagementDateTime(selectedLocale, item.publishedAt, copy.common.never)}</p>
                        <p className="text-xs text-slate-500">{item.publishedBy?.username || copy.ledger.publishedByUnpublished}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {item.status === 'draft' ? (
                        <span className="text-xs font-medium text-slate-500">{copy.ledger.currentDraft}</span>
                      ) : (
                        <ActionButton
                          tone="primary"
                          onClick={() =>
                            setDialogState({
                              kind: 'restore',
                              versionId: item.id,
                              versionNumber: item.versionNumber,
                              title: `${copy.dialogs.restoreTitlePrefix} v${item.versionNumber}?`,
                              description: copy.dialogs.restoreDescription,
                              confirmText: copy.dialogs.restoreConfirm,
                              pendingText: copy.dialogs.restorePending,
                              successMessage: `${copy.dialogs.restoreSuccessPrefix} v${item.versionNumber}`,
                              errorFallback: copy.dialogs.restoreError,
                              intent: 'primary',
                            })
                          }
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          {copy.actions.restore}
                        </ActionButton>
                      )}
                    </td>
                  </tr>
                ))}
              </TableShell>
            )}

            {!versionsPanel.error ? (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-700">{paginationLabel}</p>
                  <p className="text-xs text-slate-500">{paginationRangeLabel}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                    <span className="font-medium text-slate-700">{pageSizeLabel}</span>
                    <select
                      value={pageSize}
                      onChange={(event) => {
                        setPageSize(Number(event.target.value) as PageSizeOption);
                        setPage(1);
                      }}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                    >
                      {PAGE_SIZE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex items-center gap-2">
                    <ActionButton
                      disabled={!versionsPanel.pagination.hasPrev || versionsPanel.loading}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                    >
                      {pickLocaleText(selectedLocale, {
                        en: 'Previous',
                        zh_HANS: '上一页',
                        zh_HANT: '上一頁',
                        ja: '前へ',
                        ko: '이전',
                        fr: 'Précédent',
                      })}
                    </ActionButton>
                    <ActionButton
                      disabled={!versionsPanel.pagination.hasNext || versionsPanel.loading}
                      onClick={() =>
                        setPage((current) =>
                          Math.min(versionsPanel.pagination.totalPages, current + 1),
                        )
                      }
                    >
                      {pickLocaleText(selectedLocale, {
                        en: 'Next',
                        zh_HANS: '下一页',
                        zh_HANT: '下一頁',
                        ja: '次へ',
                        ko: '다음',
                        fr: 'Suivant',
                      })}
                    </ActionButton>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </FormSection>
      </GlassSurface>

      <ConfirmActionDialog
        open={dialogState !== null}
        title={dialogState?.title || ''}
        description={dialogState?.description || ''}
        confirmText={dialogState?.confirmText}
        pendingText={dialogState?.pendingText}
        intent={dialogState?.intent}
        isPending={dialogPending}
        onCancel={() => {
          if (!dialogPending) {
            setDialogState(null);
          }
        }}
        onConfirm={() => void handleConfirmAction()}
      />
    </div>
  );
}
