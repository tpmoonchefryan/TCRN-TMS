'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { readTalentDetail, type TalentDetailResponse } from '@/domains/config-dictionary-settings/api/settings.api';
import { ApiRequestError } from '@/platform/http/api';
import { useRuntimeLocale } from '@/platform/runtime/locale/locale-provider';
import { pickLocaleText } from '@/platform/runtime/locale/locale-text';
import { useSession } from '@/platform/runtime/session/session-provider';
import { StateView } from '@/platform/ui';

interface TalentBusinessAccessGateProps {
  tenantId: string;
  talentId: string;
  children: React.ReactNode;
}

interface GateState {
  detail: TalentDetailResponse | null;
  loading: boolean;
  error: string | null;
}

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiRequestError ? reason.message : fallback;
}

export function TalentBusinessAccessGate({
  tenantId,
  talentId,
  children,
}: Readonly<TalentBusinessAccessGateProps>) {
  const { request } = useSession();
  const { selectedLocale } = useRuntimeLocale();
  const [state, setState] = useState<GateState>({
    detail: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({
        detail: null,
        loading: true,
        error: null,
      });

      try {
        const detail = await readTalentDetail(request, talentId);

        if (cancelled) {
          return;
        }

        setState({
          detail,
          loading: false,
          error: null,
        });
      } catch (reason) {
        if (cancelled) {
          return;
        }

        setState({
          detail: null,
          loading: false,
          error: getErrorMessage(
            reason,
            pickLocaleText(selectedLocale, {
              en: 'Failed to verify talent availability.',
              zh_HANS: '确认艺人状态失败。',
              zh_HANT: '確認藝人狀態失敗。',
              ja: 'タレントの状態確認に失敗しました。',
              ko: '탤런트 상태를 확인하지 못했습니다.',
              fr: 'Impossible de vérifier l’état du talent.',
            }),
          ),
        });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [request, selectedLocale, talentId]);

  if (state.loading) {
    return (
      <StateView
        status="unavailable"
        title={pickLocaleText(selectedLocale, {
          en: 'Checking talent availability',
          zh_HANS: '正在确认艺人状态',
          zh_HANT: '正在確認藝人狀態',
          ja: 'タレントの状態を確認しています',
          ko: '탤런트 상태를 확인하고 있습니다',
          fr: 'Vérification de la disponibilité du talent',
        })}
        description={pickLocaleText(selectedLocale, {
          en: 'Confirming talent status before opening this page.',
          zh_HANS: '打开页面前先确认艺人当前状态。',
          zh_HANT: '開啟頁面前先確認藝人目前狀態。',
          ja: 'このページを開く前にタレントの状態を確認しています。',
          ko: '이 페이지를 열기 전에 탤런트 상태를 확인합니다.',
          fr: 'L’état du talent est vérifié avant d’ouvrir cette page.',
        })}
      />
    );
  }

  if (state.error || !state.detail) {
    return (
      <StateView
        status="error"
        title={pickLocaleText(selectedLocale, {
          en: 'Talent unavailable',
          zh_HANS: '艺人不可用',
          zh_HANT: '藝人不可用',
          ja: 'タレントを利用できません',
          ko: '탤런트를 사용할 수 없습니다',
          fr: 'Talent indisponible',
        })}
        description={
          state.error ||
          pickLocaleText(selectedLocale, {
            en: 'Talent lifecycle details could not be loaded.',
            zh_HANS: '无法加载艺人生命周期详情。',
            zh_HANT: '無法載入藝人生命週期詳情。',
            ja: 'タレントのライフサイクル詳細を読み込めませんでした。',
            ko: '탤런트 라이프사이클 정보를 불러오지 못했습니다.',
            fr: 'Impossible de charger les détails du cycle de vie du talent.',
          })
        }
      />
    );
  }

  if (state.detail.lifecycleStatus === 'published') {
    return <>{children}</>;
  }

  const title =
    state.detail.lifecycleStatus === 'draft'
      ? pickLocaleText(selectedLocale, {
          en: 'Talent not published',
          zh_HANS: '艺人尚未发布',
          zh_HANT: '藝人尚未發佈',
          ja: 'タレントは未公開です',
          ko: '탤런트가 아직 게시되지 않았습니다',
          fr: 'Le talent n’est pas encore publié',
        })
      : pickLocaleText(selectedLocale, {
          en: 'Talent disabled',
          zh_HANS: '艺人已停用',
          zh_HANT: '藝人已停用',
          ja: 'タレントは無効です',
          ko: '탤런트가 비활성화되었습니다',
          fr: 'Le talent est désactivé',
        });
  const description =
    state.detail.lifecycleStatus === 'draft'
      ? pickLocaleText(selectedLocale, {
          en: 'Draft talents stay in organization structure until they are published. Business pages remain unavailable.',
          zh_HANS: '草稿艺人会继续留在组织架构流程中，发布前无法进入业务页。',
          zh_HANT: '草稿藝人會繼續保留在組織結構流程中，發佈前無法進入業務頁。',
          ja: '下書き中のタレントは組織構造内で管理され、公開されるまで業務画面は利用できません。',
          ko: '초안 상태의 탤런트는 게시될 때까지 조직 구조에 남아 있으며 업무 화면을 열 수 없습니다.',
          fr: 'Les talents en brouillon restent dans la structure de l’organisation jusqu’à leur publication. Les pages métier restent indisponibles.',
        })
      : pickLocaleText(selectedLocale, {
          en: 'Disabled talents stay out of business pages until someone re-enables them in organization structure.',
          zh_HANS: '已停用艺人在组织架构中重新启用前，无法进入业务页。',
          zh_HANT: '已停用藝人在組織結構中重新啟用前，無法進入業務頁。',
          ja: '無効化されたタレントは、組織構造で再有効化されるまで業務画面を利用できません。',
          ko: '비활성화된 탤런트는 조직 구조에서 다시 활성화되기 전까지 업무 화면을 사용할 수 없습니다.',
          fr: 'Les talents désactivés restent hors des pages métier jusqu’à leur réactivation dans la structure d’organisation.',
        });

  return (
    <StateView
      status="denied"
      title={title}
      description={description}
      action={
        <Link
          href={`/tenant/${tenantId}/organization-structure`}
          className="inline-flex items-center rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
        >
          {pickLocaleText(selectedLocale, {
            en: 'Open organization structure',
            zh_HANS: '打开组织架构',
            zh_HANT: '打開組織結構',
            ja: '組織構造を開く',
            ko: '조직 구조 열기',
            fr: 'Ouvrir la structure organisationnelle',
          })}
        </Link>
      }
    />
  );
}
