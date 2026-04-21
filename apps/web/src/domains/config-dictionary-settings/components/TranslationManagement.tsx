'use client';

import {
  resolveTrilingualLocaleFamily,
  type SupportedUiLocale,
} from '@tcrn/shared';
import { Languages } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
  type RequestEnvelopeFn,
  type RequestFn,
} from '@/domains/config-dictionary-settings/api/system-dictionary.api';
import { useRuntimeLocale } from '@/platform/runtime/locale/locale-provider';
import {
  buildManagedTranslations,
  countManagedLocaleValues,
  extractManagedTranslations,
  loadTranslationLanguageOptions,
  pickLegacyLocaleValue,
  type TranslationLanguageOption,
} from '@/platform/runtime/translations/managed-translations';
import { TranslationDrawer } from '@/platform/ui';

export interface TranslationFieldSection {
  id: string;
  baseValue?: string;
  label: string;
  kind?: 'text' | 'textarea';
  placeholder?: string;
  values: Record<string, string>;
}

interface TranslationDrawerCopy {
  addLanguageLabel: string;
  baseValueSuffix: string;
  cancelLabel: string;
  emptyHint: string;
  emptyTranslationsText: string;
  fallbackLabel: string;
  fallbackNotice: string;
  helper: string;
  loadingLanguages: string;
  noLanguages: string;
  noSearchResultsText: string;
  optionalLabel: string;
  removeLanguageVisibleLabel: string;
  saveLabel: string;
  searchPlaceholder: string;
  triggerLabel: string;
  translationSectionSuffix: string;
}

interface TranslationManagementDrawerProps {
  closeButtonAriaLabel: string;
  description: string;
  open: boolean;
  onChange: (sectionId: string, localeCode: string, value: string) => void;
  onOpenChange: (open: boolean) => void;
  request: RequestFn;
  requestEnvelope: RequestEnvelopeFn;
  sections: TranslationFieldSection[];
  title: string;
}

interface TranslationManagementTriggerProps {
  count?: number;
  onClick: () => void;
}

interface AsyncLanguagesState {
  data: TranslationLanguageOption[];
  error: string | null;
  loading: boolean;
}

const COPY: Record<SupportedUiLocale, TranslationDrawerCopy> = {
  en: {
    addLanguageLabel: 'Add Language',
    baseValueSuffix: '(Base / English)',
    cancelLabel: 'Cancel',
    emptyHint: 'Leave a locale blank to fall back to the English base value.',
    emptyTranslationsText: 'No translations added yet.',
    fallbackLabel: 'Fallback',
    fallbackNotice: 'Language dictionary unavailable. Falling back to supported UI locales.',
    helper: 'Manage optional locale variants here.',
    loadingLanguages: 'Loading language options…',
    noLanguages: 'No language options available.',
    noSearchResultsText: 'No languages found.',
    optionalLabel: 'Optional',
    removeLanguageVisibleLabel: 'Remove',
    saveLabel: 'Save',
    searchPlaceholder: 'Search languages...',
    triggerLabel: 'Translation management',
    translationSectionSuffix: 'translations',
  },
  zh_HANS: {
    addLanguageLabel: '添加语言',
    baseValueSuffix: '（英文主值）',
    cancelLabel: '取消',
    emptyHint: '留空时将自动回退到英文主值。',
    emptyTranslationsText: '当前还没有添加翻译。',
    fallbackLabel: '回退',
    fallbackNotice: '语言词典暂不可用，已回退到当前支持的 UI 语言。',
    helper: '在这里管理可选的多语言变体。',
    loadingLanguages: '正在加载语言选项…',
    noLanguages: '当前没有可用语言选项。',
    noSearchResultsText: '未找到匹配的语言。',
    optionalLabel: '可选',
    removeLanguageVisibleLabel: '移除',
    saveLabel: '保存',
    searchPlaceholder: '搜索语言…',
    triggerLabel: '翻译管理',
    translationSectionSuffix: '翻译',
  },
  zh_HANT: {
    addLanguageLabel: '新增語言',
    baseValueSuffix: '（英文主值）',
    cancelLabel: '取消',
    emptyHint: '留空時會自動回退到英文主值。',
    emptyTranslationsText: '目前尚未新增翻譯。',
    fallbackLabel: '回退',
    fallbackNotice: '語言詞典暫時不可用，已回退到目前支援的 UI 語言。',
    helper: '在這裡管理可選的多語言變體。',
    loadingLanguages: '正在載入語言選項…',
    noLanguages: '目前沒有可用語言選項。',
    noSearchResultsText: '找不到符合的語言。',
    optionalLabel: '可選',
    removeLanguageVisibleLabel: '移除',
    saveLabel: '儲存',
    searchPlaceholder: '搜尋語言…',
    triggerLabel: '管理翻譯',
    translationSectionSuffix: '翻譯',
  },
  ja: {
    addLanguageLabel: '言語を追加',
    baseValueSuffix: '（英語の基準値）',
    cancelLabel: 'キャンセル',
    emptyHint: '未入力の場合は英語の基本値にフォールバックします。',
    emptyTranslationsText: 'まだ翻訳は追加されていません。',
    fallbackLabel: 'フォールバック',
    fallbackNotice: '言語辞書を読み込めないため、対応済み UI ロケールへフォールバックしています。',
    helper: 'ここで任意の各言語版を管理します。',
    loadingLanguages: '言語オプションを読み込んでいます…',
    noLanguages: '利用可能な言語オプションがありません。',
    noSearchResultsText: '一致する言語が見つかりません。',
    optionalLabel: '任意',
    removeLanguageVisibleLabel: '削除',
    saveLabel: '保存',
    searchPlaceholder: '言語を検索…',
    triggerLabel: '翻訳管理',
    translationSectionSuffix: '翻訳',
  },
  ko: {
    addLanguageLabel: '언어 추가',
    baseValueSuffix: '(영문 기본값)',
    cancelLabel: '취소',
    emptyHint: '값을 비워 두면 영어 기본값으로 대체됩니다.',
    emptyTranslationsText: '아직 추가된 번역이 없습니다.',
    fallbackLabel: '대체',
    fallbackNotice: '언어 사전을 불러올 수 없어 현재 지원되는 UI 언어로 대체합니다.',
    helper: '여기에서 선택 언어별 번역을 관리하세요.',
    loadingLanguages: '언어 옵션을 불러오는 중…',
    noLanguages: '사용 가능한 언어 옵션이 없습니다.',
    noSearchResultsText: '일치하는 언어를 찾을 수 없습니다.',
    optionalLabel: '선택 사항',
    removeLanguageVisibleLabel: '제거',
    saveLabel: '저장',
    searchPlaceholder: '언어 검색…',
    triggerLabel: '번역 관리',
    translationSectionSuffix: '번역',
  },
  fr: {
    addLanguageLabel: 'Ajouter une langue',
    baseValueSuffix: '(Valeur de base / anglais)',
    cancelLabel: 'Annuler',
    emptyHint: "Laissez une langue vide pour revenir à la valeur anglaise de base.",
    emptyTranslationsText: 'Aucune traduction n’a encore été ajoutée.',
    fallbackLabel: 'Repli',
    fallbackNotice: "Le dictionnaire des langues est indisponible. Utilisation des langues UI prises en charge.",
    helper: 'Gérez ici les variantes facultatives par langue.',
    loadingLanguages: 'Chargement des langues…',
    noLanguages: 'Aucune langue disponible.',
    noSearchResultsText: 'Aucune langue correspondante.',
    optionalLabel: 'Optionnel',
    removeLanguageVisibleLabel: 'Retirer',
    saveLabel: 'Enregistrer',
    searchPlaceholder: 'Rechercher une langue…',
    triggerLabel: 'Gérer les traductions',
    translationSectionSuffix: 'traductions',
  },
};

function getCurrentCopy(locale: SupportedUiLocale) {
  return COPY[locale];
}

function getEffectiveSelectedLocale(
  currentLocale: 'en' | 'zh' | 'ja',
  selectedLocale: SupportedUiLocale | undefined,
): SupportedUiLocale {
  if (selectedLocale && resolveTrilingualLocaleFamily(selectedLocale) === currentLocale) {
    return selectedLocale;
  }

  return currentLocale === 'zh' ? 'zh_HANS' : currentLocale;
}
export {
  buildManagedTranslations,
  countManagedLocaleValues,
  extractManagedTranslations,
  pickLegacyLocaleValue,
};
export type { TranslationLanguageOption };

export function TranslationManagementTrigger({
  count,
  onClick,
}: Readonly<TranslationManagementTriggerProps>) {
  const { currentLocale, selectedLocale } = useRuntimeLocale();
  const effectiveSelectedLocale = getEffectiveSelectedLocale(currentLocale, selectedLocale);
  const copy = getCurrentCopy(effectiveSelectedLocale);

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
      aria-label={copy.triggerLabel}
    >
      <Languages className="h-3.5 w-3.5" />
      <span>{copy.triggerLabel}</span>
      {count && count > 0 ? (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold tracking-normal text-slate-600">
          {count}
        </span>
      ) : null}
    </button>
  );
}

export function TranslationManagementDrawer({
  closeButtonAriaLabel,
  open,
  onChange,
  onOpenChange,
  request,
  requestEnvelope,
  sections,
  title,
}: Readonly<TranslationManagementDrawerProps>) {
  const { currentLocale, selectedLocale } = useRuntimeLocale();
  const effectiveSelectedLocale = getEffectiveSelectedLocale(currentLocale, selectedLocale);
  const copy = getCurrentCopy(effectiveSelectedLocale);
  const [languagesState, setLanguagesState] = useState<AsyncLanguagesState>({
    data: [],
    error: null,
    loading: true,
  });
  const [usedFallbackLanguages, setUsedFallbackLanguages] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrateLanguages() {
      setLanguagesState({
        data: [],
        error: null,
        loading: true,
      });

      const result = await loadTranslationLanguageOptions(
        request,
        requestEnvelope,
        effectiveSelectedLocale,
        copy.noLanguages,
      );

      if (cancelled) {
        return;
      }

      setLanguagesState({
        data: result.options,
        error: result.error,
        loading: false,
      });
      setUsedFallbackLanguages(result.usedFallback);
    }

    void hydrateLanguages();

    return () => {
      cancelled = true;
    };
  }, [copy.noLanguages, effectiveSelectedLocale, request, requestEnvelope]);

  const languageOptions = useMemo(
    () => languagesState.data.filter((option) => option.code.toLowerCase() !== 'en'),
    [languagesState.data],
  );

  const translationFields = useMemo(
    () =>
      sections.map((section) => {
        const type: 'text' | 'textarea' = section.kind === 'textarea' ? 'textarea' : 'text';

        return {
          id: section.id,
          label: section.label,
          type,
          baseValue: section.baseValue ?? '',
          translations: section.values,
          placeholder: section.placeholder,
        };
      }),
    [sections],
  );

  const emptyTranslationsText = languagesState.loading
    ? copy.loadingLanguages
    : languagesState.error && !usedFallbackLanguages
      ? languagesState.error
      : languageOptions.length === 0
        ? copy.noLanguages
        : copy.emptyTranslationsText;

  const handleSave = async (payload: Record<string, Record<string, string>> | Record<string, string>) => {
    const nestedPayload = payload as Record<string, Record<string, string>>;

    sections.forEach((section) => {
      const nextValues = nestedPayload[section.id] ?? {};
      const localeCodes = new Set([
        ...Object.keys(section.values),
        ...Object.keys(nextValues),
      ]);

      localeCodes.forEach((localeCode) => {
        onChange(section.id, localeCode, nextValues[localeCode] ?? '');
      });
    });

    onOpenChange(false);
  };

  return (
    <TranslationDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      fields={translationFields}
      availableLocales={languageOptions}
      onSave={handleSave}
      cancelButtonLabel={copy.cancelLabel}
      saveButtonLabel={copy.saveLabel}
      closeButtonAriaLabel={closeButtonAriaLabel}
      addLanguageLabel={copy.addLanguageLabel}
      removeLanguageVisibleLabel={copy.removeLanguageVisibleLabel}
      removeLanguageAriaLabel={(language) => `${copy.removeLanguageVisibleLabel} ${language}`}
      emptyTranslationsText={emptyTranslationsText}
      baseValueSuffix={copy.baseValueSuffix}
    />
  );
}
