'use client';

import {
  resolveTrilingualLocaleFamily,
  type SupportedUiLocale,
} from '@tcrn/shared';
import { ArrowLeft, Building2, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import {
  createCompanyCustomer,
  createCustomerMembership,
  createIndividualCustomer,
  type CustomerMembershipClassOption,
  type CustomerProfileType,
  type CustomerSocialPlatformOption,
  listCustomerMembershipTree,
  listCustomerSocialPlatforms,
} from '@/domains/customer-management/api/customer.api';
import { ApiRequestError } from '@/platform/http/api';
import { useRuntimeLocale } from '@/platform/runtime/locale/locale-provider';
import { pickLocaleText } from '@/platform/runtime/locale/locale-text';
import { useSession } from '@/platform/runtime/session/session-provider';
import { AsyncSubmitButton, GlassSurface } from '@/platform/ui';

interface CustomerCreateScreenProps {
  tenantId: string;
  talentId: string;
}

interface CustomerDraft {
  nickname: string;
  primaryLanguage: SupportedUiLocale;
  notes: string;
  companyLegalName: string;
  companyShortName: string;
}

interface MembershipDraft {
  enabled: boolean;
  platformCode: string;
  membershipClassCode: string;
  membershipTypeCode: string;
  membershipLevelCode: string;
  validFrom: string;
  validTo: string;
  autoRenew: boolean;
  note: string;
}

interface MembershipOptionsState {
  platforms: CustomerSocialPlatformOption[];
  classes: CustomerMembershipClassOption[];
  loading: boolean;
  error: string | null;
}

type CustomerCreateLocaleText = Parameters<typeof pickLocaleText>[1];

const DEFAULT_DRAFT: CustomerDraft = {
  nickname: '',
  primaryLanguage: 'zh_HANS',
  notes: '',
  companyLegalName: '',
  companyShortName: '',
};

const CUSTOMER_LANGUAGE_OPTIONS: SupportedUiLocale[] = ['zh_HANS', 'zh_HANT', 'en', 'ja', 'ko', 'fr'];

function buildDefaultMembershipDraft(): MembershipDraft {
  return {
    enabled: false,
    platformCode: '',
    membershipClassCode: '',
    membershipTypeCode: '',
    membershipLevelCode: '',
    validFrom: new Date().toISOString().slice(0, 10),
    validTo: '',
    autoRenew: false,
    note: '',
  };
}

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiRequestError ? reason.message : fallback;
}

function pickText(locale: SupportedUiLocale, value: CustomerCreateLocaleText) {
  return pickLocaleText(locale, value);
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

function pickLocalizedName(
  locale: SupportedUiLocale,
  record: {
    code: string;
    name?: string | null;
    nameEn?: string | null;
    nameZh?: string | null;
    nameJa?: string | null;
  },
) {
  return pickLocaleText(locale, {
    en: record.nameEn || record.name || record.code,
    zh_HANS: record.nameZh || record.name || record.nameEn || record.code,
    zh_HANT: record.nameZh || record.name || record.nameEn || record.code,
    ja: record.nameJa || record.name || record.nameEn || record.code,
    ko: record.name || record.nameEn || record.code,
    fr: record.name || record.nameEn || record.code,
  });
}

function getLocalizedLanguageOptionLabel(locale: SupportedUiLocale, value: SupportedUiLocale) {
  switch (value) {
    case 'zh_HANS':
      return pickLocaleText(locale, {
        en: 'Simplified Chinese',
        zh_HANS: '简体中文',
        zh_HANT: '簡體中文',
        ja: '簡体字中国語',
        ko: '중국어(간체)',
        fr: 'Chinois simplifié',
      });
    case 'zh_HANT':
      return pickLocaleText(locale, {
        en: 'Traditional Chinese',
        zh_HANS: '繁体中文',
        zh_HANT: '繁體中文',
        ja: '繁体字中国語',
        ko: '중국어(번체)',
        fr: 'Chinois traditionnel',
      });
    case 'ja':
      return pickLocaleText(locale, {
        en: 'Japanese',
        zh_HANS: '日语',
        zh_HANT: '日語',
        ja: '日本語',
        ko: '일본어',
        fr: 'Japonais',
      });
    case 'ko':
      return pickLocaleText(locale, {
        en: 'Korean',
        zh_HANS: '韩语',
        zh_HANT: '韓語',
        ja: '韓国語',
        ko: '한국어',
        fr: 'Coréen',
      });
    case 'fr':
      return pickLocaleText(locale, {
        en: 'French',
        zh_HANS: '法语',
        zh_HANT: '法語',
        ja: 'フランス語',
        ko: '프랑스어',
        fr: 'Français',
      });
    case 'en':
    default:
      return pickLocaleText(locale, {
        en: 'English',
        zh_HANS: '英语',
        zh_HANT: '英語',
        ja: '英語',
        ko: '영어',
        fr: 'Anglais',
      });
  }
}

export function CustomerCreateScreen({
  tenantId,
  talentId,
}: Readonly<CustomerCreateScreenProps>) {
  const router = useRouter();
  const { currentLocale, selectedLocale } = useRuntimeLocale();
  const effectiveSelectedLocale = getEffectiveSelectedLocale(currentLocale, selectedLocale);
  const { request } = useSession();
  const [profileType, setProfileType] = useState<CustomerProfileType>('individual');
  const [draft, setDraft] = useState<CustomerDraft>(DEFAULT_DRAFT);
  const [membershipDraft, setMembershipDraft] = useState<MembershipDraft>(() => buildDefaultMembershipDraft());
  const [membershipOptions, setMembershipOptions] = useState<MembershipOptionsState>({
    platforms: [],
    classes: [],
    loading: true,
    error: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMembershipOptions() {
      setMembershipOptions((current) => ({
        ...current,
        loading: true,
        error: null,
      }));

      try {
        const [platforms, classes] = await Promise.all([
          listCustomerSocialPlatforms(request),
          listCustomerMembershipTree(request, talentId),
        ]);

        if (cancelled) {
          return;
        }

        setMembershipOptions({
          platforms,
          classes,
          loading: false,
          error: null,
        });
      } catch (reason) {
        if (cancelled) {
          return;
        }

        setMembershipOptions({
          platforms: [],
          classes: [],
          loading: false,
          error: getErrorMessage(
            reason,
            pickText(
              effectiveSelectedLocale,
              {
                en: 'Membership options are temporarily unavailable.',
                zh_HANS: '会员选项暂时不可用。',
                zh_HANT: '會員選項暫時不可用。',
                ja: '会員オプションを一時的に利用できません。',
                ko: '멤버십 옵션을 일시적으로 사용할 수 없습니다.',
                fr: 'Les options d’adhésion sont temporairement indisponibles.',
              },
            ),
          ),
        });
      }
    }

    void loadMembershipOptions();

    return () => {
      cancelled = true;
    };
  }, [effectiveSelectedLocale, request, talentId]);

  const membershipClassOptions = useMemo(
    () =>
      membershipOptions.classes.map((membershipClass) => ({
        ...membershipClass,
        label: pickLocalizedName(effectiveSelectedLocale, membershipClass),
      })),
    [effectiveSelectedLocale, membershipOptions.classes],
  );

  const selectedMembershipClass = useMemo(
    () =>
      membershipOptions.classes.find(
        (membershipClass) => membershipClass.code === membershipDraft.membershipClassCode,
      ) ?? null,
    [membershipDraft.membershipClassCode, membershipOptions.classes],
  );

  const membershipTypeOptions = useMemo(
    () =>
      (selectedMembershipClass?.types ?? []).map((membershipType) => ({
        ...membershipType,
        label: pickLocalizedName(effectiveSelectedLocale, membershipType),
      })),
    [effectiveSelectedLocale, selectedMembershipClass],
  );

  const selectedMembershipType = useMemo(
    () =>
      selectedMembershipClass?.types.find(
        (membershipType) => membershipType.code === membershipDraft.membershipTypeCode,
      ) ?? null,
    [membershipDraft.membershipTypeCode, selectedMembershipClass],
  );

  const membershipLevelOptions = useMemo(
    () =>
      (selectedMembershipType?.levels ?? []).map((level) => ({
        ...level,
        label: pickLocalizedName(effectiveSelectedLocale, level),
      })),
    [effectiveSelectedLocale, selectedMembershipType],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nickname = draft.nickname.trim();
    const companyLegalName = draft.companyLegalName.trim();

    if (!nickname) {
      setErrorMessage(
        pickText(effectiveSelectedLocale, {
          en: 'Customer name is required.',
          zh_HANS: '客户名称不能为空。',
          zh_HANT: '客戶名稱不能為空。',
          ja: '顧客名は必須です。',
          ko: '고객 이름은 필수입니다.',
          fr: 'Le nom du client est obligatoire.',
        }),
      );
      return;
    }

    if (profileType === 'company' && !companyLegalName) {
      setErrorMessage(
        pickText(effectiveSelectedLocale, {
          en: 'Company legal name is required.',
          zh_HANS: '企业法定名称不能为空。',
          zh_HANT: '企業法定名稱不能為空。',
          ja: '会社の正式名称は必須です。',
          ko: '회사 법적 명칭은 필수입니다.',
          fr: 'La raison sociale est obligatoire.',
        }),
      );
      return;
    }

    if (membershipDraft.enabled) {
      if (
        !membershipDraft.platformCode
        || !membershipDraft.membershipClassCode
        || !membershipDraft.membershipTypeCode
        || !membershipDraft.membershipLevelCode
        || !membershipDraft.validFrom
      ) {
        setErrorMessage(
          pickText(
            effectiveSelectedLocale,
            {
              en: 'Platform, membership class, type, level, and valid-from date are required when adding membership.',
              zh_HANS: '添加会员时，平台、会员分类、会员类型、会员等级和生效日期为必填项。',
              zh_HANT: '新增會員時，平台、會員分類、會員類型、會員等級與生效日期為必填項。',
              ja: '会員を追加する場合、プラットフォーム、会員クラス、会員タイプ、会員レベル、有効開始日は必須です。',
              ko: '멤버십을 추가하려면 플랫폼, 멤버십 분류, 유형, 등급, 시작일이 필요합니다.',
              fr: 'La plateforme, la classe, le type, le niveau d’adhésion et la date de début sont requis pour ajouter une adhésion.',
            },
          ),
        );
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let createdCustomerId: string;

      if (profileType === 'company') {
        const created = await createCompanyCustomer(request, talentId, {
          nickname,
          primaryLanguage: draft.primaryLanguage || undefined,
          notes: draft.notes.trim() || undefined,
          companyLegalName,
          companyShortName: draft.companyShortName.trim() || undefined,
        });
        createdCustomerId = created.id;
      } else {
        const created = await createIndividualCustomer(request, talentId, {
          nickname,
          primaryLanguage: draft.primaryLanguage || undefined,
          notes: draft.notes.trim() || undefined,
        });
        createdCustomerId = created.id;
      }

      if (membershipDraft.enabled) {
        try {
          await createCustomerMembership(request, talentId, createdCustomerId, {
            platformCode: membershipDraft.platformCode,
            membershipLevelCode: membershipDraft.membershipLevelCode,
            validFrom: membershipDraft.validFrom,
            validTo: membershipDraft.validTo || undefined,
            autoRenew: membershipDraft.autoRenew,
            note: membershipDraft.note.trim() || undefined,
          });
        } catch (reason) {
          setErrorMessage(
            getErrorMessage(
              reason,
              pickText(
                effectiveSelectedLocale,
                {
                  en: 'Customer was created, but the membership record could not be saved. Please open the customer list and complete membership setup there.',
                  zh_HANS: '客户已创建，但会员记录保存失败。请进入客户列表后补充会员信息。',
                  zh_HANT: '客戶已建立，但會員記錄保存失敗。請進入客戶列表後補充會員資訊。',
                  ja: '顧客は作成されましたが、会員記録を保存できませんでした。顧客一覧から会員設定を完了してください。',
                  ko: '고객은 생성되었지만 멤버십 기록을 저장하지 못했습니다. 고객 목록에서 멤버십 설정을 완료해 주세요.',
                  fr: 'Le client a bien été créé, mais l’adhésion n’a pas pu être enregistrée. Ouvrez la liste des clients pour terminer la configuration.',
                },
              ),
            ),
          );
          return;
        }
      }

      router.replace(
        `/tenant/${tenantId}/talent/${talentId}/customers?created=${encodeURIComponent(nickname)}`,
      );
    } catch (reason) {
      setErrorMessage(
        getErrorMessage(
          reason,
          pickText(
            effectiveSelectedLocale,
            {
              en: 'Failed to create customer.',
              zh_HANS: '创建客户失败。',
              zh_HANT: '建立客戶失敗。',
              ja: '顧客の作成に失敗しました。',
              ko: '고객을 생성하지 못했습니다.',
              fr: 'La création du client a échoué.',
            },
          ),
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <GlassSurface className="p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              {profileType === 'company' ? <Building2 className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}
              {pickText(effectiveSelectedLocale, {
                en: 'Customer creation',
                zh_HANS: '创建客户',
                zh_HANT: '建立客戶',
                ja: '顧客を作成',
                ko: '고객 생성',
                fr: 'Création client',
              })}
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold text-slate-950">
                {pickText(effectiveSelectedLocale, {
                  en: 'Add customer',
                  zh_HANS: '添加客户',
                  zh_HANT: '新增客戶',
                  ja: '顧客を追加',
                  ko: '고객 추가',
                  fr: 'Ajouter un client',
                })}
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                {pickText(
                  effectiveSelectedLocale,
                  {
                    en: 'Create a new individual or company customer for this talent.',
                    zh_HANS: '为当前艺人创建新的个人客户或企业客户。',
                    zh_HANT: '為目前藝人建立新的個人客戶或企業客戶。',
                    ja: 'このタレント向けに個人顧客または法人顧客を作成します。',
                    ko: '이 탤런트에 연결할 개인 또는 법인 고객을 생성합니다.',
                    fr: 'Créez un nouveau client individuel ou entreprise pour ce talent.',
                  },
                )}
              </p>
            </div>
          </div>

          <Link
            href={`/tenant/${tenantId}/talent/${talentId}/customers`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            {pickText(effectiveSelectedLocale, {
              en: 'Back to customers',
              zh_HANS: '返回客户列表',
              zh_HANT: '返回客戶列表',
              ja: '顧客一覧へ戻る',
              ko: '고객 목록으로 돌아가기',
              fr: 'Retour aux clients',
            })}
          </Link>
        </div>
      </GlassSurface>

      <GlassSurface className="p-6">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-900">
              {pickText(effectiveSelectedLocale, {
                en: 'Customer type',
                zh_HANS: '客户类型',
                zh_HANT: '客戶類型',
                ja: '顧客タイプ',
                ko: '고객 유형',
                fr: 'Type de client',
              })}
            </p>
            <div className="flex flex-wrap gap-3">
              {([
                {
                  key: 'individual',
                  label: pickText(effectiveSelectedLocale, {
                    en: 'Individual',
                    zh_HANS: '个人客户',
                    zh_HANT: '個人客戶',
                    ja: '個人顧客',
                    ko: '개인 고객',
                    fr: 'Client individuel',
                  }),
                },
                {
                  key: 'company',
                  label: pickText(effectiveSelectedLocale, {
                    en: 'Company',
                    zh_HANS: '企业客户',
                    zh_HANT: '企業客戶',
                    ja: '法人顧客',
                    ko: '법인 고객',
                    fr: 'Client entreprise',
                  }),
                },
              ] as const).map((option) => {
                const isActive = profileType === option.key;

                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setProfileType(option.key)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      isActive
                        ? 'border-slate-950 bg-slate-950 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">
                {pickText(effectiveSelectedLocale, {
                  en: 'Customer name',
                  zh_HANS: '客户名称',
                  zh_HANT: '客戶名稱',
                  ja: '顧客名',
                  ko: '고객 이름',
                  fr: 'Nom du client',
                })}
              </span>
              <input
                value={draft.nickname}
                onChange={(event) => setDraft((current) => ({ ...current, nickname: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                placeholder={pickText(effectiveSelectedLocale, {
                  en: 'Ari',
                  zh_HANS: '例如：小悠',
                  zh_HANT: '例如：小悠',
                  ja: '例: Ari',
                  ko: '예: Ari',
                  fr: 'Ex. : Ari',
                })}
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">
                {pickText(effectiveSelectedLocale, {
                  en: 'Primary language',
                  zh_HANS: '主要语言',
                  zh_HANT: '主要語言',
                  ja: '主要言語',
                  ko: '기본 언어',
                  fr: 'Langue principale',
                })}
              </span>
              <select
                value={draft.primaryLanguage}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    primaryLanguage: event.target.value as SupportedUiLocale,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              >
                {CUSTOMER_LANGUAGE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {getLocalizedLanguageOptionLabel(effectiveSelectedLocale, option)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {profileType === 'company' ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-900">
                  {pickText(effectiveSelectedLocale, {
                    en: 'Company legal name',
                    zh_HANS: '企业法定名称',
                    zh_HANT: '企業法定名稱',
                    ja: '会社の正式名称',
                    ko: '회사 법적 명칭',
                    fr: 'Raison sociale',
                  })}
                </span>
                <input
                  value={draft.companyLegalName}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, companyLegalName: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  placeholder={pickText(effectiveSelectedLocale, {
                    en: 'Acme Corporation',
                    zh_HANS: '例如：极光传媒有限公司',
                    zh_HANT: '例如：極光傳媒有限公司',
                    ja: '例: Acme Corporation',
                    ko: '예: Acme Corporation',
                    fr: 'Ex. : Acme Corporation',
                  })}
                  required
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-900">
                  {pickText(effectiveSelectedLocale, {
                    en: 'Company short name',
                    zh_HANS: '企业简称',
                    zh_HANT: '企業簡稱',
                    ja: '会社略称',
                    ko: '회사 약칭',
                    fr: 'Nom court',
                  })}
                </span>
                <input
                  value={draft.companyShortName}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, companyShortName: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  placeholder={pickText(effectiveSelectedLocale, {
                    en: 'Acme',
                    zh_HANS: '例如：极光传媒',
                    zh_HANT: '例如：極光傳媒',
                    ja: '例: Acme',
                    ko: '예: Acme',
                    fr: 'Ex. : Acme',
                  })}
                />
              </label>
            </div>
          ) : null}

          <div className="space-y-4 rounded-[28px] border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">
                  {pickText(effectiveSelectedLocale, {
                    en: 'Membership setup',
                    zh_HANS: '会员信息',
                    zh_HANT: '會員資訊',
                    ja: '会員情報',
                    ko: '멤버십 정보',
                    fr: 'Adhésion',
                  })}
                </p>
                <p className="text-sm leading-6 text-slate-600">
                  {pickText(
                    effectiveSelectedLocale,
                    {
                      en: 'Optionally assign the first platform membership while creating this customer.',
                      zh_HANS: '可在创建客户时一并设置首条平台会员记录。',
                      zh_HANT: '建立客戶時可一併設定第一筆平台會員記錄。',
                      ja: '顧客作成時に最初のプラットフォーム会員情報を任意で追加できます。',
                      ko: '고객 생성과 함께 첫 번째 플랫폼 멤버십을 선택적으로 추가할 수 있습니다.',
                      fr: 'Vous pouvez également attribuer la première adhésion à une plateforme lors de la création du client.',
                    },
                  )}
                </p>
              </div>

              <label className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm">
                <input
                  type="checkbox"
                  checked={membershipDraft.enabled}
                  onChange={(event) =>
                    setMembershipDraft((current) => ({
                      ...current,
                      enabled: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>{pickText(effectiveSelectedLocale, {
                  en: 'Add membership now',
                  zh_HANS: '现在添加会员',
                  zh_HANT: '現在新增會員',
                  ja: '今すぐ会員を追加',
                  ko: '지금 멤버십 추가',
                  fr: 'Ajouter une adhésion maintenant',
                })}</span>
              </label>
            </div>

            {membershipDraft.enabled ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {pickText(effectiveSelectedLocale, {
                      en: 'Platform',
                      zh_HANS: '平台',
                      zh_HANT: '平台',
                      ja: 'プラットフォーム',
                      ko: '플랫폼',
                      fr: 'Plateforme',
                    })}
                  </span>
                  <select
                    value={membershipDraft.platformCode}
                    onChange={(event) =>
                      setMembershipDraft((current) => ({
                        ...current,
                        platformCode: event.target.value,
                      }))
                    }
                    disabled={membershipOptions.loading || membershipOptions.platforms.length === 0}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="">
                      {membershipOptions.loading
                        ? pickText(effectiveSelectedLocale, {
                            en: 'Loading platforms…',
                            zh_HANS: '正在加载平台…',
                            zh_HANT: '正在載入平台…',
                            ja: 'プラットフォームを読み込み中…',
                            ko: '플랫폼을 불러오는 중…',
                            fr: 'Chargement des plateformes…',
                          })
                        : pickText(effectiveSelectedLocale, {
                            en: 'Select a platform',
                            zh_HANS: '选择平台',
                            zh_HANT: '選擇平台',
                            ja: 'プラットフォームを選択',
                            ko: '플랫폼 선택',
                            fr: 'Sélectionner une plateforme',
                          })}
                    </option>
                    {membershipOptions.platforms.map((platform) => (
                      <option key={platform.id} value={platform.code}>
                        {pickLocalizedName(effectiveSelectedLocale, platform)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {pickText(effectiveSelectedLocale, {
                      en: 'Membership class',
                      zh_HANS: '会员分类',
                      zh_HANT: '會員分類',
                      ja: '会員クラス',
                      ko: '멤버십 분류',
                      fr: 'Classe d’adhésion',
                    })}
                  </span>
                  <select
                    value={membershipDraft.membershipClassCode}
                    onChange={(event) =>
                      setMembershipDraft((current) => ({
                        ...current,
                        membershipClassCode: event.target.value,
                        membershipTypeCode: '',
                        membershipLevelCode: '',
                      }))
                    }
                    disabled={membershipOptions.loading || membershipClassOptions.length === 0}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="">
                      {membershipOptions.loading
                        ? pickText(effectiveSelectedLocale, {
                            en: 'Loading membership classes…',
                            zh_HANS: '正在加载会员分类…',
                            zh_HANT: '正在載入會員分類…',
                            ja: '会員クラスを読み込み中…',
                            ko: '멤버십 분류를 불러오는 중…',
                            fr: 'Chargement des classes d’adhésion…',
                          })
                        : pickText(effectiveSelectedLocale, {
                            en: 'Select a membership class',
                            zh_HANS: '选择会员分类',
                            zh_HANT: '選擇會員分類',
                            ja: '会員クラスを選択',
                            ko: '멤버십 분류 선택',
                            fr: 'Sélectionner une classe d’adhésion',
                          })}
                    </option>
                    {membershipClassOptions.map((membershipClass) => (
                      <option key={membershipClass.id} value={membershipClass.code}>
                        {membershipClass.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {pickText(effectiveSelectedLocale, {
                      en: 'Membership type',
                      zh_HANS: '会员类型',
                      zh_HANT: '會員類型',
                      ja: '会員タイプ',
                      ko: '멤버십 유형',
                      fr: 'Type d’adhésion',
                    })}
                  </span>
                  <select
                    value={membershipDraft.membershipTypeCode}
                    onChange={(event) =>
                      setMembershipDraft((current) => ({
                        ...current,
                        membershipTypeCode: event.target.value,
                        membershipLevelCode: '',
                      }))
                    }
                    disabled={
                      membershipOptions.loading
                      || !membershipDraft.membershipClassCode
                      || membershipTypeOptions.length === 0
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="">
                      {membershipOptions.loading
                        ? pickText(effectiveSelectedLocale, {
                            en: 'Loading membership types…',
                            zh_HANS: '正在加载会员类型…',
                            zh_HANT: '正在載入會員類型…',
                            ja: '会員タイプを読み込み中…',
                            ko: '멤버십 유형을 불러오는 중…',
                            fr: 'Chargement des types d’adhésion…',
                          })
                        : !membershipDraft.membershipClassCode
                          ? pickText(effectiveSelectedLocale, {
                              en: 'Select a membership class first',
                              zh_HANS: '请先选择会员分类',
                              zh_HANT: '請先選擇會員分類',
                              ja: '先に会員クラスを選択してください',
                              ko: '먼저 멤버십 분류를 선택하세요',
                              fr: 'Sélectionnez d’abord une classe d’adhésion',
                            })
                          : pickText(effectiveSelectedLocale, {
                              en: 'Select a membership type',
                              zh_HANS: '选择会员类型',
                              zh_HANT: '選擇會員類型',
                              ja: '会員タイプを選択',
                              ko: '멤버십 유형 선택',
                              fr: 'Sélectionner un type d’adhésion',
                            })}
                    </option>
                    {membershipTypeOptions.map((membershipType) => (
                      <option key={membershipType.id} value={membershipType.code}>
                        {membershipType.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {pickText(effectiveSelectedLocale, {
                      en: 'Membership level',
                      zh_HANS: '会员等级',
                      zh_HANT: '會員等級',
                      ja: '会員レベル',
                      ko: '멤버십 등급',
                      fr: 'Niveau d’adhésion',
                    })}
                  </span>
                  <select
                    value={membershipDraft.membershipLevelCode}
                    onChange={(event) =>
                      setMembershipDraft((current) => ({
                        ...current,
                        membershipLevelCode: event.target.value,
                      }))
                    }
                    disabled={
                      membershipOptions.loading
                      || !membershipDraft.membershipTypeCode
                      || membershipLevelOptions.length === 0
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="">
                      {membershipOptions.loading
                        ? pickText(effectiveSelectedLocale, {
                            en: 'Loading membership levels…',
                            zh_HANS: '正在加载会员等级…',
                            zh_HANT: '正在載入會員等級…',
                            ja: '会員レベルを読み込み中…',
                            ko: '멤버십 등급을 불러오는 중…',
                            fr: 'Chargement des niveaux d’adhésion…',
                          })
                        : !membershipDraft.membershipTypeCode
                          ? pickText(effectiveSelectedLocale, {
                              en: 'Select a membership type first',
                              zh_HANS: '请先选择会员类型',
                              zh_HANT: '請先選擇會員類型',
                              ja: '先に会員タイプを選択してください',
                              ko: '먼저 멤버십 유형을 선택하세요',
                              fr: 'Sélectionnez d’abord un type d’adhésion',
                            })
                          : pickText(effectiveSelectedLocale, {
                              en: 'Select a membership level',
                              zh_HANS: '选择会员等级',
                              zh_HANT: '選擇會員等級',
                              ja: '会員レベルを選択',
                              ko: '멤버십 등급 선택',
                              fr: 'Sélectionner un niveau d’adhésion',
                            })}
                    </option>
                    {membershipLevelOptions.map((level) => (
                      <option key={level.id} value={level.code}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {pickText(effectiveSelectedLocale, {
                      en: 'Valid from',
                      zh_HANS: '生效开始',
                      zh_HANT: '生效開始',
                      ja: '有効開始',
                      ko: '시작일',
                      fr: 'Valide à partir du',
                    })}
                  </span>
                  <input
                    type="date"
                    value={membershipDraft.validFrom}
                    onChange={(event) =>
                      setMembershipDraft((current) => ({
                        ...current,
                        validFrom: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {pickText(effectiveSelectedLocale, {
                      en: 'Valid to',
                      zh_HANS: '生效结束',
                      zh_HANT: '生效結束',
                      ja: '有効終了',
                      ko: '종료일',
                      fr: 'Valide jusqu’au',
                    })}
                  </span>
                  <input
                    type="date"
                    value={membershipDraft.validTo}
                    onChange={(event) =>
                      setMembershipDraft((current) => ({
                        ...current,
                        validTo: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={membershipDraft.autoRenew}
                    onChange={(event) =>
                      setMembershipDraft((current) => ({
                        ...current,
                        autoRenew: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{pickText(effectiveSelectedLocale, {
                    en: 'Enable auto-renew',
                    zh_HANS: '启用自动续期',
                    zh_HANT: '啟用自動續期',
                    ja: '自動更新を有効化',
                    ko: '자동 갱신 사용',
                    fr: 'Activer le renouvellement automatique',
                  })}</span>
                </label>

                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
                  {membershipOptions.loading
                    ? pickText(effectiveSelectedLocale, {
                        en: 'Loading available membership options…',
                        zh_HANS: '正在加载可用会员选项…',
                        zh_HANT: '正在載入可用會員選項…',
                        ja: '利用可能な会員オプションを読み込み中…',
                        ko: '사용 가능한 멤버십 옵션을 불러오는 중…',
                        fr: 'Chargement des options d’adhésion disponibles…',
                      })
                    : membershipOptions.error
                      ? membershipOptions.error
                      : pickText(
                          effectiveSelectedLocale,
                          {
                            en: 'Membership choices come from the current tenant/talent configuration scope.',
                            zh_HANS: '会员选项来自当前租户/艺人的配置作用域。',
                            zh_HANT: '會員選項來自目前租戶／藝人的設定範圍。',
                            ja: '会員候補は現在のテナント/タレント設定スコープから取得されます。',
                            ko: '멤버십 선택지는 현재 테넌트/탤런트 설정 범위에서 가져옵니다.',
                            fr: 'Les options d’adhésion proviennent du périmètre de configuration actuel du tenant ou du talent.',
                          },
                        )}
                </div>

                <label className="space-y-2 lg:col-span-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {pickText(effectiveSelectedLocale, {
                      en: 'Membership note',
                      zh_HANS: '会员备注',
                      zh_HANT: '會員備註',
                      ja: '会員メモ',
                      ko: '멤버십 메모',
                      fr: 'Note d’adhésion',
                    })}
                  </span>
                  <textarea
                    value={membershipDraft.note}
                    onChange={(event) =>
                      setMembershipDraft((current) => ({
                        ...current,
                        note: event.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    placeholder={pickText(
                      effectiveSelectedLocale,
                      {
                        en: 'Optional note for the first membership record.',
                        zh_HANS: '首条会员记录的可选备注。',
                        zh_HANT: '第一筆會員記錄的可選備註。',
                        ja: '最初の会員記録に関する任意メモです。',
                        ko: '첫 번째 멤버십 기록에 남길 선택 메모입니다.',
                        fr: 'Note facultative pour le premier enregistrement d’adhésion.',
                      },
                    )}
                  />
                </label>
              </div>
            ) : null}
          </div>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-900">
              {pickText(effectiveSelectedLocale, {
                en: 'Internal note',
                zh_HANS: '内部备注',
                zh_HANT: '內部備註',
                ja: '内部メモ',
                ko: '내부 메모',
                fr: 'Note interne',
              })}
            </span>
            <textarea
              value={draft.notes}
              onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
              rows={5}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              placeholder={pickText(
                effectiveSelectedLocale,
                {
                  en: 'Optional internal note.',
                  zh_HANS: '可选内部备注。',
                  zh_HANT: '可選內部備註。',
                  ja: '任意の内部メモです。',
                  ko: '선택 입력용 내부 메모입니다.',
                  fr: 'Note interne facultative.',
                },
              )}
            />
          </label>

          {errorMessage ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-3">
            <Link
              href={`/tenant/${tenantId}/talent/${talentId}/customers`}
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              {pickText(effectiveSelectedLocale, {
                en: 'Cancel',
                zh_HANS: '取消',
                zh_HANT: '取消',
                ja: 'キャンセル',
                ko: '취소',
                fr: 'Annuler',
              })}
            </Link>
            <AsyncSubmitButton
              type="submit"
              isPending={isSubmitting}
              pendingText={pickText(effectiveSelectedLocale, {
                en: 'Creating…',
                zh_HANS: '创建中…',
                zh_HANT: '建立中…',
                ja: '作成中…',
                ko: '생성 중…',
                fr: 'Création…',
              })}
            >
              {pickText(effectiveSelectedLocale, {
                en: 'Create customer',
                zh_HANS: '创建客户',
                zh_HANT: '建立客戶',
                ja: '顧客を作成',
                ko: '고객 생성',
                fr: 'Créer le client',
              })}
            </AsyncSubmitButton>
          </div>
        </form>
      </GlassSurface>
    </div>
  );
}
