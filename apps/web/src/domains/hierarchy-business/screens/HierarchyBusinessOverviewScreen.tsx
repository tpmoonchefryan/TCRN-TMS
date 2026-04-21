'use client';

import { BarChart3, BriefcaseBusiness, Building2, Gem, Users2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import {
  type OrganizationNode,
  type OrganizationTalent,
  readOrganizationTree,
} from '@/domains/organization-access/api/organization.api';
import { ApiRequestError } from '@/platform/http/api';
import {
  buildTalentWorkspacePath,
} from '@/platform/routing/workspace-paths';
import { useRuntimeLocale } from '@/platform/runtime/locale/locale-provider';
import { pickLocaleText } from '@/platform/runtime/locale/locale-text';
import {
  buildPaginationMeta,
  getPaginationRange,
  PAGE_SIZE_OPTIONS,
  type PageSizeOption,
} from '@/platform/runtime/pagination/pagination';
import { useSession } from '@/platform/runtime/session/session-provider';
import { GlassSurface, StateView } from '@/platform/ui';

interface HierarchyBusinessOverviewScreenProps {
  tenantId: string;
  scopeType: 'tenant' | 'subsidiary';
  subsidiaryId?: string;
}

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiRequestError ? reason.message : fallback;
}

function collectTalents(nodes: OrganizationNode[]): OrganizationTalent[] {
  return nodes.flatMap((node) => [...node.talents, ...collectTalents(node.children)]);
}

function findNodeById(nodes: OrganizationNode[], id: string): OrganizationNode | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }

    const child = findNodeById(node.children, id);
    if (child) {
      return child;
    }
  }

  return null;
}

export function HierarchyBusinessOverviewScreen({
  tenantId,
  scopeType,
  subsidiaryId,
}: Readonly<HierarchyBusinessOverviewScreenProps>) {
  const { selectedLocale } = useRuntimeLocale();
  const { request, session } = useSession();
  const [talents, setTalents] = useState<OrganizationTalent[]>([]);
  const [scopeName, setScopeName] = useState<string | null>(scopeType === 'tenant' ? session?.tenantName ?? null : null);
  const [scopePath, setScopePath] = useState<string | null>(scopeType === 'tenant' ? session?.tenantCode ?? null : null);
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
          includeInactive: true,
        });

        if (cancelled) {
          return;
        }

        if (scopeType === 'tenant') {
          const scopedTalents = [...tree.directTalents, ...collectTalents(tree.subsidiaries)];
          setTalents(scopedTalents);
          setScopeName(session?.tenantName ?? null);
          setScopePath(session?.tenantCode ?? null);
        } else if (subsidiaryId) {
          const subsidiary = findNodeById(tree.subsidiaries, subsidiaryId);

          if (!subsidiary) {
            setTalents([]);
            setScopeName(null);
            setScopePath(null);
            setError(
              pickLocaleText(selectedLocale, {
                en: 'The selected subsidiary could not be found in the current organization tree.',
                zh_HANS: '当前组织结构中找不到所选分目录。',
                zh_HANT: '目前組織結構中找不到所選分目錄。',
                ja: '現在の組織構造で選択した配下スコープを見つけられませんでした。',
                ko: '현재 조직 구조에서 선택한 하위 조직을 찾을 수 없습니다.',
                fr: 'La filiale sélectionnée est introuvable dans la structure actuelle.',
              }),
            );
          } else {
            setTalents(collectTalents([subsidiary]));
            setScopeName(subsidiary.displayName);
            setScopePath(subsidiary.path);
          }
        }
      } catch (reason) {
        if (!cancelled) {
          setError(
            getErrorMessage(
              reason,
              pickLocaleText(selectedLocale, {
                en: 'Failed to load hierarchy business workspace.',
                zh_HANS: '加载层级业务工作区失败。',
                zh_HANT: '載入層級業務工作區失敗。',
                ja: '階層業務ワークスペースの読み込みに失敗しました。',
                ko: '계층 비즈니스 워크스페이스를 불러오지 못했습니다.',
                fr: 'Impossible de charger l’espace métier hiérarchique.',
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
  }, [request, scopeType, selectedLocale, session?.tenantCode, session?.tenantName, subsidiaryId]);

  const publishedTalents = useMemo(
    () => talents.filter((talent) => talent.lifecycleStatus === 'published' && talent.isActive).length,
    [talents],
  );
  const draftTalents = useMemo(
    () => talents.filter((talent) => talent.lifecycleStatus === 'draft').length,
    [talents],
  );
  const disabledTalents = useMemo(
    () => talents.filter((talent) => talent.lifecycleStatus === 'disabled' || !talent.isActive).length,
    [talents],
  );

  const pagination = buildPaginationMeta(talents.length, page, pageSize);
  const paginatedTalents = talents.slice(
    (pagination.page - 1) * pagination.pageSize,
    pagination.page * pagination.pageSize,
  );
  const pageRange = getPaginationRange(pagination, paginatedTalents.length);

  useEffect(() => {
    if (page > pagination.totalPages) {
      setPage(pagination.totalPages);
    }
  }, [page, pagination.totalPages]);

  if (loading) {
    return (
      <GlassSurface className="p-8">
        <p className="text-sm font-medium text-slate-500">
          {pickLocaleText(selectedLocale, {
            en: 'Loading hierarchy business workspace…',
            zh_HANS: '正在加载层级业务工作区…',
            zh_HANT: '正在載入層級業務工作區…',
            ja: '階層業務ワークスペースを読み込み中…',
            ko: '계층 비즈니스 워크스페이스를 불러오는 중…',
            fr: 'Chargement de l’espace métier hiérarchique…',
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
          en: 'Hierarchy business unavailable',
          zh_HANS: '层级业务不可用',
          zh_HANT: '層級業務不可用',
          ja: '階層業務を利用できません',
          ko: '계층 비즈니스를 사용할 수 없습니다',
          fr: 'Le métier hiérarchique est indisponible',
        })}
        description={error}
      />
    );
  }

  const scopeLabel = scopeType === 'tenant'
    ? pickLocaleText(selectedLocale, {
        en: 'Tenant scope',
        zh_HANS: '租户范围',
        zh_HANT: '租戶範圍',
        ja: 'テナントスコープ',
        ko: '테넌트 범위',
        fr: 'Portée du tenant',
      })
    : pickLocaleText(selectedLocale, {
        en: 'Subsidiary scope',
        zh_HANS: '分目录范围',
        zh_HANT: '分目錄範圍',
        ja: '配下スコープ',
        ko: '하위 조직 범위',
        fr: 'Portée de la filiale',
      });
  const scopeSummary = scopePath || pickLocaleText(selectedLocale, {
    en: 'Current organization scope',
    zh_HANS: '当前组织范围',
    zh_HANT: '目前組織範圍',
    ja: '現在の組織スコープ',
    ko: '현재 조직 범위',
    fr: 'Portée organisationnelle actuelle',
  });
  const moduleCards = [
    {
      key: 'reports',
      icon: <BarChart3 className="h-4 w-4" />,
      title: pickLocaleText(selectedLocale, {
        en: 'Reports',
        zh_HANS: '报表',
        zh_HANT: '報表',
        ja: 'レポート',
        ko: '리포트',
        fr: 'Rapports',
      }),
      description: pickLocaleText(selectedLocale, {
        en: 'Reserve this space for scope-level report suites and operational dashboards.',
        zh_HANS: '为层级报表套件和运营看板预留入口。',
        zh_HANT: '為層級報表套件與營運儀表板預留入口。',
        ja: 'スコープ単位のレポート群と運用ダッシュボードをここに集約します。',
        ko: '범위 단위 리포트 제품군과 운영 대시보드의 자리입니다.',
        fr: 'Réservez cet espace aux suites de rapports et tableaux de bord opérationnels.',
      }),
    },
    {
      key: 'crm',
      icon: <BriefcaseBusiness className="h-4 w-4" />,
      title: pickLocaleText(selectedLocale, {
        en: 'B2B CRM',
        zh_HANS: 'ToB CRM',
        zh_HANT: 'ToB CRM',
        ja: 'B2B CRM',
        ko: 'B2B CRM',
        fr: 'CRM B2B',
      }),
      description: pickLocaleText(selectedLocale, {
        en: 'Keep enterprise relationship operations separate from artist-facing business pages.',
        zh_HANS: '将企业客户关系运营与艺人侧业务页面彻底分开。',
        zh_HANT: '將企業客戶關係營運與藝人側業務頁面徹底分開。',
        ja: 'エンタープライズ向け CRM をタレント向け業務画面から分離して管理します。',
        ko: '기업 고객 운영을 아티스트용 비즈니스 페이지와 분리합니다.',
        fr: 'Séparez clairement les opérations CRM B2B des pages métier artistes.',
      }),
    },
    {
      key: 'membership',
      icon: <Gem className="h-4 w-4" />,
      title: pickLocaleText(selectedLocale, {
        en: 'Membership operations',
        zh_HANS: '会员运营',
        zh_HANT: '會員營運',
        ja: '会員運用',
        ko: '멤버십 운영',
        fr: 'Opérations membres',
      }),
      description: pickLocaleText(selectedLocale, {
        en: 'Prepare this area for scope-level membership programs, benefits, and renewal policies.',
        zh_HANS: '为层级会员方案、权益和续费规则预留空间。',
        zh_HANT: '為層級會員方案、權益與續費規則預留空間。',
        ja: 'スコープ単位の会員制度、特典、更新ポリシーをここで管理できるようにします。',
        ko: '범위 단위 멤버십 프로그램, 혜택, 갱신 정책을 이 영역에 배치합니다.',
        fr: 'Préparez cet espace pour les programmes membres, avantages et règles de renouvellement.',
      }),
    },
  ];

  return (
    <div className="space-y-6">
      <GlassSurface className="p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              <Building2 className="h-3.5 w-3.5" />
              {scopeLabel}
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold text-slate-950">{scopeName || scopeLabel}</h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                {pickLocaleText(selectedLocale, {
                  en: 'This scope-level business workspace stays separate from governance screens. Use it for cross-talent operations and jump into individual talent workspaces only when you need artist-facing modules.',
                  zh_HANS: '这里是独立于治理界面的层级业务工作区，用于跨艺人的运营工作；只有在需要进入艺人业务模块时才跳转到具体艺人工作区。',
                  zh_HANT: '這裡是獨立於治理介面的層級業務工作區，用於跨藝人的營運工作；只有在需要進入藝人業務模組時才跳轉到具體藝人工作區。',
                  ja: 'ここは統治画面から切り離された階層業務ワークスペースです。複数タレント横断の運用をここで行い、アーティスト向けモジュールが必要なときだけ個別ワークスペースへ移動します。',
                  ko: '이 공간은 거버넌스 화면과 분리된 계층 비즈니스 워크스페이스입니다. 여러 탤런트에 걸친 운영은 여기서 처리하고, 아티스트 전용 모듈이 필요할 때만 개별 워크스페이스로 이동합니다.',
                  fr: 'Cet espace métier hiérarchique reste séparé des écrans de gouvernance. Gérez ici les opérations transversales et n’ouvrez les espaces artistes qu’en cas de besoin.',
                })}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/80 px-5 py-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {pickLocaleText(selectedLocale, {
                en: 'Scope path',
                zh_HANS: '范围路径',
                zh_HANT: '範圍路徑',
                ja: 'スコープパス',
                ko: '범위 경로',
                fr: 'Chemin de portée',
              })}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{scopeSummary}</p>
          </div>
        </div>
      </GlassSurface>

      <div className="grid gap-4 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white/85 px-5 py-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {pickLocaleText(selectedLocale, {
              en: 'Managed talents',
              zh_HANS: '管理艺人数',
              zh_HANT: '管理藝人數',
              ja: '管理対象タレント数',
              ko: '관리 탤런트 수',
              fr: 'Talents gérés',
            })}
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{talents.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/85 px-5 py-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {pickLocaleText(selectedLocale, {
              en: 'Published',
              zh_HANS: '已发布',
              zh_HANT: '已發佈',
              ja: '公開済み',
              ko: '게시됨',
              fr: 'Publié',
            })}
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{publishedTalents}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/85 px-5 py-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {pickLocaleText(selectedLocale, {
              en: 'Draft',
              zh_HANS: '草稿',
              zh_HANT: '草稿',
              ja: '下書き',
              ko: '초안',
              fr: 'Brouillon',
            })}
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{draftTalents}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/85 px-5 py-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {pickLocaleText(selectedLocale, {
              en: 'Disabled',
              zh_HANS: '停用',
              zh_HANT: '停用',
              ja: '無効',
              ko: '비활성',
              fr: 'Désactivé',
            })}
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{disabledTalents}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {moduleCards.map((card) => (
          <GlassSurface key={card.key} className="p-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                {card.icon}
                {pickLocaleText(selectedLocale, {
                  en: 'Planned',
                  zh_HANS: '规划中',
                  zh_HANT: '規劃中',
                  ja: '計画中',
                  ko: '계획 중',
                  fr: 'Prévu',
                })}
              </div>
              <p className="text-lg font-semibold text-slate-950">{card.title}</p>
              <p className="text-sm leading-6 text-slate-600">{card.description}</p>
            </div>
          </GlassSurface>
        ))}
      </div>

      <GlassSurface className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users2 className="h-4 w-4 text-slate-500" />
              <h2 className="text-lg font-semibold text-slate-900">
                {pickLocaleText(selectedLocale, {
                  en: 'Talent inventory',
                  zh_HANS: '艺人清单',
                  zh_HANT: '藝人清單',
                  ja: 'タレント一覧',
                  ko: '탤런트 목록',
                  fr: 'Inventaire des talents',
                })}
              </h2>
            </div>
            <p className="text-sm leading-6 text-slate-600">
              {pickLocaleText(selectedLocale, {
                en: 'Review the talents under this scope, then open the artist workspace only when you need artist-facing operations.',
                zh_HANS: '先在这里查看当前范围下的艺人，再在需要艺人侧操作时进入具体艺人工作区。',
                zh_HANT: '先在這裡查看目前範圍下的藝人，再在需要藝人側操作時進入具體藝人工作區。',
                ja: 'まずこのスコープ配下のタレントを確認し、アーティスト向け操作が必要なときだけ個別ワークスペースを開きます。',
                ko: '먼저 이 범위 아래의 탤런트를 검토하고, 아티스트 전용 작업이 필요할 때만 개별 워크스페이스를 엽니다.',
                fr: 'Passez d’abord en revue les talents de cette portée, puis ouvrez l’espace artiste uniquement si nécessaire.',
              })}
            </p>
          </div>
          <Link
            href={`/tenant/${tenantId}/organization-structure`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <Building2 className="h-4 w-4" />
            {pickLocaleText(selectedLocale, {
              en: 'Back to organization structure',
              zh_HANS: '返回组织结构',
              zh_HANT: '返回組織結構',
              ja: '組織構造へ戻る',
              ko: '조직 구조로 돌아가기',
              fr: 'Retour à la structure organisationnelle',
            })}
          </Link>
        </div>

        {talents.length === 0 ? (
          <div className="mt-6">
            <StateView
              status="empty"
              title={pickLocaleText(selectedLocale, {
                en: 'No talents in this scope',
                zh_HANS: '当前范围下没有艺人',
                zh_HANT: '目前範圍下沒有藝人',
                ja: 'このスコープにタレントはいません',
                ko: '이 범위에 탤런트가 없습니다',
                fr: 'Aucun talent dans cette portée',
              })}
              description={pickLocaleText(selectedLocale, {
                en: 'Create or move talents from organization structure before using this workspace.',
                zh_HANS: '请先在组织结构中创建或调整艺人后，再使用此业务工作区。',
                zh_HANT: '請先在組織結構中建立或調整藝人後，再使用此業務工作區。',
                ja: 'このワークスペースを使う前に、組織構造でタレントを作成または調整してください。',
                ko: '이 워크스페이스를 사용하기 전에 조직 구조에서 탤런트를 만들거나 이동하세요.',
                fr: 'Créez ou déplacez d’abord les talents depuis la structure organisationnelle.',
              })}
            />
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="grid gap-3">
              {paginatedTalents.map((talent) => (
                <div
                  key={talent.id}
                  className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white/85 px-5 py-4 shadow-sm"
                >
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-slate-950">{talent.displayName}</p>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                        {talent.code}
                      </span>
                      <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-medium text-white">
                        {pickLocaleText(selectedLocale, {
                          en: talent.lifecycleStatus,
                          zh_HANS:
                            talent.lifecycleStatus === 'published'
                              ? '已发布'
                              : talent.lifecycleStatus === 'draft'
                                ? '草稿'
                                : '停用',
                          zh_HANT:
                            talent.lifecycleStatus === 'published'
                              ? '已發佈'
                              : talent.lifecycleStatus === 'draft'
                                ? '草稿'
                                : '停用',
                          ja:
                            talent.lifecycleStatus === 'published'
                              ? '公開済み'
                              : talent.lifecycleStatus === 'draft'
                                ? '下書き'
                                : '無効',
                          ko:
                            talent.lifecycleStatus === 'published'
                              ? '게시됨'
                              : talent.lifecycleStatus === 'draft'
                                ? '초안'
                                : '비활성',
                          fr:
                            talent.lifecycleStatus === 'published'
                              ? 'Publié'
                              : talent.lifecycleStatus === 'draft'
                                ? 'Brouillon'
                                : 'Désactivé',
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{talent.path}</p>
                  </div>
                  <Link
                    href={buildTalentWorkspacePath(tenantId, talent.id)}
                    className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    {pickLocaleText(selectedLocale, {
                      en: 'Open talent workspace',
                      zh_HANS: '进入艺人工作区',
                      zh_HANT: '進入藝人工作區',
                      ja: 'タレントワークスペースを開く',
                      ko: '탤런트 워크스페이스 열기',
                      fr: 'Ouvrir l’espace talent',
                    })}
                  </Link>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 shadow-sm">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-700">
                  {pickLocaleText(selectedLocale, {
                    en: `Page ${pagination.page} of ${pagination.totalPages}`,
                    zh_HANS: `第 ${pagination.page} / ${pagination.totalPages} 页`,
                    zh_HANT: `第 ${pagination.page} / ${pagination.totalPages} 頁`,
                    ja: `${pagination.totalPages} ページ中 ${pagination.page} ページ`,
                    ko: `${pagination.totalPages}페이지 중 ${pagination.page}페이지`,
                    fr: `Page ${pagination.page} sur ${pagination.totalPages}`,
                  })}
                </p>
                <p className="text-xs text-slate-500">
                  {pickLocaleText(selectedLocale, {
                    en: `Showing ${pageRange.start}-${pageRange.end} of ${pagination.totalCount}`,
                    zh_HANS: `显示第 ${pageRange.start}-${pageRange.end} 条，共 ${pagination.totalCount} 条`,
                    zh_HANT: `顯示第 ${pageRange.start}-${pageRange.end} 筆，共 ${pagination.totalCount} 筆`,
                    ja: `${pagination.totalCount} 件中 ${pageRange.start}-${pageRange.end} 件を表示`,
                    ko: `${pagination.totalCount}개 중 ${pageRange.start}-${pageRange.end}개 표시`,
                    fr: `Affichage de ${pageRange.start} à ${pageRange.end} sur ${pagination.totalCount}`,
                  })}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <span className="font-medium text-slate-700">
                    {pickLocaleText(selectedLocale, {
                      en: 'Rows per page',
                      zh_HANS: '每页条目',
                      zh_HANT: '每頁項目',
                      ja: '表示件数',
                      ko: '페이지당 행 수',
                      fr: 'Lignes par page',
                    })}
                  </span>
                  <select
                    aria-label={pickLocaleText(selectedLocale, {
                      en: 'Rows per page',
                      zh_HANS: '每页条目',
                      zh_HANT: '每頁項目',
                      ja: '表示件数',
                      ko: '페이지당 행 수',
                      fr: 'Lignes par page',
                    })}
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value) as PageSizeOption);
                      setPage(1);
                    }}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
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
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pickLocaleText(selectedLocale, {
                      en: 'Previous',
                      zh_HANS: '上一页',
                      zh_HANT: '上一頁',
                      ja: '前へ',
                      ko: '이전',
                      fr: 'Précédent',
                    })}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                    disabled={!pagination.hasNext}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pickLocaleText(selectedLocale, {
                      en: 'Next',
                      zh_HANS: '下一页',
                      zh_HANT: '下一頁',
                      ja: '次へ',
                      ko: '다음',
                      fr: 'Suivant',
                    })}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </GlassSurface>
    </div>
  );
}
