'use client';

import { buildSharedHomepagePath } from '@tcrn/shared';
import { ArrowRight, LayoutPanelTop, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import {
  type OrganizationNode,
  type OrganizationTalent,
  readOrganizationTree,
} from '@/domains/organization-access/api/organization.api';
import { ApiRequestError } from '@/platform/http/api';
import { buildTalentWorkspacePath } from '@/platform/routing/workspace-paths';
import { useRuntimeLocale } from '@/platform/runtime/locale/locale-provider';
import {
  formatLocaleDateTime,
  formatLocaleNumber,
  pickLocaleText,
} from '@/platform/runtime/locale/locale-text';
import {
  buildPaginationMeta,
  getPaginationRange,
  PAGE_SIZE_OPTIONS,
  type PageSizeOption,
} from '@/platform/runtime/pagination/pagination';
import { useSession } from '@/platform/runtime/session/session-provider';
import { GlassSurface, StateView } from '@/platform/ui';

function collectTalents(nodes: OrganizationNode[]): OrganizationTalent[] {
  return nodes.flatMap((node) => [...node.talents, ...collectTalents(node.children)]);
}

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiRequestError ? reason.message : fallback;
}

function getLandingPaginationCopy(
  locale: string,
  page: number,
  totalPages: number,
  start: number,
  end: number,
  totalCount: number,
) {
  return {
    page: pickLocaleText(locale, {
      en: `Page ${page} of ${totalPages}`,
      zh_HANS: `第 ${page} / ${totalPages} 页`,
      zh_HANT: `第 ${page} / ${totalPages} 頁`,
      ja: `${totalPages} ページ中 ${page} ページ`,
      ko: `${totalPages}페이지 중 ${page}페이지`,
      fr: `Page ${page} sur ${totalPages}`,
    }),
    range:
      totalCount === 0
        ? pickLocaleText(locale, {
            en: 'No talents in the current range.',
            zh_HANS: '当前范围没有艺人。',
            zh_HANT: '目前範圍沒有藝人。',
            ja: 'この範囲にタレントはありません。',
            ko: '현재 범위에 탤런트가 없습니다.',
            fr: 'Aucun talent dans la plage actuelle.',
          })
        : pickLocaleText(locale, {
            en: `Showing ${start}-${end} of ${totalCount}`,
            zh_HANS: `显示第 ${start}-${end} 条，共 ${totalCount} 条`,
            zh_HANT: `顯示第 ${start}-${end} 筆，共 ${totalCount} 筆`,
            ja: `${totalCount} 件中 ${start}-${end} 件を表示`,
            ko: `${totalCount}개 중 ${start}-${end}개 표시`,
            fr: `Affichage de ${start} à ${end} sur ${totalCount}`,
          }),
    pageSize: pickLocaleText(locale, {
      en: 'Rows per page',
      zh_HANS: '每页条目',
      zh_HANT: '每頁項目',
      ja: '表示件数',
      ko: '페이지당 행 수',
      fr: 'Lignes par page',
    }),
    previous: pickLocaleText(locale, {
      en: 'Previous',
      zh_HANS: '上一页',
      zh_HANT: '上一頁',
      ja: '前へ',
      ko: '이전',
      fr: 'Précédent',
    }),
    next: pickLocaleText(locale, {
      en: 'Next',
      zh_HANS: '下一页',
      zh_HANT: '下一頁',
      ja: '次へ',
      ko: '다음',
      fr: 'Suivant',
    }),
  };
}

export function TenantWorkspaceLandingScreen({
  tenantId,
}: Readonly<{
  tenantId: string;
}>) {
  const { selectedLocale } = useRuntimeLocale();
  const { request, session } = useSession();
  const [talents, setTalents] = useState<OrganizationTalent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(PAGE_SIZE_OPTIONS[0]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const tree = await readOrganizationTree(request, {
          includeInactive: false,
        });
        const publishedTalents = [...tree.directTalents, ...collectTalents(tree.subsidiaries)]
          .filter((talent) => talent.isActive && talent.lifecycleStatus === 'published')
          .sort((left, right) => {
            const leftTime = left.publishedAt ? new Date(left.publishedAt).getTime() : 0;
            const rightTime = right.publishedAt ? new Date(right.publishedAt).getTime() : 0;

            if (leftTime !== rightTime) {
              return rightTime - leftTime;
            }

            return left.displayName.localeCompare(right.displayName);
          });

        if (!cancelled) {
          setTalents(publishedTalents);
        }
      } catch (reason) {
        if (!cancelled) {
          setError(
            getErrorMessage(
              reason,
              pickLocaleText(selectedLocale, {
                en: 'Failed to load published talents.',
                zh_HANS: '加载已发布艺人失败。',
                zh_HANT: '載入已發佈藝人失敗。',
                ja: '公開済みタレントの読み込みに失敗しました。',
                ko: '게시된 탤런트를 불러오지 못했습니다.',
                fr: 'Impossible de charger les talents publiés.',
              }),
            ),
          );
        }
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
  }, [request, selectedLocale]);

  const pagination = buildPaginationMeta(talents.length, page, pageSize);
  const paginatedTalents = talents.slice(
    (pagination.page - 1) * pagination.pageSize,
    pagination.page * pagination.pageSize,
  );
  const pageRange = getPaginationRange(pagination, paginatedTalents.length);
  const paginationCopy = getLandingPaginationCopy(
    selectedLocale,
    pagination.page,
    pagination.totalPages,
    pageRange.start,
    pageRange.end,
    pagination.totalCount,
  );

  useEffect(() => {
    if (page > pagination.totalPages) {
      setPage(pagination.totalPages);
    }
  }, [page, pagination.totalPages]);

  const tenantName = session?.tenantName
    || pickLocaleText(selectedLocale, {
      en: 'Current tenant',
      zh_HANS: '当前租户',
      zh_HANT: '目前租戶',
      ja: '現在のテナント',
      ko: '현재 테넌트',
      fr: 'Tenant actuel',
    });
  const publishedLabel = pickLocaleText(selectedLocale, {
    en: 'Published',
    zh_HANS: '已发布',
    zh_HANT: '已發佈',
    ja: '公開済み',
    ko: '게시됨',
    fr: 'Publié',
  });
  const publishedCount = useMemo(
    () => formatLocaleNumber(selectedLocale, talents.length),
    [selectedLocale, talents.length],
  );

  if (loading) {
    return (
      <GlassSurface className="p-8">
        <p className="text-sm font-medium text-slate-500">
          {pickLocaleText(selectedLocale, {
            en: 'Loading available talents…',
            zh_HANS: '正在加载可进入的艺人…',
            zh_HANT: '正在載入可進入的藝人…',
            ja: '利用可能なタレントを読み込み中…',
            ko: '접속 가능한 탤런트를 불러오는 중…',
            fr: 'Chargement des talents disponibles…',
          })}
        </p>
      </GlassSurface>
    );
  }

  if (error) {
    return (
      <StateView
        status="error"
        title={pickLocaleText(selectedLocale, {
          en: 'Talent list unavailable',
          zh_HANS: '艺人列表不可用',
          zh_HANT: '藝人列表不可用',
          ja: 'タレント一覧を読み込めません',
          ko: '탤런트 목록을 사용할 수 없습니다',
          fr: 'Liste des talents indisponible',
        })}
        description={error}
      />
    );
  }

  if (talents.length === 0) {
    return (
      <div className="space-y-6">
        <StateView
          status="empty"
          title={pickLocaleText(selectedLocale, {
            en: 'No published talent is ready yet',
            zh_HANS: '还没有可进入的已发布艺人',
            zh_HANT: '還沒有可進入的已發佈藝人',
            ja: 'まだ入れる公開済みタレントがありません',
            ko: '아직 접속 가능한 게시 탤런트가 없습니다',
            fr: 'Aucun talent publié n’est encore prêt',
          })}
          description={pickLocaleText(selectedLocale, {
            en: 'Publish a talent from organization structure before entering business modules.',
            zh_HANS: '请先在组织架构里发布艺人，然后再进入业务模块。',
            zh_HANT: '請先在組織結構中發佈藝人，再進入業務模組。',
            ja: '組織構造でタレントを公開してから業務モジュールへ進んでください。',
            ko: '업무 모듈에 들어가기 전에 조직 구조에서 탤런트를 게시하세요.',
            fr: 'Publiez un talent depuis la structure organisationnelle avant d’ouvrir les modules métier.',
          })}
        />

        <GlassSurface className="p-6">
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/tenant/${tenantId}/organization-structure`}
              className="inline-flex items-center gap-2 rounded-full border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              <LayoutPanelTop className="h-4 w-4" />
              {pickLocaleText(selectedLocale, {
                en: 'Open organization structure',
                zh_HANS: '打开组织架构',
                zh_HANT: '打開組織結構',
                ja: '組織構造を開く',
                ko: '조직 구조 열기',
                fr: 'Ouvrir la structure organisationnelle',
              })}
            </Link>
          </div>
        </GlassSurface>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <GlassSurface className="p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              <Sparkles className="h-3.5 w-3.5" />
              {pickLocaleText(selectedLocale, {
                en: 'Talent selection',
                zh_HANS: '艺人选择',
                zh_HANT: '藝人選擇',
                ja: 'タレント選択',
                ko: '탤런트 선택',
                fr: 'Sélection du talent',
              })}
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold text-slate-950">
                {pickLocaleText(selectedLocale, {
                  en: 'Choose a published talent',
                  zh_HANS: '选择一个已发布艺人',
                  zh_HANT: '選擇一位已發佈藝人',
                  ja: '公開済みタレントを選択',
                  ko: '게시된 탤런트를 선택하세요',
                  fr: 'Choisissez un talent publié',
                })}
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                {pickLocaleText(selectedLocale, {
                  en: 'Start day-to-day work from the published talent you want to operate right now.',
                  zh_HANS: '从你当前要运营的已发布艺人开始进入日常业务。',
                  zh_HANT: '從你目前要營運的已發佈藝人開始進入日常業務。',
                  ja: '今すぐ運用したい公開済みタレントから日常業務に入ります。',
                  ko: '지금 운영하려는 게시된 탤런트부터 일상 업무를 시작하세요.',
                  fr: 'Commencez votre travail quotidien depuis le talent publié que vous exploitez maintenant.',
                })}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {pickLocaleText(selectedLocale, {
                  en: 'Tenant',
                  zh_HANS: '租户',
                  zh_HANT: '租戶',
                  ja: 'テナント',
                  ko: '테넌트',
                  fr: 'Tenant',
                })}
              </p>
              <p className="mt-2 text-base font-semibold text-slate-950">{tenantName}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {pickLocaleText(selectedLocale, {
                  en: 'Published talents',
                  zh_HANS: '已发布艺人',
                  zh_HANT: '已發佈藝人',
                  ja: '公開済みタレント',
                  ko: '게시된 탤런트',
                  fr: 'Talents publiés',
                })}
              </p>
              <p className="mt-2 text-base font-semibold text-slate-950">{publishedCount}</p>
            </div>
          </div>
        </div>
      </GlassSurface>

      <div className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-2">
          {paginatedTalents.map((talent) => {
          const publishedAt = formatLocaleDateTime(selectedLocale, talent.publishedAt, publishedLabel);
          const scopeLabel = talent.subsidiaryName || tenantName;
          const sharedHomepagePath =
            session?.tenantCode ? buildSharedHomepagePath(session.tenantCode, talent.code) : null;

          return (
            <Link
              key={talent.id}
              href={buildTalentWorkspacePath(tenantId, talent.id)}
              className="group block rounded-3xl border border-slate-200 bg-white/88 p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold text-slate-950">{talent.displayName}</p>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-800">
                      {publishedLabel}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{scopeLabel}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">{talent.code}</span>
                    {sharedHomepagePath ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">{sharedHomepagePath}</span>
                    ) : null}
                    {publishedAt ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">
                        {pickLocaleText(selectedLocale, {
                          en: `Published ${publishedAt}`,
                          zh_HANS: `发布于 ${publishedAt}`,
                          zh_HANT: `發佈於 ${publishedAt}`,
                          ja: `${publishedAt} に公開`,
                          ko: `${publishedAt} 게시`,
                          fr: `Publié le ${publishedAt}`,
                        })}
                      </span>
                    ) : null}
                  </div>
                </div>

                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition group-hover:border-slate-300 group-hover:bg-slate-50">
                  {pickLocaleText(selectedLocale, {
                    en: 'Open',
                    zh_HANS: '进入',
                    zh_HANT: '進入',
                    ja: '開く',
                    ko: '열기',
                    fr: 'Ouvrir',
                  })}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          );
          })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 shadow-sm">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-700">{paginationCopy.page}</p>
            <p className="text-xs text-slate-500">{paginationCopy.range}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <span className="font-medium text-slate-700">{paginationCopy.pageSize}</span>
              <select
                aria-label={paginationCopy.pageSize}
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value) as PageSizeOption);
                  setPage(1);
                }}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={!pagination.hasPrev}
                className="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {paginationCopy.previous}
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                disabled={!pagination.hasNext}
                className="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {paginationCopy.next}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
