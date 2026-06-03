'use client';

import {
  buildRolePermissionStateKey,
  deriveCapabilityPackState,
  EDITABLE_ROLE_CAPABILITY_PACKS,
  expandCapabilityPackState,
  type PermissionActionInput,
  type RbacResourceCode,
  ROLE_CAPABILITY_CATEGORIES,
  type RoleCapabilityPackDefinition,
  type RolePermissionState,
  type SupportedUiLocale,
} from '@tcrn/shared';
import { useState } from 'react';

import { pickLocaleText } from '@/platform/runtime/locale/locale-text';

import type { RolePermissionSelection } from './RoleAdvancedPermissionMatrix';
import {
  getLocalizedRbacActionLabel,
  getLocalizedRolePermissionOptionLabel,
} from './user-management.copy';
import { ToneBadge } from './user-management.shared';

function getRiskTone(
  riskTier: RoleCapabilityPackDefinition['riskTier']
): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (riskTier === 'critical') {
    return 'danger';
  }

  if (riskTier === 'sensitive') {
    return 'warning';
  }

  return 'neutral';
}

function getLocalizedText(value: Record<SupportedUiLocale, string>, locale: SupportedUiLocale) {
  return value[locale] || value.en;
}

function buildRawStateList(permissionStates: Record<string, RolePermissionSelection>) {
  return Object.entries(permissionStates).map(([key, state]) => {
    const [resource, action] = key.split(':');
    return {
      resource: resource as RbacResourceCode,
      action: action as PermissionActionInput,
      state,
    };
  });
}

function matchesSearch(
  pack: RoleCapabilityPackDefinition,
  locale: SupportedUiLocale,
  search: string
) {
  const normalized = search.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const haystack = [
    getLocalizedText(pack.label, locale),
    getLocalizedText(pack.description, locale),
    getLocalizedText(pack.rowDescription, locale),
    pack.category,
    pack.riskTier,
    ...pack.permissions.flatMap((permission) => [permission.resource, permission.action]),
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(normalized);
}

export function RoleCapabilityPackEditor({
  permissionStates,
  locale,
  readOnly,
  permissionStateHelpId,
  onPermissionStateChange,
}: Readonly<{
  permissionStates: Record<string, RolePermissionSelection>;
  locale: SupportedUiLocale;
  readOnly: boolean;
  permissionStateHelpId?: string;
  onPermissionStateChange: (permissionKey: string, value: RolePermissionSelection) => void;
}>) {
  const [category, setCategory] = useState<'all' | RoleCapabilityPackDefinition['category']>('all');
  const [search, setSearch] = useState('');
  const rawStateList = buildRawStateList(permissionStates);
  const categoryLabel = pickLocaleText(locale, {
    en: 'Category',
    zh_HANS: '分类',
    zh_HANT: '分類',
    ja: 'カテゴリ',
    ko: 'Category',
    fr: 'Category',
  });
  const searchLabel = pickLocaleText(locale, {
    en: 'Search',
    zh_HANS: '搜索',
    zh_HANT: '搜尋',
    ja: '検索',
    ko: 'Search',
    fr: 'Search',
  });
  const allCategoriesLabel = pickLocaleText(locale, {
    en: 'All categories',
    zh_HANS: '全部分类',
    zh_HANT: '全部分類',
    ja: 'すべてのカテゴリ',
    ko: 'All categories',
    fr: 'All categories',
  });
  const resetLabel = pickLocaleText(locale, {
    en: 'Reset filters',
    zh_HANS: '重置筛选',
    zh_HANT: '重置篩選',
    ja: 'フィルターをリセット',
    ko: 'Reset filters',
    fr: 'Reset filters',
  });
  const noResultsLabel = pickLocaleText(locale, {
    en: 'No capability packs match these filters.',
    zh_HANS: '没有匹配当前筛选的能力包。',
    zh_HANT: '沒有符合目前篩選的能力包。',
    ja: '条件に一致する権限パックはありません。',
    ko: 'No capability packs match these filters.',
    fr: 'No capability packs match these filters.',
  });
  const detailsLabel = pickLocaleText(locale, {
    en: 'Details',
    zh_HANS: '详情',
    zh_HANT: '詳情',
    ja: '詳細',
    ko: 'Details',
    fr: 'Details',
  });

  const visiblePacks = EDITABLE_ROLE_CAPABILITY_PACKS.filter(
    (pack) =>
      (category === 'all' || pack.category === category) && matchesSearch(pack, locale, search)
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)_auto]">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-900">{categoryLabel}</span>
          <select
            aria-label={categoryLabel}
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as 'all' | RoleCapabilityPackDefinition['category'])
            }
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400"
          >
            <option value="all">{allCategoriesLabel}</option>
            {ROLE_CAPABILITY_CATEGORIES.map((nextCategory) => (
              <option key={nextCategory} value={nextCategory}>
                {nextCategory}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-900">{searchLabel}</span>
          <input
            aria-label={searchLabel}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setCategory('all');
            setSearch('');
          }}
          className="self-end rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          {resetLabel}
        </button>
      </div>

      <div className="space-y-3">
        {visiblePacks.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            {noResultsLabel}
          </p>
        ) : (
          visiblePacks.map((pack) => {
            const packState = deriveCapabilityPackState(pack, rawStateList);
            const controlValue = packState === 'mixed' ? 'unset' : packState;

            return (
              <div key={pack.code} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-950">
                        {getLocalizedText(pack.label, locale)}
                      </p>
                      <ToneBadge tone="info" label={pack.category} />
                      <ToneBadge tone={getRiskTone(pack.riskTier)} label={pack.riskTier} />
                      {packState === 'mixed' ? <ToneBadge tone="warning" label="Mixed" /> : null}
                    </div>
                    <p className="text-sm leading-6 text-slate-600">
                      {getLocalizedText(pack.rowDescription, locale)}
                    </p>
                    {pack.sensitiveReason ? (
                      <p className="text-xs leading-5 text-amber-700">
                        {getLocalizedText(pack.sensitiveReason, locale)}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <select
                      aria-label={getLocalizedText(pack.label, locale)}
                      aria-describedby={permissionStateHelpId}
                      value={controlValue}
                      disabled={readOnly}
                      onChange={(event) => {
                        const nextState = event.target.value as RolePermissionState;
                        for (const entry of expandCapabilityPackState(pack, nextState)) {
                          onPermissionStateChange(
                            buildRolePermissionStateKey(entry.resource, entry.action),
                            entry.state
                          );
                        }
                      }}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      {(['unset', 'grant', 'deny'] as const).map((option) => (
                        <option key={option} value={option}>
                          {getLocalizedRolePermissionOptionLabel(option, locale)}
                        </option>
                      ))}
                    </select>
                    {packState === 'mixed' ? (
                      <p className="text-xs leading-5 text-amber-700">
                        This capability has different states across its underlying permissions.
                      </p>
                    ) : null}
                  </div>
                </div>
                <details className="mt-3 rounded-2xl bg-slate-50 px-3 py-2">
                  <summary className="cursor-pointer text-xs font-semibold text-slate-600">
                    {detailsLabel}
                  </summary>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {pack.permissions.map((permission) => (
                      <div
                        key={`${pack.code}-${permission.resource}-${permission.action}`}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
                      >
                        <span className="font-semibold text-slate-800">{permission.resource}</span>
                        <span className="px-1">/</span>
                        <span>{getLocalizedRbacActionLabel(permission.action, locale)}</span>
                        {permission.mode === 'fixedDeny' ? (
                          <span className="ml-2 text-rose-700">fixed deny</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
