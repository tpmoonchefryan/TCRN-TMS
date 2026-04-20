'use client';

import { BookText, Plus, ShieldCheck, Tags } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
  createDictionaryItem,
  createDictionaryType,
  deactivateDictionaryItem,
  type DictionaryItemRecord,
  type DictionaryTypeSummary,
  listDictionaryTypes,
  reactivateDictionaryItem,
  updateDictionaryItem,
} from '@/domains/config-dictionary-settings/api/system-dictionary.api';
import { DictionaryExplorerPanel } from '@/domains/config-dictionary-settings/components/DictionaryExplorerPanel';
import {
  buildManagedTranslations,
  countManagedLocaleValues,
  extractManagedTranslations,
  pickLegacyLocaleValue,
  TranslationManagementDrawer,
  TranslationManagementTrigger,
} from '@/domains/config-dictionary-settings/components/TranslationManagement';
import { useSystemDictionaryCopy } from '@/domains/config-dictionary-settings/screens/system-dictionary.copy';
import { ApiRequestError } from '@/platform/http/api';
import { useRuntimeLocale } from '@/platform/runtime/locale/locale-provider';
import { useSession } from '@/platform/runtime/session/session-provider';
import {
  ActionDrawer,
  AsyncSubmitButton,
  ConfirmActionDialog,
  FormSection,
  GlassSurface,
  StateView,
} from '@/platform/ui';

interface AsyncPanelState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

interface NoticeState {
  tone: 'success' | 'error';
  message: string;
}

interface DictionaryTypeDraft {
  code: string;
  nameEn: string;
  descriptionEn: string;
  nameTranslations: Record<string, string>;
  descriptionTranslations: Record<string, string>;
  sortOrder: string;
}

interface DictionaryItemDraft {
  code: string;
  nameEn: string;
  descriptionEn: string;
  nameTranslations: Record<string, string>;
  descriptionTranslations: Record<string, string>;
  sortOrder: string;
  extraDataJson: string;
}

interface ItemMutationState {
  mode: 'create' | 'edit';
  item: DictionaryItemRecord | null;
}

interface ConfirmState {
  item: DictionaryItemRecord;
  nextActive: boolean;
}

const EMPTY_TYPE_DRAFT: DictionaryTypeDraft = {
  code: '',
  nameEn: '',
  descriptionEn: '',
  nameTranslations: {},
  descriptionTranslations: {},
  sortOrder: '0',
};

const EMPTY_ITEM_DRAFT: DictionaryItemDraft = {
  code: '',
  nameEn: '',
  descriptionEn: '',
  nameTranslations: {},
  descriptionTranslations: {},
  sortOrder: '0',
  extraDataJson: '',
};

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiRequestError ? reason.message : fallback;
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

function normalizeOptionalString(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function buildItemDraft(item: DictionaryItemRecord): DictionaryItemDraft {
  return {
    code: item.code,
    nameEn: item.nameEn,
    descriptionEn: item.descriptionEn ?? '',
    nameTranslations: extractManagedTranslations(item.nameEn, item.translations, {
      zh_HANS: item.nameZh,
      ja: item.nameJa,
    }),
    descriptionTranslations: extractManagedTranslations(item.descriptionEn, item.descriptionTranslations, {
      zh_HANS: item.descriptionZh,
      ja: item.descriptionJa,
    }),
    sortOrder: String(item.sortOrder),
    extraDataJson: item.extraData ? JSON.stringify(item.extraData, null, 2) : '',
  };
}

function parseSortOrder(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function parseExtraData(value: string, invalidMessage: string) {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return undefined;
  }

  const parsed = JSON.parse(trimmed) as unknown;

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(invalidMessage);
  }

  return parsed as Record<string, unknown>;
}

export function SystemDictionaryScreen() {
  const { request, requestEnvelope } = useSession();
  const { currentLocale, dictionaryExplorerCopy, text } = useSystemDictionaryCopy();
  const { selectedLocale } = useRuntimeLocale();
  const [typesPanel, setTypesPanel] = useState<AsyncPanelState<DictionaryTypeSummary[]>>({
    data: null,
    error: null,
    loading: true,
  });
  const [selectedType, setSelectedType] = useState<DictionaryTypeSummary | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const [isTypeDrawerOpen, setIsTypeDrawerOpen] = useState(false);
  const [isTypeTranslationsOpen, setIsTypeTranslationsOpen] = useState(false);
  const [typeDraft, setTypeDraft] = useState<DictionaryTypeDraft>(EMPTY_TYPE_DRAFT);
  const [typeDraftError, setTypeDraftError] = useState<string | null>(null);
  const [isSavingType, setIsSavingType] = useState(false);

  const [itemMutationState, setItemMutationState] = useState<ItemMutationState | null>(null);
  const [isItemTranslationsOpen, setIsItemTranslationsOpen] = useState(false);
  const [itemDraft, setItemDraft] = useState<DictionaryItemDraft>(EMPTY_ITEM_DRAFT);
  const [itemDraftError, setItemDraftError] = useState<string | null>(null);
  const [isSavingItem, setIsSavingItem] = useState(false);

  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [isConfirmPending, setIsConfirmPending] = useState(false);

  const typeTranslationSections = useMemo(
    () => [
      {
        id: 'name',
        baseValue: typeDraft.nameEn,
        label: text('Type name', '类型名称', 'タイプ名'),
        values: typeDraft.nameTranslations,
      },
      {
        baseValue: typeDraft.descriptionEn,
        id: 'description',
        label: text('Type description', '类型描述', 'タイプ説明'),
        kind: 'textarea' as const,
        values: typeDraft.descriptionTranslations,
      },
    ],
    [text, typeDraft.descriptionEn, typeDraft.descriptionTranslations, typeDraft.nameEn, typeDraft.nameTranslations],
  );

  const itemTranslationSections = useMemo(
    () => [
      {
        id: 'name',
        baseValue: itemDraft.nameEn,
        label: text('Item name', '词典项名称', '項目名'),
        values: itemDraft.nameTranslations,
      },
      {
        baseValue: itemDraft.descriptionEn,
        id: 'description',
        label: text('Item description', '词典项描述', '項目説明'),
        kind: 'textarea' as const,
        values: itemDraft.descriptionTranslations,
      },
    ],
    [itemDraft.descriptionEn, itemDraft.descriptionTranslations, itemDraft.nameEn, itemDraft.nameTranslations, text],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadTypes() {
      setTypesPanel((current) => ({
        ...current,
        error: null,
        loading: true,
      }));

      try {
        const types = await listDictionaryTypes(request, selectedLocale);

        if (cancelled) {
          return;
        }

        setTypesPanel({
          data: types,
          error: null,
          loading: false,
        });
      } catch (reason) {
        if (cancelled) {
          return;
        }

        setTypesPanel({
          data: null,
          error: getErrorMessage(
            reason,
            text({
              en: 'Failed to load system dictionary types.',
              zh_HANS: '加载系统词典类型失败。',
              zh_HANT: '載入系統詞典類型失敗。',
              ja: 'システム辞書タイプの読み込みに失敗しました。',
              ko: '시스템 사전 유형을 불러오지 못했습니다.',
              fr: 'Impossible de charger les types du dictionnaire système.',
            }),
          ),
          loading: false,
        });
      }
    }

    void loadTypes();

    return () => {
      cancelled = true;
    };
  }, [request, refreshToken, selectedLocale]);

  function openCreateTypeDrawer() {
    setTypeDraft(EMPTY_TYPE_DRAFT);
    setTypeDraftError(null);
    setIsTypeTranslationsOpen(false);
    setIsTypeDrawerOpen(true);
  }

  function openCreateItemDrawer() {
    if (!selectedType) {
      return;
    }

    setItemMutationState({
      mode: 'create',
      item: null,
    });
    setItemDraft(EMPTY_ITEM_DRAFT);
    setItemDraftError(null);
    setIsItemTranslationsOpen(false);
  }

  function openEditItemDrawer(item: DictionaryItemRecord) {
    setItemMutationState({
      mode: 'edit',
      item,
    });
    setItemDraft(buildItemDraft(item));
    setItemDraftError(null);
    setIsItemTranslationsOpen(false);
  }

  async function handleCreateType() {
    if (isSavingType) {
      return;
    }

    if (typeDraft.code.trim().length < 2 || typeDraft.nameEn.trim().length === 0) {
      setTypeDraftError(
        text({
          en: 'Dictionary type code and English name are required.',
          zh_HANS: '词典类型代码和英文名称为必填项。',
          zh_HANT: '詞典類型代碼與英文名稱為必填項。',
          ja: '辞書タイプコードと英語名は必須です。',
          ko: '사전 유형 코드와 영문 이름은 필수입니다.',
          fr: 'Le code du type et le nom anglais sont obligatoires.',
        }),
      );
      return;
    }

    setIsSavingType(true);
    setTypeDraftError(null);

    try {
      const translations = buildManagedTranslations(typeDraft.nameEn, typeDraft.nameTranslations);
      const descriptionTranslations = buildManagedTranslations(
        typeDraft.descriptionEn,
        typeDraft.descriptionTranslations,
      );

      const created = await createDictionaryType(request, {
        code: typeDraft.code.trim().toUpperCase(),
        nameEn: typeDraft.nameEn.trim(),
        nameZh: pickLegacyLocaleValue(translations, 'zh_HANS'),
        nameJa: pickLegacyLocaleValue(translations, 'ja'),
        descriptionEn: normalizeOptionalString(typeDraft.descriptionEn),
        descriptionZh: pickLegacyLocaleValue(descriptionTranslations, 'zh_HANS'),
        descriptionJa: pickLegacyLocaleValue(descriptionTranslations, 'ja'),
        translations,
        descriptionTranslations,
        sortOrder: parseSortOrder(typeDraft.sortOrder),
      });

      setNotice({
        tone: 'success',
        message: text({
          en: `${created.code} dictionary type created.`,
          zh_HANS: `已创建词典类型 ${created.code}。`,
          zh_HANT: `已建立詞典類型 ${created.code}。`,
          ja: `辞書タイプ ${created.code} を作成しました。`,
          ko: `${created.code} 사전 유형을 생성했습니다.`,
          fr: `Le type de dictionnaire ${created.code} a été créé.`,
        }),
      });
      setIsTypeDrawerOpen(false);
      setRefreshToken((current) => current + 1);
    } catch (reason) {
      setTypeDraftError(
        getErrorMessage(
          reason,
          text({
            en: 'Failed to create dictionary type.',
            zh_HANS: '创建词典类型失败。',
            zh_HANT: '建立詞典類型失敗。',
            ja: '辞書タイプの作成に失敗しました。',
            ko: '사전 유형을 생성하지 못했습니다.',
            fr: 'Impossible de créer le type de dictionnaire.',
          }),
        ),
      );
    } finally {
      setIsSavingType(false);
    }
  }

  async function handleSaveItem() {
    if (!selectedType || !itemMutationState || isSavingItem) {
      return;
    }

    if (itemMutationState.mode === 'create' && itemDraft.code.trim().length === 0) {
      setItemDraftError(
        text({
          en: 'Dictionary item code is required.',
          zh_HANS: '词典项代码为必填项。',
          zh_HANT: '詞典項代碼為必填項。',
          ja: '辞書項目コードは必須です。',
          ko: '사전 항목 코드는 필수입니다.',
          fr: 'Le code de l’élément est obligatoire.',
        }),
      );
      return;
    }

    if (itemDraft.nameEn.trim().length === 0) {
      setItemDraftError(
        text({
          en: 'Dictionary item English name is required.',
          zh_HANS: '词典项英文名称为必填项。',
          zh_HANT: '詞典項英文名稱為必填項。',
          ja: '辞書項目の英語名は必須です。',
          ko: '사전 항목의 영문 이름은 필수입니다.',
          fr: 'Le nom anglais de l’élément est obligatoire.',
        }),
      );
      return;
    }

    let extraData: Record<string, unknown> | undefined;

    try {
      extraData = parseExtraData(
        itemDraft.extraDataJson,
        text('Extra data must be a JSON object.', '额外数据必须是 JSON 对象。', '追加データは JSON オブジェクトである必要があります。'),
      );
    } catch (reason) {
      setItemDraftError(
        reason instanceof Error ? reason.message : text('Extra data must be a JSON object.', '额外数据必须是 JSON 对象。', '追加データは JSON オブジェクトである必要があります。'),
      );
      return;
    }

    setIsSavingItem(true);
    setItemDraftError(null);

    try {
      if (itemMutationState.mode === 'create') {
        const translations = buildManagedTranslations(itemDraft.nameEn, itemDraft.nameTranslations);
        const descriptionTranslations = buildManagedTranslations(
          itemDraft.descriptionEn,
          itemDraft.descriptionTranslations,
        );

        await createDictionaryItem(request, selectedType.type, {
          code: itemDraft.code.trim().toUpperCase(),
          nameEn: itemDraft.nameEn.trim(),
          nameZh: pickLegacyLocaleValue(translations, 'zh_HANS'),
          nameJa: pickLegacyLocaleValue(translations, 'ja'),
          descriptionEn: normalizeOptionalString(itemDraft.descriptionEn),
          descriptionZh: pickLegacyLocaleValue(descriptionTranslations, 'zh_HANS'),
          descriptionJa: pickLegacyLocaleValue(descriptionTranslations, 'ja'),
          translations,
          descriptionTranslations,
          sortOrder: parseSortOrder(itemDraft.sortOrder),
          extraData,
        });

        setNotice({
          tone: 'success',
          message: text(
            `${itemDraft.code.trim().toUpperCase()} item created under ${selectedType.type}.`,
            `已在 ${selectedType.type} 下创建词典项 ${itemDraft.code.trim().toUpperCase()}。`,
            `${selectedType.type} に辞書項目 ${itemDraft.code.trim().toUpperCase()} を作成しました。`,
          ),
        });
      } else if (itemMutationState.item) {
        const translations = buildManagedTranslations(itemDraft.nameEn, itemDraft.nameTranslations);
        const descriptionTranslations = buildManagedTranslations(
          itemDraft.descriptionEn,
          itemDraft.descriptionTranslations,
        );

        await updateDictionaryItem(request, selectedType.type, itemMutationState.item.id, {
          nameEn: itemDraft.nameEn.trim(),
          nameZh: pickLegacyLocaleValue(translations, 'zh_HANS'),
          nameJa: pickLegacyLocaleValue(translations, 'ja'),
          descriptionEn: normalizeOptionalString(itemDraft.descriptionEn),
          descriptionZh: pickLegacyLocaleValue(descriptionTranslations, 'zh_HANS'),
          descriptionJa: pickLegacyLocaleValue(descriptionTranslations, 'ja'),
          translations,
          descriptionTranslations,
          sortOrder: parseSortOrder(itemDraft.sortOrder),
          extraData,
          version: itemMutationState.item.version,
        });

        setNotice({
          tone: 'success',
          message: text(
            `${itemMutationState.item.code} item updated.`,
            `已更新词典项 ${itemMutationState.item.code}。`,
            `辞書項目 ${itemMutationState.item.code} を更新しました。`,
          ),
        });
      }

      setItemMutationState(null);
      setRefreshToken((current) => current + 1);
    } catch (reason) {
      setItemDraftError(getErrorMessage(reason, text('Failed to save dictionary item.', '保存词典项失败。', '辞書項目の保存に失敗しました。')));
    } finally {
      setIsSavingItem(false);
    }
  }

  async function handleToggleItemActive() {
    if (!selectedType || !confirmState || isConfirmPending) {
      return;
    }

    setIsConfirmPending(true);

    try {
      if (confirmState.nextActive) {
        await reactivateDictionaryItem(request, selectedType.type, confirmState.item.id, {
          version: confirmState.item.version,
        });
      } else {
        await deactivateDictionaryItem(request, selectedType.type, confirmState.item.id, {
          version: confirmState.item.version,
        });
      }

      setNotice({
        tone: 'success',
        message: text(
          `${confirmState.item.code} ${confirmState.nextActive ? 'reactivated' : 'deactivated'}.`,
          `${confirmState.item.code}${confirmState.nextActive ? '已重新启用。' : '已停用。'}`,
          `${confirmState.item.code} を${confirmState.nextActive ? '再有効化しました。' : '無効化しました。'}`,
        ),
      });
      setConfirmState(null);
      setRefreshToken((current) => current + 1);
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, text('Failed to update dictionary item state.', '更新词典项状态失败。', '辞書項目の状態更新に失敗しました。')),
      });
    } finally {
      setIsConfirmPending(false);
    }
  }

  if (typesPanel.loading && !typesPanel.data) {
    return (
      <div className="space-y-6">
        <GlassSurface className="p-8">
          <p className="text-sm font-medium text-slate-500">{text('Loading system dictionary…', '正在加载系统词典…', 'システム辞書を読み込んでいます…')}</p>
        </GlassSurface>
      </div>
    );
  }

  if (typesPanel.error || !typesPanel.data) {
    return (
      <StateView
        status="error"
        title={text('System dictionary unavailable', '系统词典不可用', 'システム辞書を利用できません')}
        description={typesPanel.error || text('No dictionary catalog payload was returned.', '未返回词典目录数据。', '辞書カタログの応答が返されませんでした。')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <GlassSurface className="p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              <BookText className="h-3.5 w-3.5" />
              {text('AC / System Dictionary', 'AC / 系统词典', 'AC / システム辞書')}
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold text-slate-950">{text('System Dictionary', '系统词典', 'システム辞書')}</h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                {text(
                  'Manage dictionary categories, localized labels, and item status.',
                  '管理词典分类、本地化标签与词条状态。',
                  '辞書カテゴリ、ローカライズラベル、項目状態を管理します。',
                )}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{text('Dictionary Types', '词典类型', '辞書タイプ')}</p>
              <p className="mt-2 text-base font-semibold text-slate-950">{typesPanel.data.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{text('Active Type', '当前类型', '選択中タイプ')}</p>
              <p className="mt-2 text-base font-semibold text-slate-950">{selectedType?.type || text('Unselected', '未选择', '未選択')}</p>
            </div>
          </div>
        </div>
      </GlassSurface>

      {notice ? <NoticeBanner tone={notice.tone} message={notice.message} /> : null}

      <GlassSurface className="p-6">
        <FormSection
          title={text('Dictionary Management', '词典管理', '辞書管理')}
          description={text(
            'Browse categories, edit multilingual labels, and manage item status.',
            '浏览分类、编辑多语言标签并管理词条状态。',
            'カテゴリを確認し、多言語ラベルと項目状態を管理します。',
          )}
        >
          <DictionaryExplorerPanel
            request={request}
            requestEnvelope={requestEnvelope}
            types={typesPanel.data}
            locale={currentLocale}
            copy={dictionaryExplorerCopy}
            refreshToken={refreshToken}
            allowIncludeInactiveToggle
            onTypeSelected={setSelectedType}
            intro={
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white/85 px-5 py-5 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Tags className="h-4 w-4" />
                    <p className="text-sm font-semibold">{text('Stable Dictionary Codes', '稳定词典代码', '安定した辞書コード')}</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {text(
                      'Use stable dictionary codes so labels can be updated without changing downstream pages.',
                      '使用稳定的词典代码，这样更新标签时无需改动下游页面。',
                      '安定した辞書コードを使うことで、下流ページを変更せずにラベルを更新できます。',
                    )}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/85 px-5 py-5 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-700">
                    <ShieldCheck className="h-4 w-4" />
                    <p className="text-sm font-semibold">{text('Shared Dictionary Source', '共享词典来源', '共通辞書ソース')}</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {text(
                      'Changes made here become the shared dictionary source used across the platform.',
                      '这里的更改会成为平台共用的词典来源。',
                      'ここでの変更は、プラットフォーム全体で共有される辞書ソースになります。',
                    )}
                  </p>
                </div>
              </div>
            }
            renderToolbar={(activeType) => (
              <>
                <button
                  type="button"
                  onClick={openCreateTypeDrawer}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  <Plus className="h-4 w-4" />
                  {text('New dictionary type', '新建词典类型', '新しい辞書タイプ')}
                </button>
                <button
                  type="button"
                  onClick={openCreateItemDrawer}
                  disabled={!activeType}
                  className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  {text('New item', '新建词典项', '新しい項目')}
                </button>
              </>
            )}
            renderItemActions={(item) => (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    openEditItemDrawer(item);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  {text('Edit', '编辑', '編集')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmState({
                      item,
                      nextActive: !item.isActive,
                    });
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    item.isActive
                      ? 'border border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100'
                      : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100'
                  }`}
                >
                  {item.isActive ? text('Deactivate', '停用', '無効化') : text('Reactivate', '重新启用', '再有効化')}
                </button>
              </div>
            )}
          />
        </FormSection>
      </GlassSurface>

      <ActionDrawer
        open={isTypeDrawerOpen}
        onOpenChange={(open) => {
          setIsTypeDrawerOpen(open);
          if (!open) {
            setIsTypeTranslationsOpen(false);
          }
        }}
        title={text({
          en: 'New dictionary type',
          zh_HANS: '新建词典类型',
          zh_HANT: '新增詞典類型',
          ja: '新しい辞書タイプ',
          ko: '새 사전 유형',
          fr: 'Nouveau type de dictionnaire',
        })}
        description={text({
          en: 'Create a new controlled vocabulary category with multilingual labels.',
          zh_HANS: '创建带有多语言标签的新受控词汇类型。',
          zh_HANT: '建立帶有多語言標籤的新受控詞彙類型。',
          ja: '多言語ラベルを持つ新しい管理語彙カテゴリを作成します。',
          ko: '다국어 라벨을 지원하는 새 제어 어휘 범주를 생성합니다.',
          fr: 'Créez une nouvelle catégorie de vocabulaire contrôlé avec des libellés multilingues.',
        })}
        size="lg"
        closeButtonAriaLabel={text({
          en: 'Close dictionary type drawer',
          zh_HANS: '关闭词典类型抽屉',
          zh_HANT: '關閉詞典類型抽屜',
          ja: '辞書タイプドロワーを閉じる',
          ko: '사전 유형 서랍 닫기',
          fr: 'Fermer le panneau du type de dictionnaire',
        })}
        footer={(
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setIsTypeDrawerOpen(false);
              }}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              {text({ en: 'Cancel', zh_HANS: '取消', zh_HANT: '取消', ja: 'キャンセル', ko: '취소', fr: 'Annuler' })}
            </button>
            <AsyncSubmitButton
              isPending={isSavingType}
              pendingText={text({ en: 'Creating…', zh_HANS: '创建中…', zh_HANT: '建立中…', ja: '作成中…', ko: '생성 중…', fr: 'Création…' })}
              onClick={handleCreateType}
            >
              {text({
                en: 'Create dictionary type',
                zh_HANS: '创建词典类型',
                zh_HANT: '建立詞典類型',
                ja: '辞書タイプを作成',
                ko: '사전 유형 생성',
                fr: 'Créer le type de dictionnaire',
              })}
            </AsyncSubmitButton>
          </div>
        )}
      >
        <div className="space-y-6">
          {typeDraftError ? <NoticeBanner tone="error" message={typeDraftError} /> : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>{text('Type code', '类型代码', 'タイプコード')}</span>
              <input
                aria-label={text('Dictionary type code', '词典类型代码', '辞書タイプコード')}
                value={typeDraft.code}
                onChange={(event) => setTypeDraft((current) => ({ ...current, code: event.target.value }))}
                placeholder={text('CUSTOMER_STATUS', 'CUSTOMER_STATUS', 'CUSTOMER_STATUS')}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>{text('Sort order', '排序', '表示順')}</span>
              <input
                aria-label={text('Dictionary type sort order', '词典类型排序', '辞書タイプの表示順')}
                type="number"
                min={0}
                value={typeDraft.sortOrder}
                onChange={(event) => setTypeDraft((current) => ({ ...current, sortOrder: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </label>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">
                  {text('Translation management', '翻译管理', '翻訳管理')}
                </p>
                <p className="text-sm leading-6 text-slate-600">
                  {text(
                    'Keep English in the main fields and add translated values only when needed.',
                    '主字段保留英文；只有需要额外语种时再补充翻译值。',
                    '主フィールドは英語のままにし、必要な場合のみ翻訳値を追加します。',
                  )}
                </p>
              </div>
              <TranslationManagementTrigger
                count={countManagedLocaleValues(typeTranslationSections)}
                onClick={() => setIsTypeTranslationsOpen(true)}
              />
            </div>
          </div>

          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>{text('Name (EN)', '名称（英文）', '名称（英語）')}</span>
            <input
              aria-label={text('Dictionary type English name', '词典类型英文名称', '辞書タイプの英語名')}
              value={typeDraft.nameEn}
              onChange={(event) => setTypeDraft((current) => ({ ...current, nameEn: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>{text('Description (EN)', '描述（英文）', '説明（英語）')}</span>
            <textarea
              aria-label={text('Dictionary type English description', '词典类型英文描述', '辞書タイプの英語説明')}
              value={typeDraft.descriptionEn}
              onChange={(event) => setTypeDraft((current) => ({ ...current, descriptionEn: event.target.value }))}
              rows={4}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </label>
        </div>
      </ActionDrawer>

      <TranslationManagementDrawer
        open={isTypeTranslationsOpen}
        onOpenChange={setIsTypeTranslationsOpen}
        title={text({
          en: 'Dictionary type translations',
          zh_HANS: '词典类型翻译',
          zh_HANT: '詞典類型翻譯',
          ja: '辞書タイプ翻訳',
          ko: '사전 유형 번역',
          fr: 'Traductions du type de dictionnaire',
        })}
        description={text({
          en: 'Add optional localized labels for this dictionary type.',
          zh_HANS: '为该词典类型添加可选的本地化标签。',
          zh_HANT: '為此詞典類型新增可選的本地化標籤。',
          ja: 'この辞書タイプに任意のローカライズラベルを追加します。',
          ko: '이 사전 유형에 선택적 현지화 라벨을 추가합니다.',
          fr: 'Ajoutez des libellés localisés facultatifs pour ce type de dictionnaire.',
        })}
        closeButtonAriaLabel={text({
          en: 'Close dictionary type translations drawer',
          zh_HANS: '关闭词典类型翻译抽屉',
          zh_HANT: '關閉詞典類型翻譯抽屜',
          ja: '辞書タイプ翻訳ドロワーを閉じる',
          ko: '사전 유형 번역 서랍 닫기',
          fr: 'Fermer le panneau des traductions du type de dictionnaire',
        })}
        request={request}
        requestEnvelope={requestEnvelope}
        sections={typeTranslationSections}
        onChange={(sectionId, localeCode, value) => {
          setTypeDraft((current) => {
            if (sectionId === 'description') {
              return {
                ...current,
                descriptionTranslations: {
                  ...current.descriptionTranslations,
                  [localeCode]: value,
                },
              };
            }

            return {
              ...current,
              nameTranslations: {
                ...current.nameTranslations,
                [localeCode]: value,
              },
            };
          });
        }}
      />

      <ActionDrawer
        open={itemMutationState !== null}
        onOpenChange={(open) => {
          if (!open) {
            setItemMutationState(null);
            setIsItemTranslationsOpen(false);
          }
        }}
        title={itemMutationState?.mode === 'edit'
          ? text({
              en: 'Edit dictionary item',
              zh_HANS: '编辑词典项',
              zh_HANT: '編輯詞典項',
              ja: '辞書項目を編集',
              ko: '사전 항목 편집',
              fr: 'Modifier l’élément du dictionnaire',
            })
          : text({
              en: 'New dictionary item',
              zh_HANS: '新建词典项',
              zh_HANT: '新增詞典項',
              ja: '新しい辞書項目',
              ko: '새 사전 항목',
              fr: 'Nouvel élément du dictionnaire',
            })}
        description={
          itemMutationState?.mode === 'edit'
            ? text('Update multilingual labels, descriptions, ordering, and structured extra data.', '更新多语言标签、描述、排序和结构化额外数据。', '多言語ラベル、説明、順序、構造化追加データを更新します。')
            : text(
                `Create a new item inside ${selectedType?.type || 'the selected dictionary'}.`,
                `在 ${selectedType?.type || '当前词典'} 中创建新的词典项。`,
                `${selectedType?.type || '選択中の辞書'} に新しい項目を作成します。`,
              )
        }
        size="xl"
        closeButtonAriaLabel={text({
          en: 'Close dictionary item drawer',
          zh_HANS: '关闭词典项抽屉',
          zh_HANT: '關閉詞典項抽屜',
          ja: '辞書項目ドロワーを閉じる',
          ko: '사전 항목 서랍 닫기',
          fr: 'Fermer le panneau de l’élément du dictionnaire',
        })}
        footer={(
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setItemMutationState(null);
              }}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              {text({ en: 'Cancel', zh_HANS: '取消', zh_HANT: '取消', ja: 'キャンセル', ko: '취소', fr: 'Annuler' })}
            </button>
            <AsyncSubmitButton
              isPending={isSavingItem}
              pendingText={text({ en: 'Saving…', zh_HANS: '保存中…', zh_HANT: '儲存中…', ja: '保存中…', ko: '저장 중…', fr: 'Enregistrement…' })}
              onClick={handleSaveItem}
            >
              {itemMutationState?.mode === 'edit'
                ? text({ en: 'Save item', zh_HANS: '保存词典项', zh_HANT: '儲存詞典項', ja: '項目を保存', ko: '항목 저장', fr: 'Enregistrer l’élément' })
                : text({ en: 'Create item', zh_HANS: '创建词典项', zh_HANT: '建立詞典項', ja: '項目を作成', ko: '항목 생성', fr: 'Créer l’élément' })}
            </AsyncSubmitButton>
          </div>
        )}
      >
        <div className="space-y-6">
          {itemDraftError ? <NoticeBanner tone="error" message={itemDraftError} /> : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>{text('Item code', '词典项代码', '項目コード')}</span>
              <input
                aria-label={text('Dictionary item code', '词典项代码', '辞書項目コード')}
                value={itemDraft.code}
                onChange={(event) => setItemDraft((current) => ({ ...current, code: event.target.value }))}
                disabled={itemMutationState?.mode === 'edit'}
                placeholder={text('ACTIVE', 'ACTIVE', 'ACTIVE')}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>{text('Sort order', '排序', '表示順')}</span>
              <input
                aria-label={text('Dictionary item sort order', '词典项排序', '辞書項目の表示順')}
                type="number"
                min={0}
                value={itemDraft.sortOrder}
                onChange={(event) => setItemDraft((current) => ({ ...current, sortOrder: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </label>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">
                  {text('Translation management', '翻译管理', '翻訳管理')}
                </p>
                <p className="text-sm leading-6 text-slate-600">
                  {text(
                    'Keep English as the base value and add translated values only when needed.',
                    '英文作为基础值；只有需要额外语种时再补充翻译值。',
                    '英語を基準値として保持し、必要な場合のみ翻訳値を追加します。',
                  )}
                </p>
              </div>
              <TranslationManagementTrigger
                count={countManagedLocaleValues(itemTranslationSections)}
                onClick={() => setIsItemTranslationsOpen(true)}
              />
            </div>
          </div>

          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>{text('Name (EN)', '名称（英文）', '名称（英語）')}</span>
            <input
              aria-label={text('Dictionary item English name', '词典项英文名称', '辞書項目の英語名')}
              value={itemDraft.nameEn}
              onChange={(event) => setItemDraft((current) => ({ ...current, nameEn: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>{text('Description (EN)', '描述（英文）', '説明（英語）')}</span>
            <textarea
              aria-label={text('Dictionary item English description', '词典项英文描述', '辞書項目の英語説明')}
              value={itemDraft.descriptionEn}
              onChange={(event) => setItemDraft((current) => ({ ...current, descriptionEn: event.target.value }))}
              rows={4}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>{text('Extra data (JSON object)', '额外数据（JSON 对象）', '追加データ（JSON オブジェクト）')}</span>
            <textarea
              aria-label={text('Dictionary item extra data', '词典项额外数据', '辞書項目の追加データ')}
              value={itemDraft.extraDataJson}
              onChange={(event) => setItemDraft((current) => ({ ...current, extraDataJson: event.target.value }))}
              rows={8}
              placeholder={text('{\n  "color": "#4f46e5"\n}', '{\n  "color": "#4f46e5"\n}', '{\n  "color": "#4f46e5"\n}')}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm text-slate-900 shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </label>
        </div>
      </ActionDrawer>

      <TranslationManagementDrawer
        open={isItemTranslationsOpen}
        onOpenChange={setIsItemTranslationsOpen}
        title={text({
          en: 'Dictionary item translations',
          zh_HANS: '词典项翻译',
          zh_HANT: '詞典項翻譯',
          ja: '辞書項目翻訳',
          ko: '사전 항목 번역',
          fr: 'Traductions de l’élément du dictionnaire',
        })}
        description={text({
          en: 'Add optional localized labels and descriptions for this dictionary item.',
          zh_HANS: '为该词典项补充可选的本地化名称与描述。',
          zh_HANT: '為此詞典項補充可選的本地化名稱與描述。',
          ja: 'この辞書項目に任意のローカライズ名と説明を追加します。',
          ko: '이 사전 항목에 선택적 현지화 이름과 설명을 추가합니다.',
          fr: 'Ajoutez des libellés et descriptions localisés facultatifs pour cet élément.',
        })}
        closeButtonAriaLabel={text({
          en: 'Close dictionary item translations drawer',
          zh_HANS: '关闭词典项翻译抽屉',
          zh_HANT: '關閉詞典項翻譯抽屜',
          ja: '辞書項目翻訳ドロワーを閉じる',
          ko: '사전 항목 번역 서랍 닫기',
          fr: 'Fermer le panneau des traductions de l’élément du dictionnaire',
        })}
        request={request}
        requestEnvelope={requestEnvelope}
        sections={itemTranslationSections}
        onChange={(sectionId, localeCode, value) => {
          setItemDraft((current) => {
            if (sectionId === 'description') {
              return {
                ...current,
                descriptionTranslations: {
                  ...current.descriptionTranslations,
                  [localeCode]: value,
                },
              };
            }

            return {
              ...current,
              nameTranslations: {
                ...current.nameTranslations,
                [localeCode]: value,
              },
            };
          });
        }}
      />

      <ConfirmActionDialog
        open={confirmState !== null}
        title={confirmState?.nextActive ? text('Reactivate dictionary item', '重新启用词典项', '辞書項目を再有効化') : text('Deactivate dictionary item', '停用词典项', '辞書項目を無効化')}
        description={
          confirmState ? (
            <div className="space-y-2">
              <p>
                {confirmState.nextActive
                  ? text(
                      `Restore ${confirmState.item.code} so downstream modules can consume it again.`,
                      `恢复 ${confirmState.item.code}，使下游模块可以再次使用该项。`,
                      `${confirmState.item.code} を復元し、下流モジュールが再び利用できるようにします。`,
                    )
                  : text(
                      `Deactivate ${confirmState.item.code} without changing its stable reference code.`,
                      `停用 ${confirmState.item.code}，但不改变其稳定引用代码。`,
                      `${confirmState.item.code} を安定参照コードを変えずに無効化します。`,
                    )}
              </p>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                {selectedType?.type || confirmState.item.dictionaryCode}
              </p>
            </div>
          ) : (
            ''
          )
        }
        confirmText={confirmState?.nextActive ? text('Reactivate', '重新启用', '再有効化') : text('Deactivate', '停用', '無効化')}
        intent={confirmState?.nextActive ? 'primary' : 'danger'}
        isPending={isConfirmPending}
        onConfirm={() => {
          void handleToggleItemActive();
        }}
        onCancel={() => {
          setConfirmState(null);
        }}
      />
    </div>
  );
}
