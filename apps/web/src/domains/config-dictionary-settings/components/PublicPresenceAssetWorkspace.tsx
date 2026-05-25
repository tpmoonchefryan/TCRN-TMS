'use client';

import {
  CopyPlus,
  Eye,
  LayoutTemplate,
  Package2,
  PencilLine,
  RefreshCcw,
  Shield,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  type HomepageComponentType,
  type PublicPresenceAssetDetail,
  type PublicPresenceAssetKind,
  type PublicPresenceAssetListEntry,
  type PublicPresenceAssetScopeType,
  type PublicPresenceTemplateId,
  type SupportedUiLocale,
} from '@tcrn/shared';

import {
  createPublicPresenceAsset,
  duplicatePublicPresenceAsset,
  listPublicPresenceAssets,
  readPublicPresenceAsset,
  type PublicPresenceAssetScopeInput,
} from '@/domains/public-presence-studio/api/public-presence-assets.api';
import { buildPublicPresenceAssetIdePath } from '@/platform/routing/workspace-paths';
import { formatLocaleDateTime, pickLocaleText } from '@/platform/runtime/locale/locale-text';
import { ActionDrawer, ActionDrawerFooter, AsyncSubmitButton } from '@/platform/ui';

interface PublicPresenceAssetWorkspaceProps {
  families?: readonly AssetFamilyId[];
  locale: SupportedUiLocale;
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
  scopeId?: string | null;
  scopeType: PublicPresenceAssetScopeType;
  tenantId: string;
}

type AssetFamilyId = 'template' | 'component';
type AssetDrawerState =
  | {
      family: AssetFamilyId;
      mode: 'create';
    }
  | {
      assetId: string;
      family: AssetFamilyId;
      mode: 'inspect' | 'preview';
    };

interface AssetNoticeState {
  href?: string;
  label?: string;
  message: string;
  tone: 'error' | 'success';
}

function getComponentDisplayName(componentType: HomepageComponentType) {
  return componentType.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

function readTemplateFamilyId(asset: PublicPresenceAssetListEntry) {
  if (asset.currentRevision?.manifest.assetKind === 'template') {
    return asset.currentRevision.manifest.templateId;
  }

  return asset.asset.templateId;
}

function readTemplateLabel(asset: PublicPresenceAssetListEntry) {
  if (asset.currentRevision?.manifest.assetKind === 'template') {
    return asset.currentRevision.manifest.label;
  }

  return pickLocaleText('en', asset.asset.name);
}

function readComponentFamilyType(asset: PublicPresenceAssetListEntry) {
  if (asset.currentRevision?.manifest.assetKind === 'component') {
    return asset.currentRevision.manifest.componentType;
  }

  return asset.asset.componentType;
}

function getTemplateDisplayName(
  locale: SupportedUiLocale,
  templateAssets: PublicPresenceAssetListEntry[],
  templateId: PublicPresenceTemplateId
) {
  const matchingTemplateAsset = templateAssets.find(
    (asset) => readTemplateFamilyId(asset) === templateId
  );

  if (!matchingTemplateAsset) {
    return templateId;
  }

  return readTemplateLabel(matchingTemplateAsset);
}

function collectTemplateOptions(
  templateAssets: PublicPresenceAssetListEntry[]
): PublicPresenceTemplateId[] {
  const templateIds = new Set<PublicPresenceTemplateId>();

  for (const asset of templateAssets) {
    const templateId = readTemplateFamilyId(asset);

    if (templateId) {
      templateIds.add(templateId);
    }
  }

  return Array.from(templateIds);
}

function collectComponentOptions(
  componentAssets: PublicPresenceAssetListEntry[]
): HomepageComponentType[] {
  const componentTypes = new Set<HomepageComponentType>();

  for (const asset of componentAssets) {
    const componentType = readComponentFamilyType(asset);

    if (componentType) {
      componentTypes.add(componentType);
    }
  }

  return Array.from(componentTypes);
}

function getAssetOwnerLabel(
  locale: SupportedUiLocale,
  ownerType: PublicPresenceAssetScopeType | 'system'
) {
  switch (ownerType) {
    case 'system':
      return pickLocaleText(locale, {
        en: 'System seed',
        zh_HANS: '系统种子',
        zh_HANT: '系統種子',
        ja: 'システム種',
        ko: '시스템 시드',
        fr: 'Graine système',
      });
    case 'tenant':
      return pickLocaleText(locale, {
        en: 'Tenant scope',
        zh_HANS: '租户范围',
        zh_HANT: '租戶範圍',
        ja: 'テナント範囲',
        ko: '테넌트 범위',
        fr: 'Portée tenant',
      });
    case 'subsidiary':
      return pickLocaleText(locale, {
        en: 'Subsidiary scope',
        zh_HANS: '分目录范围',
        zh_HANT: '分目錄範圍',
        ja: '配下スコープ',
        ko: '하위 조직 범위',
        fr: 'Portée périmètre',
      });
    default:
      return pickLocaleText(locale, {
        en: 'Talent scope',
        zh_HANS: '艺人范围',
        zh_HANT: '藝人範圍',
        ja: 'タレント範囲',
        ko: '아티스트 범위',
        fr: 'Portée talent',
      });
  }
}

function getAssetStatusLabel(locale: SupportedUiLocale, asset: PublicPresenceAssetListEntry) {
  if (asset.currentRevision?.validationState === 'ready') {
    return pickLocaleText(locale, {
      en: 'Validated',
      zh_HANS: '已校验',
      zh_HANT: '已驗證',
      ja: '検証済み',
      ko: '검증됨',
      fr: 'Validé',
    });
  }

  if (asset.asset.status === 'active') {
    return pickLocaleText(locale, {
      en: 'Active',
      zh_HANS: '已启用',
      zh_HANT: '已啟用',
      ja: '有効',
      ko: '활성',
      fr: 'Actif',
    });
  }

  return pickLocaleText(locale, {
    en: 'Draft',
    zh_HANS: '草稿',
    zh_HANT: '草稿',
    ja: 'ドラフト',
    ko: '드래프트',
    fr: 'Brouillon',
  });
}

function buildAssetTypeLabel(locale: SupportedUiLocale, asset: PublicPresenceAssetListEntry) {
  if (asset.asset.assetKind === 'template') {
    return readTemplateLabel(asset);
  }

  const componentType = readComponentFamilyType(asset);

  if (asset.asset.assetKind === 'component' && componentType) {
    return getComponentDisplayName(componentType);
  }

  return asset.asset.assetKind;
}

function getManagedStateLabel(locale: SupportedUiLocale, asset: PublicPresenceAssetListEntry) {
  if (asset.canEdit) {
    return pickLocaleText(locale, {
      en: 'Managed here',
      zh_HANS: '在此维护',
      zh_HANT: '在此維護',
      ja: 'この範囲で管理',
      ko: '이 범위에서 관리',
      fr: 'Géré ici',
    });
  }

  return pickLocaleText(locale, {
    en: 'Inherited',
    zh_HANS: '继承',
    zh_HANT: '繼承',
    ja: '継承',
    ko: '상속',
    fr: 'Hérité',
  });
}

function getReadOnlyHint(locale: SupportedUiLocale, asset: PublicPresenceAssetListEntry) {
  if (asset.asset.isSystem) {
    return pickLocaleText(locale, {
      en: 'System assets stay read-only. Duplicate here to make an editable local copy.',
      zh_HANS: '系统资产保持只读；请先在此范围复制，再编辑本地副本。',
      zh_HANT: '系統資產保持唯讀；請先在此範圍複製，再編輯本地副本。',
      ja: 'システム資産は読み取り専用です。この範囲に複製してからローカルコピーを編集してください。',
      ko: '시스템 자산은 읽기 전용입니다. 이 범위에 복제한 뒤 로컬 사본을 편집하세요.',
      fr: 'Les assets système restent en lecture seule. Dupliquez-les ici pour créer une copie locale modifiable.',
    });
  }

  return pickLocaleText(locale, {
    en: 'This asset is inherited from an upstream scope. Duplicate here before editing.',
    zh_HANS: '此资产继承自上级范围；请先复制到当前范围再编辑。',
    zh_HANT: '此資產繼承自上級範圍；請先複製到目前範圍再編輯。',
    ja: 'この資産は上位スコープから継承されています。編集する前にこの範囲へ複製してください。',
    ko: '이 자산은 상위 범위에서 상속되었습니다. 편집 전에 현재 범위로 복제하세요.',
    fr: 'Cet asset est hérité d’une portée supérieure. Dupliquez-le ici avant modification.',
  });
}

function describeAssetFamily(
  locale: SupportedUiLocale,
  family: AssetFamilyId,
  scopeType: PublicPresenceAssetScopeType
) {
  if (family === 'template') {
    return pickLocaleText(locale, {
      en: `Visible homepage layouts for this ${scopeType}. System assets stay protected until you duplicate them here.`,
      zh_HANS: `查看当前${scopeType === 'tenant' ? '租户' : scopeType === 'subsidiary' ? '分目录' : '艺人'}可见的主页布局；系统资产需先复制到此范围后才能编辑。`,
      zh_HANT: `查看目前${scopeType === 'tenant' ? '租戶' : scopeType === 'subsidiary' ? '分目錄' : '藝人'}可見的主頁版型；系統資產需先複製到此範圍後才能編輯。`,
      ja: `この${scopeType === 'tenant' ? 'テナント' : scopeType === 'subsidiary' ? '配下スコープ' : 'タレント'}で見えるホームページレイアウトを管理します。システム資産はここへ複製するまで保護されます。`,
      ko: `이 ${scopeType === 'tenant' ? '테넌트' : scopeType === 'subsidiary' ? '하위 조직' : '아티스트'} 범위에서 보이는 홈페이지 레이아웃입니다. 시스템 자산은 여기로 복제해야 편집할 수 있습니다.`,
      fr: `Gérez les mises en page de homepage visibles pour cette portée ${scopeType}. Les assets système restent protégés tant qu’ils ne sont pas dupliqués ici.`,
    });
  }

  return pickLocaleText(locale, {
    en: `Visible homepage building blocks for this ${scopeType}. Duplicate inherited blocks here before adjusting them.`,
    zh_HANS: `查看当前${scopeType === 'tenant' ? '租户' : scopeType === 'subsidiary' ? '分目录' : '艺人'}可见的主页模块；继承模块需先复制到此范围后再调整。`,
    zh_HANT: `查看目前${scopeType === 'tenant' ? '租戶' : scopeType === 'subsidiary' ? '分目錄' : '藝人'}可見的主頁模組；繼承模組需先複製到此範圍後再調整。`,
    ja: `この${scopeType === 'tenant' ? 'テナント' : scopeType === 'subsidiary' ? '配下スコープ' : 'タレント'}で見えるホームページブロックを管理します。継承ブロックはここへ複製してから調整してください。`,
    ko: `이 ${scopeType === 'tenant' ? '테넌트' : scopeType === 'subsidiary' ? '하위 조직' : '아티스트'} 범위에서 보이는 홈페이지 블록입니다. 상속된 블록은 여기로 복제한 뒤 조정하세요.`,
    fr: `Gérez les blocs de homepage visibles pour cette portée ${scopeType}. Dupliquez d’abord ici les blocs hérités avant ajustement.`,
  });
}

function buildAssetIdeHref(
  tenantId: string,
  family: AssetFamilyId,
  assetId: string,
  scope: PublicPresenceAssetScopeInput
) {
  return buildPublicPresenceAssetIdePath(tenantId, family, assetId, {
    scopeId: scope.scopeId ?? null,
    scopeType: scope.scopeType,
  });
}

function DetailMetric({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function AssetRow({
  asset,
  duplicatePending,
  locale,
  onDuplicate,
  onInspect,
  onPreview,
  scope,
  tenantId,
}: Readonly<{
  asset: PublicPresenceAssetListEntry;
  duplicatePending: boolean;
  locale: SupportedUiLocale;
  onDuplicate: (asset: PublicPresenceAssetListEntry) => void;
  onInspect: (asset: PublicPresenceAssetListEntry) => void;
  onPreview: (asset: PublicPresenceAssetListEntry) => void;
  scope: PublicPresenceAssetScopeInput;
  tenantId: string;
}>) {
  const editHref = buildAssetIdeHref(tenantId, asset.asset.assetKind, asset.asset.id, scope);
  const displayName = pickLocaleText(locale, asset.asset.name);
  const displayDescription = pickLocaleText(locale, asset.asset.description);
  const revisionLabel = asset.currentRevision
    ? `r${asset.currentRevision.revisionNumber}`
    : pickLocaleText(locale, {
        en: 'No revision yet',
        zh_HANS: '暂无修订',
        zh_HANT: '暫無修訂',
        ja: 'まだリビジョンなし',
        ko: '아직 리비전 없음',
        fr: 'Aucune révision',
      });

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 px-4 py-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-slate-950">{displayName}</p>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] text-slate-600 uppercase">
              {getManagedStateLabel(locale, asset)}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] text-slate-600 uppercase">
              {getAssetOwnerLabel(locale, asset.asset.ownerType)}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] text-slate-600 uppercase">
              {getAssetStatusLabel(locale, asset)}
            </span>
            {asset.asset.isSystem ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] text-amber-700 uppercase">
                <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                {pickLocaleText(locale, {
                  en: 'System',
                  zh_HANS: '系统',
                  zh_HANT: '系統',
                  ja: 'システム',
                  ko: '시스템',
                  fr: 'Système',
                })}
              </span>
            ) : null}
          </div>
          <p className="text-sm leading-6 text-slate-600">{displayDescription}</p>
          <div className="grid gap-3 md:grid-cols-4">
            <DetailMetric
              label={pickLocaleText(locale, {
                en: 'Asset type',
                zh_HANS: '资产类型',
                zh_HANT: '資產類型',
                ja: '資産タイプ',
                ko: '자산 유형',
                fr: 'Type d’asset',
              })}
              value={buildAssetTypeLabel(locale, asset)}
            />
            <DetailMetric
              label={pickLocaleText(locale, {
                en: 'Code',
                zh_HANS: '代码',
                zh_HANT: '代碼',
                ja: 'コード',
                ko: '코드',
                fr: 'Code',
              })}
              value={asset.asset.code}
            />
            <DetailMetric
              label={pickLocaleText(locale, {
                en: 'Latest revision',
                zh_HANS: '最新修订',
                zh_HANT: '最新修訂',
                ja: '最新リビジョン',
                ko: '최신 리비전',
                fr: 'Dernière révision',
              })}
              value={revisionLabel}
            />
            <DetailMetric
              label={pickLocaleText(locale, {
                en: 'Updated',
                zh_HANS: '更新时间',
                zh_HANT: '更新時間',
                ja: '更新日時',
                ko: '업데이트됨',
                fr: 'Mis à jour',
              })}
              value={formatLocaleDateTime(locale, asset.asset.updatedAt, asset.asset.updatedAt)}
            />
          </div>
          {!asset.canEdit ? (
            <p className="text-sm leading-6 text-slate-600">{getReadOnlyHint(locale, asset)}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onPreview(asset)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            {pickLocaleText(locale, {
              en: 'Preview',
              zh_HANS: '预览',
              zh_HANT: '預覽',
              ja: 'プレビュー',
              ko: '미리보기',
              fr: 'Aperçu',
            })}
          </button>
          <button
            type="button"
            onClick={() => onInspect(asset)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            {pickLocaleText(locale, {
              en: 'Inspect',
              zh_HANS: '查看',
              zh_HANT: '檢視',
              ja: '確認',
              ko: '검사',
              fr: 'Inspecter',
            })}
          </button>
          {asset.canEdit ? (
            <Link
              href={editHref}
              className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
            >
              <PencilLine className="h-4 w-4" aria-hidden="true" />
              {asset.asset.assetKind === 'template'
                ? pickLocaleText(locale, {
                    en: 'Edit template',
                    zh_HANS: '编辑模板',
                    zh_HANT: '編輯模板',
                    ja: 'テンプレートを編集',
                    ko: '템플릿 편집',
                    fr: 'Modifier le template',
                  })
                : pickLocaleText(locale, {
                    en: 'Edit component',
                    zh_HANS: '编辑组件',
                    zh_HANT: '編輯元件',
                    ja: 'コンポーネントを編集',
                    ko: '컴포넌트 편집',
                    fr: 'Modifier le composant',
                  })}
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => onDuplicate(asset)}
            disabled={duplicatePending}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {duplicatePending ? (
              <RefreshCcw className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <CopyPlus className="h-4 w-4" aria-hidden="true" />
            )}
            {pickLocaleText(locale, {
              en: 'Duplicate here',
              zh_HANS: '复制到此范围',
              zh_HANT: '複製到此範圍',
              ja: 'ここへ複製',
              ko: '여기로 복제',
              fr: 'Dupliquer ici',
            })}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PublicPresenceAssetWorkspace({
  families,
  locale,
  request,
  scopeId,
  scopeType,
  tenantId,
}: Readonly<PublicPresenceAssetWorkspaceProps>) {
  const closeDrawerRef = useRef<HTMLButtonElement | null>(null);
  const [templateAssets, setTemplateAssets] = useState<PublicPresenceAssetListEntry[]>([]);
  const [componentAssets, setComponentAssets] = useState<PublicPresenceAssetListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<AssetNoticeState | null>(null);
  const [drawerState, setDrawerState] = useState<AssetDrawerState | null>(null);
  const [selectedAssetDetail, setSelectedAssetDetail] = useState<PublicPresenceAssetDetail | null>(
    null
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [createPending, setCreatePending] = useState(false);
  const [duplicateAssetId, setDuplicateAssetId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] =
    useState<PublicPresenceTemplateId>('activeTalentHub');
  const [selectedComponentType, setSelectedComponentType] =
    useState<HomepageComponentType>('SocialLinks');

  const assetScope = useMemo<PublicPresenceAssetScopeInput>(
    () => ({
      scopeId: scopeId ?? null,
      scopeType,
    }),
    [scopeId, scopeType]
  );
  const requestedFamilies = useMemo<readonly AssetFamilyId[]>(
    () => (families && families.length > 0 ? families : ['template', 'component']),
    [families]
  );
  const activeDrawerAssetId =
    drawerState && drawerState.mode !== 'create' ? drawerState.assetId : null;

  const templateOptions = useMemo(() => collectTemplateOptions(templateAssets), [templateAssets]);
  const componentOptions = useMemo(
    () => collectComponentOptions(componentAssets),
    [componentAssets]
  );

  useEffect(() => {
    setSelectedTemplateId(templateOptions[0] ?? 'activeTalentHub');
    setSelectedComponentType(componentOptions[0] ?? 'SocialLinks');
  }, [componentOptions, templateOptions]);

  useEffect(() => {
    let cancelled = false;

    async function loadAssets() {
      setLoading(true);
      setLoadError(null);

      try {
        const [templateResult, componentResult] = await Promise.all([
          requestedFamilies.includes('template')
            ? listPublicPresenceAssets(request, {
                ...assetScope,
                assetKind: 'template',
              })
            : Promise.resolve([]),
          requestedFamilies.includes('component')
            ? listPublicPresenceAssets(request, {
                ...assetScope,
                assetKind: 'component',
              })
            : Promise.resolve([]),
        ]);

        if (cancelled) {
          return;
        }

        setTemplateAssets(templateResult);
        setComponentAssets(componentResult);
      } catch {
        if (cancelled) {
          return;
        }

        setLoadError(
          pickLocaleText(locale, {
            en: 'Unable to load homepage assets for this scope.',
            zh_HANS: '无法加载当前范围的主页模板/组件资产。',
            zh_HANT: '無法載入目前範圍的主頁模板/元件資產。',
            ja: 'このスコープのホームページ資産を読み込めませんでした。',
            ko: '이 범위의 홈페이지 자산을 불러오지 못했습니다.',
            fr: 'Impossible de charger les assets de homepage pour cette portée.',
          })
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAssets();

    return () => {
      cancelled = true;
    };
  }, [assetScope, locale, request, requestedFamilies]);

  useEffect(() => {
    const assetIdForDetail = activeDrawerAssetId;

    if (!assetIdForDetail) {
      setSelectedAssetDetail(null);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }

    let cancelled = false;

    async function loadDetail() {
      setDetailLoading(true);
      setDetailError(null);

      try {
        const detail = await readPublicPresenceAsset(request, assetIdForDetail!, assetScope);

        if (cancelled) {
          return;
        }

        setSelectedAssetDetail(detail);
      } catch {
        if (cancelled) {
          return;
        }

        setDetailError(
          pickLocaleText(locale, {
            en: 'Unable to load asset details right now.',
            zh_HANS: '暂时无法加载资产详情。',
            zh_HANT: '暫時無法載入資產詳情。',
            ja: '現在は資産詳細を読み込めません。',
            ko: '지금은 자산 상세 정보를 불러올 수 없습니다.',
            fr: 'Impossible de charger les détails de l’asset pour le moment.',
          })
        );
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [activeDrawerAssetId, assetScope, locale, request]);

  const refreshAssets = async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const [templateResult, componentResult] = await Promise.all([
        requestedFamilies.includes('template')
          ? listPublicPresenceAssets(request, {
              ...assetScope,
              assetKind: 'template',
            })
          : Promise.resolve([]),
        requestedFamilies.includes('component')
          ? listPublicPresenceAssets(request, {
              ...assetScope,
              assetKind: 'component',
            })
          : Promise.resolve([]),
      ]);
      setTemplateAssets(templateResult);
      setComponentAssets(componentResult);
    } catch {
      setLoadError(
        pickLocaleText(locale, {
          en: 'Unable to refresh homepage assets for this scope.',
          zh_HANS: '无法刷新当前范围的主页模板/组件资产。',
          zh_HANT: '無法重新整理目前範圍的主頁模板/元件資產。',
          ja: 'このスコープのホームページ資産を更新できませんでした。',
          ko: '이 범위의 홈페이지 자산을 새로 고치지 못했습니다.',
          fr: 'Impossible d’actualiser les assets de homepage pour cette portée.',
        })
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAsset = async (family: AssetFamilyId) => {
    setCreatePending(true);
    setNotice(null);

    try {
      const created = await createPublicPresenceAsset(
        request,
        family === 'template'
          ? {
              assetKind: 'template',
              templateId: selectedTemplateId,
            }
          : {
              assetKind: 'component',
              componentType: selectedComponentType,
            },
        assetScope
      );

      await refreshAssets();
      setDrawerState(null);
      setNotice({
        href: buildAssetIdeHref(tenantId, family, created.asset.id, assetScope),
        label:
          family === 'template'
            ? pickLocaleText(locale, {
                en: 'Open template IDE',
                zh_HANS: '打开模板 IDE',
                zh_HANT: '打開模板 IDE',
                ja: 'テンプレート IDE を開く',
                ko: '템플릿 IDE 열기',
                fr: 'Ouvrir l’IDE template',
              })
            : pickLocaleText(locale, {
                en: 'Open component IDE',
                zh_HANS: '打开组件 IDE',
                zh_HANT: '打開元件 IDE',
                ja: 'コンポーネント IDE を開く',
                ko: '컴포넌트 IDE 열기',
                fr: 'Ouvrir l’IDE composant',
              }),
        message:
          family === 'template'
            ? pickLocaleText(locale, {
                en: 'Template asset created for this scope.',
                zh_HANS: '已在当前范围创建模板资产。',
                zh_HANT: '已在目前範圍建立模板資產。',
                ja: 'このスコープにテンプレート資産を作成しました。',
                ko: '현재 범위에 템플릿 자산을 만들었습니다.',
                fr: 'Un asset template a été créé pour cette portée.',
              })
            : pickLocaleText(locale, {
                en: 'Component asset created for this scope.',
                zh_HANS: '已在当前范围创建组件资产。',
                zh_HANT: '已在目前範圍建立元件資產。',
                ja: 'このスコープにコンポーネント資産を作成しました。',
                ko: '현재 범위에 컴포넌트 자산을 만들었습니다.',
                fr: 'Un asset composant a été créé pour cette portée.',
              }),
        tone: 'success',
      });
    } catch {
      setNotice({
        message: pickLocaleText(locale, {
          en: 'Unable to create a homepage asset in this scope.',
          zh_HANS: '无法在当前范围创建主页模板/组件资产。',
          zh_HANT: '無法在目前範圍建立主頁模板/元件資產。',
          ja: 'このスコープにホームページ資産を作成できませんでした。',
          ko: '현재 범위에 홈페이지 자산을 만들지 못했습니다.',
          fr: 'Impossible de créer un asset de homepage dans cette portée.',
        }),
        tone: 'error',
      });
    } finally {
      setCreatePending(false);
    }
  };

  const handleDuplicateAsset = async (asset: PublicPresenceAssetListEntry) => {
    setDuplicateAssetId(asset.asset.id);
    setNotice(null);

    try {
      const duplicated = await duplicatePublicPresenceAsset(
        request,
        asset.asset.id,
        {},
        assetScope
      );

      await refreshAssets();
      setNotice({
        href: buildAssetIdeHref(tenantId, asset.asset.assetKind, duplicated.asset.id, assetScope),
        label:
          asset.asset.assetKind === 'template'
            ? pickLocaleText(locale, {
                en: 'Edit duplicated template',
                zh_HANS: '编辑复制模板',
                zh_HANT: '編輯複製模板',
                ja: '複製したテンプレートを編集',
                ko: '복제한 템플릿 편집',
                fr: 'Modifier le template dupliqué',
              })
            : pickLocaleText(locale, {
                en: 'Edit duplicated component',
                zh_HANS: '编辑复制组件',
                zh_HANT: '編輯複製元件',
                ja: '複製したコンポーネントを編集',
                ko: '복제한 컴포넌트 편집',
                fr: 'Modifier le composant dupliqué',
              }),
        message: pickLocaleText(locale, {
          en: 'An editable copy was created in the current scope.',
          zh_HANS: '已在当前范围创建可编辑副本。',
          zh_HANT: '已在目前範圍建立可編輯副本。',
          ja: '現在のスコープに編集可能なコピーを作成しました。',
          ko: '현재 범위에 편집 가능한 사본을 만들었습니다.',
          fr: 'Une copie modifiable a été créée dans la portée actuelle.',
        }),
        tone: 'success',
      });
    } catch {
      setNotice({
        message: pickLocaleText(locale, {
          en: 'Unable to duplicate this asset into the current scope.',
          zh_HANS: '无法将此资产复制到当前范围。',
          zh_HANT: '無法將此資產複製到目前範圍。',
          ja: 'この資産を現在のスコープへ複製できませんでした。',
          ko: '이 자산을 현재 범위로 복제하지 못했습니다.',
          fr: 'Impossible de dupliquer cet asset dans la portée actuelle.',
        }),
        tone: 'error',
      });
    } finally {
      setDuplicateAssetId(null);
    }
  };

  const drawerTitle =
    drawerState?.mode === 'create'
      ? drawerState.family === 'template'
        ? pickLocaleText(locale, {
            en: 'Add homepage template asset',
            zh_HANS: '新增主页模板资产',
            zh_HANT: '新增主頁模板資產',
            ja: 'ホームページテンプレート資産を追加',
            ko: '홈페이지 템플릿 자산 추가',
            fr: 'Ajouter un asset template de homepage',
          })
        : pickLocaleText(locale, {
            en: 'Add homepage component asset',
            zh_HANS: '新增主页组件资产',
            zh_HANT: '新增主頁元件資產',
            ja: 'ホームページコンポーネント資産を追加',
            ko: '홈페이지 컴포넌트 자산 추가',
            fr: 'Ajouter un asset composant de homepage',
          })
      : drawerState?.mode === 'preview'
        ? pickLocaleText(locale, {
            en: 'Asset preview',
            zh_HANS: '资产预览',
            zh_HANT: '資產預覽',
            ja: '資産プレビュー',
            ko: '자산 미리보기',
            fr: 'Aperçu de l’asset',
          })
        : pickLocaleText(locale, {
            en: 'Asset inspect',
            zh_HANS: '资产详情',
            zh_HANT: '資產詳情',
            ja: '資産詳細',
            ko: '자산 상세',
            fr: 'Détails de l’asset',
          });

  const drawerDescription =
    drawerState?.mode === 'create'
      ? drawerState.family === 'template'
        ? pickLocaleText(locale, {
            en: 'Choose a governed homepage layout as the starting point for this scope.',
            zh_HANS: '为当前范围选择一个受治理的主页布局作为起点。',
            zh_HANT: '為目前範圍選擇一個受治理的主頁版型作為起點。',
            ja: 'このスコープの出発点として、管理対象のホームページレイアウトを選択します。',
            ko: '현재 범위의 시작점이 될 관리형 홈페이지 레이아웃을 선택하세요.',
            fr: 'Choisissez une mise en page gouvernée comme point de départ pour cette portée.',
          })
        : pickLocaleText(locale, {
            en: 'Choose a homepage block to start authoring inside the current scope.',
            zh_HANS: '选择一个主页模块，在当前范围内开始创作。',
            zh_HANT: '選擇一個主頁模組，在目前範圍內開始創作。',
            ja: '現在のスコープで作成を始めるホームページブロックを選択します。',
            ko: '현재 범위 안에서 작업을 시작할 홈페이지 블록을 선택하세요.',
            fr: 'Choisissez un bloc de homepage pour commencer l’authoring dans la portée actuelle.',
          })
      : selectedAssetDetail
        ? pickLocaleText(locale, {
            en: `Current scope: ${getAssetOwnerLabel(locale, scopeType)}`,
            zh_HANS: `当前范围：${getAssetOwnerLabel(locale, scopeType)}`,
            zh_HANT: `目前範圍：${getAssetOwnerLabel(locale, scopeType)}`,
            ja: `現在のスコープ: ${getAssetOwnerLabel(locale, scopeType)}`,
            ko: `현재 범위: ${getAssetOwnerLabel(locale, scopeType)}`,
            fr: `Portée actuelle : ${getAssetOwnerLabel(locale, scopeType)}`,
          })
        : undefined;

  const renderDrawerBody = () => {
    if (!drawerState) {
      return null;
    }

    if (drawerState.mode === 'create') {
      return (
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-sm leading-6 text-slate-700">
              {drawerState.family === 'template'
                ? pickLocaleText(locale, {
                    en: 'New template assets start with a governed source bundle and stay editable only in this scope.',
                    zh_HANS: '新模板资产会从受治理的源码包起步，并且只在当前范围内可编辑。',
                    zh_HANT: '新模板資產會從受治理的原始碼包起步，並且只在目前範圍內可編輯。',
                    ja: '新しいテンプレート資産は管理されたソースバンドルから始まり、このスコープ内でのみ編集できます。',
                    ko: '새 템플릿 자산은 관리된 소스 번들에서 시작하며 현재 범위에서만 편집할 수 있습니다.',
                    fr: 'Les nouveaux assets template démarrent avec un bundle source gouverné et restent modifiables uniquement dans cette portée.',
                  })
                : pickLocaleText(locale, {
                    en: 'New component assets start with a governed source bundle and can be adjusted after you open the IDE.',
                    zh_HANS: '新组件资产会从受治理的源码包起步，进入 IDE 后即可继续调整。',
                    zh_HANT: '新元件資產會從受治理的原始碼包起步，進入 IDE 後即可繼續調整。',
                    ja: '新しいコンポーネント資産は管理されたソースバンドルから始まり、IDE を開いてから調整できます。',
                    ko: '새 컴포넌트 자산은 관리된 소스 번들에서 시작하며 IDE를 연 뒤 조정할 수 있습니다.',
                    fr: 'Les nouveaux assets composant démarrent avec un bundle source gouverné et peuvent être ajustés après ouverture de l’IDE.',
                  })}
            </p>
          </div>

          {drawerState.family === 'template' ? (
            <label className="space-y-2 text-sm font-medium text-slate-900">
              <span>
                {pickLocaleText(locale, {
                  en: 'Template family',
                  zh_HANS: '模板族',
                  zh_HANT: '模板族',
                  ja: 'テンプレート種別',
                  ko: '템플릿 계열',
                  fr: 'Famille de template',
                })}
              </span>
              <select
                value={selectedTemplateId}
                onChange={(event) =>
                  setSelectedTemplateId(event.currentTarget.value as PublicPresenceTemplateId)
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900"
              >
                {templateOptions.map((templateId) => (
                  <option key={templateId} value={templateId}>
                    {getTemplateDisplayName(locale, templateAssets, templateId)}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="space-y-2 text-sm font-medium text-slate-900">
              <span>
                {pickLocaleText(locale, {
                  en: 'Component family',
                  zh_HANS: '组件族',
                  zh_HANT: '元件族',
                  ja: 'コンポーネント種別',
                  ko: '컴포넌트 계열',
                  fr: 'Famille de composant',
                })}
              </span>
              <select
                value={selectedComponentType}
                onChange={(event) =>
                  setSelectedComponentType(event.currentTarget.value as HomepageComponentType)
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900"
              >
                {componentOptions.map((componentType) => (
                  <option key={componentType} value={componentType}>
                    {getComponentDisplayName(componentType)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      );
    }

    if (detailLoading) {
      return (
        <p className="text-sm font-medium text-slate-600">
          {pickLocaleText(locale, {
            en: 'Loading asset details…',
            zh_HANS: '正在加载资产详情…',
            zh_HANT: '正在載入資產詳情…',
            ja: '資産詳細を読み込み中…',
            ko: '자산 상세 정보를 불러오는 중…',
            fr: 'Chargement des détails de l’asset…',
          })}
        </p>
      );
    }

    if (detailError || !selectedAssetDetail) {
      return <p className="text-sm font-medium text-rose-700">{detailError}</p>;
    }

    const currentRevision = selectedAssetDetail.currentRevision;
    const displayName = pickLocaleText(locale, selectedAssetDetail.asset.name);
    const displayDescription = pickLocaleText(locale, selectedAssetDetail.asset.description);
    const sourceHash = currentRevision?.sourceHash ?? 'N/A';

    return (
      <div className="space-y-5">
        <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] text-slate-600 uppercase">
              {buildAssetTypeLabel(locale, selectedAssetDetail)}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] text-slate-600 uppercase">
              {getAssetStatusLabel(locale, selectedAssetDetail)}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] text-slate-600 uppercase">
              {selectedAssetDetail.asset.code}
            </span>
          </div>
          <h3 className="mt-4 text-xl font-semibold text-slate-950">{displayName}</h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">{displayDescription}</p>
        </div>

        {drawerState.mode === 'preview' ? (
          <div className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white via-rose-50/50 to-slate-50 p-6">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase">
              {pickLocaleText(locale, {
                en: 'Preview focus',
                zh_HANS: '预览聚焦',
                zh_HANT: '預覽聚焦',
                ja: 'プレビュー焦点',
                ko: '미리보기 초점',
                fr: 'Focus aperçu',
              })}
            </p>
            <div className="mt-4 rounded-[1.75rem] border border-slate-200 bg-white px-5 py-6 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">{displayName}</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">{displayDescription}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <DetailMetric
                  label={pickLocaleText(locale, {
                    en: 'Current revision',
                    zh_HANS: '当前修订',
                    zh_HANT: '目前修訂',
                    ja: '現在のリビジョン',
                    ko: '현재 리비전',
                    fr: 'Révision courante',
                  })}
                  value={currentRevision ? `r${currentRevision.revisionNumber}` : 'N/A'}
                />
                <DetailMetric
                  label={pickLocaleText(locale, {
                    en: 'Files',
                    zh_HANS: '文件数',
                    zh_HANT: '檔案數',
                    ja: 'ファイル数',
                    ko: '파일 수',
                    fr: 'Fichiers',
                  })}
                  value={String(currentRevision?.sourceBundle.length ?? 0)}
                />
                <DetailMetric
                  label={pickLocaleText(locale, {
                    en: 'Validation',
                    zh_HANS: '校验',
                    zh_HANT: '驗證',
                    ja: '検証',
                    ko: '검증',
                    fr: 'Validation',
                  })}
                  value={currentRevision?.validationState ?? 'unvalidated'}
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <DetailMetric
                label={pickLocaleText(locale, {
                  en: 'Revision',
                  zh_HANS: '修订号',
                  zh_HANT: '修訂號',
                  ja: 'リビジョン',
                  ko: '리비전',
                  fr: 'Révision',
                })}
                value={currentRevision ? `r${currentRevision.revisionNumber}` : 'N/A'}
              />
              <DetailMetric
                label={pickLocaleText(locale, {
                  en: 'Source hash',
                  zh_HANS: '源码哈希',
                  zh_HANT: '原始碼雜湊',
                  ja: 'ソースハッシュ',
                  ko: '소스 해시',
                  fr: 'Hash source',
                })}
                value={sourceHash.slice(0, 12)}
              />
              <DetailMetric
                label={pickLocaleText(locale, {
                  en: 'Validated at',
                  zh_HANS: '校验时间',
                  zh_HANT: '驗證時間',
                  ja: '検証日時',
                  ko: '검증 시각',
                  fr: 'Validé le',
                })}
                value={formatLocaleDateTime(
                  locale,
                  currentRevision?.lastValidatedAt ?? null,
                  pickLocaleText(locale, {
                    en: 'Not yet',
                    zh_HANS: '尚未',
                    zh_HANT: '尚未',
                    ja: '未実行',
                    ko: '아직 아님',
                    fr: 'Pas encore',
                  })
                )}
              />
              <DetailMetric
                label={pickLocaleText(locale, {
                  en: 'File bundle',
                  zh_HANS: '文件包',
                  zh_HANT: '檔案包',
                  ja: 'ファイル束',
                  ko: '파일 번들',
                  fr: 'Bundle de fichiers',
                })}
                value={String(currentRevision?.sourceBundle.length ?? 0)}
              />
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/90 p-5">
              <p className="text-sm font-semibold text-slate-900">
                {pickLocaleText(locale, {
                  en: 'Revision history',
                  zh_HANS: '修订历史',
                  zh_HANT: '修訂歷史',
                  ja: 'リビジョン履歴',
                  ko: '리비전 기록',
                  fr: 'Historique des révisions',
                })}
              </p>
              <div className="mt-4 space-y-3">
                {selectedAssetDetail.revisions.map((revision) => (
                  <div
                    key={revision.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{`r${revision.revisionNumber}`}</p>
                      <p className="text-xs font-medium text-slate-500">
                        {formatLocaleDateTime(locale, revision.createdAt, revision.createdAt)}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {pickLocaleText(locale, {
                        en: `Validation ${revision.validationState}, ${revision.validationSummary.warnCount} warnings, ${revision.validationSummary.passCount} passes.`,
                        zh_HANS: `校验状态 ${revision.validationState}，${revision.validationSummary.warnCount} 条警告，${revision.validationSummary.passCount} 条通过。`,
                        zh_HANT: `驗證狀態 ${revision.validationState}，${revision.validationSummary.warnCount} 條警告，${revision.validationSummary.passCount} 條通過。`,
                        ja: `検証 ${revision.validationState}、警告 ${revision.validationSummary.warnCount} 件、パス ${revision.validationSummary.passCount} 件。`,
                        ko: `검증 ${revision.validationState}, 경고 ${revision.validationSummary.warnCount}건, 통과 ${revision.validationSummary.passCount}건.`,
                        fr: `Validation ${revision.validationState}, ${revision.validationSummary.warnCount} avertissements, ${revision.validationSummary.passCount} réussites.`,
                      })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderFamilySection = (family: AssetFamilyId, assets: PublicPresenceAssetListEntry[]) => {
    const icon =
      family === 'template' ? (
        <LayoutTemplate className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Package2 className="h-4 w-4" aria-hidden="true" />
      );
    const familyTitle =
      family === 'template'
        ? pickLocaleText(locale, {
            en: 'Homepage Template Assets',
            zh_HANS: '主页模板资产',
            zh_HANT: '主頁模板資產',
            ja: 'ホームページテンプレート資産',
            ko: '홈페이지 템플릿 자산',
            fr: 'Assets template de homepage',
          })
        : pickLocaleText(locale, {
            en: 'Homepage Component Assets',
            zh_HANS: '主页组件资产',
            zh_HANT: '主頁元件資產',
            ja: 'ホームページコンポーネント資産',
            ko: '홈페이지 컴포넌트 자산',
            fr: 'Assets composant de homepage',
          });

    return (
      <section
        className="space-y-4 rounded-[2rem] border border-slate-200 bg-slate-50/70 p-5"
        data-testid={`asset-family-${family}`}
        key={family}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold tracking-[0.16em] text-slate-600 uppercase">
              {icon}
              {familyTitle}
            </div>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              {describeAssetFamily(locale, family, scopeType)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDrawerState({ family, mode: 'create' })}
            className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
          >
            {family === 'template' ? (
              <LayoutTemplate className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Package2 className="h-4 w-4" aria-hidden="true" />
            )}
            {family === 'template'
              ? pickLocaleText(locale, {
                  en: 'Add template asset',
                  zh_HANS: '新增模板资产',
                  zh_HANT: '新增模板資產',
                  ja: 'テンプレート資産を追加',
                  ko: '템플릿 자산 추가',
                  fr: 'Ajouter un asset template',
                })
              : pickLocaleText(locale, {
                  en: 'Add component asset',
                  zh_HANS: '新增组件资产',
                  zh_HANT: '新增元件資產',
                  ja: 'コンポーネント資産を追加',
                  ko: '컴포넌트 자산 추가',
                  fr: 'Ajouter un asset composant',
                })}
          </button>
        </div>

        {loading ? (
          <p className="text-sm font-medium text-slate-600">
            {pickLocaleText(locale, {
              en: 'Loading assets…',
              zh_HANS: '正在加载资产…',
              zh_HANT: '正在載入資產…',
              ja: '資産を読み込み中…',
              ko: '자산을 불러오는 중…',
              fr: 'Chargement des assets…',
            })}
          </p>
        ) : assets.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/90 px-4 py-5">
            <p className="text-sm font-semibold text-slate-900">
              {family === 'template'
                ? pickLocaleText(locale, {
                    en: 'No template assets are managed directly in this scope yet.',
                    zh_HANS: '当前范围还没有直接维护的模板资产。',
                    zh_HANT: '目前範圍還沒有直接維護的模板資產。',
                    ja: 'このスコープで直接管理しているテンプレート資産はまだありません。',
                    ko: '현재 범위에서 직접 관리하는 템플릿 자산이 아직 없습니다.',
                    fr: 'Aucun asset template n’est encore géré directement dans cette portée.',
                  })
                : pickLocaleText(locale, {
                    en: 'No component assets are managed directly in this scope yet.',
                    zh_HANS: '当前范围还没有直接维护的组件资产。',
                    zh_HANT: '目前範圍還沒有直接維護的元件資產。',
                    ja: 'このスコープで直接管理しているコンポーネント資産はまだありません。',
                    ko: '현재 범위에서 직접 관리하는 컴포넌트 자산이 아직 없습니다.',
                    fr: 'Aucun asset composant n’est encore géré directement dans cette portée.',
                  })}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {assets.map((asset) => (
              <AssetRow
                key={asset.asset.id}
                asset={asset}
                duplicatePending={duplicateAssetId === asset.asset.id}
                locale={locale}
                onDuplicate={handleDuplicateAsset}
                onInspect={(nextAsset) =>
                  setDrawerState({
                    assetId: nextAsset.asset.id,
                    family,
                    mode: 'inspect',
                  })
                }
                onPreview={(nextAsset) =>
                  setDrawerState({
                    assetId: nextAsset.asset.id,
                    family,
                    mode: 'preview',
                  })
                }
                scope={assetScope}
                tenantId={tenantId}
              />
            ))}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="space-y-5" data-testid="public-presence-asset-workspace">
      {notice ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
            notice.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
          role={notice.tone === 'success' ? 'status' : 'alert'}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{notice.message}</span>
            {notice.href && notice.label ? (
              <Link href={notice.href} className="font-semibold underline underline-offset-4">
                {notice.label}
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {loadError ? (
        <div
          className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-800"
          role="alert"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{loadError}</span>
            <button
              type="button"
              onClick={() => {
                void refreshAssets();
              }}
              className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-3 py-2 font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
            >
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
              {pickLocaleText(locale, {
                en: 'Retry',
                zh_HANS: '重试',
                zh_HANT: '重試',
                ja: '再試行',
                ko: '다시 시도',
                fr: 'Réessayer',
              })}
            </button>
          </div>
        </div>
      ) : null}

      {requestedFamilies.includes('template')
        ? renderFamilySection('template', templateAssets)
        : null}
      {requestedFamilies.includes('component')
        ? renderFamilySection('component', componentAssets)
        : null}

      <ActionDrawer
        closeButtonAriaLabel={pickLocaleText(locale, {
          en: 'Close asset drawer',
          zh_HANS: '关闭资产抽屉',
          zh_HANT: '關閉資產抽屜',
          ja: '資産ドロワーを閉じる',
          ko: '자산 서랍 닫기',
          fr: 'Fermer le tiroir d’asset',
        })}
        description={drawerDescription}
        footer={
          drawerState ? (
            <ActionDrawerFooter
              secondary={
                <button
                  ref={closeDrawerRef}
                  type="button"
                  onClick={() => setDrawerState(null)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  {pickLocaleText(locale, {
                    en: 'Close',
                    zh_HANS: '关闭',
                    zh_HANT: '關閉',
                    ja: '閉じる',
                    ko: '닫기',
                    fr: 'Fermer',
                  })}
                </button>
              }
              primary={
                drawerState.mode === 'create' ? (
                  <AsyncSubmitButton
                    onClick={() => handleCreateAsset(drawerState.family)}
                    isPending={createPending}
                    pendingText={pickLocaleText(locale, {
                      en: 'Creating…',
                      zh_HANS: '创建中…',
                      zh_HANT: '建立中…',
                      ja: '作成中…',
                      ko: '생성 중…',
                      fr: 'Création…',
                    })}
                  >
                    {drawerState.family === 'template'
                      ? pickLocaleText(locale, {
                          en: 'Create template asset',
                          zh_HANS: '创建模板资产',
                          zh_HANT: '建立模板資產',
                          ja: 'テンプレート資産を作成',
                          ko: '템플릿 자산 만들기',
                          fr: 'Créer l’asset template',
                        })
                      : pickLocaleText(locale, {
                          en: 'Create component asset',
                          zh_HANS: '创建组件资产',
                          zh_HANT: '建立元件資產',
                          ja: 'コンポーネント資産を作成',
                          ko: '컴포넌트 자산 만들기',
                          fr: 'Créer l’asset composant',
                        })}
                  </AsyncSubmitButton>
                ) : selectedAssetDetail ? (
                  <Link
                    href={buildAssetIdeHref(
                      tenantId,
                      drawerState.family,
                      selectedAssetDetail.asset.id,
                      assetScope
                    )}
                    className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
                  >
                    <PencilLine className="h-4 w-4" aria-hidden="true" />
                    {drawerState.family === 'template'
                      ? pickLocaleText(locale, {
                          en: 'Open template IDE',
                          zh_HANS: '打开模板 IDE',
                          zh_HANT: '打開模板 IDE',
                          ja: 'テンプレート IDE を開く',
                          ko: '템플릿 IDE 열기',
                          fr: 'Ouvrir l’IDE template',
                        })
                      : pickLocaleText(locale, {
                          en: 'Open component IDE',
                          zh_HANS: '打开组件 IDE',
                          zh_HANT: '打開元件 IDE',
                          ja: 'コンポーネント IDE を開く',
                          ko: '컴포넌트 IDE 열기',
                          fr: 'Ouvrir l’IDE composant',
                        })}
                  </Link>
                ) : null
              }
            />
          ) : null
        }
        initialFocusRef={closeDrawerRef}
        onOpenChange={(open) => {
          if (!open) {
            setDrawerState(null);
          }
        }}
        open={drawerState !== null}
        size={drawerState?.mode === 'create' ? 'md' : 'lg'}
        title={drawerTitle ?? ''}
      >
        {renderDrawerBody()}
      </ActionDrawer>
    </div>
  );
}
