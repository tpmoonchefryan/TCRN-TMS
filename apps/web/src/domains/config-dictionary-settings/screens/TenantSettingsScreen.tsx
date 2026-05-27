'use client';

import { Building2, CircleCheck, Pencil, Plus, Power, Save, SearchCheck, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { startTransition, useEffect, useState } from 'react';

import {
  buildTenantSettingsDraft,
  buildTenantSettingsUpdatePayload,
  isTenantSettingsDraftDirty,
  listManagedSsoProviders,
  type ManagedSsoProvider,
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
  upsertManagedSsoProvider,
  type UpsertManagedSsoProviderInput,
} from '@/domains/config-dictionary-settings/api/settings.api';
import {
  type DictionaryTypeSummary,
  listDictionaryTypes,
} from '@/domains/config-dictionary-settings/api/system-dictionary.api';
import { ArtistLifecycleFlowWorkspace } from '@/domains/config-dictionary-settings/components/ArtistLifecycleFlowWorkspace';
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
type TenantSettingsCategory = 'defaults' | 'email' | 'captcha' | 'lifecycle-flow' | 'sso';
type TenantSsoSecretMode = 'keep' | 'replace' | 'clear';

interface TenantSsoProviderDraft {
  code: string;
  displayNameEn: string;
  displayNameZhHans: string;
  issuerUrl: string;
  authorizationUrl: string;
  tokenUrl: string;
  userinfoUrl: string;
  jwksUrl: string;
  clientId: string;
  clientSecretRef: string;
  redirectUri: string;
  scopes: string;
  isEnabled: boolean;
  secretMode: TenantSsoSecretMode;
}

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

function buildEmptyTenantSsoDraft(): TenantSsoProviderDraft {
  return {
    code: '',
    displayNameEn: '',
    displayNameZhHans: '',
    issuerUrl: '',
    authorizationUrl: '',
    tokenUrl: '',
    userinfoUrl: '',
    jwksUrl: '',
    clientId: '',
    clientSecretRef: '',
    redirectUri: '',
    scopes: 'openid profile email',
    isEnabled: true,
    secretMode: 'replace',
  };
}

function buildTenantSsoDraftFromProvider(provider: ManagedSsoProvider): TenantSsoProviderDraft {
  return {
    code: provider.code,
    displayNameEn: provider.displayName.en || provider.code,
    displayNameZhHans: provider.displayName.zh_HANS || provider.displayName.en || provider.code,
    issuerUrl: provider.issuerUrl ?? '',
    authorizationUrl: provider.authorizationUrl ?? '',
    tokenUrl: provider.tokenUrl ?? '',
    userinfoUrl: provider.userinfoUrl ?? '',
    jwksUrl: provider.jwksUrl ?? '',
    clientId: provider.clientId ?? '',
    clientSecretRef: '',
    redirectUri: provider.redirectUri ?? '',
    scopes: provider.scopes.join(' '),
    isEnabled: provider.enabled,
    secretMode: 'keep',
  };
}

function normalizeTenantSsoCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function splitTenantSsoScopes(value: string) {
  return value
    .split(/[\s,]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
}

function buildTenantSsoPayload(draft: TenantSsoProviderDraft): UpsertManagedSsoProviderInput {
  const code = normalizeTenantSsoCode(draft.code);
  const displayNameEn = draft.displayNameEn.trim() || code;
  const displayNameZhHans = draft.displayNameZhHans.trim() || displayNameEn;
  const payload: UpsertManagedSsoProviderInput = {
    code,
    displayName: {
      en: displayNameEn,
      zh_HANS: displayNameZhHans,
      zh_HANT: displayNameZhHans,
      ja: displayNameEn,
      ko: displayNameEn,
      fr: displayNameEn,
    },
    providerType: 'oidc',
    ownerScope: 'tenant_product',
    issuerUrl: draft.issuerUrl.trim() || null,
    authorizationUrl: draft.authorizationUrl.trim() || null,
    tokenUrl: draft.tokenUrl.trim() || null,
    userinfoUrl: draft.userinfoUrl.trim() || null,
    jwksUrl: draft.jwksUrl.trim() || null,
    clientId: draft.clientId.trim() || null,
    redirectUri: draft.redirectUri.trim() || null,
    scopes: splitTenantSsoScopes(draft.scopes),
    claimMappingPolicy: {
      subject: 'sub',
      email: 'email',
      displayName: 'name',
      emailVerified: 'email_verified',
    },
    isEnabled: draft.isEnabled,
  };

  if (draft.secretMode === 'replace') {
    payload.clientSecretRef = draft.clientSecretRef.trim() || null;
  } else if (draft.secretMode === 'clear') {
    payload.clientSecretRef = null;
  }

  return payload;
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
  const [ssoProviderPanel, setSsoProviderPanel] = useState<AsyncPanelState<ManagedSsoProvider[]>>({
    data: null,
    error: null,
    loading: false,
  });
  const [ssoEditorMode, setSsoEditorMode] = useState<'create' | 'edit' | null>(null);
  const [ssoDraft, setSsoDraft] = useState<TenantSsoProviderDraft>(() =>
    buildEmptyTenantSsoDraft()
  );
  const [ssoSaveError, setSsoSaveError] = useState<string | null>(null);
  const [ssoSaveSuccess, setSsoSaveSuccess] = useState<string | null>(null);
  const [ssoDiscoveryStatus, setSsoDiscoveryStatus] = useState<string | null>(null);
  const [isSsoSaving, setIsSsoSaving] = useState(false);

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

  async function loadTenantSsoProviders() {
    if (ssoProviderPanel.loading) {
      return;
    }

    setSsoProviderPanel((current) => ({ ...current, loading: true, error: null }));
    setSsoSaveError(null);
    setSsoSaveSuccess(null);
    setSsoDiscoveryStatus(null);

    try {
      const response = await listManagedSsoProviders(request, 'tenant_product');
      setSsoProviderPanel({
        data: response,
        error: null,
        loading: false,
      });
    } catch (reason) {
      setSsoProviderPanel({
        data: null,
        error: getErrorMessage(
          reason,
          text({
            en: 'Failed to load SSO providers.',
            zh_HANS: '加载 SSO 提供方失败。',
            zh_HANT: '載入 SSO 提供者失敗。',
            ja: 'SSO プロバイダーを読み込めません。',
            ko: 'SSO 공급자를 불러오지 못했습니다.',
            fr: 'Impossible de charger les fournisseurs SSO.',
          })
        ),
        loading: false,
      });
    }
  }

  function openCreateSsoProviderEditor() {
    setSsoEditorMode('create');
    setSsoDraft(buildEmptyTenantSsoDraft());
    setSsoSaveError(null);
    setSsoSaveSuccess(null);
    setSsoDiscoveryStatus(null);
  }

  function openEditSsoProviderEditor(provider: ManagedSsoProvider) {
    setSsoEditorMode('edit');
    setSsoDraft(buildTenantSsoDraftFromProvider(provider));
    setSsoSaveError(null);
    setSsoSaveSuccess(null);
    setSsoDiscoveryStatus(null);
  }

  function closeSsoProviderEditor() {
    setSsoEditorMode(null);
    setSsoDraft(buildEmptyTenantSsoDraft());
    setSsoSaveError(null);
    setSsoDiscoveryStatus(null);
  }

  function validateSsoDraft(draftToValidate: TenantSsoProviderDraft) {
    const code = normalizeTenantSsoCode(draftToValidate.code);
    if (!code) {
      return text({
        en: 'Provider code is required.',
        zh_HANS: '需要填写提供方代码。',
        zh_HANT: '需要填寫提供者代碼。',
        ja: 'プロバイダーコードは必須です。',
        ko: '공급자 코드가 필요합니다.',
        fr: 'Le code du fournisseur est requis.',
      });
    }

    if (!draftToValidate.displayNameEn.trim()) {
      return text({
        en: 'English display name is required.',
        zh_HANS: '需要填写英文显示名称。',
        zh_HANT: '需要填寫英文顯示名稱。',
        ja: '英語の表示名は必須です。',
        ko: '영문 표시 이름이 필요합니다.',
        fr: 'Le nom anglais est requis.',
      });
    }

    if (!draftToValidate.issuerUrl.trim()) {
      return text({
        en: 'OIDC issuer URL is required.',
        zh_HANS: '需要填写 OIDC Issuer URL。',
        zh_HANT: '需要填寫 OIDC Issuer URL。',
        ja: 'OIDC Issuer URL は必須です。',
        ko: 'OIDC Issuer URL이 필요합니다.',
        fr: "L'URL issuer OIDC est requise.",
      });
    }

    if (!draftToValidate.clientId.trim()) {
      return text({
        en: 'Client ID is required.',
        zh_HANS: '需要填写 Client ID。',
        zh_HANT: '需要填寫 Client ID。',
        ja: 'Client ID は必須です。',
        ko: 'Client ID가 필요합니다.',
        fr: 'Le Client ID est requis.',
      });
    }

    if (
      draftToValidate.secretMode === 'replace' &&
      draftToValidate.clientSecretRef.trim() &&
      !draftToValidate.clientSecretRef.trim().startsWith('env:')
    ) {
      return text({
        en: 'Client Secret must be stored as an env: reference.',
        zh_HANS: 'Client Secret 必须使用 env: 引用保存。',
        zh_HANT: 'Client Secret 必須使用 env: 參照儲存。',
        ja: 'Client Secret は env: 参照で保存する必要があります。',
        ko: 'Client Secret은 env: 참조로 저장해야 합니다.',
        fr: 'Le Client Secret doit être enregistré sous forme de référence env:.',
      });
    }

    return null;
  }

  function handleSsoDiscoveryCheck() {
    const validationError = validateSsoDraft(ssoDraft);
    if (validationError) {
      setSsoDiscoveryStatus(null);
      setSsoSaveError(validationError);
      return;
    }

    setSsoSaveError(null);
    setSsoDiscoveryStatus(
      text({
        en: 'Discovery fields are ready to save. The server keeps runtime protocol validation authoritative.',
        zh_HANS: '发现配置字段已可保存；运行时协议校验仍由服务端作为权威。',
        zh_HANT: '發現設定欄位已可儲存；執行時協定校驗仍由服務端作為權威。',
        ja: 'ディスカバリー項目は保存可能です。実行時のプロトコル検証はサーバーが権威を持ちます。',
        ko: '디스커버리 필드를 저장할 수 있습니다. 런타임 프로토콜 검증은 서버가 권한을 유지합니다.',
        fr: 'Les champs de découverte sont prêts à être enregistrés. La validation protocolaire reste côté serveur.',
      })
    );
  }

  async function saveSsoProviderDraft(nextDraft = ssoDraft) {
    if (isSsoSaving) {
      return;
    }

    const validationError = validateSsoDraft(nextDraft);
    if (validationError) {
      setSsoSaveError(validationError);
      setSsoSaveSuccess(null);
      return;
    }

    setIsSsoSaving(true);
    setSsoSaveError(null);
    setSsoSaveSuccess(null);

    try {
      const providerCode = normalizeTenantSsoCode(nextDraft.code);
      const savedProvider = await upsertManagedSsoProvider(
        request,
        providerCode,
        buildTenantSsoPayload(nextDraft)
      );
      setSsoProviderPanel((current) => {
        const currentData = current.data ?? [];
        const nextData = currentData.some((provider) => provider.id === savedProvider.id)
          ? currentData.map((provider) =>
              provider.id === savedProvider.id ? savedProvider : provider
            )
          : [...currentData, savedProvider];

        return { data: nextData, error: null, loading: false };
      });
      setSsoDraft(buildTenantSsoDraftFromProvider(savedProvider));
      setSsoEditorMode(null);
      setSsoSaveSuccess(
        text({
          en: 'Tenant SSO provider saved.',
          zh_HANS: '租户 SSO 提供方已保存。',
          zh_HANT: '租戶 SSO 提供者已儲存。',
          ja: 'テナント SSO プロバイダーを保存しました。',
          ko: '테넌트 SSO 공급자가 저장되었습니다.',
          fr: 'Le fournisseur SSO tenant a été enregistré.',
        })
      );
    } catch (reason) {
      setSsoSaveError(
        getErrorMessage(
          reason,
          text({
            en: 'Failed to save tenant SSO provider.',
            zh_HANS: '保存租户 SSO 提供方失败。',
            zh_HANT: '儲存租戶 SSO 提供者失敗。',
            ja: 'テナント SSO プロバイダーを保存できません。',
            ko: '테넌트 SSO 공급자를 저장하지 못했습니다.',
            fr: "Impossible d'enregistrer le fournisseur SSO tenant.",
          })
        )
      );
    } finally {
      setIsSsoSaving(false);
    }
  }

  async function toggleSsoProvider(provider: ManagedSsoProvider) {
    const draftFromProvider = {
      ...buildTenantSsoDraftFromProvider(provider),
      isEnabled: !provider.enabled,
      secretMode: 'keep' as const,
    };
    await saveSsoProviderDraft(draftFromProvider);
  }

  function handleSettingsCategoryChange(categoryId: string) {
    const nextCategoryId =
      categoryId === 'email' ||
      categoryId === 'captcha' ||
      categoryId === 'lifecycle-flow' ||
      categoryId === 'sso'
        ? categoryId
        : 'defaults';
    setActiveSettingsCategory(nextCategoryId);

    if (nextCategoryId === 'email' && !emailPanel.data && !emailPanel.loading) {
      void loadTenantEmailSenderDomains();
    }

    if (nextCategoryId === 'captcha' && !turnstilePanel.data && !turnstilePanel.loading) {
      void loadTenantTurnstileSettings();
    }

    if (nextCategoryId === 'sso' && !ssoProviderPanel.data && !ssoProviderPanel.loading) {
      void loadTenantSsoProviders();
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
                    zh_HANS: '在同一目录中维护租户自有配置实体、主页模板资产与主页组件资产。',
                    zh_HANT: '在同一目錄中維護租戶自有配置實體、主頁模板資產與主頁元件資產。',
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
                      : activeSettingsCategory === 'sso'
                        ? text({
                            en: 'Manage tenant product SSO provider metadata without exposing secrets.',
                            zh_HANS: '管理租户产品 SSO 提供方元数据，不暴露密钥。',
                            zh_HANT: '管理租戶產品 SSO 提供者中繼資料，不暴露密鑰。',
                            ja: 'シークレットを表示せずにテナント製品 SSO プロバイダーのメタデータを管理します。',
                            ko: '비밀 값을 노출하지 않고 테넌트 제품 SSO 공급자 메타데이터를 관리합니다.',
                            fr: 'Gérez les métadonnées SSO produit du tenant sans exposer de secrets.',
                          })
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
                    {
                      id: 'lifecycle-flow',
                      label: text({
                        en: 'Artist Lifecycle Flow',
                        zh_HANS: 'Artist Lifecycle Flow',
                        zh_HANT: 'Artist Lifecycle Flow',
                        ja: 'Artist Lifecycle Flow',
                        ko: 'Artist Lifecycle Flow',
                        fr: 'Artist Lifecycle Flow',
                      }),
                    },
                    { id: 'email', label: text('Email', '邮件', 'メール') },
                    {
                      id: 'sso',
                      label: text({
                        en: 'Single Sign-On',
                        zh_HANS: '单点登录',
                        zh_HANT: '單點登入',
                        ja: 'シングルサインオン',
                        ko: '싱글 사인온',
                        fr: 'SSO',
                      }),
                    },
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

                  {activeSettingsCategory === 'lifecycle-flow' ? (
                    <ArtistLifecycleFlowWorkspace
                      request={request}
                      requestEnvelope={requestEnvelope}
                      scopeType="tenant"
                      locale={locale}
                    />
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

                  {activeSettingsCategory === 'sso' ? (
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-950">
                            {text({
                              en: 'Tenant inbound TMS SSO',
                              zh_HANS: '租户入站 TMS SSO',
                              zh_HANT: '租戶入站 TMS SSO',
                              ja: 'テナント受信 TMS SSO',
                              ko: '테넌트 인바운드 TMS SSO',
                              fr: 'SSO TMS entrant du tenant',
                            })}
                          </p>
                          <p className="text-sm leading-6 text-slate-600">
                            {text({
                              en: 'Only tenant_product providers are editable here; platform and external-tool SSO stay on AC surfaces.',
                              zh_HANS:
                                '此处只能编辑 tenant_product 提供方；平台与外部工具 SSO 保留在 AC 界面。',
                              zh_HANT:
                                '此處只能編輯 tenant_product 提供者；平台與外部工具 SSO 保留在 AC 介面。',
                              ja: 'ここで編集できるのは tenant_product プロバイダーのみです。プラットフォームと外部ツール SSO は AC 画面に残ります。',
                              ko: '여기서는 tenant_product 공급자만 편집합니다. 플랫폼 및 외부 도구 SSO는 AC 화면에 남습니다.',
                              fr: 'Seuls les fournisseurs tenant_product sont modifiables ici; le SSO plateforme et outils externes reste côté AC.',
                            })}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void loadTenantSsoProviders()}
                            disabled={ssoProviderPanel.loading}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <SearchCheck className="h-4 w-4" aria-hidden="true" />
                            {text('Refresh', '刷新', '更新')}
                          </button>
                          <button
                            type="button"
                            onClick={openCreateSsoProviderEditor}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                          >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            {text('Add provider', '新增提供方', 'プロバイダーを追加')}
                          </button>
                        </div>
                      </div>

                      {ssoSaveError ? (
                        <p role="alert" className="text-sm font-medium text-red-600">
                          {ssoSaveError}
                        </p>
                      ) : null}
                      {ssoSaveSuccess ? (
                        <p className="text-sm font-medium text-emerald-700">{ssoSaveSuccess}</p>
                      ) : null}

                      {ssoEditorMode ? (
                        <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-4 shadow-sm">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-950">
                                {ssoEditorMode === 'create'
                                  ? text({
                                      en: 'Create tenant SSO provider',
                                      zh_HANS: '创建租户 SSO 提供方',
                                      zh_HANT: '建立租戶 SSO 提供者',
                                      ja: 'テナント SSO プロバイダーを作成',
                                      ko: '테넌트 SSO 공급자 만들기',
                                      fr: 'Créer un fournisseur SSO tenant',
                                    })
                                  : text({
                                      en: 'Edit tenant SSO provider',
                                      zh_HANS: '编辑租户 SSO 提供方',
                                      zh_HANT: '編輯租戶 SSO 提供者',
                                      ja: 'テナント SSO プロバイダーを編集',
                                      ko: '테넌트 SSO 공급자 편집',
                                      fr: 'Modifier le fournisseur SSO tenant',
                                    })}
                              </p>
                              <p className="mt-1 text-sm leading-6 text-slate-600">
                                {text({
                                  en: 'Secrets are saved only as env: references and are never displayed after save.',
                                  zh_HANS: '密钥只会以 env: 引用保存，保存后不会回显。',
                                  zh_HANT: '密鑰只會以 env: 參照儲存，儲存後不會回顯。',
                                  ja: 'シークレットは env: 参照としてのみ保存され、保存後は表示されません。',
                                  ko: '비밀 값은 env: 참조로만 저장되며 저장 후 표시되지 않습니다.',
                                  fr: 'Les secrets sont enregistrés uniquement comme références env: et jamais réaffichés.',
                                })}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={closeSsoProviderEditor}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                              <X className="h-4 w-4" aria-hidden="true" />
                              {text('Cancel', '取消', 'キャンセル')}
                            </button>
                          </div>

                          <div className="mt-4 grid gap-4 lg:grid-cols-2">
                            <label className="space-y-2">
                              <span className="text-sm font-semibold text-slate-900">
                                {text('Provider code', '提供方代码', 'プロバイダーコード')}
                              </span>
                              <input
                                aria-label={text(
                                  'Provider code',
                                  '提供方代码',
                                  'プロバイダーコード'
                                )}
                                value={ssoDraft.code}
                                disabled={ssoEditorMode === 'edit'}
                                onChange={(event) =>
                                  setSsoDraft({ ...ssoDraft, code: event.target.value })
                                }
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:bg-slate-100 disabled:text-slate-500"
                                placeholder="google-workspace"
                              />
                            </label>
                            <label className="space-y-2">
                              <span className="text-sm font-semibold text-slate-900">
                                {text('English display name', '英文显示名称', '英語表示名')}
                              </span>
                              <input
                                aria-label={text(
                                  'English display name',
                                  '英文显示名称',
                                  '英語表示名'
                                )}
                                value={ssoDraft.displayNameEn}
                                onChange={(event) =>
                                  setSsoDraft({ ...ssoDraft, displayNameEn: event.target.value })
                                }
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                                placeholder="Google Workspace"
                              />
                            </label>
                            <label className="space-y-2">
                              <span className="text-sm font-semibold text-slate-900">
                                {text(
                                  'Simplified Chinese display name',
                                  '简体中文显示名称',
                                  '簡体字中国語表示名'
                                )}
                              </span>
                              <input
                                aria-label={text(
                                  'Simplified Chinese display name',
                                  '简体中文显示名称',
                                  '簡体字中国語表示名'
                                )}
                                value={ssoDraft.displayNameZhHans}
                                onChange={(event) =>
                                  setSsoDraft({
                                    ...ssoDraft,
                                    displayNameZhHans: event.target.value,
                                  })
                                }
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                                placeholder="Google Workspace"
                              />
                            </label>
                            <label className="space-y-2">
                              <span className="text-sm font-semibold text-slate-900">
                                {text('Enabled', '启用', '有効')}
                              </span>
                              <select
                                aria-label={text('Enabled', '启用', '有効')}
                                value={ssoDraft.isEnabled ? 'enabled' : 'disabled'}
                                onChange={(event) =>
                                  setSsoDraft({
                                    ...ssoDraft,
                                    isEnabled: event.target.value === 'enabled',
                                  })
                                }
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                              >
                                <option value="enabled">{text('Enabled', '已启用', '有効')}</option>
                                <option value="disabled">
                                  {text('Disabled', '已停用', '無効')}
                                </option>
                              </select>
                            </label>
                            <label className="space-y-2 lg:col-span-2">
                              <span className="text-sm font-semibold text-slate-900">
                                {text('OIDC issuer URL', 'OIDC Issuer URL', 'OIDC Issuer URL')}
                              </span>
                              <input
                                aria-label={text(
                                  'OIDC issuer URL',
                                  'OIDC Issuer URL',
                                  'OIDC Issuer URL'
                                )}
                                value={ssoDraft.issuerUrl}
                                onChange={(event) =>
                                  setSsoDraft({ ...ssoDraft, issuerUrl: event.target.value })
                                }
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                                placeholder="https://idp.example.com"
                              />
                            </label>
                            <label className="space-y-2">
                              <span className="text-sm font-semibold text-slate-900">
                                {text('Client ID', 'Client ID', 'Client ID')}
                              </span>
                              <input
                                aria-label={text('Client ID', 'Client ID', 'Client ID')}
                                value={ssoDraft.clientId}
                                onChange={(event) =>
                                  setSsoDraft({ ...ssoDraft, clientId: event.target.value })
                                }
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                                placeholder="tcrn-web"
                              />
                            </label>
                            <label className="space-y-2">
                              <span className="text-sm font-semibold text-slate-900">
                                {text('Redirect URI', 'Redirect URI', 'Redirect URI')}
                              </span>
                              <input
                                aria-label={text('Redirect URI', 'Redirect URI', 'Redirect URI')}
                                value={ssoDraft.redirectUri}
                                onChange={(event) =>
                                  setSsoDraft({ ...ssoDraft, redirectUri: event.target.value })
                                }
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                                placeholder="https://app.example.com/api/v1/auth/sso/callback/google-workspace"
                              />
                            </label>
                            <label className="space-y-2">
                              <span className="text-sm font-semibold text-slate-900">
                                {text('Scopes', 'Scopes', 'Scopes')}
                              </span>
                              <input
                                aria-label={text('Scopes', 'Scopes', 'Scopes')}
                                value={ssoDraft.scopes}
                                onChange={(event) =>
                                  setSsoDraft({ ...ssoDraft, scopes: event.target.value })
                                }
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                              />
                            </label>
                            <label className="space-y-2">
                              <span className="text-sm font-semibold text-slate-900">
                                {text(
                                  'Client Secret env reference',
                                  'Client Secret 环境变量引用',
                                  'Client Secret env 参照'
                                )}
                              </span>
                              <input
                                aria-label={text(
                                  'Client Secret env reference',
                                  'Client Secret 环境变量引用',
                                  'Client Secret env 参照'
                                )}
                                value={ssoDraft.clientSecretRef}
                                onChange={(event) =>
                                  setSsoDraft({
                                    ...ssoDraft,
                                    clientSecretRef: event.target.value,
                                    secretMode: event.target.value.trim()
                                      ? 'replace'
                                      : ssoDraft.secretMode,
                                  })
                                }
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                                placeholder="env:TCRN_GOOGLE_SSO_CLIENT_SECRET"
                              />
                            </label>
                          </div>

                          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setSsoDraft({
                                    ...ssoDraft,
                                    clientSecretRef: '',
                                    secretMode: 'keep',
                                  })
                                }
                                className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                                  ssoDraft.secretMode === 'keep'
                                    ? 'bg-slate-950 text-white'
                                    : 'border border-slate-300 bg-white text-slate-700'
                                }`}
                              >
                                {text('Keep secret', '保留密钥', 'シークレットを保持')}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setSsoDraft({ ...ssoDraft, secretMode: 'replace' })
                                }
                                className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                                  ssoDraft.secretMode === 'replace'
                                    ? 'bg-slate-950 text-white'
                                    : 'border border-slate-300 bg-white text-slate-700'
                                }`}
                              >
                                {text('Replace secret', '替换密钥', 'シークレットを置換')}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setSsoDraft({
                                    ...ssoDraft,
                                    clientSecretRef: '',
                                    secretMode: 'clear',
                                  })
                                }
                                className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                                  ssoDraft.secretMode === 'clear'
                                    ? 'bg-red-700 text-white'
                                    : 'border border-red-200 bg-white text-red-700'
                                }`}
                              >
                                {text('Clear secret', '清除密钥', 'シークレットを削除')}
                              </button>
                            </div>
                            <p className="mt-2 text-xs leading-5 text-slate-500">
                              {text({
                                en: 'Keep preserves the existing redacted secret; replace accepts only env: references; clear removes the provider secret reference.',
                                zh_HANS:
                                  '保留会继续使用现有隐藏密钥；替换只接受 env: 引用；清除会移除提供方密钥引用。',
                                zh_HANT:
                                  '保留會繼續使用現有隱藏密鑰；替換只接受 env: 參照；清除會移除提供者密鑰參照。',
                                ja: '保持は既存の非表示シークレットを維持します。置換は env: 参照のみ受け付け、削除は参照を消去します。',
                                ko: '유지는 기존 숨김 비밀 값을 보존합니다. 교체는 env: 참조만 허용하며 삭제는 공급자 비밀 참조를 제거합니다.',
                                fr: 'Conserver garde le secret masqué; remplacer accepte seulement les références env:; effacer supprime la référence.',
                              })}
                            </p>
                          </div>

                          {ssoDiscoveryStatus ? (
                            <p className="mt-3 text-sm font-medium text-emerald-700">
                              {ssoDiscoveryStatus}
                            </p>
                          ) : null}

                          <div className="mt-4 flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={handleSsoDiscoveryCheck}
                              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
                            >
                              <CircleCheck className="h-4 w-4" aria-hidden="true" />
                              {text('Check discovery', '检查发现配置', 'ディスカバリーを確認')}
                            </button>
                            <button
                              type="button"
                              onClick={() => void saveSsoProviderDraft()}
                              disabled={isSsoSaving}
                              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Save className="h-4 w-4" aria-hidden="true" />
                              {isSsoSaving
                                ? text('Saving provider', '正在保存提供方', '保存中')
                                : text('Save provider', '保存提供方', 'プロバイダーを保存')}
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {ssoProviderPanel.loading ? (
                        <p className="text-sm font-medium text-slate-500">
                          {text({
                            en: 'Loading SSO providers…',
                            zh_HANS: '正在加载 SSO 提供方…',
                            zh_HANT: '正在載入 SSO 提供者…',
                            ja: 'SSO プロバイダーを読み込み中…',
                            ko: 'SSO 공급자를 불러오는 중…',
                            fr: 'Chargement des fournisseurs SSO…',
                          })}
                        </p>
                      ) : ssoProviderPanel.error ? (
                        <p className="text-sm font-medium text-red-600">
                          {ssoProviderPanel.error}
                        </p>
                      ) : ssoProviderPanel.data && ssoProviderPanel.data.length > 0 ? (
                        <div className="grid gap-4 lg:grid-cols-2">
                          {ssoProviderPanel.data.map((provider) => {
                            const displayName =
                              provider.displayName[locale] ||
                              provider.displayName.en ||
                              provider.code;

                            return (
                              <div
                                key={provider.id}
                                className="min-w-0 rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-950">
                                      {displayName}
                                    </p>
                                    <p className="mt-1 text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                                      {provider.code}
                                    </p>
                                  </div>
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                      provider.enabled
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {provider.enabled
                                      ? text('Enabled', '已启用', '有効')
                                      : text('Disabled', '已停用', '無効')}
                                  </span>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openEditSsoProviderEditor(provider)}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                  >
                                    <Pencil className="h-4 w-4" aria-hidden="true" />
                                    {text('Edit provider', '编辑提供方', 'プロバイダーを編集')}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void toggleSsoProvider(provider)}
                                    disabled={isSsoSaving}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <Power className="h-4 w-4" aria-hidden="true" />
                                    {provider.enabled
                                      ? text('Disable provider', '停用提供方', 'プロバイダーを無効化')
                                      : text('Enable provider', '启用提供方', 'プロバイダーを有効化')}
                                  </button>
                                </div>
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                  <FieldRow
                                    label={text('Provider Type', '提供方类型', 'プロバイダー種別')}
                                    value={provider.providerType.toUpperCase()}
                                    hint={text({
                                      en: 'Login SSO metadata is separate from integration OAuth adapters.',
                                      zh_HANS: '登录 SSO 元数据与集成 OAuth 适配器相互独立。',
                                      zh_HANT: '登入 SSO 中繼資料與整合 OAuth 配接器相互獨立。',
                                      ja: 'ログイン SSO メタデータは統合 OAuth アダプターとは分離されています。',
                                      ko: '로그인 SSO 메타데이터는 통합 OAuth 어댑터와 분리됩니다.',
                                      fr: 'Les métadonnées SSO de connexion sont séparées des adaptateurs OAuth d’intégration.',
                                    })}
                                  />
                                  <FieldRow
                                    label={text('Owner Scope', '归属范围', '所有スコープ')}
                                    value={provider.ownerScope}
                                    hint={text({
                                      en: 'Tenant settings can manage tenant_product providers only.',
                                      zh_HANS: '租户设置只能管理 tenant_product 提供方。',
                                      zh_HANT: '租戶設定只能管理 tenant_product 提供者。',
                                      ja: 'テナント設定で管理できるのは tenant_product プロバイダーだけです。',
                                      ko: '테넌트 설정은 tenant_product 공급자만 관리할 수 있습니다.',
                                      fr: 'Les paramètres tenant ne gèrent que les fournisseurs tenant_product.',
                                    })}
                                  />
                                  <FieldRow
                                    label={text('Issuer', 'Issuer', 'Issuer')}
                                    value={provider.issuerUrl || common.notConfigured}
                                  />
                                  <FieldRow
                                    label={text('Client ID', 'Client ID', 'Client ID')}
                                    value={provider.clientId || common.notConfigured}
                                  />
                                  <FieldRow
                                    label={text('Client Secret', 'Client Secret', 'Client Secret')}
                                    value={
                                      provider.clientSecretConfigured
                                        ? text(
                                            'Configured (redacted)',
                                            '已配置（已隐藏）',
                                            '設定済み（非表示）'
                                          )
                                        : common.notConfigured
                                    }
                                  />
                                  <FieldRow
                                    label={text('Redirect URI', 'Redirect URI', 'Redirect URI')}
                                    value={provider.redirectUri || common.notConfigured}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <SectionPlaceholder
                          title={text({
                            en: 'No tenant SSO provider configured',
                            zh_HANS: '尚未配置租户 SSO 提供方',
                            zh_HANT: '尚未設定租戶 SSO 提供者',
                            ja: 'テナント SSO プロバイダーは未設定です',
                            ko: '테넌트 SSO 공급자가 구성되지 않았습니다',
                            fr: 'Aucun fournisseur SSO tenant configuré',
                          })}
                          description={text({
                            en: 'Create an OIDC provider here to enable tenant inbound TMS SSO. Secrets stay redacted.',
                            zh_HANS:
                              '在此创建 OIDC 提供方以启用租户入站 TMS SSO。密钥始终隐藏。',
                            zh_HANT:
                              '在此建立 OIDC 提供者以啟用租戶入站 TMS SSO。密鑰始終隱藏。',
                            ja: 'ここで OIDC プロバイダーを作成してテナント受信 TMS SSO を有効にします。シークレットは常に非表示です。',
                            ko: '여기서 OIDC 공급자를 만들어 테넌트 인바운드 TMS SSO를 활성화합니다. 비밀 값은 항상 숨겨집니다.',
                            fr: 'Créez ici un fournisseur OIDC pour activer le SSO TMS entrant du tenant. Les secrets restent masqués.',
                          })}
                        />
                      )}
                    </div>
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
