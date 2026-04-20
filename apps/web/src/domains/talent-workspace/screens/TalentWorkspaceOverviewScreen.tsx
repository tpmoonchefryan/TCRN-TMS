'use client';

import { buildSharedHomepagePath } from '@tcrn/shared';
import { FileSpreadsheet, Globe2, LayoutPanelTop, Mailbox, Sparkles, Users2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { readTalentDetail } from '@/domains/config-dictionary-settings/api/settings.api';
import { ApiRequestError } from '@/platform/http/api';
import { buildTalentWorkspaceSectionPath } from '@/platform/routing/workspace-paths';
import { useRuntimeLocale } from '@/platform/runtime/locale/locale-provider';
import { pickLocaleText } from '@/platform/runtime/locale/locale-text';
import { useSession } from '@/platform/runtime/session/session-provider';
import { GlassSurface } from '@/platform/ui';

interface TalentWorkspaceOverviewScreenProps {
  tenantId: string;
  talentId: string;
}

const MODULE_CARDS = [
  {
    key: 'customers',
    icon: Users2,
  },
  {
    key: 'homepage',
    icon: Globe2,
  },
  {
    key: 'marshmallow',
    icon: Mailbox,
  },
  {
    key: 'reports',
    icon: FileSpreadsheet,
  },
] as const;

export function TalentWorkspaceOverviewScreen({
  tenantId,
  talentId,
}: Readonly<TalentWorkspaceOverviewScreenProps>) {
  const { selectedLocale } = useRuntimeLocale();
  const { request, session } = useSession();
  const [talentName, setTalentName] = useState<string | null>(null);
  const [talentCode, setTalentCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTalentSummary() {
      try {
        const detail = await readTalentDetail(request, talentId);

        if (!cancelled) {
          setTalentName(detail.displayName);
          setTalentCode(detail.code);
        }
      } catch (error) {
        if (!cancelled && !(error instanceof ApiRequestError)) {
          setTalentName(null);
          setTalentCode(null);
        }
      }
    }

    void loadTalentSummary();

    return () => {
      cancelled = true;
    };
  }, [request, talentId]);

  const resolvedTalentName = talentName || pickLocaleText(selectedLocale, {
    en: 'Talent workspace',
    zh_HANS: '艺人工作区',
    zh_HANT: '藝人工作區',
    ja: 'タレントワークスペース',
    ko: '탤런트 워크스페이스',
    fr: 'Espace de travail talent',
  });
  const resolvedTenantName = session?.tenantName || pickLocaleText(selectedLocale, {
    en: 'Current tenant',
    zh_HANS: '当前租户',
    zh_HANT: '目前租戶',
    ja: '現在のテナント',
    ko: '현재 테넌트',
    fr: 'Tenant actuel',
  });
  const sharedHomepagePath =
    session?.tenantCode && talentCode ? buildSharedHomepagePath(session.tenantCode, talentCode) : null;

  return (
    <div className="space-y-6">
      <GlassSurface className="p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              <Sparkles className="h-3.5 w-3.5" />
              {pickLocaleText(selectedLocale, {
                en: 'Overview',
                zh_HANS: '概览',
                zh_HANT: '概覽',
                ja: '概要',
                ko: '개요',
                fr: 'Vue d’ensemble',
              })}
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold text-slate-950">
                {resolvedTalentName}
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                {pickLocaleText(selectedLocale, {
                  en: 'Choose the business area you want to open.',
                  zh_HANS: '选择要进入的业务模块。',
                  zh_HANT: '選擇要進入的業務模組。',
                  ja: '開きたい業務モジュールを選択します。',
                  ko: '열고 싶은 업무 모듈을 선택하세요.',
                  fr: 'Choisissez le domaine métier à ouvrir.',
                })}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {pickLocaleText(selectedLocale, {
                  en: 'Tenant',
                  zh_HANS: '租户',
                  zh_HANT: '租戶',
                  ja: 'テナント',
                  ko: '테넌트',
                  fr: 'Tenant',
                })}
              </p>
              <p className="mt-2 text-base font-semibold text-slate-950">{resolvedTenantName}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {pickLocaleText(selectedLocale, {
                  en: 'Talent',
                  zh_HANS: '艺人',
                  zh_HANT: '藝人',
                  ja: 'タレント',
                  ko: '탤런트',
                  fr: 'Talent',
                })}
              </p>
              <p className="mt-2 text-base font-semibold text-slate-950">{resolvedTalentName}</p>
              {sharedHomepagePath ? (
                <p className="mt-2 text-xs text-slate-500">{sharedHomepagePath}</p>
              ) : null}
            </div>
          </div>
        </div>
      </GlassSurface>

      <div className="grid gap-4 xl:grid-cols-2">
        {MODULE_CARDS.map(({ key, icon: Icon }) => (
          <Link
            key={key}
            href={buildTalentWorkspaceSectionPath(tenantId, talentId, key)}
            className="block rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <Icon className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-slate-950">
                  {key === 'customers'
                    ? pickLocaleText(selectedLocale, {
                        en: 'Customer Management',
                        zh_HANS: '客户管理',
                        zh_HANT: '客戶管理',
                        ja: '顧客管理',
                        ko: '고객 관리',
                        fr: 'Gestion des clients',
                      })
                    : key === 'homepage'
                      ? pickLocaleText(selectedLocale, {
                          en: 'Homepage Management',
                          zh_HANS: '主页管理',
                          zh_HANT: '主頁管理',
                          ja: 'ホームページ管理',
                          ko: '홈페이지 관리',
                          fr: 'Gestion de la homepage',
                        })
                      : key === 'marshmallow'
                        ? pickLocaleText(selectedLocale, {
                            en: 'Marshmallow Management',
                            zh_HANS: '棉花糖管理',
                            zh_HANT: '棉花糖管理',
                            ja: 'マシュマロ管理',
                            ko: '마시멜로 관리',
                            fr: 'Gestion Marshmallow',
                          })
                        : pickLocaleText(selectedLocale, {
                            en: 'Reports',
                            zh_HANS: '报表',
                            zh_HANT: '報表',
                            ja: 'レポート',
                            ko: '리포트',
                            fr: 'Rapports',
                          })}
                </h2>
                <p className="text-sm leading-6 text-slate-600">
                  {key === 'customers'
                      ? pickLocaleText(selectedLocale, {
                          en: 'Customers, memberships, and lifecycle status.',
                          zh_HANS: '客户、会员与生命周期状态。',
                          zh_HANT: '客戶、會員與生命週期狀態。',
                          ja: '顧客、会員、ライフサイクル状態。',
                          ko: '고객, 멤버십, 라이프사이클 상태를 관리합니다.',
                          fr: 'Clients, adhésions et état du cycle de vie.',
                        })
                    : key === 'homepage'
                      ? pickLocaleText(selectedLocale, {
                          en: 'Publishing status and public pages.',
                          zh_HANS: '发布状态与公开页面。',
                          zh_HANT: '發佈狀態與公開頁面。',
                          ja: '公開状態と公開ページ。',
                          ko: '게시 상태와 공개 페이지를 관리합니다.',
                          fr: 'Statut de publication et pages publiques.',
                        })
                      : key === 'marshmallow'
                        ? pickLocaleText(selectedLocale, {
                            en: 'Inbox settings, moderation, and exports.',
                            zh_HANS: '收件设置、审核与导出。',
                            zh_HANT: '收件設定、審核與匯出。',
                            ja: '受信設定、モデレーション、エクスポート。',
                            ko: '수신함 설정, 검수, 내보내기를 관리합니다.',
                            fr: 'Réglages de réception, modération et export.',
                          })
                        : pickLocaleText(selectedLocale, {
                            en: 'Create, monitor, and download reports.',
                            zh_HANS: '创建、跟踪并下载报表。',
                            zh_HANT: '建立、追蹤並下載報表。',
                            ja: 'レポートの作成、確認、ダウンロード。',
                            ko: '리포트를 생성하고 상태를 확인하며 다운로드합니다.',
                            fr: 'Créez, suivez et téléchargez les rapports.',
                          })}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <GlassSurface className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-950">
              {pickLocaleText(selectedLocale, {
                en: 'Management access',
                zh_HANS: '管理入口',
                zh_HANT: '管理入口',
                ja: '管理導線',
                ko: '관리 진입점',
                fr: 'Accès de gestion',
              })}
            </p>
            <p className="text-sm leading-6 text-slate-600">
              {pickLocaleText(selectedLocale, {
                en: 'Open organization structure to manage lifecycle and scope settings.',
                zh_HANS: '如需管理生命周期和层级设置，请进入组织架构。',
                zh_HANT: '如需管理生命週期與層級設定，請進入組織結構。',
                ja: 'ライフサイクルや階層設定を管理する場合は、組織構造を開いてください。',
                ko: '라이프사이클과 계층 설정은 조직 구조에서 관리하세요.',
                fr: 'Ouvrez la structure organisationnelle pour gérer le cycle de vie et les réglages de portée.',
              })}
            </p>
          </div>

          <Link
            href={`/tenant/${tenantId}/organization-structure`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
          >
            <LayoutPanelTop className="h-4 w-4" />
            {pickLocaleText(selectedLocale, {
              en: 'Open organization structure',
              zh_HANS: '打开组织架构',
              zh_HANT: '打開組織結構',
              ja: '組織構造を開く',
              ko: '조직 구조 열기',
              fr: 'Ouvrir la structure organisationnelle',
            })}
          </Link>
        </div>
      </GlassSurface>
    </div>
  );
}
