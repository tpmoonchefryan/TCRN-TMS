'use client';

import { SUPPORTED_UI_LOCALES, type SupportedUiLocale } from '@tcrn/shared';
import { Building2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  buildSubsidiarySettingsDraft,
  buildSubsidiarySettingsUpdatePayload,
  isSubsidiarySettingsDraftDirty,
  readSubsidiaryDetail,
  readSubsidiarySettings,
  type ScopeSettingsResponse,
  type SubsidiaryDetailResponse,
  type SubsidiarySettingsDraft,
  updateSubsidiarySettings,
} from '@/domains/config-dictionary-settings/api/settings.api';
import {
  type DictionaryTypeSummary,
  listDictionaryTypes,
} from '@/domains/config-dictionary-settings/api/system-dictionary.api';
import { DictionaryExplorerPanel } from '@/domains/config-dictionary-settings/components/DictionaryExplorerPanel';
import { ScopedConfigEntityWorkspace } from '@/domains/config-dictionary-settings/components/ScopedConfigEntityWorkspace';
import { useSettingsFamilyCopy } from '@/domains/config-dictionary-settings/screens/settings-family.copy';
import { ApiRequestError } from '@/platform/http/api';
import { useFadeSwapState } from '@/platform/runtime/motion/use-fade-swap-state';
import { useSession } from '@/platform/runtime/session/session-provider';
import { FormSection, GlassSurface, SettingsLayout, StateView } from '@/platform/ui';

interface AsyncPanelState<T> {
  data: T | null;
  error: string | null;
}

const LANGUAGE_LABELS = {
  en: 'English',
  zh_HANS: '简体中文',
  zh_HANT: '繁體中文',
  ja: '日本語',
  ko: '한국어',
  fr: 'Français',
} as const;

const LANGUAGE_OPTIONS = SUPPORTED_UI_LOCALES.map((value) => ({
  value,
  label: LANGUAGE_LABELS[value],
}));

const TIMEZONE_OPTIONS = [
  'Asia/Shanghai',
  'Asia/Tokyo',
  'UTC',
  'America/Los_Angeles',
];

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiRequestError ? reason.message : fallback;
}

function resolveDescription(detail: SubsidiaryDetailResponse, fallback: string) {
  return detail.descriptionZh || detail.descriptionEn || detail.descriptionJa || fallback;
}

function FieldRow({
  label,
  value,
  hint,
}: Readonly<{
  label: string;
  value: string;
  hint?: string;
}>) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-base font-semibold text-slate-950">{value}</p>
      {hint ? <p className="mt-2 text-sm leading-6 text-slate-600">{hint}</p> : null}
    </div>
  );
}

function SectionPlaceholder({
  title,
  description,
}: Readonly<{
  title: string;
  description: string;
}>) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-4">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function SectionEntryLink({
  title,
  description,
  href,
  cta,
}: Readonly<{
  title: string;
  description: string;
  href: string;
  cta: string;
}>) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <Link
          href={href}
          className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100"
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}

export function SubsidiarySettingsScreen({
  tenantId,
  subsidiaryId,
}: Readonly<{
  tenantId: string;
  subsidiaryId: string;
}>) {
  const [activeSectionId, setActiveSectionId] = useState<'details' | 'config-entities' | 'settings' | 'dictionary'>(
    'details',
  );
  const {
    displayedValue: displayedSectionId,
    transitionClassName: sectionTransitionClassName,
  } = useFadeSwapState(activeSectionId);
  const { request, requestEnvelope, session } = useSession();
  const {
    common,
    selectedLocale,
    dictionaryExplorerCopy,
    formatDateTime,
    localizedConfigEntityCatalog,
    scopedConfigCopy,
    text,
  } = useSettingsFamilyCopy();
  const [detail, setDetail] = useState<SubsidiaryDetailResponse | null>(null);
  const [settings, setSettings] = useState<ScopeSettingsResponse | null>(null);
  const [dictionaryPanel, setDictionaryPanel] = useState<AsyncPanelState<DictionaryTypeSummary[]>>({
    data: null,
    error: null,
  });
  const [initialDraft, setInitialDraft] = useState<SubsidiarySettingsDraft>(() => buildSubsidiarySettingsDraft({}));
  const [draft, setDraft] = useState<SubsidiarySettingsDraft>(() => buildSubsidiarySettingsDraft({}));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);

      try {
        const [detailResult, settingsResult, dictionaryResult] = await Promise.allSettled([
          readSubsidiaryDetail(request, subsidiaryId),
          readSubsidiarySettings(request, subsidiaryId),
          listDictionaryTypes(request),
        ]);

        if (cancelled) {
          return;
        }

        if (detailResult.status !== 'fulfilled') {
          setLoadError(
            getErrorMessage(
              detailResult.reason,
              text({
                en: 'Failed to load subsidiary details.',
                zh_HANS: '加载分目录详情失败。',
                zh_HANT: '載入分目錄詳情失敗。',
                ja: '配下スコープ詳細の読み込みに失敗しました。',
                ko: '하위 조직 상세 정보를 불러오지 못했습니다.',
                fr: 'Echec du chargement des details de la filiale.',
              }),
            ),
          );
          return;
        }

        if (settingsResult.status !== 'fulfilled') {
          setLoadError(
            getErrorMessage(
              settingsResult.reason,
              text({
                en: 'Failed to load subsidiary settings.',
                zh_HANS: '加载分目录设置失败。',
                zh_HANT: '載入分目錄設定失敗。',
                ja: '配下スコープ設定の読み込みに失敗しました。',
                ko: '하위 조직 설정을 불러오지 못했습니다.',
                fr: 'Echec du chargement des parametres de la filiale.',
              }),
            ),
          );
          return;
        }

        const nextDraft = buildSubsidiarySettingsDraft(settingsResult.value.settings);
        setDetail(detailResult.value);
        setSettings(settingsResult.value);
        setInitialDraft(nextDraft);
        setDraft(nextDraft);
        setDictionaryPanel({
          data: dictionaryResult.status === 'fulfilled' ? dictionaryResult.value : null,
          error:
            dictionaryResult.status === 'rejected'
              ? getErrorMessage(
                  dictionaryResult.reason,
                  text({
                    en: 'System dictionary is unavailable for this scope.',
                    zh_HANS: '当前范围的系统词典不可用。',
                    zh_HANT: '目前範圍的系統詞典不可用。',
                    ja: 'このスコープのシステム辞書を読み込めません。',
                    ko: '이 범위에서는 시스템 사전을 사용할 수 없습니다.',
                    fr: 'Le dictionnaire systeme est indisponible pour ce perimetre.',
                  }),
                )
              : null,
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
  }, [request, subsidiaryId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <GlassSurface className="p-8">
          <p className="text-sm font-medium text-slate-500">
            {text({
              en: 'Loading subsidiary settings…',
              zh_HANS: '正在加载分目录设置…',
              zh_HANT: '正在載入分目錄設定…',
              ja: '配下スコープ設定を読み込み中…',
              ko: '하위 조직 설정을 불러오는 중…',
              fr: 'Chargement des parametres de la filiale…',
            })}
          </p>
        </GlassSurface>
      </div>
    );
  }

  if (loadError || !detail || !settings) {
    return (
      <StateView
        status="error"
        title={text({
          en: 'Subsidiary settings unavailable',
          zh_HANS: '分目录设置不可用',
          zh_HANT: '分目錄設定不可用',
          ja: '配下スコープ設定を読み込めません',
          ko: '하위 조직 설정을 사용할 수 없습니다',
          fr: 'Les parametres de la filiale sont indisponibles',
        })}
        description={loadError || undefined}
      />
    );
  }

  const currentSettings = settings;
  const hasDirtyDraft = isSubsidiarySettingsDraftDirty(initialDraft, draft);
  const overrideSet = new Set(settings.overrides);
  const dictionaryCount = dictionaryPanel.data?.length ?? 0;
  const localOverrideLabel = text({
    en: 'Subsidiary override',
    zh_HANS: '分目录覆盖',
    zh_HANT: '分目錄覆寫',
    ja: '配下スコープ上書き',
    ko: '하위 조직 재정의',
    fr: 'Remplacement au niveau de la filiale',
  });

  function formatScopeSource(source: string | null | undefined) {
    if (!source) {
      return localOverrideLabel;
    }

    if (source === 'tenant') {
      return text({
        en: 'Tenant default',
        zh_HANS: '租户默认值',
        zh_HANT: '租戶預設值',
        ja: 'テナント既定値',
        ko: '테넌트 기본값',
        fr: 'Valeur par defaut du locataire',
      });
    }

    if (source === 'subsidiary') {
      return text({
        en: 'Parent subsidiary',
        zh_HANS: '上级分目录',
        zh_HANT: '上級分目錄',
        ja: '親配下スコープ',
        ko: '상위 하위 조직',
        fr: 'Filiale parente',
      });
    }

    if (source === 'talent') {
      return text({
        en: 'Talent scope',
        zh_HANS: '艺人范围',
        zh_HANT: '藝人範圍',
        ja: 'タレントスコープ',
        ko: '아티스트 범위',
        fr: 'Perimetre du talent',
      });
    }

    return source;
  }

  function formatSourceHint(source: string | null | undefined, isOverridden: boolean) {
    return `${common.source}: ${formatScopeSource(source)}${isOverridden ? ` / ${common.overriddenHere}` : ''}`;
  }

  async function handleSave() {
    if (!hasDirtyDraft || isSaving || !currentSettings) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const nextSettings = await updateSubsidiarySettings(request, subsidiaryId, {
        settings: buildSubsidiarySettingsUpdatePayload(draft),
        version: currentSettings.version,
      });
      const nextDraft = buildSubsidiarySettingsDraft(nextSettings.settings);
      setSettings(nextSettings);
      setInitialDraft(nextDraft);
      setDraft(nextDraft);
      setSaveSuccess(
        text({
          en: 'Subsidiary settings saved.',
          zh_HANS: '分目录设置已保存。',
          zh_HANT: '分目錄設定已儲存。',
          ja: '配下スコープ設定を保存しました。',
          ko: '하위 조직 설정을 저장했습니다.',
          fr: 'Les parametres de la filiale ont ete enregistres.',
        }),
      );
    } catch (reason) {
      setSaveError(
        getErrorMessage(
          reason,
          text({
            en: 'Failed to save subsidiary settings.',
            zh_HANS: '保存分目录设置失败。',
            zh_HANT: '儲存分目錄設定失敗。',
            ja: '配下スコープ設定の保存に失敗しました。',
            ko: '하위 조직 설정을 저장하지 못했습니다.',
            fr: 'Echec de l enregistrement des parametres de la filiale.',
          }),
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleReset() {
    setDraft(initialDraft);
    setSaveError(null);
    setSaveSuccess(null);
  }

  return (
    <SettingsLayout
      title={`${detail.name} ${text({
        en: 'Subsidiary Settings',
        zh_HANS: '分目录设置',
        zh_HANT: '分目錄設定',
        ja: '配下スコープ設定',
        ko: '하위 조직 설정',
        fr: 'Parametres de la filiale',
      })}`}
      description={text({
        en: 'Manage subsidiary identity, defaults, configuration entities, and dictionary visibility.',
        zh_HANS: '管理分目录身份、默认值、配置实体与词典可见性。',
        zh_HANT: '管理分目錄識別資訊、預設值、配置實體與詞典可見性。',
        ja: '配下スコープの識別情報、既定値、設定エンティティ、辞書表示を管理します。',
        ko: '하위 조직의 식별 정보, 기본값, 구성 엔티티, 사전 가시성을 관리합니다.',
        fr: 'Gerez l identite de la filiale, ses valeurs par defaut, ses entites de configuration et la visibilite du dictionnaire.',
      })}
      sections={[
        { id: 'details', label: common.details },
        { id: 'config-entities', label: common.configEntities },
        { id: 'settings', label: common.settings },
        { id: 'dictionary', label: common.dictionary },
      ]}
      activeSectionId={activeSectionId}
      ariaLabel={common.settingsSectionsAriaLabel}
      onSectionChange={(sectionId) => {
        setActiveSectionId(sectionId as 'details' | 'config-entities' | 'settings' | 'dictionary');
      }}
    >
      <div className={sectionTransitionClassName}>
      {displayedSectionId === 'details' ? (
        <div className="space-y-6">
          <GlassSurface className="p-8">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                  <Building2 className="h-3.5 w-3.5" />
                  {text({
                    en: 'Subsidiary settings',
                    zh_HANS: '分目录设置',
                    zh_HANT: '分目錄設定',
                    ja: '配下スコープ設定',
                    ko: '하위 조직 설정',
                    fr: 'Parametres de la filiale',
                  })}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <FieldRow label={text({ en: 'Tenant', zh_HANS: '租户', zh_HANT: '租戶', ja: 'テナント', ko: '테넌트', fr: 'Locataire' })} value={session?.tenantName || common.currentTenant} />
                <FieldRow label={text({ en: 'Subsidiary', zh_HANS: '分目录', zh_HANT: '分目錄', ja: '配下スコープ', ko: '하위 조직', fr: 'Filiale' })} value={detail.name} />
                <FieldRow label={text({ en: 'Child Subsidiaries', zh_HANS: '子分目录', zh_HANT: '子分目錄', ja: '子スコープ', ko: '하위 조직 수', fr: 'Filiales enfants' })} value={String(detail.childrenCount)} />
                <FieldRow label={text({ en: 'Attached Talents', zh_HANS: '关联艺人', zh_HANT: '關聯藝人', ja: '所属タレント', ko: '연결된 아티스트', fr: 'Talents rattaches' })} value={String(detail.talentCount)} />
              </div>
            </div>
          </GlassSurface>

          <GlassSurface className="p-6">
            <FormSection
              title={common.details}
              description={text({
                en: 'Review subsidiary identity, hierarchy, and status.',
                zh_HANS: '查看分目录身份、层级与状态。',
                zh_HANT: '查看分目錄識別資訊、層級與狀態。',
                ja: '配下スコープの識別情報、階層、状態を確認します。',
                ko: '하위 조직의 식별 정보, 계층, 상태를 확인합니다.',
                fr: 'Consultez l identite, la hierarchie et le statut de la filiale.',
              })}
            >
              <div className="grid gap-4 xl:grid-cols-2">
                <FieldRow label={text({ en: 'Subsidiary Code', zh_HANS: '分目录代码', zh_HANT: '分目錄代碼', ja: '配下スコープコード', ko: '하위 조직 코드', fr: 'Code de la filiale' })} value={detail.code} />
                <FieldRow label={text({ en: 'Path', zh_HANS: '路径', zh_HANT: '路徑', ja: 'パス', ko: '경로', fr: 'Chemin' })} value={detail.path} />
                <FieldRow label={text({ en: 'Legal Name', zh_HANS: '正式名称', zh_HANT: '正式名稱', ja: '正式名称', ko: '법인명', fr: 'Raison sociale' })} value={detail.nameEn} />
                <FieldRow
                  label={text({ en: 'Parent scope', zh_HANS: '上级范围', zh_HANT: '上級範圍', ja: '親スコープ', ko: '상위 범위', fr: 'Perimetre parent' })}
                  value={
                    detail.parentId
                      ? text({ en: 'Parent subsidiary', zh_HANS: '上级分目录', zh_HANT: '上級分目錄', ja: '親の子会社', ko: '상위 하위 조직', fr: 'Filiale parente' })
                      : text({ en: 'Tenant root', zh_HANS: '租户根级', zh_HANT: '租戶根級', ja: 'テナントルート', ko: '테넌트 루트', fr: 'Racine du locataire' })
                  }
                />
                <FieldRow
                  label={text({ en: 'Hierarchy Level', zh_HANS: '层级深度', zh_HANT: '層級深度', ja: '階層', ko: '계층 깊이', fr: 'Niveau hierarchique' })}
                  value={String(detail.depth)}
                />
                <FieldRow label={text({ en: 'Sort Order', zh_HANS: '排序', zh_HANT: '排序', ja: '表示順', ko: '정렬 순서', fr: 'Ordre de tri' })} value={String(detail.sortOrder)} />
                <FieldRow label={text({ en: 'Status', zh_HANS: '状态', zh_HANT: '狀態', ja: '状態', ko: '상태', fr: 'Statut' })} value={detail.isActive ? common.active : common.inactive} />
                <FieldRow label={text({ en: 'Created At', zh_HANS: '创建时间', zh_HANT: '建立時間', ja: '作成日時', ko: '생성 시각', fr: 'Cree le' })} value={formatDateTime(detail.createdAt)} />
                <FieldRow label={text({ en: 'Updated At', zh_HANS: '更新时间', zh_HANT: '更新時間', ja: '更新日時', ko: '수정 시각', fr: 'Mis a jour le' })} value={formatDateTime(detail.updatedAt)} />
              </div>

              <SectionPlaceholder
                title={text({
                  en: 'Description',
                  zh_HANS: '说明',
                  zh_HANT: '說明',
                  ja: '説明',
                  ko: '설명',
                  fr: 'Description',
                })}
                description={resolveDescription(
                  detail,
                  text({
                    en: 'No description has been provided for this subsidiary.',
                    zh_HANS: '该分目录暂无说明。',
                    zh_HANT: '此分目錄尚無說明。',
                    ja: 'この配下スコープには説明がありません。',
                    ko: '이 하위 조직에는 아직 설명이 없습니다.',
                    fr: 'Aucune description n a encore ete renseignee pour cette filiale.',
                  }),
                )}
              />
            </FormSection>
          </GlassSurface>
        </div>
      ) : null}

      {displayedSectionId === 'config-entities' ? (
        <GlassSurface className="p-6">
          <FormSection
            title={common.configEntities}
            description={text({
              en: 'Manage configuration entities available in this subsidiary.',
              zh_HANS: '管理当前分目录可用的配置实体。',
              zh_HANT: '管理目前分目錄可用的配置實體。',
              ja: 'この配下スコープで利用できる設定エンティティを管理します。',
              ko: '이 하위 조직에서 사용할 수 있는 구성 엔티티를 관리합니다.',
              fr: 'Gerez les entites de configuration disponibles pour cette filiale.',
            })}
          >
            <div className="grid gap-4 xl:grid-cols-3">
              <FieldRow
                label={text({ en: 'Child Subsidiaries', zh_HANS: '子分目录', zh_HANT: '子分目錄', ja: '子スコープ', ko: '하위 조직 수', fr: 'Filiales enfants' })}
                value={String(detail.childrenCount)}
                hint={text(
                  'Number of child subsidiaries under this branch.',
                  '当前分支下的子分目录数量。',
                  'この配下に含まれる子スコープ数です。',
                )}
              />
              <FieldRow
                label={text({ en: 'Attached Talents', zh_HANS: '关联艺人', zh_HANT: '關聯藝人', ja: '所属タレント', ko: '연결된 아티스트', fr: 'Talents rattaches' })}
                value={String(detail.talentCount)}
                hint={text(
                  'Number of talents currently attached to this subsidiary.',
                  '当前挂在此分目录下的艺人数量。',
                  'この配下スコープに属するタレント数です。',
                )}
              />
              <FieldRow
                label={text({ en: 'Override Fields', zh_HANS: '覆盖字段', zh_HANT: '覆寫欄位', ja: '上書き項目', ko: '재정의 필드', fr: 'Champs remplaces' })}
                value={String(settings.overrides.length)}
                hint={text(
                  'Fields currently overridden at this subsidiary.',
                  '当前分目录已覆盖的字段数。',
                  'この配下スコープで上書きしている項目数です。',
                )}
              />
            </div>

            <ScopedConfigEntityWorkspace
              request={request}
              requestEnvelope={requestEnvelope}
              scopeType="subsidiary"
              scopeId={subsidiaryId}
              locale={selectedLocale}
              copy={scopedConfigCopy}
              catalog={localizedConfigEntityCatalog}
            />
          </FormSection>
        </GlassSurface>
      ) : null}

      {displayedSectionId === 'settings' ? (
        <div className="space-y-6">
          <GlassSurface className="p-6">
          <FormSection
            title={common.settings}
            description={text({
              en: 'Adjust subsidiary defaults for language and timezone.',
              zh_HANS: '调整分目录的语言和时区默认值。',
              zh_HANT: '調整分目錄的語言與時區預設值。',
              ja: '配下スコープの言語とタイムゾーン既定値を調整します。',
              ko: '하위 조직의 기본 언어와 시간대를 조정합니다.',
              fr: 'Ajustez les valeurs par defaut de langue et de fuseau horaire pour cette filiale.',
            })}
              actions={
                <>
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={isSaving || !hasDirtyDraft}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {common.reset}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={isSaving || !hasDirtyDraft}
                    className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving
                      ? common.saving
                      : text({
                          en: 'Save subsidiary settings',
                          zh_HANS: '保存分目录设置',
                          zh_HANT: '儲存分目錄設定',
                          ja: '配下スコープ設定を保存',
                          ko: '하위 조직 설정 저장',
                          fr: 'Enregistrer les parametres de la filiale',
                        })}
                  </button>
                </>
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-900">{text({ en: 'Default language', zh_HANS: '默认语言', zh_HANT: '預設語言', ja: '既定言語', ko: '기본 언어', fr: 'Langue par defaut' })}</span>
                  <select
                    aria-label={text({ en: 'Default language', zh_HANS: '默认语言', zh_HANT: '預設語言', ja: '既定言語', ko: '기본 언어', fr: 'Langue par defaut' })}
                    value={draft.defaultLanguage}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        defaultLanguage: event.target.value as SupportedUiLocale,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400"
                  >
                    {LANGUAGE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500">
                    {formatSourceHint(settings.inheritedFrom.defaultLanguage, overrideSet.has('defaultLanguage'))}
                  </p>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-900">{text({ en: 'Default timezone', zh_HANS: '默认时区', zh_HANT: '預設時區', ja: '既定タイムゾーン', ko: '기본 시간대', fr: 'Fuseau horaire par defaut' })}</span>
                  <select
                    aria-label={text({ en: 'Default timezone', zh_HANS: '默认时区', zh_HANT: '預設時區', ja: '既定タイムゾーン', ko: '기본 시간대', fr: 'Fuseau horaire par defaut' })}
                    value={draft.timezone}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        timezone: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400"
                  >
                    {TIMEZONE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500">
                    {formatSourceHint(settings.inheritedFrom.timezone, overrideSet.has('timezone'))}
                  </p>
                </label>
              </div>

              {saveError ? <p className="text-sm font-medium text-red-600">{saveError}</p> : null}
              {saveSuccess ? <p className="text-sm font-medium text-emerald-700">{saveSuccess}</p> : null}
            </FormSection>
          </GlassSurface>

          <GlassSurface className="p-6">
          <FormSection
              title={text({
                en: 'Security Shortcuts',
                zh_HANS: '安全快捷入口',
                zh_HANT: '安全快捷入口',
                ja: 'セキュリティショートカット',
                ko: '보안 바로가기',
                fr: 'Raccourcis de securite',
              })}
              description={text({
                en: 'Open security pages already filtered to this subsidiary.',
                zh_HANS: '直接打开已带当前分目录筛选条件的安全页面。',
                zh_HANT: '直接開啟已套用目前分目錄篩選條件的安全頁面。',
                ja: 'この配下スコープで絞り込んだセキュリティ画面を開きます。',
                ko: '이 하위 조직으로 이미 필터링된 보안 페이지를 엽니다.',
                fr: 'Ouvrez les pages de securite deja filtrees sur cette filiale.',
              })}
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <SectionEntryLink
                  title={text({ en: 'Security', zh_HANS: '安全管理', zh_HANT: '安全管理', ja: 'セキュリティ管理', ko: '보안 관리', fr: 'Securite' })}
                  description={text(
                    'Open security management for this subsidiary.',
                    '打开当前分目录的安全管理页面。',
                    'この配下スコープのセキュリティ管理を開きます。',
                  )}
                  href={`/tenant/${tenantId}/security?tab=blocklist&scopeType=subsidiary&scopeId=${subsidiaryId}`}
                  cta={text({ en: 'Open security', zh_HANS: '打开安全管理', zh_HANT: '打開安全管理', ja: 'セキュリティを開く', ko: '보안 열기', fr: 'Ouvrir la securite' })}
                />
                <SectionEntryLink
                  title={text({ en: 'External Blocklist', zh_HANS: '外部封禁', zh_HANT: '外部封禁', ja: '外部ブロックリスト', ko: '외부 차단 목록', fr: 'Liste de blocage externe' })}
                  description={text(
                    'Review external blocklist rules for this subsidiary.',
                    '查看当前分目录的外部封禁规则。',
                    'この配下スコープの外部ブロックリストを確認します。',
                  )}
                  href={`/tenant/${tenantId}/security?tab=external-blocklist&scopeType=subsidiary&scopeId=${subsidiaryId}`}
                  cta={text({ en: 'Open blocklist', zh_HANS: '打开外部封禁', zh_HANT: '打開外部封禁', ja: 'ブロックリストを開く', ko: '차단 목록 열기', fr: 'Ouvrir la liste de blocage' })}
                />
              </div>
            </FormSection>
          </GlassSurface>
        </div>
      ) : null}

      {displayedSectionId === 'dictionary' ? (
        <GlassSurface className="p-6">
          <FormSection
            title={common.dictionary}
            description={text({
              en: 'Review dictionary items available in this subsidiary.',
              zh_HANS: '查看当前分目录可用的词典内容。',
              zh_HANT: '查看目前分目錄可用的詞典內容。',
              ja: 'この配下スコープで利用できる辞書項目を確認します。',
              ko: '이 하위 조직에서 사용할 수 있는 사전 항목을 확인합니다.',
              fr: 'Consultez les elements du dictionnaire disponibles pour cette filiale.',
            })}
          >
            {dictionaryPanel.error ? (
              <SectionPlaceholder
                title={text({
                  en: 'Dictionary unavailable',
                  zh_HANS: '词典不可用',
                  zh_HANT: '詞典不可用',
                  ja: '辞書を読み込めません',
                  ko: '사전을 사용할 수 없습니다',
                  fr: 'Dictionnaire indisponible',
                })}
                description={dictionaryPanel.error}
              />
            ) : dictionaryPanel.data ? (
              <>
                <div className="grid gap-4 xl:grid-cols-3">
                  <FieldRow label={text({ en: 'Visible Dictionary Types', zh_HANS: '可见词典类型', zh_HANT: '可見詞典類型', ja: '表示中の辞書タイプ', ko: '표시 가능한 사전 유형', fr: 'Types de dictionnaire visibles' })} value={String(dictionaryCount)} />
                  <FieldRow label={text({ en: 'Inherited Fields', zh_HANS: '继承字段', zh_HANT: '繼承欄位', ja: '継承項目', ko: '상속 필드', fr: 'Champs herites' })} value={String(Object.keys(settings.inheritedFrom).length)} />
                  <FieldRow label={text({ en: 'Current Overrides', zh_HANS: '当前覆盖项', zh_HANT: '目前覆寫項', ja: '現在の上書き数', ko: '현재 재정의 수', fr: 'Remplacements actuels' })} value={String(settings.overrides.length)} />
                </div>
                <DictionaryExplorerPanel
                  request={request}
                  requestEnvelope={requestEnvelope}
                  types={dictionaryPanel.data}
                  locale={selectedLocale}
                  copy={dictionaryExplorerCopy}
                  allowIncludeInactiveToggle
                  intro={(
                    <>
                      <p>
                        {text({
                          en: 'Review the dictionary items available in this subsidiary.',
                          zh_HANS: '查看当前分目录可用的词典项。',
                          zh_HANT: '查看目前分目錄可用的詞典項。',
                          ja: 'この配下スコープで利用できる辞書項目を確認します。',
                          ko: '이 하위 조직에서 사용할 수 있는 사전 항목을 확인합니다.',
                          fr: 'Consultez les elements du dictionnaire disponibles pour cette filiale.',
                        })}
                      </p>
                      <p className="mt-2">
                        {text({
                          en: 'Open System Dictionary if you need to change the vocabulary itself.',
                          zh_HANS: '如需调整词典内容，请前往系统词典。',
                          zh_HANT: '如需調整詞典內容，請前往系統詞典。',
                          ja: '辞書項目自体を変更する場合はシステム辞書を開いてください。',
                          ko: '용어 자체를 바꾸려면 시스템 사전을 여십시오.',
                          fr: 'Ouvrez le dictionnaire systeme si vous devez modifier le vocabulaire lui-meme.',
                        })}
                      </p>
                    </>
                  )}
                  emptyDescription={text({
                    en: 'No dictionary types are currently available for this subsidiary.',
                    zh_HANS: '当前分目录下没有可用的词典类型。',
                    zh_HANT: '目前此分目錄下沒有可用的詞典類型。',
                    ja: 'この配下スコープで利用できる辞書タイプはありません。',
                    ko: '이 하위 조직에서 현재 사용할 수 있는 사전 유형이 없습니다.',
                    fr: 'Aucun type de dictionnaire n est actuellement disponible pour cette filiale.',
                  })}
                />
              </>
            ) : (
              <SectionPlaceholder
                title={text({
                  en: 'No dictionary types returned',
                  zh_HANS: '未返回词典类型',
                  zh_HANT: '未返回詞典類型',
                  ja: '辞書タイプが返されませんでした',
                  ko: '반환된 사전 유형이 없습니다',
                  fr: 'Aucun type de dictionnaire n a ete renvoye',
                })}
                description={text({
                  en: 'No dictionary types are currently available for this subsidiary.',
                  zh_HANS: '当前分目录下没有可用的词典类型。',
                  zh_HANT: '目前此分目錄下沒有可用的詞典類型。',
                  ja: 'この配下スコープで利用できる辞書タイプはありません。',
                  ko: '이 하위 조직에서 현재 사용할 수 있는 사전 유형이 없습니다.',
                  fr: 'Aucun type de dictionnaire n est actuellement disponible pour cette filiale.',
                })}
              />
            )}
          </FormSection>
        </GlassSurface>
      ) : null}
      </div>
    </SettingsLayout>
  );
}
