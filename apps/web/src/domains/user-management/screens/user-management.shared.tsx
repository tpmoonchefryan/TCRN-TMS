import type { ReactNode } from 'react';

import {
  isRbacRoleAvailableForScopeType,
  isRbacRoleAvailableForTenantTier,
  type RbacTenantTier,
  type SupportedUiLocale,
} from '@tcrn/shared';

import type {
  OrganizationNode,
  OrganizationTreeResponse,
} from '@/domains/organization-access/api/organization.api';
import type {
  SystemRoleListItem,
  SystemUserRoleAssignment,
} from '@/domains/user-management/api/user-management.api';
import { type ApiPaginationMeta, ApiRequestError } from '@/platform/http/api';
import { getPaginationRange, type PageSizeOption } from '@/platform/runtime/pagination/pagination';
import { PaginationFooter } from '@/platform/ui';

import {
  formatUserManagementDateTime,
  pickLocalizedName,
  type UserManagementCopy,
} from './user-management.copy';

export interface OrganizationScopeOption {
  id: string;
  type: 'tenant' | 'subsidiary' | 'talent';
  label: string;
  hint: string;
}

export function buildOrganizationScopeOptions(tree: OrganizationTreeResponse, tenantLabel: string) {
  const options: OrganizationScopeOption[] = [
    {
      id: 'tenant-root',
      type: 'tenant',
      label: tenantLabel,
      hint: tenantLabel,
    },
  ];

  const walk = (nodes: OrganizationNode[], labels: string[] = []) => {
    nodes.forEach((node) => {
      const nextLabels = [...labels, node.displayName];

      options.push({
        id: node.id,
        type: 'subsidiary',
        label: node.displayName,
        hint: nextLabels.join(' / '),
      });

      node.talents.forEach((talent) => {
        options.push({
          id: talent.id,
          type: 'talent',
          label: talent.displayName,
          hint: [...nextLabels, talent.displayName].join(' / '),
        });
      });

      walk(node.children, nextLabels);
    });
  };

  tree.directTalents.forEach((talent) => {
    options.push({
      id: talent.id,
      type: 'talent',
      label: talent.displayName,
      hint: `${tenantLabel} / ${talent.displayName}`,
    });
  });

  walk(tree.subsidiaries);

  return options;
}

export function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiRequestError ? reason.message : fallback;
}

export function resolveScopedLabel(
  scopeType: 'tenant' | 'subsidiary' | 'talent',
  scopeName: string | null,
  sharedCopy: UserManagementCopy['shared']
) {
  if (scopeName) {
    return scopeName;
  }

  if (scopeType === 'tenant') {
    return sharedCopy.tenantRoot;
  }

  return sharedCopy.unnamedScope;
}

export function resolveRoleDisplayName(
  detail: {
    roleName: SystemRoleListItem['name'];
  },
  locale: SupportedUiLocale
) {
  return pickLocalizedName({ name: detail.roleName }, locale);
}

export function filterAssignableRoles(
  roles: SystemRoleListItem[],
  tenantTier: string | null | undefined,
  scopeType: 'tenant' | 'subsidiary' | 'talent'
) {
  const normalizedTier: RbacTenantTier = tenantTier === 'ac' ? 'ac' : 'standard';

  return roles.filter((role) => {
    if (!role.isActive) {
      return false;
    }

    return (
      isRbacRoleAvailableForTenantTier(role.code, normalizedTier) &&
      isRbacRoleAvailableForScopeType(role.code, scopeType)
    );
  });
}

export function isRoleVisibleInWorkspace(
  role: Pick<SystemRoleListItem, 'code'>,
  tenantTier: string | null | undefined
) {
  return isRbacRoleAvailableForTenantTier(role.code, tenantTier === 'ac' ? 'ac' : 'standard');
}

export function ToneBadge({
  tone,
  label,
}: Readonly<{
  tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  label: string;
}>) {
  const toneClasses =
    tone === 'success'
      ? 'bg-emerald-100 text-emerald-800'
      : tone === 'warning'
        ? 'bg-amber-100 text-amber-800'
        : tone === 'danger'
          ? 'bg-rose-100 text-rose-800'
          : tone === 'info'
            ? 'bg-indigo-100 text-indigo-800'
            : 'bg-slate-100 text-slate-700';

  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${toneClasses}`}>
      {label}
    </span>
  );
}

export function InlineActionButton({
  children,
  tone = 'neutral',
  disabled = false,
  onClick,
}: Readonly<{
  children: ReactNode;
  tone?: 'neutral' | 'danger' | 'primary';
  disabled?: boolean;
  onClick?: () => void;
}>) {
  const toneClasses =
    tone === 'danger'
      ? 'border-rose-200 text-rose-700 hover:border-rose-300 hover:bg-rose-50'
      : tone === 'primary'
        ? 'border-indigo-200 text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50'
        : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-white';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${toneClasses} disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {children}
    </button>
  );
}

export function NoticeBanner({
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

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${toneClasses}`}>
      {message}
    </div>
  );
}

export function SummaryCard({
  label,
  value,
  hint,
}: Readonly<{
  label: string;
  value: string;
  hint: string;
}>) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p>
    </div>
  );
}

export function ScopeAssignmentCard({
  assignment,
  sharedCopy,
  locale,
  children,
}: Readonly<{
  assignment: SystemUserRoleAssignment;
  sharedCopy: UserManagementCopy['shared'];
  locale: SupportedUiLocale;
  children?: ReactNode;
}>) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">
            {resolveRoleDisplayName(assignment, locale)}
          </p>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
            {assignment.roleCode}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ToneBadge
            tone={assignment.roleIsActive ? 'success' : 'warning'}
            label={assignment.roleIsActive ? sharedCopy.roleActive : sharedCopy.roleInactive}
          />
          {assignment.inherit ? <ToneBadge tone="neutral" label={sharedCopy.inherit} /> : null}
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-700">
        {resolveScopedLabel(assignment.scopeType, assignment.scopeName, sharedCopy)}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {assignment.scopePath || sharedCopy.tenantWideAssignment}
      </p>
      <p className="mt-2 text-xs text-slate-500">
        {sharedCopy.grantedLabel}{' '}
        {formatUserManagementDateTime(assignment.grantedAt, locale, sharedCopy.unavailable)}
        {assignment.expiresAt
          ? ` • ${sharedCopy.expiresLabel} ${formatUserManagementDateTime(
              assignment.expiresAt,
              locale,
              sharedCopy.unavailable
            )}`
          : ''}
      </p>
      {children ? <div className="mt-3 flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}

function getUserManagementPaginationCopy(
  locale: SupportedUiLocale,
  pagination: ApiPaginationMeta,
  itemCount: number
) {
  const range = getPaginationRange(pagination, itemCount);
  const localeCode = locale;

  if (localeCode === 'zh_HANS' || localeCode === 'zh_HANT') {
    return {
      page: `第 ${pagination.page} / ${pagination.totalPages} 页`,
      range:
        pagination.totalCount === 0
          ? '当前范围没有记录。'
          : `显示第 ${range.start}-${range.end} 条，共 ${pagination.totalCount} 条`,
      pageSize: '每页条目',
      previous: '上一页',
      next: '下一页',
    };
  }

  if (localeCode === 'ja') {
    return {
      page: `${pagination.totalPages} ページ中 ${pagination.page} ページ`,
      range:
        pagination.totalCount === 0
          ? 'この範囲に記録はありません。'
          : `${pagination.totalCount} 件中 ${range.start}-${range.end} 件を表示`,
      pageSize: '表示件数',
      previous: '前へ',
      next: '次へ',
    };
  }

  return {
    page: `Page ${pagination.page} of ${pagination.totalPages}`,
    range:
      pagination.totalCount === 0
        ? 'No records in the current range.'
        : `Showing ${range.start}-${range.end} of ${pagination.totalCount}`,
    pageSize: 'Rows per page',
    previous: 'Previous',
    next: 'Next',
  };
}

export function UserManagementPaginationFooter({
  locale,
  pagination,
  itemCount,
  onPageSizeChange,
  onPrevious,
  onNext,
}: Readonly<{
  locale: SupportedUiLocale;
  pagination: ApiPaginationMeta;
  itemCount: number;
  pageSize: PageSizeOption;
  onPageSizeChange: (pageSize: PageSizeOption) => void;
  onPrevious: () => void;
  onNext: () => void;
}>) {
  const paginationCopy = getUserManagementPaginationCopy(locale, pagination, itemCount);

  return (
    <PaginationFooter
      pagination={pagination}
      itemCount={itemCount}
      labels={{
        pageLabel: paginationCopy.page,
        rangeLabel: paginationCopy.range,
        rowsPerPageLabel: paginationCopy.pageSize,
        pageSizeAriaLabel: paginationCopy.pageSize,
        previousLabel: paginationCopy.previous,
        nextLabel: paginationCopy.next,
      }}
      onPageChange={(nextPage) => {
        if (nextPage < pagination.page) {
          onPrevious();
          return;
        }

        if (nextPage > pagination.page) {
          onNext();
        }
      }}
      onPageSizeChange={(nextPageSize) => onPageSizeChange(nextPageSize as PageSizeOption)}
      className="rounded-2xl border border-slate-200 bg-white/85 shadow-sm"
    />
  );
}
