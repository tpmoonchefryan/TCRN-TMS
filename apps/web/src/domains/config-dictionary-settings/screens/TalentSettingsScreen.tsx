'use client';

import {
  buildSharedHomepagePath,
  buildSharedMarshmallowPath,
  FIXED_CUSTOM_DOMAIN_HOMEPAGE_PATH,
  FIXED_CUSTOM_DOMAIN_MARSHMALLOW_PATH,
  SUPPORTED_UI_LOCALES,
  type SupportedUiLocale,
} from '@tcrn/shared';
import { UserRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { startTransition, useEffect, useRef, useState } from 'react';

import {
  readTalentCustomDomainConfig,
  setTalentCustomDomain,
  type TalentCustomDomainConfigResponse,
  updateTalentCustomDomainSslMode,
  verifyTalentCustomDomain,
} from '@/domains/config-dictionary-settings/api/public-domain-settings.api';
import {
  buildTalentSettingsDraft,
  buildTalentSettingsUpdatePayload,
  disableTalent,
  isTalentSettingsDraftDirty,
  publishTalent,
  readTalentDetail,
  readTalentPublishReadiness,
  readTalentSettings,
  reEnableTalent,
  type ScopeSettingsResponse,
  type TalentDetailResponse,
  type TalentPublishReadinessResponse,
  type TalentSettingsDraft,
  updateTalentSettings,
} from '@/domains/config-dictionary-settings/api/settings.api';
import {
  type DictionaryTypeSummary,
  listDictionaryTypes,
} from '@/domains/config-dictionary-settings/api/system-dictionary.api';
import { DictionaryExplorerPanel } from '@/domains/config-dictionary-settings/components/DictionaryExplorerPanel';
import { ScopedConfigEntityWorkspace } from '@/domains/config-dictionary-settings/components/ScopedConfigEntityWorkspace';
import {
  type SettingsFamilyLocalizedText,
  useSettingsFamilyCopy,
} from '@/domains/config-dictionary-settings/screens/settings-family.copy';
import {
  type HomepageResponse,
  readHomepage,
} from '@/domains/homepage-management/api/homepage.api';
import {
  type MarshmallowConfigResponse,
  readMarshmallowConfig,
  updateMarshmallowConfig,
} from '@/domains/marshmallow-management/api/marshmallow.api';
import { ApiRequestError } from '@/platform/http/api';
import {
  buildTalentWorkspacePath,
  buildTalentWorkspaceSectionPath,
  type TalentSettingsFocus,
  type TalentSettingsSection,
} from '@/platform/routing/workspace-paths';
import type { RuntimeLocale } from '@/platform/runtime/locale/locale-provider';
import { pickLocaleText } from '@/platform/runtime/locale/locale-text';
import { useFadeSwapState } from '@/platform/runtime/motion/use-fade-swap-state';
import { useSession } from '@/platform/runtime/session/session-provider';
import { resolveLocalizedLabel } from '@/platform/runtime/translations/managed-translations';
import { ConfirmActionDialog, FormSection, GlassSurface, SettingsLayout, StateView } from '@/platform/ui';

interface AsyncPanelState<T> {
  data: T | null;
  error: string | null;
}

interface NoticeState {
  tone: 'success' | 'error';
  message: string;
}

interface LifecycleDialogState {
  kind: 'publish' | 'disable' | 're-enable';
  title: string;
  description: string;
  confirmText: string;
  pendingText: string;
  successMessage: string;
  errorFallback: string;
  intent: 'primary' | 'danger';
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

const TALENT_SETTINGS_SECTIONS: readonly TalentSettingsSection[] = ['details', 'config-entities', 'settings', 'dictionary'];
const TALENT_SETTINGS_FOCUS_VALUES: readonly TalentSettingsFocus[] = ['homepage-routing', 'marshmallow-routing'];

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiRequestError ? reason.message : fallback;
}

function normalizeCustomDomainDraft(value: string) {
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

function buildVerificationTxtRecord(token: string | null) {
  return token ? `tcrn-verify=${token}` : null;
}

function buildFixedCustomDomainRoute(
  customDomain: string | null | undefined,
  route: 'homepage' | 'marshmallow',
  fallback: string,
) {
  const pathSegment =
    route === 'homepage'
      ? FIXED_CUSTOM_DOMAIN_HOMEPAGE_PATH
      : FIXED_CUSTOM_DOMAIN_MARSHMALLOW_PATH;

  return customDomain ? `https://${customDomain}/${pathSegment}` : fallback;
}

function formatBoolean(value: boolean | null | undefined, truthy: string, falsy: string) {
  return value ? truthy : falsy;
}

function resolveProfileStoreName(
  detail: TalentDetailResponse,
  locale: RuntimeLocale | SupportedUiLocale,
) {
  if (!detail.profileStore) {
    return '';
  }

  return resolveLocalizedLabel(
    detail.profileStore.translations,
    locale,
    detail.profileStore.nameEn || detail.profileStore.nameZh || detail.profileStore.nameJa || detail.profileStore.code,
  );
}

function parseTalentSettingsSection(section: string | null): TalentSettingsSection {
  if (section && TALENT_SETTINGS_SECTIONS.includes(section as TalentSettingsSection)) {
    return section as TalentSettingsSection;
  }

  return 'details';
}

function parseTalentSettingsFocus(focus: string | null): TalentSettingsFocus | null {
  if (focus && TALENT_SETTINGS_FOCUS_VALUES.includes(focus as TalentSettingsFocus)) {
    return focus as TalentSettingsFocus;
  }

  return null;
}

function FieldRow({
  label,
  value,
  hint,
  valueClassName,
}: Readonly<{
  label: string;
  value: string;
  hint?: string;
  valueClassName?: string;
}>) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={`mt-2 min-w-0 whitespace-normal break-all font-semibold text-slate-950 ${valueClassName ?? 'text-base'}`}>{value}</p>
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

function ReadinessList({
  title,
  tone,
  items,
}: Readonly<{
  title: string;
  tone: 'danger' | 'warning';
  items: { code: string; label?: string; message: string }[];
}>) {
  const toneClasses =
    tone === 'danger'
      ? 'border-red-200 bg-red-50/80 text-red-900'
      : 'border-amber-200 bg-amber-50/80 text-amber-900';

  return (
    <div className={`rounded-2xl border px-4 py-4 ${toneClasses}`}>
      <p className="text-sm font-semibold">{title}</p>
      <ul className="mt-3 space-y-3">
        {items.map((item) => (
          <li key={item.code} className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em]">{item.label || item.code}</p>
            <p className="text-sm leading-6">{item.message}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TalentSettingsScreen({
  tenantId,
  talentId,
}: Readonly<{
  tenantId: string;
  talentId: string;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const urlSection = parseTalentSettingsSection(searchParams.get('section'));
  const urlFocus = parseTalentSettingsFocus(searchParams.get('focus'));
  const [activeSectionId, setActiveSectionId] = useState<TalentSettingsSection>(urlSection);
  const {
    displayedValue: displayedSectionId,
    transitionClassName: sectionTransitionClassName,
  } = useFadeSwapState(activeSectionId);
  const [activeFocus, setActiveFocus] = useState<TalentSettingsFocus | null>(urlFocus);
  const { request, requestEnvelope, session } = useSession();
  const {
    common,
    currentLocale,
    selectedLocale,
    dictionaryExplorerCopy,
    formatDateTime,
    localizedConfigEntityCatalog,
    scopedConfigCopy,
  } = useSettingsFamilyCopy();
  const text = (valueOrEn: SettingsFamilyLocalizedText | string, zh?: string, ja?: string) =>
    pickLocaleText(
      selectedLocale,
      typeof valueOrEn === 'string'
        ? {
            en: valueOrEn,
            zh_HANS: zh ?? valueOrEn,
            zh_HANT: zh ?? valueOrEn,
            ja: ja ?? valueOrEn,
            ko: valueOrEn,
            fr: valueOrEn,
          }
        : valueOrEn,
    );
  const localizeReadinessIssue = (issue: { code: string; message: string }) => {
    switch (issue.code) {
      case 'PROFILE_STORE_REQUIRED':
        return {
          ...issue,
          label: text({
            en: 'Customer archive required',
            zh_HANS: '需要客户档案库',
            zh_HANT: '需要客戶檔案庫',
            ja: '顧客アーカイブが必要',
            ko: '고객 아카이브가 필요합니다',
            fr: 'Archive client requise',
          }),
          message: text({
            en: 'Bind an active customer archive before publishing this talent.',
            zh_HANS: '请先为该艺人绑定可用的客户档案库，再发布艺人。',
            zh_HANT: '請先為此藝人綁定可用的客戶檔案庫，再發布藝人。',
            ja: 'このタレントを公開する前に、有効な顧客アーカイブを紐付けてください。',
            ko: '이 아티스트를 게시하기 전에 활성 고객 아카이브를 연결하세요.',
            fr: 'Associez une archive client active avant de publier ce talent.',
          }),
        };
      case 'HOMEPAGE_NOT_PUBLISHED':
        return {
          ...issue,
          label: text({
            en: 'Homepage not published',
            zh_HANS: '主页未发布',
            zh_HANT: '主頁未發布',
            ja: 'ホームページが未公開',
            ko: '홈페이지가 아직 게시되지 않았습니다',
            fr: 'Homepage non publiee',
          }),
          message: text({
            en: 'The homepage is still private. Publish it if this talent should be visible on the public side.',
            zh_HANS: '主页仍处于未发布状态。如果该艺人需要对外可见，请先发布主页。',
            zh_HANT: '主頁仍未發布。若此藝人需要對外可見，請先發布主頁。',
            ja: 'ホームページはまだ非公開です。このタレントを公開側で見せる場合は先に公開してください。',
            ko: '홈페이지가 아직 비공개 상태입니다. 이 아티스트를 공개하려면 먼저 홈페이지를 게시하세요.',
            fr: 'La homepage est encore privee. Publiez-la si ce talent doit etre visible publiquement.',
          }),
        };
      case 'MARSHMALLOW_NOT_ENABLED':
        return {
          ...issue,
          label: text({
            en: 'Marshmallow not enabled',
            zh_HANS: '棉花糖未启用',
            zh_HANT: '棉花糖未啟用',
            ja: 'マシュマロが未有効',
            ko: '마시멜로가 아직 활성화되지 않았습니다',
            fr: 'Marshmallow non active',
          }),
          message: text({
            en: 'Public marshmallow is still closed for this talent.',
            zh_HANS: '该艺人的公开棉花糖入口仍处于关闭状态。',
            zh_HANT: '此藝人的公開棉花糖入口仍為關閉狀態。',
            ja: 'このタレントの公開マシュマロ入口はまだ閉じています。',
            ko: '이 아티스트의 공개 마시멜로 입구는 아직 닫혀 있습니다.',
            fr: 'La page Marshmallow publique est encore fermee pour ce talent.',
          }),
        };
      case 'AVATAR_MISSING':
        return {
          ...issue,
          label: text({
            en: 'Avatar missing',
            zh_HANS: '缺少头像',
            zh_HANT: '缺少頭像',
            ja: 'アバター未設定',
            ko: '아바타가 없습니다',
            fr: 'Avatar manquant',
          }),
          message: text({
            en: 'Add an avatar so this talent is easier to recognize across the console and public pages.',
            zh_HANS: '请补充头像，方便在后台与公开页面识别该艺人。',
            zh_HANT: '請補上頭像，方便在後台與公開頁面辨識此藝人。',
            ja: '管理画面と公開ページの両方で識別しやすいよう、アバターを追加してください。',
            ko: '콘솔과 공개 페이지에서 이 아티스트를 쉽게 식별할 수 있도록 아바타를 추가하세요.',
            fr: 'Ajoutez un avatar pour identifier plus facilement ce talent dans la console et sur les pages publiques.',
          }),
        };
      case 'DESCRIPTION_MISSING':
        return {
          ...issue,
          label: text({
            en: 'Description missing',
            zh_HANS: '缺少说明',
            zh_HANT: '缺少說明',
            ja: '説明未設定',
            ko: '설명이 없습니다',
            fr: 'Description manquante',
          }),
          message: text({
            en: 'Add at least one language description before release.',
            zh_HANS: '发布前请至少补充一种语言的说明。',
            zh_HANT: '發布前請至少補上一種語言的說明。',
            ja: '公開前に、少なくとも 1 言語の説明を追加してください。',
            ko: '배포 전에 최소 한 개 언어의 설명을 추가하세요.',
            fr: 'Ajoutez au moins une description localisee avant la mise en ligne.',
          }),
        };
      default:
        return issue;
    }
  };
  const [detail, setDetail] = useState<TalentDetailResponse | null>(null);
  const [settings, setSettings] = useState<ScopeSettingsResponse | null>(null);
  const [homepagePanel, setHomepagePanel] = useState<AsyncPanelState<HomepageResponse>>({
    data: null,
    error: null,
  });
  const [customDomainPanel, setCustomDomainPanel] = useState<AsyncPanelState<TalentCustomDomainConfigResponse>>({
    data: null,
    error: null,
  });
  const [marshmallowPanel, setMarshmallowPanel] = useState<AsyncPanelState<MarshmallowConfigResponse>>({
    data: null,
    error: null,
  });
  const [readinessPanel, setReadinessPanel] = useState<AsyncPanelState<TalentPublishReadinessResponse>>({
    data: null,
    error: null,
  });
  const [dictionaryPanel, setDictionaryPanel] = useState<AsyncPanelState<DictionaryTypeSummary[]>>({
    data: null,
    error: null,
  });
  const [initialDraft, setInitialDraft] = useState<TalentSettingsDraft>(() => buildTalentSettingsDraft({}));
  const [draft, setDraft] = useState<TalentSettingsDraft>(() => buildTalentSettingsDraft({}));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [customDomainDraft, setCustomDomainDraft] = useState('');
  const [customDomainPending, setCustomDomainPending] = useState(false);
  const [customDomainError, setCustomDomainError] = useState<string | null>(null);
  const [customDomainSuccess, setCustomDomainSuccess] = useState<string | null>(null);
  const [customDomainVerifyPending, setCustomDomainVerifyPending] = useState(false);
  const [customDomainVerifyNotice, setCustomDomainVerifyNotice] = useState<NoticeState | null>(null);
  const [customDomainSslModeDraft, setCustomDomainSslModeDraft] =
    useState<TalentCustomDomainConfigResponse['customDomainSslMode']>('auto');
  const [customDomainSslPending, setCustomDomainSslPending] = useState(false);
  const [customDomainSslError, setCustomDomainSslError] = useState<string | null>(null);
  const [customDomainSslSuccess, setCustomDomainSslSuccess] = useState<string | null>(null);
  const [marshmallowEnabledDraft, setMarshmallowEnabledDraft] = useState<boolean | null>(null);
  const [marshmallowSavePending, setMarshmallowSavePending] = useState(false);
  const [marshmallowSaveError, setMarshmallowSaveError] = useState<string | null>(null);
  const [marshmallowSaveSuccess, setMarshmallowSaveSuccess] = useState<string | null>(null);
  const [lifecycleNotice, setLifecycleNotice] = useState<NoticeState | null>(null);
  const [lifecycleDialogState, setLifecycleDialogState] = useState<LifecycleDialogState | null>(null);
  const [lifecyclePending, setLifecyclePending] = useState(false);
  const homepageRoutingRef = useRef<HTMLDivElement | null>(null);
  const marshmallowRoutingRef = useRef<HTMLDivElement | null>(null);
  const customDomainSslModeOptions = [
    {
      value: 'auto',
      label: text('Auto-managed', '自动托管', '自動管理'),
      hint: text(
        'Use the platform-managed default certificate flow.',
        '使用平台托管的默认证书流程。',
        'プラットフォーム管理の標準証明書フローを使用します。',
      ),
    },
    {
      value: 'self_hosted',
      label: text('Self-hosted', '自托管', 'セルフホスト'),
      hint: text(
        'Use your own certificate and edge termination.',
        '使用你自己的证书与边缘终止方式。',
        '独自の証明書とエッジ終端を使用します。',
      ),
    },
    {
      value: 'cloudflare',
      label: text('Cloudflare', 'Cloudflare', 'Cloudflare'),
      hint: text(
        'Put Cloudflare-managed TLS in front of the custom domain.',
        '由 Cloudflare 在自定义域名前方托管 TLS。',
        'Cloudflare 管理の TLS をカスタムドメイン前段に置きます。',
      ),
    },
  ] as const;

  useEffect(() => {
    setActiveSectionId((current) => (current === urlSection ? current : urlSection));
    setActiveFocus((current) => (current === urlFocus ? current : urlFocus));
  }, [urlFocus, urlSection]);

  useEffect(() => {
    if (activeSectionId !== 'settings' || !activeFocus) {
      return;
    }

    const target = activeFocus === 'homepage-routing' ? homepageRoutingRef.current : marshmallowRoutingRef.current;

    if (!target) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      target.scrollIntoView({
        block: 'start',
      });
      target.focus();
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [activeFocus, activeSectionId]);

  function applySettingsRouteState(nextSectionId: TalentSettingsSection, nextFocus: TalentSettingsFocus | null = null) {
    setActiveSectionId(nextSectionId);
    setActiveFocus(nextSectionId === 'settings' ? nextFocus : null);

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('section', nextSectionId);

    if (nextSectionId === 'settings' && nextFocus) {
      nextParams.set('focus', nextFocus);
    } else {
      nextParams.delete('focus');
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
        const [
          detailResult,
          settingsResult,
          homepageResult,
          customDomainResult,
          marshmallowResult,
          readinessResult,
          dictionaryResult,
        ] =
          await Promise.allSettled([
            readTalentDetail(request, talentId),
            readTalentSettings(request, talentId),
            readHomepage(request, talentId),
            readTalentCustomDomainConfig(request, talentId),
            readMarshmallowConfig(request, talentId),
            readTalentPublishReadiness(request, talentId),
            listDictionaryTypes(request),
          ]);

        if (cancelled) {
          return;
        }

        if (detailResult.status !== 'fulfilled') {
          setLoadError(getErrorMessage(detailResult.reason, text('Failed to load talent details.', '加载艺人详情失败。', 'タレント詳細の読み込みに失敗しました。')));
          return;
        }

        if (settingsResult.status !== 'fulfilled') {
          setLoadError(getErrorMessage(settingsResult.reason, text('Failed to load talent settings.', '加载艺人设置失败。', 'タレント設定の読み込みに失敗しました。')));
          return;
        }

        const nextDraft = buildTalentSettingsDraft(settingsResult.value.settings);
        setDetail(detailResult.value);
        setSettings(settingsResult.value);
        setInitialDraft(nextDraft);
        setDraft(nextDraft);
        if (readinessResult.status === 'fulfilled') {
          setReadinessPanel({
            data: readinessResult.value,
            error: null,
          });
        } else {
          setReadinessPanel({
            data: null,
            error: getErrorMessage(
              readinessResult.reason,
              text('Publish readiness is currently unavailable.', '当前无法获取发布就绪状态。', '現在、公開準備の判定を取得できません。'),
            ),
          });
        }
        if (dictionaryResult.status === 'fulfilled') {
          setDictionaryPanel({
            data: dictionaryResult.value,
            error: null,
          });
        } else {
          setDictionaryPanel({
            data: null,
            error: getErrorMessage(
              dictionaryResult.reason,
              text(
                'System-dictionary summary is unavailable for this scope.',
                '当前范围的系统词典摘要不可用。',
                'このスコープのシステム辞書サマリーを取得できません。',
              ),
            ),
          });
        }
        if (homepageResult.status === 'fulfilled') {
          setHomepagePanel({
            data: homepageResult.value,
            error: null,
          });
        } else {
          setHomepagePanel({
            data: null,
            error: getErrorMessage(
              homepageResult.reason,
              text('Homepage routing is currently unavailable.', '当前无法获取主页路由。', '現在、ホームページルーティングを取得できません。'),
            ),
          });
        }
        if (customDomainResult.status === 'fulfilled') {
          setCustomDomainPanel({
            data: customDomainResult.value,
            error: null,
          });
          setCustomDomainDraft(customDomainResult.value.customDomain ?? '');
          setCustomDomainSslModeDraft(customDomainResult.value.customDomainSslMode);
        } else {
          setCustomDomainPanel({
            data: null,
            error: getErrorMessage(
              customDomainResult.reason,
              text('Custom-domain routing is currently unavailable.', '当前无法获取自定义域名配置。', '現在、カスタムドメイン設定を取得できません。'),
            ),
          });
          setCustomDomainDraft('');
          setCustomDomainSslModeDraft('auto');
        }
        setMarshmallowPanel({
          data: marshmallowResult.status === 'fulfilled' ? marshmallowResult.value : null,
          error:
            marshmallowResult.status === 'rejected'
              ? getErrorMessage(
                  marshmallowResult.reason,
                  text('Marshmallow routing is currently unavailable.', '当前无法获取棉花糖路由。', '現在、マシュマロルーティングを取得できません。'),
                )
              : null,
        });
        setMarshmallowEnabledDraft(marshmallowResult.status === 'fulfilled' ? marshmallowResult.value.isEnabled : null);
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
  }, [currentLocale, request, talentId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <GlassSurface className="p-8">
          <p className="text-sm font-medium text-slate-500">
            {text('Loading talent settings…', '正在加载艺人设置…', 'タレント設定を読み込み中…')}
          </p>
        </GlassSurface>
      </div>
    );
  }

  if (loadError || !detail || !settings) {
    return (
      <StateView
        status="error"
        title={text('Talent settings unavailable', '艺人设置不可用', 'タレント設定を読み込めません')}
        description={loadError || undefined}
      />
    );
  }

  const hasDirtyDraft = isTalentSettingsDraftDirty(initialDraft, draft);
  const hasDirtyMarshmallowToggle =
    marshmallowPanel.data !== null &&
    marshmallowEnabledDraft !== null &&
    marshmallowPanel.data.isEnabled !== marshmallowEnabledDraft;
  const normalizedCustomDomainDraft = normalizeCustomDomainDraft(customDomainDraft);
  const hasDirtyCustomDomain = (customDomainPanel.data?.customDomain ?? null) !== normalizedCustomDomainDraft;
  const sharedHomepagePath = session?.tenantCode ? buildSharedHomepagePath(session.tenantCode, detail.code) : null;
  const sharedMarshmallowPath = session?.tenantCode
    ? buildSharedMarshmallowPath(session.tenantCode, detail.code)
    : null;
  const sharedHomepageUrl = homepagePanel.data?.homepageUrl || sharedHomepagePath || common.notConfigured;
  const fixedCustomDomainHomepageRoute = buildFixedCustomDomainRoute(
    customDomainPanel.data?.customDomain,
    'homepage',
    common.notConfigured,
  );
  const fixedCustomDomainMarshmallowRoute = buildFixedCustomDomainRoute(
    customDomainPanel.data?.customDomain,
    'marshmallow',
    common.notConfigured,
  );
  const hasDirtyCustomDomainSslMode =
    customDomainPanel.data !== null &&
    customDomainPanel.data.customDomainSslMode !== customDomainSslModeDraft;
  const homepageVerificationTxtRecord = buildVerificationTxtRecord(
    customDomainPanel.data?.customDomainVerificationToken ?? null,
  );
  const overrideSet = new Set(settings.overrides);
  const dictionaryCount = dictionaryPanel.data?.length ?? 0;
  const readiness = readinessPanel.data;
  const localizedReadiness = readiness
    ? {
        ...readiness,
        blockers: readiness.blockers.map(localizeReadinessIssue),
        warnings: readiness.warnings.map(localizeReadinessIssue),
      }
    : null;
  const currentSettings = settings;
  const lifecycleStatusLabel = (status: TalentDetailResponse['lifecycleStatus']) =>
    status === 'draft'
      ? text('Draft', '草稿', '下書き')
      : status === 'published'
        ? text('Published', '已发布', '公開済み')
        : text('Disabled', '停用', '無効');
  const readinessActionLabel = (action: TalentPublishReadinessResponse['recommendedAction'] | null | undefined) => {
    if (action === 'publish') {
      return text('Publish', '发布', '公開');
    }

    if (action === 'disable') {
      return text('Disable', '停用', '無効化');
    }

    if (action === 're-enable') {
      return text('Re-enable', '重新启用', '再有効化');
    }

    return text('No action available', '当前没有可执行操作', '実行できる操作はありません');
  };
  const formatScopeSource = (value: string | null | undefined, fallback: string) => {
    if (!value) {
      return fallback;
    }

    if (value === 'tenant') {
      return text('Tenant default', '租户默认值', 'テナント既定値');
    }

    if (value === 'subsidiary') {
      return text('Subsidiary default', '分目录默认值', '配下スコープ既定値');
    }

    if (value === 'talent') {
      return text('Talent override', '艺人覆盖', 'タレント上書き');
    }

    return value;
  };
  const inheritedSourceLabel = (value: string | null | undefined, fallback: string, isOverridden: boolean) =>
    `${common.source}: ${formatScopeSource(value, fallback)}${isOverridden ? ` / ${common.overriddenHere}` : ''}`;
  const talentOverrideLabel = text('talent override', '艺人覆盖', 'タレント上書き');

  async function handleSave() {
    if (!hasDirtyDraft || isSaving || !currentSettings) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const nextSettings = await updateTalentSettings(request, talentId, {
        settings: buildTalentSettingsUpdatePayload(draft),
        version: currentSettings.version,
      });
      const nextDraft = buildTalentSettingsDraft(nextSettings.settings);
      setSettings(nextSettings);
      setInitialDraft(nextDraft);
      setDraft(nextDraft);
      setSaveSuccess(text('Talent settings saved.', '艺人设置已保存。', 'タレント設定を保存しました。'));
    } catch (reason) {
      setSaveError(getErrorMessage(reason, text('Failed to save talent settings.', '保存艺人设置失败。', 'タレント設定の保存に失敗しました。')));
    } finally {
      setIsSaving(false);
    }
  }

  async function refreshMarshmallowRoutingSummary() {
    try {
      const nextConfig = await readMarshmallowConfig(request, talentId);
      setMarshmallowPanel({
        data: nextConfig,
        error: null,
      });
      setMarshmallowEnabledDraft((current) =>
        hasDirtyMarshmallowToggle && current !== null ? current : nextConfig.isEnabled,
      );
    } catch (reason) {
      setMarshmallowPanel((current) => ({
        data: current.data,
        error: getErrorMessage(reason, text('Marshmallow routing is currently unavailable.', '当前无法获取棉花糖路由。', '現在、マシュマロルーティングを取得できません。')),
      }));
    }
  }

  async function handleSaveCustomDomain() {
    if (!customDomainPanel.data || customDomainPending || !hasDirtyCustomDomain) {
      return;
    }

    setCustomDomainPending(true);
    setCustomDomainError(null);
    setCustomDomainSuccess(null);
    setCustomDomainVerifyNotice(null);

    try {
      const result = await setTalentCustomDomain(request, talentId, {
        customDomain: normalizedCustomDomainDraft,
      });

      setCustomDomainPanel((current) => ({
        data: current.data
          ? {
              ...current.data,
              customDomain: result.customDomain,
              customDomainVerified: false,
              customDomainVerificationToken: result.token,
            }
          : {
              customDomain: result.customDomain,
              customDomainVerified: false,
              customDomainVerificationToken: result.token,
              customDomainSslMode: 'auto',
              homepageCustomPath: null,
              marshmallowCustomPath: null,
            },
        error: null,
      }));
      setCustomDomainDraft(result.customDomain ?? '');
      setCustomDomainSuccess(
        result.customDomain
          ? text('Custom domain saved.', '自定义域名已保存。', 'カスタムドメインを保存しました。')
          : text('Custom domain cleared.', '自定义域名已清除。', 'カスタムドメインを解除しました。'),
      );
      await refreshMarshmallowRoutingSummary();
    } catch (reason) {
      setCustomDomainError(getErrorMessage(reason, text('Failed to save custom domain.', '保存自定义域名失败。', 'カスタムドメインの保存に失敗しました。')));
    } finally {
      setCustomDomainPending(false);
    }
  }

  async function handleVerifyCustomDomain() {
    if (!customDomainPanel.data?.customDomain || customDomainVerifyPending) {
      return;
    }

    setCustomDomainVerifyPending(true);
    setCustomDomainVerifyNotice(null);

    try {
      const result = await verifyTalentCustomDomain(request, talentId);
      setCustomDomainPanel((current) =>
        current.data
          ? {
              data: {
                ...current.data,
                customDomainVerified: result.verified,
              },
              error: current.error,
            }
          : current,
      );
      setCustomDomainVerifyNotice({
        tone: result.verified ? 'success' : 'error',
        message: result.message,
      });
    } catch (reason) {
      setCustomDomainVerifyNotice({
        tone: 'error',
        message: getErrorMessage(reason, text('Failed to verify custom domain.', '验证自定义域名失败。', 'カスタムドメインの検証に失敗しました。')),
      });
    } finally {
      setCustomDomainVerifyPending(false);
    }
  }

  async function handleSaveCustomDomainSslMode() {
    if (!customDomainPanel.data || customDomainSslPending || !hasDirtyCustomDomainSslMode) {
      return;
    }

    if (
      customDomainSslModeDraft !== 'auto' &&
      customDomainSslModeDraft !== 'self_hosted' &&
      customDomainSslModeDraft !== 'cloudflare'
    ) {
      setCustomDomainSslError(
        text('Unsupported custom-domain SSL mode.', '不支持的自定义域名 SSL 模式。', 'サポートされていないカスタムドメイン SSL モードです。'),
      );
      return;
    }

    setCustomDomainSslPending(true);
    setCustomDomainSslError(null);
    setCustomDomainSslSuccess(null);

    try {
      const result = await updateTalentCustomDomainSslMode(request, talentId, {
        sslMode: customDomainSslModeDraft,
      });

      setCustomDomainPanel((current) =>
        current.data
          ? {
              data: {
                ...current.data,
                customDomainSslMode: result.customDomainSslMode,
              },
              error: current.error,
            }
          : current,
      );
      setCustomDomainSslModeDraft(result.customDomainSslMode);
      setCustomDomainSslSuccess(text('Custom-domain SSL mode saved.', '自定义域名 SSL 模式已保存。', 'カスタムドメイン SSL モードを保存しました。'));
    } catch (reason) {
      setCustomDomainSslError(
        getErrorMessage(reason, text('Failed to save custom-domain SSL mode.', '保存自定义域名 SSL 模式失败。', 'カスタムドメイン SSL モードの保存に失敗しました。')),
      );
    } finally {
      setCustomDomainSslPending(false);
    }
  }

  async function handleSaveMarshmallowRouting() {
    if (!marshmallowPanel.data || marshmallowEnabledDraft === null || !hasDirtyMarshmallowToggle) {
      return;
    }

    setMarshmallowSavePending(true);
    setMarshmallowSaveError(null);
    setMarshmallowSaveSuccess(null);

    try {
      const nextConfig = await updateMarshmallowConfig(request, talentId, {
        isEnabled: marshmallowEnabledDraft,
        title: marshmallowPanel.data.title || undefined,
        welcomeText: marshmallowPanel.data.welcomeText || undefined,
        placeholderText: marshmallowPanel.data.placeholderText || undefined,
        thankYouText: marshmallowPanel.data.thankYouText || undefined,
        allowAnonymous: marshmallowPanel.data.allowAnonymous,
        captchaMode: marshmallowPanel.data.captchaMode,
        moderationEnabled: marshmallowPanel.data.moderationEnabled,
        autoApprove: marshmallowPanel.data.autoApprove,
        profanityFilterEnabled: marshmallowPanel.data.profanityFilterEnabled,
        externalBlocklistEnabled: marshmallowPanel.data.externalBlocklistEnabled,
        maxMessageLength: marshmallowPanel.data.maxMessageLength,
        minMessageLength: marshmallowPanel.data.minMessageLength,
        rateLimitPerIp: marshmallowPanel.data.rateLimitPerIp,
        rateLimitWindowHours: marshmallowPanel.data.rateLimitWindowHours,
        reactionsEnabled: marshmallowPanel.data.reactionsEnabled,
        allowedReactions: marshmallowPanel.data.allowedReactions,
        version: marshmallowPanel.data.version,
      });

      setMarshmallowPanel({
        data: nextConfig,
        error: null,
      });
      setMarshmallowEnabledDraft(nextConfig.isEnabled);
      setMarshmallowSaveSuccess(text('Public marshmallow routing saved.', '公开棉花糖路由已保存。', '公開マシュマロルートを保存しました。'));
      setDetail((current) =>
        current
          ? {
              ...current,
              externalPagesDomain: {
                ...current.externalPagesDomain,
                marshmallow: {
                  isEnabled: nextConfig.isEnabled,
                },
              },
            }
          : current,
      );
    } catch (reason) {
      setMarshmallowSaveError(
        getErrorMessage(reason, text('Failed to save public marshmallow routing.', '保存公开棉花糖路由失败。', '公開マシュマロルートの保存に失敗しました。')),
      );
    } finally {
      setMarshmallowSavePending(false);
    }
  }

  function handleReset() {
    setDraft(initialDraft);
    setSaveError(null);
    setSaveSuccess(null);
  }

  async function refreshReadiness() {
    try {
      const nextReadiness = await readTalentPublishReadiness(request, talentId);
      setReadinessPanel({
        data: nextReadiness,
        error: null,
      });
    } catch (reason) {
      setReadinessPanel((current) => ({
        data: current.data,
        error: getErrorMessage(
          reason,
          text('Publish readiness is currently unavailable.', '当前无法获取发布就绪状态。', '現在、公開準備の判定を取得できません。'),
        ),
      }));
    }
  }

  async function handleLifecycleConfirm() {
    if (!detail || !lifecycleDialogState) {
      return;
    }

    const currentDialog = lifecycleDialogState;
    setLifecyclePending(true);
    setLifecycleNotice(null);

    try {
      const input = { version: detail.version };
      const response =
        currentDialog.kind === 'publish'
          ? await publishTalent(request, talentId, input)
          : currentDialog.kind === 'disable'
            ? await disableTalent(request, talentId, input)
            : await reEnableTalent(request, talentId, input);

      setDetail((current) =>
        current
          ? {
              ...current,
              ...response,
            }
          : current,
      );
      await refreshReadiness();
      setLifecycleNotice({
        tone: 'success',
        message: currentDialog.successMessage,
      });
    } catch (reason) {
      setLifecycleNotice({
        tone: 'error',
        message: getErrorMessage(reason, currentDialog.errorFallback),
      });
    } finally {
      setLifecyclePending(false);
      setLifecycleDialogState(null);
    }
  }

  const lifecycleAction =
    detail.lifecycleStatus === 'draft'
      ? {
          kind: 'publish' as const,
          label: text({
            en: 'Publish talent',
            zh_HANS: '发布艺人',
            zh_HANT: '發布藝人',
            ja: 'タレントを公開',
            ko: '아티스트 게시',
            fr: 'Publier le talent',
          }),
          title: text({
            en: 'Publish talent?',
            zh_HANS: '发布艺人？',
            zh_HANT: '發布藝人？',
            ja: 'タレントを公開しますか？',
            ko: '아티스트를 게시할까요?',
            fr: 'Publier ce talent ?',
          }),
          description: text({
            en: 'Publishing makes customer, homepage, marshmallow, and report pages available for this talent.',
            zh_HANS: '发布后，该艺人的客户、主页、棉花糖和报表页面将可用。',
            zh_HANT: '發布後，此藝人的客戶、主頁、棉花糖與報表頁面將可用。',
            ja: '公開後、このタレントの顧客、ホームページ、マシュマロ、レポート画面が利用可能になります。',
            ko: '게시하면 이 아티스트의 고객, 홈페이지, 마시멜로, 보고서 화면을 사용할 수 있습니다.',
            fr: 'La publication rend disponibles les pages client, homepage, marshmallow et rapport pour ce talent.',
          }),
          confirmText: text({
            en: 'Publish talent',
            zh_HANS: '确认发布',
            zh_HANT: '確認發布',
            ja: '公開する',
            ko: '게시하기',
            fr: 'Publier',
          }),
          pendingText: text({
            en: 'Publishing talent…',
            zh_HANS: '发布中…',
            zh_HANT: '發布中…',
            ja: '公開中…',
            ko: '게시 중…',
            fr: 'Publication en cours…',
          }),
          successMessage: text({
            en: 'Talent published.',
            zh_HANS: '艺人已发布。',
            zh_HANT: '藝人已發布。',
            ja: 'タレントを公開しました。',
            ko: '아티스트를 게시했습니다.',
            fr: 'Le talent a ete publie.',
          }),
          errorFallback: text({
            en: 'Failed to publish talent.',
            zh_HANS: '发布艺人失败。',
            zh_HANT: '發布藝人失敗。',
            ja: 'タレントの公開に失敗しました。',
            ko: '아티스트 게시에 실패했습니다.',
            fr: 'Echec de la publication du talent.',
          }),
          intent: 'primary' as const,
          isDisabled: lifecyclePending || !readiness || !readiness.canEnterPublishedState,
          blockedMessage: readinessPanel.error
            ? text({
                en: 'Publish readiness is unavailable, so this transition remains closed.',
                zh_HANS: '当前无法获取发布就绪结果，发布操作已保持关闭。',
                zh_HANT: '目前無法取得發布就緒結果，因此發布操作維持關閉。',
                ja: '公開可否の判定を取得できないため、この操作は停止中です。',
                ko: '게시 준비 상태를 확인할 수 없어 이 전환을 진행할 수 없습니다.',
                fr: 'L etat de preparation a la publication est indisponible, cette transition reste donc fermee.',
              })
            : readiness && !readiness.canEnterPublishedState
              ? text({
                  en: 'Resolve the current blockers before publishing this talent.',
                  zh_HANS: '请先处理当前阻断项，再发布艺人。',
                  zh_HANT: '請先處理目前阻斷項，再發布藝人。',
                  ja: '現在のブロッカーを解消してから公開してください。',
                  ko: '이 아티스트를 게시하기 전에 현재 차단 항목을 해결하세요.',
                  fr: 'Resolvez les blocages actuels avant de publier ce talent.',
                })
              : null,
        }
      : detail.lifecycleStatus === 'published'
        ? {
            kind: 'disable' as const,
            label: text({
              en: 'Disable talent',
              zh_HANS: '停用艺人',
              zh_HANT: '停用藝人',
              ja: 'タレントを無効化',
              ko: '아티스트 비활성화',
              fr: 'Desactiver le talent',
            }),
            title: text({
              en: 'Disable talent?',
              zh_HANS: '停用艺人？',
              zh_HANT: '停用藝人？',
              ja: 'タレントを無効化しますか？',
              ko: '아티스트를 비활성화할까요?',
              fr: 'Desactiver ce talent ?',
            }),
            description: text({
              en: 'Disabling keeps settings available but removes this talent from active business pages.',
              zh_HANS: '停用后仍可进入设置，但该艺人会从当前业务页面中隐藏。',
              zh_HANT: '停用後仍可進入設定，但此藝人會從目前業務頁面中隱藏。',
              ja: '無効化後も設定は開けますが、このタレントは現在の業務画面から非表示になります。',
              ko: '비활성화해도 설정은 유지되지만, 이 아티스트는 현재 업무 페이지에서 숨겨집니다.',
              fr: 'La desactivation conserve les parametres mais retire ce talent des pages metier actives.',
            }),
            confirmText: text({
              en: 'Disable talent',
              zh_HANS: '确认停用',
              zh_HANT: '確認停用',
              ja: '無効化する',
              ko: '비활성화하기',
              fr: 'Desactiver',
            }),
            pendingText: text({
              en: 'Disabling talent…',
              zh_HANS: '停用中…',
              zh_HANT: '停用中…',
              ja: '無効化中…',
              ko: '비활성화 중…',
              fr: 'Desactivation en cours…',
            }),
            successMessage: text({
              en: 'Talent disabled.',
              zh_HANS: '艺人已停用。',
              zh_HANT: '藝人已停用。',
              ja: 'タレントを無効化しました。',
              ko: '아티스트를 비활성화했습니다.',
              fr: 'Le talent a ete desactive.',
            }),
            errorFallback: text({
              en: 'Failed to disable talent.',
              zh_HANS: '停用艺人失败。',
              zh_HANT: '停用藝人失敗。',
              ja: 'タレントの無効化に失敗しました。',
              ko: '아티스트 비활성화에 실패했습니다.',
              fr: 'Echec de la desactivation du talent.',
            }),
            intent: 'danger' as const,
            isDisabled: lifecyclePending,
            blockedMessage: null,
          }
        : {
            kind: 're-enable' as const,
            label: text({
              en: 'Re-enable talent',
              zh_HANS: '重新启用艺人',
              zh_HANT: '重新啟用藝人',
              ja: 'タレントを再有効化',
              ko: '아티스트 다시 활성화',
              fr: 'Reactiver le talent',
            }),
            title: text({
              en: 'Re-enable talent?',
              zh_HANS: '重新启用艺人？',
              zh_HANT: '重新啟用藝人？',
              ja: 'タレントを再有効化しますか？',
              ko: '아티스트를 다시 활성화할까요?',
              fr: 'Reactiver ce talent ?',
            }),
            description: text({
              en: 'Re-enabling returns this talent to business pages after readiness checks pass.',
              zh_HANS: '重新启用后，该艺人会重新出现在业务页面中，但仍需先通过当前就绪校验。',
              zh_HANT: '重新啟用後，此藝人會重新出現在業務頁面中，但仍需先通過目前就緒檢查。',
              ja: '再有効化すると業務画面に再び表示されますが、先に現在の準備判定を通過する必要があります。',
              ko: '다시 활성화하면 이 아티스트가 업무 페이지에 다시 나타나지만, 먼저 현재 준비 점검을 통과해야 합니다.',
              fr: 'La reactivation remet ce talent sur les pages metier une fois les controles de preparation valides.',
            }),
            confirmText: text({
              en: 'Re-enable talent',
              zh_HANS: '重新启用',
              zh_HANT: '重新啟用',
              ja: '再有効化する',
              ko: '다시 활성화하기',
              fr: 'Reactiver',
            }),
            pendingText: text({
              en: 'Re-enabling talent…',
              zh_HANS: '重新启用中…',
              zh_HANT: '重新啟用中…',
              ja: '再有効化中…',
              ko: '다시 활성화하는 중…',
              fr: 'Reactivation en cours…',
            }),
            successMessage: text({
              en: 'Talent re-enabled.',
              zh_HANS: '艺人已重新启用。',
              zh_HANT: '藝人已重新啟用。',
              ja: 'タレントを再有効化しました。',
              ko: '아티스트를 다시 활성화했습니다.',
              fr: 'Le talent a ete reactive.',
            }),
            errorFallback: text({
              en: 'Failed to re-enable talent.',
              zh_HANS: '重新启用艺人失败。',
              zh_HANT: '重新啟用藝人失敗。',
              ja: 'タレントの再有効化に失敗しました。',
              ko: '아티스트 재활성화에 실패했습니다.',
              fr: 'Echec de la reactivation du talent.',
            }),
            intent: 'primary' as const,
            isDisabled: lifecyclePending || !readiness || !readiness.canEnterPublishedState,
            blockedMessage: readinessPanel.error
              ? text({
                  en: 'Publish readiness is unavailable, so re-enable stays closed.',
                  zh_HANS: '当前无法获取就绪结果，因此不能重新启用。',
                  zh_HANT: '目前無法取得就緒結果，因此不能重新啟用。',
                  ja: '準備判定を取得できないため、再有効化できません。',
                  ko: '준비 상태를 확인할 수 없어 다시 활성화할 수 없습니다.',
                  fr: 'L etat de preparation est indisponible, la reactivation reste donc fermee.',
                })
              : readiness && !readiness.canEnterPublishedState
                ? text({
                    en: 'Resolve the current blockers before re-enabling this talent.',
                    zh_HANS: '请先处理当前阻断项，再重新启用艺人。',
                    zh_HANT: '請先處理目前阻斷項，再重新啟用藝人。',
                    ja: '現在のブロッカーを解消してから再有効化してください。',
                    ko: '이 아티스트를 다시 활성화하기 전에 현재 차단 항목을 해결하세요.',
                    fr: 'Resolvez les blocages actuels avant de reactiver ce talent.',
                  })
                : null,
          };

  return (
    <div className="space-y-6">
      <SettingsLayout
        title={`${detail.displayName} ${text({
          en: 'Talent Settings',
          zh_HANS: '艺人设置',
          zh_HANT: '藝人設定',
          ja: 'タレント設定',
          ko: '아티스트 설정',
          fr: 'Parametres du talent',
        })}`}
        description={text({
          en: 'Manage talent identity, lifecycle, scoped defaults, public routing, and effective dictionary visibility.',
          zh_HANS: '管理艺人身份、生命周期、范围默认值、公域路由与生效词典可见性。',
          zh_HANT: '管理藝人識別資訊、生命週期、範圍預設值、公域路由與生效詞典可見性。',
          ja: 'タレントの識別情報、ライフサイクル、スコープ既定値、公開ルート、有効な辞書可視性を管理します。',
          ko: '아티스트의 식별 정보, 라이프사이클, 범위별 기본값, 공개 라우팅, 유효 사전 가시성을 관리합니다.',
          fr: 'Gerez l identite du talent, son cycle de vie, ses valeurs par defaut de perimetre, le routage public et la visibilite effective du dictionnaire.',
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
          applySettingsRouteState(
            sectionId as TalentSettingsSection,
            sectionId === 'settings' ? activeFocus : null,
          );
        }}
      >
        <div className={sectionTransitionClassName}>
        {displayedSectionId === 'details' ? (
          <div className="space-y-6">
            <GlassSurface className="p-8">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                    <UserRound className="h-3.5 w-3.5" />
                    {text('Talent Settings', '艺人设置', 'タレント設定')}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={buildTalentWorkspacePath(tenantId, talentId)}
                    className="rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
                  >
                    {text('Open business pages', '打开业务页面', '業務ページを開く')}
                  </Link>
                  <Link
                    href={`/tenant/${tenantId}/security?tab=external-blocklist&scopeType=talent&scopeId=${talentId}`}
                    className="rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
                  >
                    {text('Open security', '打开安全页', 'セキュリティを開く')}
                  </Link>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <FieldRow label={text('Tenant', '租户', 'テナント')} value={session?.tenantName || common.currentTenant} />
                  <FieldRow label={text('Talent', '艺人', 'タレント')} value={detail.displayName} />
                  <FieldRow label={text('Lifecycle', '生命周期', 'ライフサイクル')} value={lifecycleStatusLabel(detail.lifecycleStatus)} />
                  <FieldRow
                    label={text('Profile Store', '档案库', 'プロフィールストア')}
                    value={detail.profileStore ? resolveProfileStoreName(detail, selectedLocale) : text('Unbound', '未绑定', '未紐付け')}
                  />
                </div>
              </div>
            </GlassSurface>

            <GlassSurface className="p-6">
              <FormSection
                title={common.details}
                description={text(
                  'Keep talent identity, ownership, and scope facts visible before making changes.',
                  '在修改前先确认艺人身份、归属与范围事实。',
                  '変更前にタレントの識別情報、所属、スコープ情報を確認します。',
                )}
              >
                <div className="grid gap-4 xl:grid-cols-2">
                  <FieldRow label={text('Talent Code', '艺人代码', 'タレントコード')} value={detail.code} />
                  <FieldRow label={text('Legal Name', '法定名称', '正式名称')} value={detail.name} />
                  <FieldRow label={text('Talent Path', '艺人路径', 'タレントパス')} value={detail.path} />
                  <FieldRow
                    label={text('Shared Homepage Route', '共享主页路径', '共有ホームページルート')}
                    value={sharedHomepagePath || common.notConfigured}
                  />
                  <FieldRow label={text('Timezone', '时区', 'タイムゾーン')} value={detail.timezone || common.inheritedUnset} />
                  <FieldRow label={text('Published At', '发布时间', '公開日時')} value={formatDateTime(detail.publishedAt)} />
                  <FieldRow label={text('Created At', '创建时间', '作成日時')} value={formatDateTime(detail.createdAt)} />
                  <FieldRow label={text('Updated At', '更新时间', '更新日時')} value={formatDateTime(detail.updatedAt)} />
                </div>
              </FormSection>
            </GlassSurface>

            <GlassSurface className="p-6">
              <FormSection
                title={text('Lifecycle / Publish Readiness', '生命周期 / 发布就绪', 'ライフサイクル / 公開準備')}
                description={text(
                  'Review the current status, blockers, and the next allowed lifecycle action.',
                  '查看当前状态、阻断项以及下一步允许的生命周期操作。',
                  '現在の状態、ブロッカー、次に実行できるライフサイクル操作を確認します。',
                )}
              >
                <div className="grid gap-4 xl:grid-cols-3">
                  <FieldRow
                    label={text('Current Status', '当前状态', '現在の状態')}
                    value={lifecycleStatusLabel(detail.lifecycleStatus)}
                    hint={text(
                      'This is the current lifecycle state for the talent.',
                      '这里显示该艺人的当前生命周期状态。',
                      'ここにはこのタレントの現在のライフサイクル状態が表示されます。',
                    )}
                  />
                  <FieldRow
                    label={text('Available action', '当前可执行操作', '現在実行できる操作')}
                    value={readinessActionLabel(readiness?.recommendedAction)}
                    hint={text(
                      'Nothing changes until you confirm the selected lifecycle action.',
                      '在你确认所选生命周期操作前，当前状态不会发生变化。',
                      '選択したライフサイクル操作を確認するまで、現在の状態は変わりません。',
                    )}
                  />
                  <FieldRow
                    label={text('Publish Readiness', '发布就绪', '公開準備')}
                    value={
                      localizedReadiness
                        ? formatBoolean(
                            localizedReadiness.canEnterPublishedState,
                            text('Ready', '可发布', '公開可能'),
                            text('Blocked', '被阻止', 'ブロック中'),
                          )
                        : common.unavailable
                    }
                  />
                </div>

                {lifecycleNotice ? <NoticeBanner tone={lifecycleNotice.tone} message={lifecycleNotice.message} /> : null}

                <div className="rounded-2xl border border-slate-200 bg-white/85 px-5 py-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-950">
                        {text('Lifecycle action', '生命周期操作', 'ライフサイクル操作')}
                      </p>
                      <p className="max-w-2xl text-sm leading-6 text-slate-600">{lifecycleAction.description}</p>
                    </div>
                    <button
                      type="button"
                      disabled={lifecycleAction.isDisabled}
                      onClick={() => {
                        setLifecycleDialogState({
                          kind: lifecycleAction.kind,
                          title: lifecycleAction.title,
                          description: lifecycleAction.description,
                          confirmText: lifecycleAction.confirmText,
                          pendingText: lifecycleAction.pendingText,
                          successMessage: lifecycleAction.successMessage,
                          errorFallback: lifecycleAction.errorFallback,
                          intent: lifecycleAction.intent,
                        });
                      }}
                      className={`rounded-xl px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        lifecycleAction.intent === 'danger'
                          ? 'bg-rose-600 hover:bg-rose-500'
                          : 'bg-slate-950 hover:bg-slate-800'
                      }`}
                    >
                      {lifecycleAction.label}
                    </button>
                  </div>

                  {lifecycleAction.blockedMessage ? (
                    <p className="mt-3 text-sm font-medium text-amber-700">{lifecycleAction.blockedMessage}</p>
                  ) : null}
                </div>

                {readinessPanel.error ? (
                  <SectionPlaceholder
                    title={text('Publish readiness unavailable', '发布就绪不可用', '公開準備を確認できません')}
                    description={readinessPanel.error}
                  />
                ) : null}

                {localizedReadiness ? (
                  <div className="grid gap-4 xl:grid-cols-2">
                    {localizedReadiness.blockers.length > 0 ? (
                      <ReadinessList
                        title={text('Blocking items', '阻断项', 'ブロッカー')}
                        tone="danger"
                        items={localizedReadiness.blockers}
                      />
                    ) : (
                      <SectionPlaceholder
                        title={text('No publish blockers', '没有发布阻断项', '公開を止める項目はありません')}
                        description={text(
                          'No hard blockers were returned for the next lifecycle transition.',
                          '下一步生命周期切换目前没有返回硬阻断项。',
                          '次のライフサイクル遷移を止めるハードブロッカーはありません。',
                        )}
                      />
                    )}

                    {localizedReadiness.warnings.length > 0 ? (
                      <ReadinessList
                        title={text('Warnings', '提示项', '注意事項')}
                        tone="warning"
                        items={localizedReadiness.warnings}
                      />
                    ) : (
                      <SectionPlaceholder
                        title={text('No readiness warnings', '没有就绪提示项', '準備に関する注意事項はありません')}
                        description={text(
                          'No soft warnings were returned for this talent.',
                          '当前没有返回需要额外留意的提示项。',
                          'このタレントに関する追加の注意事項はありません。',
                        )}
                      />
                    )}
                  </div>
                ) : null}
              </FormSection>
            </GlassSurface>

            <GlassSurface className="p-6">
              <FormSection
                title={text({
                  en: 'Public Surface',
                  zh_HANS: '公域入口',
                  zh_HANT: '公域入口',
                  ja: '公開面',
                  ko: '공개 표면',
                  fr: 'Surface publique',
                })}
                description={text({
                  en: 'Review homepage and marshmallow exposure from the talent scope.',
                  zh_HANS: '在艺人范围内查看主页与棉花糖的公开状态。',
                  zh_HANT: '在藝人範圍內查看主頁與棉花糖的公開狀態。',
                  ja: 'タレントスコープでホームページとマシュマロの公開状態を確認します。',
                  ko: '아티스트 범위에서 홈페이지와 마시멜로의 공개 상태를 확인합니다.',
                  fr: 'Consultez l exposition publique de la homepage et de Marshmallow depuis le perimetre du talent.',
                })}
              >
                <div className="grid gap-4 xl:grid-cols-2">
                  <FieldRow
                    label={text('Shared Homepage Route', '共享主页路径', '共有ホームページルート')}
                    value={sharedHomepagePath || common.notConfigured}
                    hint={text({
                      en: 'The shared-domain route is generated from tenant code and talent code. Draft talents still stay unavailable on the public side.',
                      zh_HANS: '共享域路径由租户代码和艺人代码自动生成。草稿艺人在公域侧仍保持不可访问。',
                      zh_HANT: '共享域路徑由租戶代碼與藝人代碼自動產生。草稿藝人在公域側仍維持不可訪問。',
                      ja: '共有ドメインルートはテナントコードとタレントコードから自動生成されます。下書きタレントは公開側では引き続き利用できません。',
                      ko: '공유 도메인 경로는 테넌트 코드와 아티스트 코드로 자동 생성됩니다. 초안 상태의 아티스트는 공개 영역에서 계속 접근할 수 없습니다.',
                      fr: 'La route du domaine partage est generee automatiquement a partir du code locataire et du code talent. Les talents en brouillon restent indisponibles cote public.',
                    })}
                  />
                  <FieldRow
                    label={text('Homepage Published', '主页发布状态', 'ホームページ公開状態')}
                    value={formatBoolean(
                      detail.externalPagesDomain.homepage?.isPublished,
                      lifecycleStatusLabel('published'),
                      text('Not published', '未发布', '未公開'),
                    )}
                  />
                  <FieldRow
                    label={text('Marshmallow Page', '棉花糖页面', 'マシュマロページ')}
                    value={formatBoolean(detail.externalPagesDomain.marshmallow?.isEnabled, common.active, common.inactive)}
                  />
                  <FieldRow
                    label={text('Public Availability', '公开可用性', '公開可用性')}
                    value={
                      detail.lifecycleStatus === 'published'
                        ? text('Eligible for public release', '可进入公开发布', '公開対象にできます')
                        : text('Closed until published', '发布前保持关闭', '公開されるまで閉じています')
                    }
                  />
                </div>
              </FormSection>
            </GlassSurface>

            <GlassSurface className="p-6">
              <FormSection
                title={text('Customer Archive Binding', '客户档案绑定', '顧客アーカイブ連携')}
                description={text({
                  en: 'Archive binding controls whether this talent can open customer records and pass release checks.',
                  zh_HANS: '档案库绑定决定该艺人能否进入客户记录，并影响发布校验。',
                  zh_HANT: '檔案庫綁定決定此藝人能否進入客戶記錄，並影響發布檢查。',
                  ja: 'アーカイブの紐付けによって、このタレントが顧客記録を開けるかどうかと公開判定が決まります。',
                  ko: '아카이브 연결 여부는 이 아티스트가 고객 기록을 열 수 있는지와 게시 점검 통과 여부를 결정합니다.',
                  fr: 'La liaison d archive determine si ce talent peut ouvrir les fiches clients et valider les controles de publication.',
                })}
              >
                {detail.profileStore ? (
                  <div className="grid gap-4 xl:grid-cols-2">
                    <FieldRow label={text('Archive Store', '档案库', 'アーカイブストア')} value={resolveProfileStoreName(detail, selectedLocale)} />
                    <FieldRow label={text('Archive Code', '档案库代码', 'アーカイブコード')} value={detail.profileStore.code} />
                    <FieldRow
                      label={text('Binding Type', '绑定方式', '連携方式')}
                      value={formatBoolean(
                        detail.profileStore.isDefault,
                        text('Tenant default', '租户默认值', 'テナント既定値'),
                        text('Talent-specific', '艺人专属', 'タレント専用'),
                      )}
                    />
                  </div>
                ) : (
                  <SectionPlaceholder
                    title={text({
                      en: 'No customer archive connected',
                      zh_HANS: '未连接客户档案库',
                      zh_HANT: '未連接客戶檔案庫',
                      ja: '顧客アーカイブ未接続',
                      ko: '연결된 고객 아카이브가 없습니다',
                      fr: 'Aucune archive client connectee',
                    })}
                    description={text({
                      en: 'This talent does not have an archive store yet, so customer records and release checks remain blocked.',
                      zh_HANS: '该艺人当前还没有档案库，因此客户记录与发布校验都会被阻断。',
                      zh_HANT: '此藝人目前尚未連接檔案庫，因此客戶記錄與發布檢查都會被阻斷。',
                      ja: 'このタレントにはまだアーカイブストアがないため、顧客記録と公開判定がブロックされます。',
                      ko: '이 아티스트에는 아직 아카이브 저장소가 없어 고객 기록과 게시 점검이 계속 차단됩니다.',
                      fr: 'Ce talent n a pas encore d archive client, donc les fiches clients et les controles de publication restent bloques.',
                    })}
                  />
                )}
              </FormSection>
            </GlassSurface>

            <GlassSurface className="p-6">
              <FormSection
                title={text({
                  en: 'Related Pages',
                  zh_HANS: '关联页面',
                  zh_HANT: '關聯頁面',
                  ja: '関連ページ',
                  ko: '관련 페이지',
                  fr: 'Pages associees',
                })}
                description={text({
                  en: 'Jump to tenant integration or talent security from here.',
                  zh_HANS: '从这里进入租户集成页或艺人安全页。',
                  zh_HANT: '從這裡進入租戶集成頁或藝人安全頁。',
                  ja: 'ここからテナント統合画面またはタレントセキュリティ画面へ移動できます。',
                  ko: '여기에서 테넌트 통합 화면이나 아티스트 보안 화면으로 이동할 수 있습니다.',
                  fr: 'Accedez ici a l integration locataire ou a la securite du talent.',
                })}
              >
                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white/85 px-5 py-5 shadow-sm">
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-slate-950">
                        {text('Tenant integration', '租户集成管理', 'テナント統合管理')}
                      </p>
                      <p className="text-sm leading-6 text-slate-600">
                        {text(
                          'Manage adapters, webhook endpoints, and email settings at the tenant level.',
                          '在租户层管理适配器、Webhook 端点和邮件设置。',
                          'アダプター、Webhook エンドポイント、メール設定をテナント単位で管理します。',
                        )}
                      </p>
                      <Link
                        href={`/tenant/${tenantId}/integration-management`}
                        className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100"
                      >
                        {text('Open integration', '打开集成管理', '統合管理を開く')}
                      </Link>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/85 px-5 py-5 shadow-sm">
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-slate-950">
                        {text('Talent-scoped security view', '艺人范围安全视图', 'タレントスコープのセキュリティ表示')}
                      </p>
                      <p className="text-sm leading-6 text-slate-600">
                        {text(
                          'Open security with this talent preselected to review inherited and local blocking rules.',
                          '以当前艺人为预选范围打开安全页，检查继承与本地阻断规则。',
                          'このタレントを事前選択した状態でセキュリティ画面を開き、継承ルールとローカルルールを確認します。',
                        )}
                      </p>
                      <Link
                        href={`/tenant/${tenantId}/security?tab=external-blocklist&scopeType=talent&scopeId=${talentId}`}
                        className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100"
                      >
                        {text('Open talent security', '打开艺人安全页', 'タレントセキュリティを開く')}
                      </Link>
                    </div>
                  </div>
                </div>
              </FormSection>
            </GlassSurface>
          </div>
        ) : null}

        {displayedSectionId === 'config-entities' ? (
          <GlassSurface className="p-6">
            <FormSection
              title={common.configEntities}
              description={text(
                'Review and edit configuration records that apply to this talent.',
                '查看并编辑当前作用于该艺人的配置记录。',
                'このタレントに適用される設定レコードを確認・編集します。',
              )}
            >
              <ScopedConfigEntityWorkspace
                request={request}
                requestEnvelope={requestEnvelope}
                scopeType="talent"
                scopeId={talentId}
                locale={selectedLocale}
                copy={scopedConfigCopy}
                catalog={localizedConfigEntityCatalog}
              />
            </FormSection>
          </GlassSurface>
        ) : null}

        {displayedSectionId === 'settings' ? (
          <GlassSurface className="p-6">
            <FormSection
              title={common.settings}
              description={text(
                'Adjust talent defaults and public route settings.',
                '调整艺人默认值和公开路由设置。',
                'タレント既定値と公開ルート設定を調整します。',
              )}
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
                    {isSaving ? common.saving : text('Save talent settings', '保存艺人设置', 'タレント設定を保存')}
                  </button>
                </>
              }
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
                    {inheritedSourceLabel(
                      settings.inheritedFrom.defaultLanguage,
                      talentOverrideLabel,
                      overrideSet.has('defaultLanguage'),
                    )}
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
                    {inheritedSourceLabel(settings.inheritedFrom.timezone, talentOverrideLabel, overrideSet.has('timezone'))}
                  </p>
                </label>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div
                  ref={homepageRoutingRef}
                  tabIndex={-1}
                  className={`rounded-2xl border bg-white/85 px-5 py-5 shadow-sm outline-none transition ${
                    activeFocus === 'homepage-routing'
                      ? 'border-indigo-300 ring-2 ring-indigo-200'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-950">
                      {text('Homepage / Custom Domain', '主页 / 自定义域名', 'ホームページ / カスタムドメイン')}
                    </p>
                    <p className="text-sm leading-6 text-slate-600">
                      {text(
                        'Review homepage path, custom domain, verification, and related routing for this talent.',
                        '查看当前艺人的主页路径、自定义域名、验证状态与相关路由。',
                        'このタレントのホームページパス、カスタムドメイン、検証状況、関連ルーティングを確認します。',
                      )}
                    </p>
                  </div>

                  <div className="mt-4 grid gap-4">
                    <FieldRow
                      label={text('Homepage Published', '主页发布状态', 'ホームページ公開状態')}
                      value={formatBoolean(
                        homepagePanel.data?.isPublished ?? detail.externalPagesDomain.homepage?.isPublished,
                        lifecycleStatusLabel('published'),
                        text('Not published', '未发布', '未公開'),
                      )}
                    />
                    <FieldRow
                      label={text('Current Homepage URL', '当前主页 URL', '現在のホームページ URL')}
                      value={sharedHomepageUrl}
                      valueClassName="font-mono text-sm leading-7"
                      hint={text(
                        'Use this URL to verify the route after saving.',
                        '保存后可用这个 URL 核对实际路由。',
                        '保存後、この URL でルートを確認できます。',
                      )}
                    />
                  </div>

                  <div className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-950">{text('Shared-domain routes', '共享域路径', '共有ドメインルート')}</p>
                      <p className="text-sm leading-6 text-slate-600">
                        {text(
                          'This route is derived automatically from tenant code and talent code. Bind a custom domain if you need a different public address.',
                          '该路径会根据租户代码和艺人代码自动生成。如需不同的公开地址，请绑定自定义域名。',
                          'このルートはテナントコードとタレントコードから自動生成されます。別の公開アドレスが必要な場合はカスタムドメインを設定してください。',
                        )}
                      </p>
                    </div>

                    {homepagePanel.error ? (
                      <SectionPlaceholder
                        title={text('Homepage routing unavailable', '主页路由不可用', 'ホームページルーティングを読み込めません')}
                        description={homepagePanel.error}
                      />
                    ) : homepagePanel.data ? (
                      <>
                        <div className="grid gap-4">
                          <FieldRow
                            label={text('Shared Homepage Route', '共享主页路径', '共有ホームページルート')}
                            value={sharedHomepagePath || common.notConfigured}
                            valueClassName="font-mono text-sm leading-7"
                            hint={text(
                              'This route remains stable unless tenant code or talent code changes.',
                              '除非租户代码或艺人代码变化，否则该路径保持稳定。',
                              'テナントコードまたはタレントコードが変わらない限り、このルートは固定です。',
                            )}
                          />
                          <FieldRow
                            label={text('Shared Marshmallow Route', '共享棉花糖路径', '共有マシュマロルート')}
                            value={sharedMarshmallowPath || common.notConfigured}
                            valueClassName="font-mono text-sm leading-7"
                            hint={text(
                              'Marshmallow follows the same shared-domain rule under /marshmallow.',
                              '棉花糖在共享域名下也遵循同样规则，并固定挂在 /marshmallow。',
                              'マシュマロも共有ドメインでは同じ規則に従い、/marshmallow 配下に固定されます。',
                            )}
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <Link
                            href={buildTalentWorkspaceSectionPath(tenantId, talentId, 'homepage')}
                            className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100"
                          >
                            {text('Open homepage page', '打开主页页面', 'ホームページを開く')}
                          </Link>
                        </div>
                      </>
                    ) : null}
                  </div>

                  <div className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-950">{text('Custom Domain', '自定义域名', 'カスタムドメイン')}</p>
                      <p className="text-sm leading-6 text-slate-600">
                        {text(
                          'Bind or clear a custom domain, verify DNS ownership, and review the fixed homepage and marshmallow routes.',
                          '绑定或清除自定义域名，验证 DNS 所有权，并查看固定的主页与棉花糖路由。',
                          'カスタムドメインの設定・解除、DNS 所有権の検証、および固定のホームページ / マシュマロルートを確認します。',
                        )}
                      </p>
                    </div>

                    {customDomainPanel.error ? (
                      <SectionPlaceholder
                        title={text('Custom-domain routing unavailable', '自定义域名路由不可用', 'カスタムドメイン設定を読み込めません')}
                        description={customDomainPanel.error}
                      />
                    ) : customDomainPanel.data ? (
                      <>
                        <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/85 px-4 py-4">
                          <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                              {text('Step 1', '步骤 1', 'ステップ 1')}
                            </p>
                            <p className="text-sm font-semibold text-slate-950">
                              {text('Bind or update the custom domain', '绑定或更新自定义域名', 'カスタムドメインを設定または更新')}
                            </p>
                            <p className="text-sm leading-6 text-slate-600">
                              {text(
                                'Save the domain first. Verification and TLS can happen later without blocking you here.',
                                '先保存域名，后续可以稍后再完成验证和 TLS 设置。',
                                '先にドメインを保存し、その後で検証と TLS 設定を進められます。',
                              )}
                            </p>
                          </div>

                          <p className="rounded-xl border border-slate-200 bg-white/90 px-3 py-3 text-sm leading-6 text-slate-600">
                            {text(
                              'Each talent currently uses one custom domain at a time. Replace the saved domain when you need to switch.',
                              '当前每个艺人一次只能使用一个自定义域名；如需切换，请直接替换已保存的域名。',
                              '現在、各タレントは同時に 1 つのカスタムドメインのみ利用できます。切り替える場合は保存済みドメインを置き換えてください。',
                            )}
                          </p>

                          <FieldRow
                            label={text('Current Custom Domain', '当前自定义域名', '現在のカスタムドメイン')}
                            value={customDomainPanel.data.customDomain || common.notConfigured}
                            valueClassName="font-mono text-sm leading-7"
                            hint={text(
                              'Leave the field empty and save to clear the current custom domain.',
                              '留空并保存即可清除当前自定义域名。',
                              '空欄のまま保存すると現在のカスタムドメインを解除できます。',
                            )}
                          />

                          <label className="space-y-2">
                            <span className="text-sm font-semibold text-slate-900">{text('Custom domain', '自定义域名', 'カスタムドメイン')}</span>
                            <input
                              aria-label={text('Custom domain', '自定义域名', 'カスタムドメイン')}
                              type="text"
                              value={customDomainDraft}
                              onChange={(event) => {
                                setCustomDomainDraft(event.target.value);
                                setCustomDomainError(null);
                                setCustomDomainSuccess(null);
                                setCustomDomainVerifyNotice(null);
                              }}
                              placeholder="fans.example.com"
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400"
                            />
                          </label>

                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={() => void handleSaveCustomDomain()}
                              disabled={customDomainPending || !hasDirtyCustomDomain}
                              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {customDomainPending
                                ? text('Saving custom domain…', '正在保存自定义域名…', 'カスタムドメインを保存中…')
                                : text('Save custom domain', '保存自定义域名', 'カスタムドメインを保存')}
                            </button>
                          </div>
                          {customDomainError ? <NoticeBanner tone="error" message={customDomainError} /> : null}
                          {customDomainSuccess ? <NoticeBanner tone="success" message={customDomainSuccess} /> : null}
                        </div>

                        {customDomainPanel.data.customDomain ? (
                          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                            <div className="space-y-1">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                {text('Step 2', '步骤 2', 'ステップ 2')}
                              </p>
                              <p className="text-sm font-semibold text-slate-950">
                                {text('Verify DNS ownership', '验证 DNS 所有权', 'DNS 所有権を検証')}
                              </p>
                              <p className="text-sm leading-6 text-slate-600">
                                {text(
                                  'Publish the TXT record first, then verify when DNS has propagated.',
                                  '先发布 TXT 记录，等待 DNS 生效后再执行验证。',
                                  '先に TXT レコードを公開し、DNS が反映されたら検証してください。',
                                )}
                              </p>
                            </div>

                            <FieldRow
                              label={text('Verification Status', '验证状态', '検証状態')}
                              value={
                                customDomainPanel.data.customDomainVerified
                                  ? text('Verified', '已验证', '検証済み')
                                  : text('Pending verification', '待验证', '検証待ち')
                              }
                              hint={
                                homepageVerificationTxtRecord
                                  ? `TXT host: _tcrn-verify.${customDomainPanel.data.customDomain}`
                                  : text('Bind a domain to receive a DNS proof record.', '先绑定域名才能生成 DNS 验证记录。', 'DNS 検証レコードを受け取るには先にドメインを設定してください。')
                              }
                            />

                            {homepageVerificationTxtRecord ? (
                              <FieldRow
                                label={text('Expected TXT Record', '期望 TXT 记录', '必要な TXT レコード')}
                                value={homepageVerificationTxtRecord}
                                valueClassName="font-mono text-sm leading-7"
                                hint={text(
                                  'Publish this TXT value before running domain verification.',
                                  '执行域名验证前，请先发布这条 TXT 记录。',
                                  'ドメイン検証を実行する前にこの TXT レコードを公開してください。',
                                )}
                              />
                            ) : null}

                            <div className="flex flex-wrap items-center gap-3">
                              <button
                                type="button"
                                onClick={() => void handleVerifyCustomDomain()}
                                disabled={customDomainVerifyPending || !customDomainPanel.data.customDomain}
                                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {customDomainVerifyPending
                                  ? text('Verifying domain…', '正在验证域名…', 'ドメインを検証中…')
                                  : text('Verify custom domain', '验证自定义域名', 'カスタムドメインを検証')}
                              </button>
                            </div>
                            {customDomainVerifyNotice ? (
                              <NoticeBanner tone={customDomainVerifyNotice.tone} message={customDomainVerifyNotice.message} />
                            ) : null}
                          </div>
                        ) : (
                          <SectionPlaceholder
                            title={text('No custom domain bound', '未绑定自定义域名', 'カスタムドメイン未設定')}
                            description={text(
                              'Add a domain above when this talent needs its own public entry.',
                              '如果该艺人需要独立公开入口，请先在上方添加域名。',
                              'このタレント専用の公開入口が必要な場合は、まず上でドメインを追加してください。',
                            )}
                          />
                        )}

                        {customDomainPanel.data.customDomain ? (
                          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/85 px-4 py-4">
                            <div className="space-y-1">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                {text('Step 3', '步骤 3', 'ステップ 3')}
                              </p>
                              <p className="text-sm font-semibold text-slate-950">
                                {text('Fixed Public Routes', '固定公开路由', '固定公開ルート')}
                              </p>
                              <p className="text-sm leading-6 text-slate-600">
                                {text(
                                  'Custom domains now use fixed routes. Change the domain itself if you need a different public address.',
                                  '自定义域名现在使用固定路由。如需不同的公开地址，请更换域名本身。',
                                  'カスタムドメインは固定ルートを使用します。別の公開アドレスが必要な場合は、ドメイン自体を変更してください。',
                                )}
                              </p>
                            </div>

                            <div className="grid gap-4">
                              <FieldRow
                                label={text('Homepage route under custom domain', '自定义域名下的主页路由', 'カスタムドメイン配下のホームページルート')}
                                value={fixedCustomDomainHomepageRoute}
                                valueClassName="font-mono text-sm leading-7"
                                hint={text(
                                  'The homepage route is fixed to /homepage under any custom domain.',
                                  '任意自定义域名下的主页路由固定为 /homepage。',
                                  '任意のカスタムドメイン配下でホームページルートは /homepage に固定されます。',
                                )}
                              />
                              <FieldRow
                                label={text('Marshmallow route under custom domain', '自定义域名下的棉花糖路由', 'カスタムドメイン配下のマシュマロルート')}
                                value={fixedCustomDomainMarshmallowRoute}
                                valueClassName="font-mono text-sm leading-7"
                                hint={text(
                                  'The marshmallow route is fixed to /marshmallow under any custom domain.',
                                  '任意自定义域名下的棉花糖路由固定为 /marshmallow。',
                                  '任意のカスタムドメイン配下でマシュマロルートは /marshmallow に固定されます。',
                                )}
                              />
                            </div>
                          </div>
                        ) : null}

                        {customDomainPanel.data.customDomain ? (
                          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/85 px-4 py-4">
                            <div className="space-y-1">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                {text('Step 4', '步骤 4', 'ステップ 4')}
                              </p>
                              <p className="text-sm font-semibold text-slate-950">
                                {text('Custom-Domain SSL Mode', '自定义域名 SSL 模式', 'カスタムドメイン SSL モード')}
                              </p>
                              <p className="text-sm leading-6 text-slate-600">
                                {text(
                                  'Choose how TLS is handled for the custom domain.',
                                  '选择自定义域名的 TLS 处理方式。',
                                  'カスタムドメインの TLS 処理方式を選択します。',
                                )}
                              </p>
                            </div>

                            <label className="space-y-2">
                              <span className="text-sm font-semibold text-slate-900">
                                {text('Custom-domain SSL mode', '自定义域名 SSL 模式', 'カスタムドメイン SSL モード')}
                              </span>
                              <select
                                aria-label={text('Custom-domain SSL mode', '自定义域名 SSL 模式', 'カスタムドメイン SSL モード')}
                                value={customDomainSslModeDraft}
                                onChange={(event) => {
                                  setCustomDomainSslModeDraft(
                                    event.target.value as TalentCustomDomainConfigResponse['customDomainSslMode'],
                                  );
                                  setCustomDomainSslError(null);
                                  setCustomDomainSslSuccess(null);
                                }}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400"
                              >
                                {customDomainSslModeOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              <p className="text-xs text-slate-500">
                                {customDomainSslModeOptions.find((option) => option.value === customDomainSslModeDraft)?.hint}
                              </p>
                            </label>

                            <button
                              type="button"
                              onClick={() => void handleSaveCustomDomainSslMode()}
                              disabled={customDomainSslPending || !hasDirtyCustomDomainSslMode}
                              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {customDomainSslPending
                                ? text('Saving SSL mode…', '正在保存 SSL 模式…', 'SSL モードを保存中…')
                                : text('Save custom-domain SSL mode', '保存自定义域名 SSL 模式', 'カスタムドメイン SSL モードを保存')}
                            </button>
                            {customDomainSslError ? <NoticeBanner tone="error" message={customDomainSslError} /> : null}
                            {customDomainSslSuccess ? <NoticeBanner tone="success" message={customDomainSslSuccess} /> : null}
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </div>

                <div
                  ref={marshmallowRoutingRef}
                  tabIndex={-1}
                  className={`rounded-2xl border bg-white/85 px-5 py-5 shadow-sm outline-none transition ${
                    activeFocus === 'marshmallow-routing'
                      ? 'border-indigo-300 ring-2 ring-indigo-200'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-950">
                      {text('Public Marshmallow Route', '公开棉花糖路由', '公開マシュマロルート')}
                    </p>
                    <p className="text-sm leading-6 text-slate-600">
                      {text(
                        'Control whether this talent exposes the public marshmallow page.',
                        '控制该艺人是否开放公开棉花糖页面。',
                        'このタレントが公開マシュマロページを公開するかを制御します。',
                      )}
                    </p>
                  </div>

                  {marshmallowPanel.error ? (
                    <div className="mt-4">
                      <SectionPlaceholder
                        title={text('Marshmallow routing unavailable', '棉花糖路由不可用', 'マシュマロルーティングを読み込めません')}
                        description={marshmallowPanel.error}
                      />
                    </div>
                  ) : marshmallowPanel.data && marshmallowEnabledDraft !== null ? (
                    <>
                      <label className="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                        <input
                          aria-label={text('Enable public marshmallow route', '启用公开棉花糖路由', '公開マシュマロルートを有効化')}
                          type="checkbox"
                          checked={marshmallowEnabledDraft}
                          onChange={(event) => {
                            setMarshmallowEnabledDraft(event.target.checked);
                            setMarshmallowSaveError(null);
                            setMarshmallowSaveSuccess(null);
                          }}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                        />
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-950">
                            {text('Enable public marshmallow route', '启用公开棉花糖路由', '公開マシュマロルートを有効化')}
                          </p>
                          <p className="text-sm leading-6 text-slate-600">
                            {text(
                              'Turn the public marshmallow page on or off for this talent.',
                              '为该艺人开启或关闭公开棉花糖页面。',
                              'このタレントの公開マシュマロページをオン・オフします。',
                            )}
                          </p>
                        </div>
                      </label>

                      <div className="mt-4 grid gap-4">
                        <FieldRow
                          label={text('Mailbox URL', '信箱 URL', 'メールボックス URL')}
                          value={marshmallowPanel.data.marshmallowUrl}
                          hint={text(
                            'Use this link to verify the public mailbox after saving.',
                            '保存后可用这个链接核对公开信箱入口。',
                            '保存後、このリンクで公開メールボックスを確認できます。',
                          )}
                        />
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => void handleSaveMarshmallowRouting()}
                          disabled={marshmallowSavePending || !hasDirtyMarshmallowToggle}
                          className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {marshmallowSavePending
                            ? text('Saving public route…', '正在保存公开路由…', '公開ルートを保存中…')
                            : text('Save public marshmallow route', '保存公开棉花糖路由', '公開マシュマロルートを保存')}
                        </button>
                        <Link
                          href={buildTalentWorkspaceSectionPath(tenantId, talentId, 'marshmallow')}
                          className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100"
                        >
                            {text('Open marshmallow page', '打开棉花糖页面', 'マシュマロページを開く')}
                        </Link>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>

              {saveError ? <p className="text-sm font-medium text-red-600">{saveError}</p> : null}
              {saveSuccess ? <p className="text-sm font-medium text-emerald-700">{saveSuccess}</p> : null}
              {marshmallowSaveError ? <p className="text-sm font-medium text-red-600">{marshmallowSaveError}</p> : null}
              {marshmallowSaveSuccess ? <p className="text-sm font-medium text-emerald-700">{marshmallowSaveSuccess}</p> : null}
            </FormSection>
          </GlassSurface>
        ) : null}

        {displayedSectionId === 'dictionary' ? (
          <GlassSurface className="p-6">
            <FormSection
              title={common.dictionary}
              description={text(
                'Browse the effective dictionary for this talent scope.',
                '查看当前艺人范围生效的系统词典。',
                'このタレントスコープで有効なシステム辞書を確認します。',
              )}
            >
              {dictionaryPanel.error ? (
                <SectionPlaceholder
                  title={text('Dictionary catalog unavailable', '词典目录不可用', '辞書カタログを読み込めません')}
                  description={dictionaryPanel.error}
                />
              ) : dictionaryPanel.data ? (
                <>
                  <div className="grid gap-4 xl:grid-cols-3">
                  <FieldRow label={text('Visible Dictionary Types', '可见词典类型', '表示中の辞書タイプ')} value={String(dictionaryCount)} />
                  <FieldRow label={text('Marshmallow Messages', '棉花糖消息数', 'マシュマロ件数')} value={String(detail.stats.marshmallowMessageCount)} />
                    <FieldRow label={text('Current Shared Homepage Route', '当前共享主页路径', '現在の共有ホームページルート')} value={sharedHomepagePath || common.notConfigured} />
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
                          {text(
                            'Review the dictionary items currently used by customer, homepage, and marshmallow pages.',
                            '查看客户、主页和棉花糖页面当前使用的词典项。',
                            '顧客、ホームページ、マシュマロ画面で現在使用している辞書項目を確認します。',
                          )}
                        </p>
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
                      'The dictionary catalog is currently empty for this talent context.',
                      '当前艺人范围下的词典目录为空。',
                      'このタレントコンテキストでは辞書カタログが空です。',
                    )}
                  />
                </>
              ) : (
                <SectionPlaceholder
                  title={text('No dictionary types returned', '未返回词典类型', '辞書タイプが返されませんでした')}
                  description={text(
                    'The dictionary catalog is currently empty for this talent context.',
                    '当前艺人范围下的词典目录为空。',
                    'このタレントコンテキストでは辞書カタログが空です。',
                  )}
                />
              )}
            </FormSection>
          </GlassSurface>
        ) : null}
        </div>
      </SettingsLayout>

      <ConfirmActionDialog
        open={lifecycleDialogState !== null}
        title={lifecycleDialogState?.title || text('Confirm action', '确认操作', '操作を確認')}
        description={lifecycleDialogState?.description || ''}
        confirmText={lifecycleDialogState?.confirmText || text('Confirm', '确认', '確認')}
        pendingText={lifecycleDialogState?.pendingText}
        intent={lifecycleDialogState?.intent || 'primary'}
        isPending={lifecyclePending}
        onCancel={() => {
          if (!lifecyclePending) {
            setLifecycleDialogState(null);
          }
        }}
        onConfirm={() => {
          void handleLifecycleConfirm();
        }}
      />
    </div>
  );
}
