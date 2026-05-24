'use client';

import { ChevronLeft, Plus } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import type { IntegrationAdapterDefinition } from '@tcrn/shared';

import { useIntegrationManagementCopy } from '@/domains/integration-management/screens/integration-management.copy';
import {
  createScopedAdapter,
  createTenantAdapter,
  type IntegrationAdapterScope,
  listAdapterDefinitions,
  type OwnerType,
} from '@/domains/interface-management/api/interface-management.api';
import { pickLocaleText } from '@/platform/runtime/locale/locale-text';
import { useSession } from '@/platform/runtime/session/session-provider';
import { AsyncSubmitButton, FormSection, GlassSurface, StateView } from '@/platform/ui';

type PanelState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
};

type NoticeState = {
  tone: 'success' | 'error';
  message: string;
};

const OWNER_TYPES = new Set<OwnerType>(['tenant', 'subsidiary', 'talent']);

function createPanelState<T>(data: T, loading = true): PanelState<T> {
  return {
    data,
    loading,
    error: null,
  };
}

function getErrorMessage(reason: unknown, fallback: string) {
  if (reason instanceof Error && reason.message) {
    return reason.message;
  }

  return fallback;
}

function resolveScope(searchParams: URLSearchParams): IntegrationAdapterScope {
  const ownerTypeValue = searchParams.get('ownerType');
  const ownerType = OWNER_TYPES.has(ownerTypeValue as OwnerType)
    ? (ownerTypeValue as OwnerType)
    : 'tenant';

  if (ownerType === 'tenant') {
    return { ownerType, ownerId: null };
  }

  return {
    ownerType,
    ownerId: searchParams.get('ownerId') || '',
  };
}

function buildListHref(
  tenantId: string,
  workspaceKind: 'tenant' | 'ac',
  scope: IntegrationAdapterScope
) {
  const params = new URLSearchParams();
  params.set('ownerType', scope.ownerType);

  if (scope.ownerId) {
    params.set('ownerId', scope.ownerId);
  }

  const query = params.toString();
  const path =
    workspaceKind === 'ac'
      ? `/ac/${encodeURIComponent(tenantId)}/interface-management`
      : `/tenant/${encodeURIComponent(tenantId)}/interface-management`;

  return query ? `${path}?${query}` : path;
}

function pickDefinitionText(
  locale: string,
  value: IntegrationAdapterDefinition['name'] | IntegrationAdapterDefinition['description'],
  fallback = ''
) {
  return pickLocaleText(locale, value) || fallback;
}

function findProviderDefinition(definition: IntegrationAdapterDefinition | null, provider: string) {
  return definition?.aiProviders?.find((item) => item.provider === provider) ?? null;
}

function TextField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
}: Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}>) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}>) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SecondaryButton({
  children,
  onClick,
}: Readonly<{
  children: React.ReactNode;
  onClick: () => void;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
    >
      {children}
    </button>
  );
}

export function InterfaceAddAdapterScreen({
  tenantId,
  workspaceKind = 'tenant',
}: Readonly<{
  tenantId: string;
  workspaceKind?: 'tenant' | 'ac';
}>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { request } = useSession();
  const { locale, text } = useIntegrationManagementCopy();
  const [definitionsPanel, setDefinitionsPanel] = useState<
    PanelState<IntegrationAdapterDefinition[]>
  >(createPanelState<IntegrationAdapterDefinition[]>([]));
  const [definitionKey, setDefinitionKey] = useState('');
  const [provider, setProvider] = useState('');
  const [endpointPath, setEndpointPath] = useState('');
  const [model, setModel] = useState('');
  const [token, setToken] = useState('');
  const [inherit, setInherit] = useState(true);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const scope = useMemo(() => resolveScope(searchParams), [searchParams]);
  const listHref = buildListHref(tenantId, workspaceKind, scope);
  const selectedDefinition = useMemo(
    () => definitionsPanel.data.find((definition) => definition.key === definitionKey) ?? null,
    [definitionKey, definitionsPanel.data]
  );
  const providerDefinition = findProviderDefinition(selectedDefinition, provider);
  const providerOptions =
    selectedDefinition?.aiProviders?.map((item) => ({
      value: item.provider,
      label: pickDefinitionText(locale, item.label, item.provider),
    })) ?? [];
  const adapterDefinitionLoadError = text({
    en: 'Failed to load adapter definitions.',
    zh_HANS: '加载适配器定义失败。',
    zh_HANT: '載入適配器定義失敗。',
    ja: 'アダプター定義の読み込みに失敗しました。',
    ko: '어댑터 정의를 불러오지 못했습니다.',
    fr: 'Impossible de charger les définitions d’adaptateur.',
  });

  useEffect(() => {
    let cancelled = false;

    async function loadDefinitions() {
      setDefinitionsPanel((current) => ({
        ...current,
        loading: true,
        error: null,
      }));

      try {
        const data = await listAdapterDefinitions(request);

        if (cancelled) {
          return;
        }

        setDefinitionsPanel({
          data,
          loading: false,
          error: null,
        });
        const firstDefinition = data[0] ?? null;
        setDefinitionKey((current) => current || firstDefinition?.key || '');
        const firstProvider = firstDefinition?.aiProviders?.[0] ?? null;
        setProvider((current) => current || firstProvider?.provider || '');
        setEndpointPath((current) => current || firstProvider?.endpointPathDefault || '');
        setModel((current) => current || firstProvider?.modelPlaceholder || '');
      } catch (reason) {
        if (cancelled) {
          return;
        }

        setDefinitionsPanel({
          data: [],
          loading: false,
          error: getErrorMessage(reason, adapterDefinitionLoadError),
        });
      }
    }

    void loadDefinitions();

    return () => {
      cancelled = true;
    };
  }, [adapterDefinitionLoadError, request]);

  function handleDefinitionChange(nextDefinitionKey: string) {
    const nextDefinition =
      definitionsPanel.data.find((definition) => definition.key === nextDefinitionKey) ?? null;
    const nextProvider = nextDefinition?.aiProviders?.[0] ?? null;

    setDefinitionKey(nextDefinitionKey);
    setProvider(nextProvider?.provider || '');
    setEndpointPath(nextProvider?.endpointPathDefault || '');
    setModel(nextProvider?.modelPlaceholder || '');
  }

  function handleProviderChange(nextProvider: string) {
    const nextProviderDefinition = findProviderDefinition(selectedDefinition, nextProvider);

    setProvider(nextProvider);
    setEndpointPath(nextProviderDefinition?.endpointPathDefault || '');
    setModel(nextProviderDefinition?.modelPlaceholder || '');
  }

  async function handleSubmit() {
    if (!selectedDefinition) {
      setNotice({
        tone: 'error',
        message: text({
          en: 'Choose an adapter type before creating the adapter.',
          zh_HANS: '请先选择适配器类型。',
          zh_HANT: '請先選擇適配器類型。',
          ja: 'アダプターを作成する前に種別を選択してください。',
          ko: '어댑터를 만들기 전에 유형을 선택하세요.',
          fr: 'Choisissez un type d’adaptateur avant de créer l’adaptateur.',
        }),
      });
      return;
    }

    if (!scope.ownerId && scope.ownerType !== 'tenant') {
      setNotice({
        tone: 'error',
        message: text({
          en: 'Choose a valid scope before creating the adapter.',
          zh_HANS: '请先选择有效范围。',
          zh_HANT: '請先選擇有效範圍。',
          ja: 'アダプターを作成する前に有効なスコープを選択してください。',
          ko: '어댑터를 만들기 전에 유효한 범위를 선택하세요.',
          fr: 'Choisissez un périmètre valide avant de créer l’adaptateur.',
        }),
      });
      return;
    }

    if (!provider || !endpointPath.trim() || !model.trim() || !token.trim()) {
      setNotice({
        tone: 'error',
        message: text({
          en: 'Provider, endpoint path, model, and token secret are required.',
          zh_HANS: '提供商、Endpoint 路径、模型与 Token 密钥均为必填。',
          zh_HANT: '供應商、Endpoint 路徑、模型與 Token 密鑰均為必填。',
          ja: 'プロバイダー、エンドポイントパス、モデル、トークンシークレットは必須です。',
          ko: '제공자, 엔드포인트 경로, 모델, 토큰 시크릿은 필수입니다.',
          fr: 'Le fournisseur, le chemin endpoint, le modèle et le jeton secret sont obligatoires.',
        }),
      });
      return;
    }

    setSubmitting(true);
    setNotice(null);

    try {
      const payload = {
        definitionKey: selectedDefinition.key,
        inherit,
        configs: [
          { configKey: 'provider', configValue: provider },
          { configKey: 'endpoint_path', configValue: endpointPath.trim() },
          { configKey: 'model', configValue: model.trim() },
          { configKey: 'token', configValue: token },
        ],
      };

      if (scope.ownerType === 'tenant') {
        await createTenantAdapter(request, payload);
      } else {
        await createScopedAdapter(request, scope, payload);
      }

      router.replace(listHref);
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(
          reason,
          text({
            en: 'Failed to create adapter.',
            zh_HANS: '创建适配器失败。',
            zh_HANT: '建立適配器失敗。',
            ja: 'アダプターの作成に失敗しました。',
            ko: '어댑터 생성에 실패했습니다.',
            fr: 'Échec de la création de l’adaptateur.',
          })
        ),
      });
    } finally {
      setSubmitting(false);
    }
  }

  const noticeClasses =
    notice?.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : 'border-rose-200 bg-rose-50 text-rose-800';

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {text({
              en: 'Interface Management',
              zh_HANS: '接口管理',
              zh_HANT: '介面管理',
              ja: 'インターフェース管理',
              ko: '인터페이스 관리',
              fr: 'Gestion des interfaces',
            })}
          </p>
          <h1 className="text-2xl font-semibold text-slate-950">
            {text({
              en: 'Add Adapter',
              zh_HANS: '新增适配器',
              zh_HANT: '新增適配器',
              ja: 'アダプターを追加',
              ko: '어댑터 추가',
              fr: 'Ajouter un adaptateur',
            })}
          </h1>
        </div>
        <SecondaryButton onClick={() => router.replace(listHref)}>
          <ChevronLeft className="h-4 w-4" />
          {text({
            en: 'Back to adapters',
            zh_HANS: '返回适配器',
            zh_HANT: '返回適配器',
            ja: 'アダプターへ戻る',
            ko: '어댑터로 돌아가기',
            fr: 'Retour aux adaptateurs',
          })}
        </SecondaryButton>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <GlassSurface className="p-4">
          <nav
            aria-label={text({
              en: 'Add adapter sections',
              zh_HANS: '新增适配器分区',
              zh_HANT: '新增適配器分區',
              ja: 'アダプター追加セクション',
              ko: '어댑터 추가 섹션',
              fr: 'Sections d’ajout d’adaptateur',
            })}
          >
            <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
              {[
                {
                  href: '#base-information',
                  label: text({
                    en: 'Base information',
                    zh_HANS: '基础信息',
                    zh_HANT: '基礎資訊',
                    ja: '基本情報',
                    ko: '기본 정보',
                    fr: 'Informations de base',
                  }),
                },
                {
                  href: '#provider-connection',
                  label: text({
                    en: 'Provider connection',
                    zh_HANS: '提供商连接',
                    zh_HANT: '供應商連線',
                    ja: 'プロバイダー接続',
                    ko: '제공자 연결',
                    fr: 'Connexion fournisseur',
                  }),
                },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-sm font-medium text-slate-700 hover:border-indigo-200 hover:text-indigo-700 lg:rounded-2xl"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </nav>
        </GlassSurface>

        <div className="space-y-6">
          {definitionsPanel.error ? (
            <StateView
              status="error"
              title={text({
                en: 'Adapter definitions unavailable',
                zh_HANS: '适配器定义不可用',
                zh_HANT: '適配器定義不可用',
                ja: 'アダプター定義を表示できません',
                ko: '어댑터 정의를 사용할 수 없습니다.',
                fr: 'Définitions d’adaptateur indisponibles',
              })}
              description={definitionsPanel.error}
            />
          ) : null}

          {notice ? (
            <div
              role="status"
              className={`rounded-2xl border px-4 py-3 text-sm font-medium ${noticeClasses}`}
            >
              {notice.message}
            </div>
          ) : null}

          <GlassSurface className="p-6">
            <FormSection
              title={text({
                en: 'Base information',
                zh_HANS: '基础信息',
                zh_HANT: '基礎資訊',
                ja: '基本情報',
                ko: '기본 정보',
                fr: 'Informations de base',
              })}
              description={text({
                en: 'Choose the adapter type in the main form. The current catalog offers one addable adapter type.',
                zh_HANS: '在主表单中选择适配器类型。当前目录提供一种可新增的适配器类型。',
                zh_HANT: '在主表單中選擇適配器類型。目前目錄提供一種可新增的適配器類型。',
                ja: 'メインフォームでアダプター種別を選びます。現在のカタログで追加できる種別は 1 つです。',
                ko: '기본 양식에서 어댑터 유형을 선택합니다. 현재 카탈로그에는 추가 가능한 어댑터 유형이 하나 있습니다.',
                fr: 'Choisissez le type d’adaptateur dans le formulaire principal. Le catalogue actuel propose un seul type ajoutable.',
              })}
            >
              <div id="base-information" className="grid gap-4 md:grid-cols-2">
                <SelectField
                  label={text({
                    en: 'Adapter type',
                    zh_HANS: '适配器类型',
                    zh_HANT: '適配器類型',
                    ja: 'アダプター種別',
                    ko: '어댑터 유형',
                    fr: 'Type d’adaptateur',
                  })}
                  value={definitionKey}
                  onChange={handleDefinitionChange}
                  options={definitionsPanel.data.map((definition) => ({
                    value: definition.key,
                    label: pickDefinitionText(locale, definition.name, definition.code),
                  }))}
                />
                <label className="flex items-center gap-3 self-end rounded-2xl border border-slate-200 bg-white/75 px-4 py-3 text-sm font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={inherit}
                    onChange={(event) => setInherit(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>
                    {text({
                      en: 'Allow child scopes to inherit this adapter',
                      zh_HANS: '允许下级范围继承此适配器',
                      zh_HANT: '允許下級範圍繼承此適配器',
                      ja: '下位スコープでこのアダプターを継承する',
                      ko: '하위 범위가 이 어댑터를 상속하도록 허용',
                      fr: 'Autoriser les périmètres enfants à hériter de cet adaptateur',
                    })}
                  </span>
                </label>
              </div>
            </FormSection>
          </GlassSurface>

          <GlassSurface className="p-6">
            <FormSection
              title={text({
                en: 'Provider connection',
                zh_HANS: '提供商连接',
                zh_HANT: '供應商連線',
                ja: 'プロバイダー接続',
                ko: '제공자 연결',
                fr: 'Connexion fournisseur',
              })}
              description={text({
                en: 'Configure the provider, endpoint path, model, and token secret for this adapter.',
                zh_HANS: '配置此适配器的提供商、Endpoint 路径、模型与 Token 密钥。',
                zh_HANT: '設定此適配器的供應商、Endpoint 路徑、模型與 Token 密鑰。',
                ja: 'このアダプターのプロバイダー、エンドポイントパス、モデル、トークンシークレットを設定します。',
                ko: '이 어댑터의 제공자, 엔드포인트 경로, 모델, 토큰 시크릿을 설정합니다.',
                fr: 'Configurez le fournisseur, le chemin endpoint, le modèle et le jeton secret de cet adaptateur.',
              })}
              actions={
                <AsyncSubmitButton
                  onClick={() => void handleSubmit()}
                  isPending={submitting}
                  disabled={definitionsPanel.loading || !selectedDefinition}
                  pendingText={text({
                    en: 'Creating adapter...',
                    zh_HANS: '正在创建适配器...',
                    zh_HANT: '正在建立適配器...',
                    ja: 'アダプターを作成しています...',
                    ko: '어댑터 생성 중...',
                    fr: 'Création de l’adaptateur...',
                  })}
                >
                  <Plus className="h-4 w-4" />
                  {text({
                    en: 'Create adapter',
                    zh_HANS: '创建适配器',
                    zh_HANT: '建立適配器',
                    ja: 'アダプターを作成',
                    ko: '어댑터 생성',
                    fr: 'Créer l’adaptateur',
                  })}
                </AsyncSubmitButton>
              }
            >
              <div id="provider-connection" className="grid gap-4 md:grid-cols-2">
                <SelectField
                  label={text({
                    en: 'Provider',
                    zh_HANS: '提供商',
                    zh_HANT: '供應商',
                    ja: 'プロバイダー',
                    ko: '제공자',
                    fr: 'Fournisseur',
                  })}
                  value={provider}
                  onChange={handleProviderChange}
                  options={providerOptions}
                />
                <TextField
                  label={text({
                    en: 'Endpoint path',
                    zh_HANS: 'Endpoint 路径',
                    zh_HANT: 'Endpoint 路徑',
                    ja: 'エンドポイントパス',
                    ko: '엔드포인트 경로',
                    fr: 'Chemin endpoint',
                  })}
                  value={endpointPath}
                  onChange={setEndpointPath}
                  placeholder={providerDefinition?.endpointPathDefault}
                  required
                />
                <TextField
                  label={text({
                    en: 'Model',
                    zh_HANS: '模型',
                    zh_HANT: '模型',
                    ja: 'モデル',
                    ko: '모델',
                    fr: 'Modèle',
                  })}
                  value={model}
                  onChange={setModel}
                  placeholder={providerDefinition?.modelPlaceholder}
                  required
                />
                <TextField
                  label={text({
                    en: 'Token secret',
                    zh_HANS: 'Token 密钥',
                    zh_HANT: 'Token 密鑰',
                    ja: 'トークンシークレット',
                    ko: '토큰 시크릿',
                    fr: 'Jeton secret',
                  })}
                  value={token}
                  onChange={setToken}
                  type="password"
                  required
                />
              </div>
            </FormSection>
          </GlassSurface>
        </div>
      </div>
    </div>
  );
}
