'use client';

import { ArrowRight, RefreshCcw, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
  type ArtistLifecycleFlow,
  HOMEPAGE_TEMPLATE_TYPE_DICTIONARY_CODE,
  type SupportedUiLocale,
} from '@tcrn/shared';

import {
  type ArtistLifecycleFlowSettingsResponse,
  type ConfigEntityRecord,
  type ConfigEntityScopeType,
  listAllConfigEntities,
  readSubsidiaryArtistLifecycleFlow,
  readTalentArtistLifecycleFlow,
  readTenantArtistLifecycleFlow,
  type RequestEnvelopeFn,
  updateTenantArtistLifecycleFlow,
} from '@/domains/config-dictionary-settings/api/settings.api';
import { listDictionaryItems } from '@/domains/config-dictionary-settings/api/system-dictionary.api';
import { ApiRequestError } from '@/platform/http/api';
import { pickLocaleText } from '@/platform/runtime/locale/locale-text';

type RequestFn = <T>(path: string, init?: RequestInit) => Promise<T>;

interface ArtistLifecycleFlowWorkspaceProps {
  request: RequestFn;
  requestEnvelope: RequestEnvelopeFn;
  scopeType: ConfigEntityScopeType;
  scopeId?: string;
  locale?: SupportedUiLocale;
}

interface FlowDraft {
  policyByStage: Record<string, string[]>;
  transitionKeys: string[];
}

interface TemplateTypeOption {
  label: string;
  value: string;
}

interface NoticeState {
  tone: 'success' | 'error';
  message: string;
}

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiRequestError ? reason.message : fallback;
}

function getStageLabel(stage: ConfigEntityRecord, locale: SupportedUiLocale) {
  return stage.localizedName || stage.name[locale] || stage.name.en || stage.code || 'Artist Stage';
}

function getStageCode(stage: ConfigEntityRecord) {
  return stage.code || stage.localizedName || stage.id;
}

function getTransitionKey(fromStageId: string, toStageId: string) {
  return `${fromStageId}:${toStageId}`;
}

function buildTransitionId(
  fromStage: ConfigEntityRecord,
  toStage: ConfigEntityRecord,
  fromIndex: number,
  toIndex: number
) {
  const fromCode = (fromStage.code || `from-${fromIndex}`).replace(/[^a-z0-9_-]/gi, '-');
  const toCode = (toStage.code || `to-${toIndex}`).replace(/[^a-z0-9_-]/gi, '-');
  return `stage-${fromCode}-to-${toCode}`.slice(0, 64);
}

function normalizePolicyCodes(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((code) => String(code).trim()).filter(Boolean);
}

function buildDraft(flow: ArtistLifecycleFlow, stages: ConfigEntityRecord[]): FlowDraft {
  const policyByStage: FlowDraft['policyByStage'] = {};

  for (const stage of stages) {
    const storedPolicy = flow.homepagePolicyByStage.find((policy) => policy.stageId === stage.id);
    const storedCodes = normalizePolicyCodes(storedPolicy?.allowedTemplateTypeCodes);
    const stageCode = stage.homepageTemplateTypeCode;
    const fallbackCodes = typeof stageCode === 'string' && stageCode.trim() ? [stageCode] : [];

    policyByStage[stage.id] = storedCodes.length > 0 ? storedCodes : fallbackCodes;
  }

  return {
    policyByStage,
    transitionKeys: flow.transitions.map((transition) =>
      getTransitionKey(transition.fromStageId, transition.toStageId)
    ),
  };
}

function buildFlowFromDraft(
  draft: FlowDraft,
  stages: ConfigEntityRecord[],
  locale: SupportedUiLocale
): ArtistLifecycleFlow {
  const activeStages = stages.filter((stage) => stage.isActive);

  return {
    nodes: activeStages.map((stage) => ({
      stageCode: getStageCode(stage),
      stageId: stage.id,
    })),
    transitions: activeStages.flatMap((fromStage, fromIndex) =>
      activeStages.flatMap((toStage, toIndex) => {
        const transitionKey = getTransitionKey(fromStage.id, toStage.id);

        if (fromStage.id === toStage.id || !draft.transitionKeys.includes(transitionKey)) {
          return [];
        }

        return [
          {
            fromStageId: fromStage.id,
            id: buildTransitionId(fromStage, toStage, fromIndex, toIndex),
            label: `${getStageLabel(fromStage, locale)} -> ${getStageLabel(toStage, locale)}`,
            reason: null,
            toStageId: toStage.id,
          },
        ];
      })
    ),
    homepagePolicyByStage: activeStages
      .map((stage) => ({
        allowedTemplateTypeCodes: (draft.policyByStage[stage.id] ??
          []) as ArtistLifecycleFlow['homepagePolicyByStage'][number]['allowedTemplateTypeCodes'],
        stageId: stage.id,
      }))
      .filter((policy) => policy.allowedTemplateTypeCodes.length > 0),
  };
}

function resolveTemplateTypeLabel(code: string, options: TemplateTypeOption[]) {
  return options.find((option) => option.value === code)?.label ?? code;
}

export function ArtistLifecycleFlowWorkspace({
  request,
  requestEnvelope,
  scopeType,
  scopeId,
  locale = 'en',
}: Readonly<ArtistLifecycleFlowWorkspaceProps>) {
  const [flowState, setFlowState] = useState<ArtistLifecycleFlowSettingsResponse | null>(null);
  const [stages, setStages] = useState<ConfigEntityRecord[]>([]);
  const [draft, setDraft] = useState<FlowDraft>({ policyByStage: {}, transitionKeys: [] });
  const [templateTypeOptions, setTemplateTypeOptions] = useState<TemplateTypeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const activeStages = useMemo(() => stages.filter((stage) => stage.isActive), [stages]);
  const writable = flowState?.writable === true && scopeType === 'tenant';

  async function loadWorkspace() {
    setLoading(true);
    setLoadError(null);
    setNotice(null);

    try {
      const [stageRecords, flowResponse, templateTypeItems] = await Promise.all([
        listAllConfigEntities(
          requestEnvelope,
          'artist-stage',
          {
            scopeType,
            scopeId,
            includeInherited: true,
            includeDisabled: true,
            includeInactive: false,
            sort: 'sortOrder',
          },
          locale
        ),
        scopeType === 'tenant'
          ? readTenantArtistLifecycleFlow(request)
          : scopeType === 'subsidiary'
            ? readSubsidiaryArtistLifecycleFlow(request, scopeId || '')
            : readTalentArtistLifecycleFlow(request, scopeId || ''),
        listDictionaryItems(
          requestEnvelope,
          HOMEPAGE_TEMPLATE_TYPE_DICTIONARY_CODE,
          {
            includeInactive: false,
            page: 1,
            pageSize: 100,
          },
          locale
        ),
      ]);

      const nextStages = stageRecords.filter((stage) => stage.code);
      const nextTemplateTypeOptions = templateTypeItems.items.map((item) => ({
        label: item.localizedName || item.name[locale] || item.name.en || item.code,
        value: item.code,
      }));
      setStages(nextStages);
      setFlowState(flowResponse);
      setDraft(buildDraft(flowResponse.flow, nextStages));
      setTemplateTypeOptions(nextTemplateTypeOptions);
    } catch (reason) {
      setStages([]);
      setFlowState(null);
      setDraft({ policyByStage: {}, transitionKeys: [] });
      setTemplateTypeOptions([]);
      setLoadError(
        getErrorMessage(
          reason,
          pickLocaleText(locale, {
            en: 'Failed to load Artist Lifecycle Flow.',
            zh_HANS: '加载 Artist Lifecycle Flow 失败。',
            zh_HANT: '載入 Artist Lifecycle Flow 失敗。',
            ja: 'Artist Lifecycle Flow を読み込めません。',
            ko: 'Artist Lifecycle Flow를 불러오지 못했습니다.',
            fr: 'Impossible de charger l’Artist Lifecycle Flow.',
          })
        )
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWorkspace();
  }, [locale, request, requestEnvelope, scopeId, scopeType]);

  function toggleTemplateType(stageId: string, code: string) {
    setDraft((current) => {
      const currentCodes = current.policyByStage[stageId] ?? [];
      const nextCodes = currentCodes.includes(code)
        ? currentCodes.filter((currentCode) => currentCode !== code)
        : [...currentCodes, code];

      return {
        ...current,
        policyByStage: {
          ...current.policyByStage,
          [stageId]: nextCodes,
        },
      };
    });
  }

  function toggleTransition(fromStageId: string, toStageId: string) {
    const transitionKey = getTransitionKey(fromStageId, toStageId);

    setDraft((current) => ({
      ...current,
      transitionKeys: current.transitionKeys.includes(transitionKey)
        ? current.transitionKeys.filter((key) => key !== transitionKey)
        : [...current.transitionKeys, transitionKey],
    }));
  }

  async function handleSave() {
    if (!writable || saving) {
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      const flow = buildFlowFromDraft(draft, activeStages, locale);
      const response = await updateTenantArtistLifecycleFlow(request, { flow });

      setFlowState(response);
      setDraft(buildDraft(response.flow, activeStages));
      setNotice({
        tone: 'success',
        message: pickLocaleText(locale, {
          en: 'Artist Lifecycle Flow saved.',
          zh_HANS: 'Artist Lifecycle Flow 已保存。',
          zh_HANT: 'Artist Lifecycle Flow 已儲存。',
          ja: 'Artist Lifecycle Flow を保存しました。',
          ko: 'Artist Lifecycle Flow가 저장되었습니다.',
          fr: 'Artist Lifecycle Flow enregistre.',
        }),
      });
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(
          reason,
          pickLocaleText(locale, {
            en: 'Failed to save Artist Lifecycle Flow.',
            zh_HANS: '保存 Artist Lifecycle Flow 失败。',
            zh_HANT: '儲存 Artist Lifecycle Flow 失敗。',
            ja: 'Artist Lifecycle Flow を保存できません。',
            ko: 'Artist Lifecycle Flow 저장에 실패했습니다.',
            fr: 'Impossible d’enregistrer l’Artist Lifecycle Flow.',
          })
        ),
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div
        className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-5 text-sm font-medium text-slate-600"
        data-testid="artist-lifecycle-flow-workspace"
      >
        {pickLocaleText(locale, {
          en: 'Loading Artist Lifecycle Flow…',
          zh_HANS: '正在加载 Artist Lifecycle Flow…',
          zh_HANT: '正在載入 Artist Lifecycle Flow…',
          ja: 'Artist Lifecycle Flow を読み込み中…',
          ko: 'Artist Lifecycle Flow를 불러오는 중…',
          fr: 'Chargement de l’Artist Lifecycle Flow…',
        })}
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4"
        data-testid="artist-lifecycle-flow-workspace"
        role="alert"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-rose-800">{loadError}</p>
          <button
            type="button"
            onClick={() => {
              void loadWorkspace();
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
          >
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            {pickLocaleText(locale, {
              en: 'Retry',
              zh_HANS: '重试',
              zh_HANT: '重試',
              ja: '再試行',
              ko: '다시 시도',
              fr: 'Reessayer',
            })}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="artist-lifecycle-flow-workspace">
      <div className="grid gap-4 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-4 shadow-sm">
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
            {pickLocaleText(locale, {
              en: 'Scope',
              zh_HANS: '范围',
              zh_HANT: '範圍',
              ja: 'スコープ',
              ko: '범위',
              fr: 'Portee',
            })}
          </p>
          <p className="mt-2 text-base font-semibold text-slate-950">
            {flowState?.scopeType ?? scopeType}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-4 shadow-sm">
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
            {pickLocaleText(locale, {
              en: 'Mutability',
              zh_HANS: '可维护性',
              zh_HANT: '可維護性',
              ja: '変更可否',
              ko: '수정 가능성',
              fr: 'Mutabilite',
            })}
          </p>
          <p className="mt-2 text-base font-semibold text-slate-950">
            {writable
              ? pickLocaleText(locale, {
                  en: 'Tenant editable',
                  zh_HANS: '租户可编辑',
                  zh_HANT: '租戶可編輯',
                  ja: 'テナント編集可',
                  ko: '테넌트 편집 가능',
                  fr: 'Modifiable tenant',
                })
              : pickLocaleText(locale, {
                  en: 'Read-only inherited',
                  zh_HANS: '只读继承',
                  zh_HANT: '唯讀繼承',
                  ja: '読み取り専用の継承',
                  ko: '읽기 전용 상속',
                  fr: 'Herite en lecture seule',
                })}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-4 shadow-sm">
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
            {pickLocaleText(locale, {
              en: 'Artist Stages',
              zh_HANS: 'Artist Stage',
              zh_HANT: 'Artist Stage',
              ja: 'Artist Stage',
              ko: 'Artist Stage',
              fr: 'Artist Stage',
            })}
          </p>
          <p className="mt-2 text-base font-semibold text-slate-950">{activeStages.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-4 shadow-sm">
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
            {pickLocaleText(locale, {
              en: 'Flow Edges',
              zh_HANS: 'Flow 边',
              zh_HANT: 'Flow 邊',
              ja: 'Flow エッジ',
              ko: 'Flow 엣지',
              fr: 'Bords Flow',
            })}
          </p>
          <p className="mt-2 text-base font-semibold text-slate-950">
            {draft.transitionKeys.length}
          </p>
        </div>
      </div>

      {!writable ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
          {pickLocaleText(locale, {
            en: 'This scope can review the effective Flow and homepage policy but cannot edit them. Update the tenant Flow to change transitions or allowed Homepage Template Type coverage.',
            zh_HANS:
              '当前范围只能查看生效的 Flow 与主页策略，不能编辑。若要修改流转或允许的 Homepage Template Type，请在租户 Flow 中维护。',
            zh_HANT:
              '目前範圍只能檢視生效的 Flow 與主頁策略，不能編輯。若要修改流轉或允許的 Homepage Template Type，請在租戶 Flow 中維護。',
            ja: 'このスコープでは有効な Flow とホームページポリシーを確認できますが編集はできません。遷移や許可する Homepage Template Type を変えるにはテナント Flow を更新してください。',
            ko: '이 범위에서는 적용 중인 Flow와 홈페이지 정책을 검토할 수 있지만 편집할 수 없습니다. 전환 또는 허용되는 Homepage Template Type 범위는 테넌트 Flow에서 변경하세요.',
            fr: 'Cette portee peut consulter le Flow effectif et la policy homepage, mais ne peut pas les modifier. Modifiez le Flow tenant pour changer les transitions ou la couverture Homepage Template Type autorisee.',
          })}
        </div>
      ) : null}

      {notice ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
            notice.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
          role={notice.tone === 'success' ? 'status' : 'alert'}
        >
          {notice.message}
        </div>
      ) : null}

      <div className="space-y-4">
        {activeStages.map((stage) => (
          <section
            key={stage.id}
            className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-4 shadow-sm"
            data-testid="artist-lifecycle-flow-stage"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold text-slate-950">
                    {getStageLabel(stage, locale)}
                  </p>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {stage.artistStatusCode || 'status'}
                  </span>
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                    {stage.homepageTemplateTypeCode || 'template type'}
                  </span>
                </div>
                <p className="text-sm leading-6 text-slate-600">
                  {pickLocaleText(locale, {
                    en: 'Configure allowed next Artist Stages and Homepage Template Type policy for this stage.',
                    zh_HANS:
                      '配置此 Artist Stage 允许的下一阶段，以及 Homepage Template Type 主页策略。',
                    zh_HANT:
                      '設定此 Artist Stage 允許的下一階段，以及 Homepage Template Type 主頁策略。',
                    ja: 'この Artist Stage に許可される次のステージと Homepage Template Type ポリシーを設定します。',
                    ko: '이 Artist Stage에서 허용되는 다음 단계와 Homepage Template Type 정책을 구성합니다.',
                    fr: 'Configurez les Artist Stages suivants autorises et la policy Homepage Template Type pour cette etape.',
                  })}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-900">
                  {pickLocaleText(locale, {
                    en: 'Homepage Template Type policy',
                    zh_HANS: 'Homepage Template Type 策略',
                    zh_HANT: 'Homepage Template Type 策略',
                    ja: 'Homepage Template Type ポリシー',
                    ko: 'Homepage Template Type 정책',
                    fr: 'Policy Homepage Template Type',
                  })}
                </p>
                <div className="flex flex-wrap gap-2">
                  {templateTypeOptions.length > 0 ? (
                    templateTypeOptions.map((option) => (
                      <label
                        key={option.value}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={(draft.policyByStage[stage.id] ?? []).includes(option.value)}
                          disabled={!writable}
                          onChange={() => toggleTemplateType(stage.id, option.value)}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                        />
                        {resolveTemplateTypeLabel(option.value, templateTypeOptions)}
                      </label>
                    ))
                  ) : (
                    <p className="text-sm leading-6 text-slate-600">
                      {pickLocaleText(locale, {
                        en: 'No active Homepage Template Type dictionary items are available.',
                        zh_HANS: '当前没有可用的 Homepage Template Type 字典项。',
                        zh_HANT: '目前沒有可用的 Homepage Template Type 字典項。',
                        ja: '利用可能な Homepage Template Type 辞書項目がありません。',
                        ko: '사용 가능한 Homepage Template Type 사전 항목이 없습니다.',
                        fr: 'Aucun item de dictionnaire Homepage Template Type actif disponible.',
                      })}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-900">
                  {pickLocaleText(locale, {
                    en: 'Allowed stage transitions',
                    zh_HANS: '允许的阶段流转',
                    zh_HANT: '允許的階段流轉',
                    ja: '許可されたステージ遷移',
                    ko: '허용된 단계 전환',
                    fr: 'Transitions d etape autorisees',
                  })}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {activeStages
                    .filter((targetStage) => targetStage.id !== stage.id)
                    .map((targetStage) => {
                      const transitionKey = getTransitionKey(stage.id, targetStage.id);

                      return (
                        <label
                          key={targetStage.id}
                          className="inline-flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
                        >
                          <input
                            type="checkbox"
                            checked={draft.transitionKeys.includes(transitionKey)}
                            disabled={!writable}
                            onChange={() => toggleTransition(stage.id, targetStage.id)}
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                          />
                          <span className="inline-flex min-w-0 items-center gap-2">
                            <ArrowRight className="h-4 w-4 flex-none" aria-hidden="true" />
                            <span className="truncate">{getStageLabel(targetStage, locale)}</span>
                          </span>
                        </label>
                      );
                    })}
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm leading-6 text-slate-600">
          {pickLocaleText(locale, {
            en: 'Flow uses the governed Artist Stage catalog while showing operator-safe stage names and Homepage Template Type labels here.',
            zh_HANS:
              'Flow 使用受管 Artist Stage 目录，这里展示面向操作员的阶段名称与 Homepage Template Type 标签。',
            zh_HANT:
              'Flow 使用受管 Artist Stage 目錄，這裡顯示面向操作員的階段名稱與 Homepage Template Type 標籤。',
            ja: 'Flow は管理された Artist Stage カタログを使用し、この画面ではオペレーター向けのステージ名と Homepage Template Type ラベルを表示します。',
            ko: 'Flow는 관리되는 Artist Stage 카탈로그를 사용하고, 여기서는 운영자용 단계 이름과 Homepage Template Type 라벨을 표시합니다.',
            fr: 'Le Flow utilise le catalogue Artist Stage gouverne tout en affichant ici des noms d etape et libelles Homepage Template Type exploitables.',
          })}
        </p>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!writable || saving}
          data-testid="artist-lifecycle-flow-save"
          className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          {saving
            ? pickLocaleText(locale, {
                en: 'Saving Flow…',
                zh_HANS: '正在保存 Flow…',
                zh_HANT: '正在儲存 Flow…',
                ja: 'Flow を保存中…',
                ko: 'Flow 저장 중…',
                fr: 'Enregistrement du Flow…',
              })
            : pickLocaleText(locale, {
                en: 'Save Flow',
                zh_HANS: '保存 Flow',
                zh_HANT: '儲存 Flow',
                ja: 'Flow を保存',
                ko: 'Flow 저장',
                fr: 'Enregistrer le Flow',
              })}
        </button>
      </div>
    </div>
  );
}
