'use client';

import { Building2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { startTransition, useEffect, useState } from 'react';

import {
  buildTenantSettingsDraft,
  buildTenantSettingsUpdatePayload,
  isTenantSettingsDraftDirty,
  readTenantSenderDomains,
  readTenantSettings,
  readTenantTurnstileSettings,
  type ScopeSettingsResponse,
  type TenantSenderDomainsResponse,
  type TenantSettingsDraft,
  type TenantTurnstileSettingsResponse,
  updateTenantSenderDomains,
  updateTenantSettings,
  updateTenantTurnstileSettings,
} from '@/domains/config-dictionary-settings/api/settings.api';
import {
  type DictionaryTypeSummary,
  listDictionaryTypes,
} from '@/domains/config-dictionary-settings/api/system-dictionary.api';
import { DictionaryExplorerPanel } from '@/domains/config-dictionary-settings/components/DictionaryExplorerPanel';
import { ScopedConfigEntityWorkspace } from '@/domains/config-dictionary-settings/components/ScopedConfigEntityWorkspace';
import { SettingsCategoryWorkbench } from '@/domains/config-dictionary-settings/components/SettingsCategoryWorkbench';
import {
  SettingsDefaultsFormFields,
  SettingsDefaultsSummaryGrid,
} from '@/domains/config-dictionary-settings/components/SettingsDefaultsFields';
import {
  buildTenantEmailSenderDraft,
  type TenantEmailSenderDraft,
  TenantEmailSettingsFields,
} from '@/domains/config-dictionary-settings/components/TenantEmailSettingsFields';
import {
  buildTenantTurnstileDraft,
  type TenantTurnstileDraft,
  TurnstileSettingsFields,
} from '@/domains/config-dictionary-settings/components/TurnstileSettingsFields';
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

type TenantSettingsSection = 'details' | 'config-entities' | 'settings' | 'dictionary';
type TenantSettingsCategory = 'defaults' | 'email' | 'captcha';

const TENANT_SETTINGS_SECTIONS: readonly TenantSettingsSection[] = [
  'details',
  'config-entities',
  'settings',
  'dictionary',
];

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiRequestError ? reason.message : fallback;
}

function parseTenantSettingsSection(section: string | null): TenantSettingsSection {
  if (section && TENANT_SETTINGS_SECTIONS.includes(section as TenantSettingsSection)) {
    return section as TenantSettingsSection;
  }

  return 'details';
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
      <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">{label}</p>
      <p className="mt-2 min-w-0 text-base font-semibold break-all whitespace-normal text-slate-950">
        {value}
      </p>
      {hint ? (
        <p className="mt-2 min-w-0 text-sm leading-6 break-all whitespace-normal text-slate-600">
          {hint}
        </p>
      ) : null}
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
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const urlSection = parseTenantSettingsSection(searchParams.get('section'));
  const [activeSectionId, setActiveSectionId] = useState<TenantSettingsSection>(urlSection);
  const { displayedValue: displayedSectionId, transitionClassName: sectionTransitionClassName } =
    useFadeSwapState(activeSectionId);
  const { request, requestEnvelope, session } = useSession();
  const {
    common,
    locale,
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
  const [initialDraft, setInitialDraft] = useState<TenantSettingsDraft>(() =>
    buildTenantSettingsDraft({})
  );
  const [draft, setDraft] = useState<TenantSettingsDraft>(() => buildTenantSettingsDraft({}));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDefaultsDrawerOpen, setIsDefaultsDrawerOpen] = useState(false);
  const [activeSettingsCategory, setActiveSettingsCategory] =
    useState<TenantSettingsCategory>('defaults');
  const [emailPanel, setEmailPanel] = useState<AsyncPanelState<TenantSenderDomainsResponse>>({
    data: null,
    error: null,
    loading: false,
  });
  const [emailDraft, setEmailDraft] = useState<TenantEmailSenderDraft>(() =>
    buildTenantEmailSenderDraft(null)
  );
  const [emailSaveError, setEmailSaveError] = useState<string | null>(null);
  const [emailSaveSuccess, setEmailSaveSuccess] = useState<string | null>(null);
  const [isEmailSaving, setIsEmailSaving] = useState(false);
  const [turnstilePanel, setTurnstilePanel] = useState<
    AsyncPanelState<TenantTurnstileSettingsResponse>
  >({
    data: null,
    error: null,
    loading: false,
  });
  const [turnstileDraft, setTurnstileDraft] = useState<TenantTurnstileDraft>(() =>
    buildTenantTurnstileDraft(null)
  );
  const [turnstileSaveError, setTurnstileSaveError] = useState<string | null>(null);
  const [turnstileSaveSuccess, setTurnstileSaveSuccess] = useState<string | null>(null);
  const [isTurnstileSaving, setIsTurnstileSaving] = useState(false);

  useEffect(() => {
    setActiveSectionId((current) => (current === urlSection ? current : urlSection));
  }, [urlSection]);

  function applySectionRouteState(nextSectionId: TenantSettingsSection) {
    setActiveSectionId(nextSectionId);

    const nextParams = new URLSearchParams(searchParams.toString());
    if (nextSectionId === 'details') {
      nextParams.delete('section');
    } else {
      nextParams.set('section', nextSectionId);
    }

    const nextQueryString = nextParams.toString();
    if (nextQueryString === queryString) {
      return;
    }

    const nextHref = nextQueryString ? `${pathname}?${nextQueryString}` : pathname;
    startTransition(() => {
      router.replace(nextHref);
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);

      try {
        const nextSettings = await readTenantSettings(request);
        const dictionaryResult = await Promise.allSettled([listDictionaryTypes(request, locale)]);

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
                  text(
                    'System dictionary is unavailable.',
                    '系统词典暂不可用。',
                    'システム辞書を読み込めません。'
                  )
                )
              : null,
          loading: false,
        });
      } catch (reason) {
        if (!cancelled) {
          setLoadError(
            getErrorMessage(
              reason,
              text(
                'Failed to load tenant settings.',
                '加载租户设置失败。',
                'テナント設定の読み込みに失敗しました。'
              )
            )
          );
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
  }, [request, locale, text]);

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
        })
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
          })
        )
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

  async function loadTenantEmailSenderDomains() {
    if (emailPanel.loading) {
      return;
    }

    setEmailPanel((current) => ({ ...current, loading: true, error: null }));
    setEmailSaveError(null);
    setEmailSaveSuccess(null);

    try {
      const response = await readTenantSenderDomains(request);
      setEmailPanel({
        data: response,
        error: null,
        loading: false,
      });
      setEmailDraft(buildTenantEmailSenderDraft(response));
    } catch (reason) {
      setEmailPanel({
        data: null,
        error: getErrorMessage(
          reason,
          text({
            en: 'Failed to load email sender domains.',
            zh_HANS: '加载发信域名失败。',
            zh_HANT: '載入發信域名失敗。',
            ja: 'メール送信ドメインを読み込めません。',
            ko: '이메일 발신 도메인을 불러오지 못했습니다.',
            fr: 'Impossible de charger les domaines d’envoi.',
          })
        ),
        loading: false,
      });
    }
  }

  async function loadTenantTurnstileSettings() {
    if (turnstilePanel.loading) {
      return;
    }

    setTurnstilePanel((current) => ({ ...current, loading: true, error: null }));
    setTurnstileSaveError(null);
    setTurnstileSaveSuccess(null);

    try {
      const response = await readTenantTurnstileSettings(request);
      setTurnstilePanel({
        data: response,
        error: null,
        loading: false,
      });
      setTurnstileDraft(buildTenantTurnstileDraft(response));
    } catch (reason) {
      setTurnstilePanel({
        data: null,
        error: getErrorMessage(
          reason,
          text({
            en: 'Failed to load Turnstile settings.',
            zh_HANS: '加载 Turnstile 设置失败。',
            zh_HANT: '載入 Turnstile 設定失敗。',
            ja: 'Turnstile 設定を読み込めません。',
            ko: 'Turnstile 설정을 불러오지 못했습니다.',
            fr: 'Impossible de charger les paramètres Turnstile.',
          })
        ),
        loading: false,
      });
    }
  }

  function handleSettingsCategoryChange(categoryId: string) {
    const nextCategoryId =
      categoryId === 'email' || categoryId === 'captcha' ? categoryId : 'defaults';
    setActiveSettingsCategory(nextCategoryId);

    if (nextCategoryId === 'email' && !emailPanel.data && !emailPanel.loading) {
      void loadTenantEmailSenderDomains();
    }

    if (nextCategoryId === 'captcha' && !turnstilePanel.data && !turnstilePanel.loading) {
      void loadTenantTurnstileSettings();
    }
  }

  async function handleSaveEmailSenderPreferences() {
    if (isEmailSaving) {
      return;
    }

    setIsEmailSaving(true);
    setEmailSaveError(null);
    setEmailSaveSuccess(null);

    try {
      const response = await updateTenantSenderDomains(request, {
        defaultDomainId: emailDraft.defaultDomainId || null,
        fromName: emailDraft.fromName || null,
        replyTo: emailDraft.replyTo || null,
      });
      setEmailPanel({
        data: response,
        error: null,
        loading: false,
      });
      setEmailDraft(buildTenantEmailSenderDraft(response));
      setEmailSaveSuccess(
        text({
          en: 'Email sender preferences saved.',
          zh_HANS: '发信偏好已保存。',
          zh_HANT: '發信偏好已儲存。',
          ja: 'メール送信設定を保存しました。',
          ko: '이메일 발신 설정이 저장되었습니다.',
          fr: 'Les préférences d’envoi ont été enregistrées.',
        })
      );
    } catch (reason) {
      setEmailSaveError(
        getErrorMessage(
          reason,
          text({
            en: 'Failed to save email sender preferences.',
            zh_HANS: '保存发信偏好失败。',
            zh_HANT: '儲存發信偏好失敗。',
            ja: 'メール送信設定を保存できません。',
            ko: '이메일 발신 설정을 저장하지 못했습니다.',
            fr: 'Impossible d’enregistrer les préférences d’envoi.',
          })
        )
      );
    } finally {
      setIsEmailSaving(false);
    }
  }

  async function handleSaveTurnstileSettings() {
    if (isTurnstileSaving) {
      return;
    }

    setIsTurnstileSaving(true);
    setTurnstileSaveError(null);
    setTurnstileSaveSuccess(null);

    try {
      const response = await updateTenantTurnstileSettings(request, {
        siteKey: turnstileDraft.siteKey || null,
        secretKeyMutation: turnstileDraft.secretKeyMutation,
        secretKey: turnstileDraft.secretKey || null,
      });
      setTurnstilePanel({
        data: response,
        error: null,
        loading: false,
      });
      setTurnstileDraft(buildTenantTurnstileDraft(response));
      setTurnstileSaveSuccess(
        text({
          en: 'Turnstile settings saved.',
          zh_HANS: 'Turnstile 设置已保存。',
          zh_HANT: 'Turnstile 設定已儲存。',
          ja: 'Turnstile 設定を保存しました。',
          ko: 'Turnstile 설정이 저장되었습니다.',
          fr: 'Les paramètres Turnstile ont été enregistrés.',
        })
      );
    } catch (reason) {
      setTurnstileSaveError(
        getErrorMessage(
          reason,
          text({
            en: 'Failed to save Turnstile settings.',
            zh_HANS: '保存 Turnstile 设置失败。',
            zh_HANT: '儲存 Turnstile 設定失敗。',
            ja: 'Turnstile 設定を保存できません。',
            ko: 'Turnstile 설정을 저장하지 못했습니다.',
            fr: 'Impossible d’enregistrer les paramètres Turnstile.',
          })
        )
      );
    } finally {
      setIsTurnstileSaving(false);
    }
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
          applySectionRouteState(sectionId as TenantSettingsSection);
        }}
      >
        <div className={sectionTransitionClassName}>
          {displayedSectionId === 'details' ? (
            <div className="space-y-6">
              <GlassSurface className="p-8">
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-slate-600 uppercase">
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
                    <FieldRow
                      label={text('Tenant', '租户', 'テナント')}
                      value={session?.tenantName || common.currentTenant}
                    />
                    <FieldRow
                      label={text('Default language', '默认语言', '既定言語')}
                      value={draft.defaultLanguage || common.inheritedUnset}
                    />
                    <FieldRow
                      label={common.configEntities}
                      value={String(configEntityFamilyCount)}
                    />
                    <FieldRow
                      label={text('Dictionary Types', '词典类型', '辞書タイプ')}
                      value={String(dictionaryCount)}
                    />
                  </div>
                </div>
              </GlassSurface>

              <GlassSurface className="p-6">
                <FormSection
                  title={common.details}
                  description={text(
                    'Review tenant identity and quick links to related management pages.',
                    '查看租户身份信息及相关管理入口。',
                    'テナント識別情報と関連管理ページへの入口を確認します。'
                  )}
                >
                  <div className="grid gap-4 lg:grid-cols-2">
                    <FieldRow
                      label={text('Tenant Tier', '租户层级', 'テナント階層')}
                      value={session?.tenantTier || common.unknown}
                      hint={text(
                        'Available management features vary by tenant tier.',
                        '不同租户层级可用的管理能力不同。',
                        'テナント階層によって利用できる管理機能が異なります。'
                      )}
                    />
                    <FieldRow
                      label={text('Tenant Code', '租户代码', 'テナントコード')}
                      value={session?.tenantCode || common.unassigned}
                      hint={text(
                        'Tenant code is the stable identifier for this tenant.',
                        '租户代码是当前租户的稳定标识。',
                        'テナントコードはこのテナントの安定した識別子です。'
                      )}
                    />
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <SectionEntryLink
                      title={text('Business Workspace', '业务工作区', '業務ワークスペース')}
                      description={text(
                        'Open the tenant-level business workspace for cross-talent operations, reporting, and workspace handoff.',
                        '打开租户级业务工作区，用于跨艺人运营、报表与工作区交接。',
                        '複数タレント横断の運用、レポート、ワークスペース連携のためにテナント業務ワークスペースを開きます。'
                      )}
                      href={buildTenantBusinessPath(tenantId)}
                      cta={text(
                        'Open business workspace',
                        '打开业务工作区',
                        '業務ワークスペースを開く'
                      )}
                    />
                    <SectionEntryLink
                      title={text('Interface Management', '接口管理', 'インターフェース管理')}
                      description={text(
                        'Open adapter interface management. Webhooks and email sender settings are managed from their own pages.',
                        '打开适配器接口管理。Webhook 与邮件发信设置分别在独立页面管理。',
                        'アダプターインターフェース管理を開きます。Webhook とメール送信設定はそれぞれ専用画面で管理します。'
                      )}
                      href={`/tenant/${tenantId}/interface-management`}
                      cta={text(
                        'Open interface management',
                        '打开接口管理',
                        'インターフェース管理を開く'
                      )}
                    />
                    <SectionEntryLink
                      title={text('Security', '安全管理', 'セキュリティ管理')}
                      description={text(
                        'Open security, compliance, and blocklist settings.',
                        '打开安全、合规和封禁设置。',
                        'セキュリティ、コンプライアンス、ブロックリスト設定を開きます。'
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
	                    en: 'Maintain tenant-owned configuration families, homepage template assets, and homepage component assets in one catalog.',
	                    zh_HANS:
	                      '在同一目录中维护租户自有配置实体、主页模板资产与主页组件资产。',
	                    zh_HANT:
	                      '在同一目錄中維護租戶自有配置實體、主頁模板資產與主頁元件資產。',
	                    ja: 'テナント所有の設定エンティティ、ホームページテンプレート資産、コンポーネント資産を同じカタログで管理します。',
	                    ko: '테넌트 소유 구성 엔티티, 홈페이지 템플릿 자산, 컴포넌트 자산을 하나의 카탈로그에서 관리합니다.',
	                    fr: 'Gérez les familles de configuration du tenant ainsi que les assets template et composant de homepage dans un même catalogue.',
	                  })}
	                >
	                  <ScopedConfigEntityWorkspace
	                    request={request}
	                    requestEnvelope={requestEnvelope}
	                    scopeType="tenant"
	                    tenantId={tenantId}
	                    locale={locale}
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
                description={
                  activeSettingsCategory === 'email'
                    ? text(
                        'Select verified AC-assigned sending domains and non-secret sender preferences.',
                        '选择 AC 分配且已验证的发信域名，以及非密钥类发信偏好。',
                        'AC が割り当て検証済みの送信ドメインと非秘密の送信者設定を選択します。'
                      )
                    : activeSettingsCategory === 'captcha'
                      ? text(
                          'Manage tenant Cloudflare Turnstile keys and readiness for public CAPTCHA.',
                          '管理租户级 Cloudflare Turnstile 密钥与公开验证码就绪状态。',
                          '公開 CAPTCHA 用のテナント Cloudflare Turnstile キーと準備状況を管理します。'
                        )
                      : text(
                          'Review tenant defaults before opening the edit workflow.',
                          '先查看租户默认值，再进入编辑流程。',
                          '編集ワークフローを開く前にテナント既定値を確認します。'
                        )
                }
                actions={
                  activeSettingsCategory === 'defaults' ? (
                    <button
                      type="button"
                      onClick={() => setIsDefaultsDrawerOpen(true)}
                      className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                      {text('Edit defaults', '编辑默认值', '既定値を編集')}
                    </button>
                  ) : null
                }
              >
                <SettingsCategoryWorkbench
                  ariaLabel={common.settingsCategoriesAriaLabel}
                  categories={[
                    { id: 'defaults', label: common.defaultsCategory },
                    { id: 'email', label: text('Email', '邮件', 'メール') },
                    { id: 'captcha', label: text('CAPTCHA', '验证码', 'CAPTCHA') },
                  ]}
                  activeCategoryId={activeSettingsCategory}
                  onCategoryChange={handleSettingsCategoryChange}
                >
                  {activeSettingsCategory === 'defaults' ? (
                    <>
                      <SettingsDefaultsSummaryGrid
                        draft={initialDraft}
                        getSourceHint={(key) =>
                          formatSourceHint(settings.inheritedFrom[key], overrideSet.has(key))
                        }
                        text={text}
                      />

                      {!isDefaultsDrawerOpen && saveError ? (
                        <p className="text-sm font-medium text-red-600">{saveError}</p>
                      ) : null}
                      {!isDefaultsDrawerOpen && saveSuccess ? (
                        <p className="text-sm font-medium text-emerald-700">{saveSuccess}</p>
                      ) : null}
                    </>
                  ) : null}

                  {activeSettingsCategory === 'email' ? (
                    emailPanel.loading ? (
                      <p className="text-sm font-medium text-slate-500">
                        {text(
                          'Loading email sender domains…',
                          '正在加载发信域名…',
                          'メール送信ドメインを読み込み中…'
                        )}
                      </p>
                    ) : emailPanel.error ? (
                      <p className="text-sm font-medium text-red-600">{emailPanel.error}</p>
                    ) : (
                      <TenantEmailSettingsFields
                        domains={emailPanel.data?.domains ?? []}
                        draft={emailDraft}
                        error={emailSaveError}
                        success={emailSaveSuccess}
                        isSaving={isEmailSaving}
                        onDraftChange={setEmailDraft}
                        onSave={() => void handleSaveEmailSenderPreferences()}
                        text={text}
                      />
                    )
                  ) : null}

                  {activeSettingsCategory === 'captcha' ? (
                    turnstilePanel.loading ? (
                      <p className="text-sm font-medium text-slate-500">
                        {text(
                          'Loading Turnstile settings…',
                          '正在加载 Turnstile 设置…',
                          'Turnstile 設定を読み込み中…'
                        )}
                      </p>
                    ) : turnstilePanel.error ? (
                      <p className="text-sm font-medium text-red-600">{turnstilePanel.error}</p>
                    ) : turnstilePanel.data ? (
                      <TurnstileSettingsFields
                        response={turnstilePanel.data}
                        draft={turnstileDraft}
                        error={turnstileSaveError}
                        success={turnstileSaveSuccess}
                        isSaving={isTurnstileSaving}
                        onDraftChange={setTurnstileDraft}
                        onSave={() => void handleSaveTurnstileSettings()}
                        text={text}
                      />
                    ) : null
                  ) : null}
                </SettingsCategoryWorkbench>
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
                  'このテナントで利用できる辞書項目を確認します。'
                )}
              >
                {dictionaryPanel.error ? (
                  <SectionPlaceholder
                    title={text('Dictionary unavailable', '词典不可用', '辞書を読み込めません')}
                    description={dictionaryPanel.error}
                  />
                ) : dictionaryPanel.data ? (
                  <>
                    <div className="grid gap-4 xl:grid-cols-3">
                      <FieldRow
                        label={text(
                          'Visible Dictionary Types',
                          '可见词典类型',
                          '表示中の辞書タイプ'
                        )}
                        value={String(dictionaryCount)}
                      />
                      <FieldRow
                        label={common.configEntities}
                        value={String(configEntityFamilyCount)}
                      />
                      <FieldRow
                        label={text('Tenant Overrides', '租户覆盖项', 'テナント上書き数')}
                        value={String(settings.overrides.length)}
                      />
                    </div>
                    <DictionaryExplorerPanel
                      request={request}
                      requestEnvelope={requestEnvelope}
                      types={dictionaryPanel.data}
                      locale={locale}
                      copy={dictionaryExplorerCopy}
                      allowIncludeInactiveToggle
                      intro={
                        <>
                          <p>
                            {text(
                              'Review the dictionary items available in this tenant.',
                              '查看当前租户可用的词典项。',
                              'このテナントで利用できる辞書項目を確認します。'
                            )}
                          </p>
                          <p className="mt-2">
                            {text(
                              'Open System Dictionary if you need to change the vocabulary itself.',
                              '如需调整词典内容，请前往系统词典。',
                              '辞書項目自体を変更する場合はシステム辞書を開いてください。'
                            )}
                          </p>
                        </>
                      }
                      emptyDescription={text(
                        'No dictionary types are currently available for this tenant.',
                        '当前租户下没有可用的词典类型。',
                        'このテナントで利用できる辞書タイプはありません。'
                      )}
                    />
                  </>
                ) : (
                  <SectionPlaceholder
                    title={text(
                      'No dictionary types returned',
                      '未返回词典类型',
                      '辞書タイプが返されませんでした'
                    )}
                    description={text(
                      'No dictionary types are currently available for this tenant.',
                      '当前租户下没有可用的词典类型。',
                      'このテナントで利用できる辞書タイプはありません。'
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
          'Change localization, public surface, import, and security defaults used by this tenant scope.',
          '修改当前租户范围使用的本地化、公开入口、导入与安全默认值。',
          'このテナントスコープで使用するローカライズ、公開サーフェス、インポート、セキュリティ既定値を変更します。'
        )}
        size="lg"
        closeButtonAriaLabel={text(
          'Close tenant defaults editor',
          '关闭租户默认值编辑器',
          'テナント既定値エディターを閉じる'
        )}
        footer={
          <ActionDrawerFooter
            secondary={
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
            }
            primary={
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving || !hasDirtyDraft}
                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving
                  ? common.saving
                  : text('Save tenant defaults', '保存租户默认值', 'テナント既定値を保存')}
              </button>
            }
          />
        }
      >
        <FormSection
          title={common.settings}
          description={text(
            'Review and adjust the defaults applied across this tenant.',
            '查看并调整整个租户范围内应用的默认设置。',
            'このテナント全体に適用される既定値を確認して調整します。'
          )}
        >
          <SettingsDefaultsFormFields
            draft={draft}
            getSourceHint={(key) =>
              formatSourceHint(settings.inheritedFrom[key], overrideSet.has(key))
            }
            onDraftChange={setDraft}
            text={text}
          />

          {saveError ? <p className="text-sm font-medium text-red-600">{saveError}</p> : null}
          {saveSuccess ? (
            <p className="text-sm font-medium text-emerald-700">{saveSuccess}</p>
          ) : null}
        </FormSection>
      </ActionDrawer>
    </div>
  );
}
