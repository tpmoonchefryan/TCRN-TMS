'use client';

import {
  SUPPORTED_UI_LOCALES,
  type SupportedUiLocale,
} from '@tcrn/shared';
import { Building2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  buildTenantSettingsDraft,
  buildTenantSettingsUpdatePayload,
  isTenantSettingsDraftDirty,
  readTenantSettings,
  type ScopeSettingsResponse,
  type TenantSettingsDraft,
  updateTenantSettings,
} from '@/domains/config-dictionary-settings/api/settings.api';
import {
  type DictionaryTypeSummary,
  listDictionaryTypes,
} from '@/domains/config-dictionary-settings/api/system-dictionary.api';
import { DictionaryExplorerPanel } from '@/domains/config-dictionary-settings/components/DictionaryExplorerPanel';
import { ScopedConfigEntityWorkspace } from '@/domains/config-dictionary-settings/components/ScopedConfigEntityWorkspace';
import { useSettingsFamilyCopy } from '@/domains/config-dictionary-settings/screens/settings-family.copy';
import { ApiRequestError } from '@/platform/http/api';
import { buildTenantBusinessPath } from '@/platform/routing/workspace-paths';
import { useFadeSwapState } from '@/platform/runtime/motion/use-fade-swap-state';
import { useSession } from '@/platform/runtime/session/session-provider';
import {
  ActionDrawer,
  ActionDrawerFooter,
  FormSection,
  GlassSurface,
  SettingsLayout,
  StateView,
} from '@/platform/ui';

interface AsyncPanelState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
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
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 min-w-0 whitespace-normal break-all text-base font-semibold text-slate-950">{value}</p>
      {hint ? <p className="mt-2 min-w-0 whitespace-normal break-all text-sm leading-6 text-slate-600">{hint}</p> : null}
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

export function TenantSettingsScreen({
  tenantId,
}: Readonly<{
  tenantId: string;
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
    localizedConfigEntityCatalog,
    scopedConfigCopy,
    text,
  } = useSettingsFamilyCopy();
  const [settings, setSettings] = useState<ScopeSettingsResponse | null>(null);
  const [dictionaryPanel, setDictionaryPanel] = useState<AsyncPanelState<DictionaryTypeSummary[]>>({
    data: null,
    error: null,
    loading: true,
  });
  const [initialDraft, setInitialDraft] = useState<TenantSettingsDraft>(() => buildTenantSettingsDraft({}));
  const [draft, setDraft] = useState<TenantSettingsDraft>(() => buildTenantSettingsDraft({}));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDefaultsDrawerOpen, setIsDefaultsDrawerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);

      try {
        const nextSettings = await readTenantSettings(request);
        const dictionaryResult = await Promise.allSettled([listDictionaryTypes(request, selectedLocale)]);

        if (cancelled) {
          return;
        }

        const nextDraft = buildTenantSettingsDraft(nextSettings.settings);
        setSettings(nextSettings);
        setInitialDraft(nextDraft);
        setDraft(nextDraft);
        setDictionaryPanel({
          data: dictionaryResult[0]?.status === 'fulfilled' ? dictionaryResult[0].value : null,
          error:
            dictionaryResult[0]?.status === 'rejected'
              ? getErrorMessage(
                  dictionaryResult[0].reason,
                  text('System dictionary is unavailable.', '系统词典暂不可用。', 'システム辞書を読み込めません。'),
                )
              : null,
          loading: false,
        });
      } catch (reason) {
        if (!cancelled) {
          setLoadError(getErrorMessage(reason, text('Failed to load tenant settings.', '加载租户设置失败。', 'テナント設定の読み込みに失敗しました。')));
          setDictionaryPanel((current) => ({ ...current, loading: false }));
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
  }, [request, selectedLocale, text]);

  if (loading) {
    return (
      <div className="space-y-6">
        <GlassSurface className="p-8">
          <p className="text-sm font-medium text-slate-500">
            {text({
              en: 'Loading tenant settings…',
              zh_HANS: '正在加载租户设置…',
              zh_HANT: '正在載入租戶設定…',
              ja: 'テナント設定を読み込み中…',
              ko: '테넌트 설정을 불러오는 중…',
              fr: 'Chargement des paramètres du tenant…',
            })}
          </p>
        </GlassSurface>
      </div>
    );
  }

  if (loadError || !settings) {
    return (
      <StateView
        status="error"
        title={text({
          en: 'Tenant settings unavailable',
          zh_HANS: '租户设置不可用',
          zh_HANT: '租戶設定不可用',
          ja: 'テナント設定を読み込めません',
          ko: '테넌트 설정을 사용할 수 없습니다.',
          fr: 'Les paramètres du tenant sont indisponibles.',
        })}
        description={loadError || undefined}
      />
    );
  }

  const hasDirtyDraft = isTenantSettingsDraftDirty(initialDraft, draft);
  const currentSettings = settings;
  const overrideSet = new Set(settings.overrides);
  const dictionaryCount = dictionaryPanel.data?.length ?? 0;
  const configEntityFamilyCount = Object.keys(localizedConfigEntityCatalog).length;
  const tenantOverrideLabel = text('Tenant override', '租户覆盖', 'テナント上書き');

  function formatScopeSource(source: string | null | undefined) {
    if (!source) {
      return tenantOverrideLabel;
    }

    if (source === 'tenant') {
      return text('Tenant default', '租户默认值', 'テナント既定値');
    }

    if (source === 'subsidiary') {
      return text('Subsidiary default', '分目录默认值', '配下スコープ既定値');
    }

    if (source === 'talent') {
      return text('Talent scope', '艺人范围', 'タレントスコープ');
    }

    return source;
  }

  function formatSourceHint(source: string | null | undefined, isOverridden: boolean) {
    return `${common.source}: ${formatScopeSource(source)}${isOverridden ? ` / ${common.overriddenHere}` : ''}`;
  }

  async function handleSave() {
    if (!hasDirtyDraft || isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const nextSettings = await updateTenantSettings(request, {
        settings: buildTenantSettingsUpdatePayload(draft),
        version: currentSettings.version,
      });
      const nextDraft = buildTenantSettingsDraft(nextSettings.settings);
      setSettings(nextSettings);
      setInitialDraft(nextDraft);
      setDraft(nextDraft);
      setSaveSuccess(
        text({
          en: 'Tenant defaults saved.',
          zh_HANS: '租户默认值已保存。',
          zh_HANT: '租戶預設值已儲存。',
          ja: 'テナント既定値を保存しました。',
          ko: '테넌트 기본값을 저장했습니다.',
          fr: 'Les valeurs par défaut du tenant ont été enregistrées.',
        }),
      );
    } catch (reason) {
      setSaveError(
        getErrorMessage(
          reason,
          text({
            en: 'Failed to save tenant settings.',
            zh_HANS: '保存租户设置失败。',
            zh_HANT: '儲存租戶設定失敗。',
            ja: 'テナント設定の保存に失敗しました。',
            ko: '테넌트 설정을 저장하지 못했습니다.',
            fr: 'Impossible d’enregistrer les paramètres du tenant.',
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
    <div className="space-y-6">
      <SettingsLayout
        title={text({
          en: 'Tenant Settings',
          zh_HANS: '租户设置',
          zh_HANT: '租戶設定',
          ja: 'テナント設定',
          ko: '테넌트 설정',
          fr: 'Paramètres du tenant',
        })}
        description={text({
          en: 'Manage tenant defaults, configuration entities, and dictionary visibility.',
          zh_HANS: '集中管理租户默认值、配置实体与词典可见性。',
          zh_HANT: '集中管理租戶預設值、配置實體與詞典可見性。',
          ja: 'テナント既定値、設定エンティティ、辞書表示をまとめて管理します。',
          ko: '테넌트 기본값, 구성 엔티티, 사전 표시 범위를 관리합니다.',
          fr: 'Gérez les valeurs par défaut du tenant, les entités de configuration et la visibilité du dictionnaire.',
        })}
        sections={[
          { id: 'details', label: common.details },
          { id: 'config-entities', label: common.configEntities },
          { id: 'settings', label: common.settings },
          { id: 'dictionary', label: common.dictionary },
        ]}
        activeSectionId={activeSectionId}
        ariaLabel={common.settingsSectionsAriaLabel}
        sectionNavId="tenant-settings-sections"
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
                    en: 'Tenant settings',
                    zh_HANS: '租户设置',
                    zh_HANT: '租戶設定',
                    ja: 'テナント設定',
                    ko: '테넌트 설정',
                    fr: 'Paramètres du tenant',
                  })}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <FieldRow label={text('Tenant', '租户', 'テナント')} value={session?.tenantName || common.currentTenant} />
                  <FieldRow
                    label={text('Default language', '默认语言', '既定言語')}
                    value={draft.defaultLanguage || common.inheritedUnset}
                  />
                  <FieldRow label={common.configEntities} value={String(configEntityFamilyCount)} />
                  <FieldRow label={text('Dictionary Types', '词典类型', '辞書タイプ')} value={String(dictionaryCount)} />
                </div>
              </div>
            </GlassSurface>

            <GlassSurface className="p-6">
              <FormSection
                title={common.details}
                description={text(
                  'Review tenant identity and quick links to related management pages.',
                  '查看租户身份信息及相关管理入口。',
                  'テナント識別情報と関連管理ページへの入口を確認します。',
                )}
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  <FieldRow
                    label={text('Tenant Tier', '租户层级', 'テナント階層')}
                    value={session?.tenantTier || common.unknown}
                    hint={text(
                      'Available management features vary by tenant tier.',
                      '不同租户层级可用的管理能力不同。',
                      'テナント階層によって利用できる管理機能が異なります。',
                    )}
                  />
                  <FieldRow
                    label={text('Tenant Code', '租户代码', 'テナントコード')}
                    value={session?.tenantCode || common.unassigned}
                    hint={text(
                      'Tenant code is the stable identifier for this tenant.',
                      '租户代码是当前租户的稳定标识。',
                      'テナントコードはこのテナントの安定した識別子です。',
                    )}
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <SectionEntryLink
                    title={text('Business Workspace', '业务工作区', '業務ワークスペース')}
                    description={text(
                      'Open the tenant-level business workspace for cross-talent operations, reporting, and workspace handoff.',
                      '打开租户级业务工作区，用于跨艺人运营、报表与工作区交接。',
                      '複数タレント横断の運用、レポート、ワークスペース連携のためにテナント業務ワークスペースを開きます。',
                    )}
                    href={buildTenantBusinessPath(tenantId)}
                    cta={text('Open business workspace', '打开业务工作区', '業務ワークスペースを開く')}
                  />
                  <SectionEntryLink
                    title={text('Integration', '集成管理', '統合管理')}
                    description={text(
                      'Open adapters, webhooks, and tenant email settings.',
                      '打开适配器、Webhook 和租户邮件设置。',
                      'アダプター、Webhook、テナントのメール設定を開きます。',
                    )}
                    href={`/tenant/${tenantId}/integration-management`}
                    cta={text('Open integration', '打开集成管理', '統合管理を開く')}
                  />
                  <SectionEntryLink
                    title={text('Security', '安全管理', 'セキュリティ管理')}
                    description={text(
                      'Open security, compliance, and blocklist settings.',
                      '打开安全、合规和封禁设置。',
                      'セキュリティ、コンプライアンス、ブロックリスト設定を開きます。',
                    )}
                    href={`/tenant/${tenantId}/security`}
                    cta={text('Open security', '打开安全管理', 'セキュリティ管理を開く')}
                  />
                </div>
              </FormSection>
            </GlassSurface>
          </div>
        ) : null}

        {displayedSectionId === 'config-entities' ? (
          <div className="space-y-6">
            <GlassSurface className="p-6">
              <FormSection
                title={common.configEntities}
                description={text({
                  en: 'Maintain tenant-owned configuration families, including Profile Store, in one scoped workspace inherited by subsidiary and talent scopes.',
                  zh_HANS: '在同一个范围工作区维护租户自有配置实体，包括档案库，并向下游分目录与艺人范围继承。',
                  zh_HANT: '在同一個範圍工作區維護租戶自有配置實體，包括檔案庫，並向下游分目錄與藝人範圍繼承。',
                  ja: 'プロフィールストアを含むテナント所有の設定エンティティを、配下スコープとタレントスコープへ継承される単一のスコープワークスペースで管理します。',
                  ko: '프로필 스토어를 포함한 테넌트 소유 구성 엔티티를 하위 조직 및 탤런트 범위로 상속되는 하나의 범위 작업 공간에서 관리합니다.',
                  fr: 'Gérez les familles de configuration détenues par le tenant, y compris Profile Store, dans un espace par portée hérité par les périmètres et talents.',
                })}
              >
                <ScopedConfigEntityWorkspace
                  request={request}
                  requestEnvelope={requestEnvelope}
                  scopeType="tenant"
                  locale={selectedLocale}
                  copy={scopedConfigCopy}
                  catalog={localizedConfigEntityCatalog}
                />
              </FormSection>
            </GlassSurface>
          </div>
        ) : null}

        {displayedSectionId === 'settings' ? (
          <GlassSurface className="p-6">
              <FormSection
                title={common.settings}
                description={text(
                  'Review tenant defaults before opening the edit workflow.',
                  '先查看租户默认值，再进入编辑流程。',
                  '編集ワークフローを開く前にテナント既定値を確認します。',
                )}
                actions={(
                  <button
                    type="button"
                    onClick={() => setIsDefaultsDrawerOpen(true)}
                    className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    {text('Edit defaults', '编辑默认值', '既定値を編集')}
                  </button>
                )}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <FieldRow
                  label={text('Default language', '默认语言', '既定言語')}
                  value={initialDraft.defaultLanguage}
                  hint={formatSourceHint(settings.inheritedFrom.defaultLanguage, overrideSet.has('defaultLanguage'))}
                />
                <FieldRow
                  label={text('Default timezone', '默认时区', '既定タイムゾーン')}
                  value={initialDraft.timezone}
                  hint={formatSourceHint(settings.inheritedFrom.timezone, overrideSet.has('timezone'))}
                />
              </div>

              {!isDefaultsDrawerOpen && saveError ? <p className="text-sm font-medium text-red-600">{saveError}</p> : null}
              {!isDefaultsDrawerOpen && saveSuccess ? <p className="text-sm font-medium text-emerald-700">{saveSuccess}</p> : null}
            </FormSection>
          </GlassSurface>
        ) : null}

        {displayedSectionId === 'dictionary' ? (
          <GlassSurface className="p-6">
              <FormSection
              title={common.dictionary}
              description={text(
                'Review dictionary items available in this tenant.',
                '查看当前租户可用的词典内容。',
                'このテナントで利用できる辞書項目を確認します。',
              )}
            >
              {dictionaryPanel.error ? (
                <SectionPlaceholder title={text('Dictionary unavailable', '词典不可用', '辞書を読み込めません')} description={dictionaryPanel.error} />
              ) : dictionaryPanel.data ? (
                <>
                  <div className="grid gap-4 xl:grid-cols-3">
                    <FieldRow label={text('Visible Dictionary Types', '可见词典类型', '表示中の辞書タイプ')} value={String(dictionaryCount)} />
                    <FieldRow label={common.configEntities} value={String(configEntityFamilyCount)} />
                    <FieldRow label={text('Tenant Overrides', '租户覆盖项', 'テナント上書き数')} value={String(settings.overrides.length)} />
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
                        <p>{text('Review the dictionary items available in this tenant.', '查看当前租户可用的词典项。', 'このテナントで利用できる辞書項目を確認します。')}</p>
                        <p className="mt-2">
                          {text(
                            'Open System Dictionary if you need to change the vocabulary itself.',
                            '如需调整词典内容，请前往系统词典。',
                            '辞書項目自体を変更する場合はシステム辞書を開いてください。',
                          )}
                        </p>
                      </>
                    )}
                    emptyDescription={text(
                      'No dictionary types are currently available for this tenant.',
                      '当前租户下没有可用的词典类型。',
                      'このテナントで利用できる辞書タイプはありません。',
                    )}
                  />
                </>
              ) : (
                <SectionPlaceholder
                  title={text('No dictionary types returned', '未返回词典类型', '辞書タイプが返されませんでした')}
                  description={text(
                    'No dictionary types are currently available for this tenant.',
                    '当前租户下没有可用的词典类型。',
                    'このテナントで利用できる辞書タイプはありません。',
                  )}
                />
              )}
            </FormSection>
          </GlassSurface>
        ) : null}
        </div>
      </SettingsLayout>

      <ActionDrawer
        open={isDefaultsDrawerOpen}
        onOpenChange={(open) => {
          if (!open && !isSaving) {
            handleReset();
          }
          setIsDefaultsDrawerOpen(open);
        }}
        title={text('Edit tenant defaults', '编辑租户默认值', 'テナント既定値を編集')}
        description={text(
          'Change the default language and timezone used by this tenant scope.',
          '修改当前租户范围使用的默认语言和时区。',
          'このテナントスコープで使用する既定言語とタイムゾーンを変更します。',
        )}
        size="lg"
        closeButtonAriaLabel={text('Close tenant defaults editor', '关闭租户默认值编辑器', 'テナント既定値エディターを閉じる')}
        footer={(
          <ActionDrawerFooter
            secondary={(
              <button
                type="button"
                onClick={() => {
                  handleReset();
                  setIsDefaultsDrawerOpen(false);
                }}
                disabled={isSaving}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {text('Cancel', '取消', 'キャンセル')}
              </button>
            )}
            primary={(
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving || !hasDirtyDraft}
                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? common.saving : text('Save tenant defaults', '保存租户默认值', 'テナント既定値を保存')}
              </button>
            )}
          />
        )}
      >
        <FormSection
          title={common.settings}
          description={text(
            'Adjust tenant defaults for language and timezone.',
            '调整租户的语言和时区默认值。',
            'テナントの言語とタイムゾーン既定値を調整します。',
          )}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">{text('Default language', '默认语言', '既定言語')}</span>
              <select
                aria-label={text('Default language', '默认语言', '既定言語')}
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
              <span className="text-sm font-semibold text-slate-900">{text('Default timezone', '默认时区', '既定タイムゾーン')}</span>
              <select
                aria-label={text('Default timezone', '默认时区', '既定タイムゾーン')}
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
      </ActionDrawer>
    </div>
  );
}
