'use client';

import {
  KeyRound,
  Pencil,
  ShieldCheck,
  Trash2,
  UserMinus,
  UserRoundPlus,
  UsersRound,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDeferredValue, useEffect, useState } from 'react';

import {
  type OrganizationNode,
  type OrganizationTreeResponse,
  readOrganizationTree,
} from '@/domains/organization-access/api/organization.api';
import {
  createDelegatedAdmin,
  deactivateSystemUser,
  type DelegatedAdminListItem,
  forceSystemUserTotp,
  listDelegatedAdmins,
  listSystemRoles,
  listSystemUsers,
  reactivateSystemUser,
  removeDelegatedAdmin,
  removeSystemRole,
  type SystemRoleListItem,
  type SystemUserListItem,
} from '@/domains/user-management/api/user-management.api';
import {
  type ApiPaginationMeta,
  ApiRequestError,
  buildFallbackPagination,
} from '@/platform/http/api';
import {
  buildPaginationMeta,
  PAGE_SIZE_OPTIONS,
  type PageSizeOption,
  parsePageParam,
  parsePageSizeParam,
} from '@/platform/runtime/pagination/pagination';
import { useSession } from '@/platform/runtime/session/session-provider';
import {
  AsyncSubmitButton,
  ConfirmActionDialog,
  FormSection,
  GlassSurface,
  StateView,
  TableShell,
} from '@/platform/ui';

import {
  formatUserManagementDateTime,
  getLocalizedDelegateTypeLabel,
  getLocalizedScopeTypeLabel,
  pickLocalizedName,
  useUserManagementCopy,
} from './user-management.copy';
import {
  isRoleVisibleInWorkspace,
  UserManagementPaginationFooter,
} from './user-management.shared';

type ManagementTab = 'users' | 'roles' | 'delegation';
type UserStatusFilter = 'all' | 'active' | 'inactive';

interface PanelState<T> {
  data: T[];
  pagination: ApiPaginationMeta;
  loading: boolean;
  error: string | null;
}

interface DelegationScopeOption {
  id: string;
  type: 'subsidiary' | 'talent';
  label: string;
  hint: string;
}

interface DelegationDraft {
  scopeType: 'subsidiary' | 'talent';
  scopeId: string;
  delegateType: 'user' | 'role';
  delegateId: string;
}

interface NoticeState {
  scope: ManagementTab;
  tone: 'success' | 'error';
  message: string;
}

type DialogState =
  | {
      kind: 'deactivate-user';
      scope: 'users';
      id: string;
      title: string;
      description: string;
      confirmText: string;
      pendingText: string;
      successMessage: string;
      errorFallback: string;
      intent: 'danger';
    }
  | {
      kind: 'reactivate-user';
      scope: 'users';
      id: string;
      title: string;
      description: string;
      confirmText: string;
      pendingText: string;
      successMessage: string;
      errorFallback: string;
      intent: 'primary';
    }
  | {
      kind: 'force-totp';
      scope: 'users';
      id: string;
      title: string;
      description: string;
      confirmText: string;
      pendingText: string;
      successMessage: string;
      errorFallback: string;
      intent: 'primary';
    }
  | {
      kind: 'delete-role';
      scope: 'roles';
      id: string;
      title: string;
      description: string;
      confirmText: string;
      pendingText: string;
      successMessage: string;
      errorFallback: string;
      intent: 'danger';
    }
  | {
      kind: 'remove-delegation';
      scope: 'delegation';
      id: string;
      title: string;
      description: string;
      confirmText: string;
      pendingText: string;
      successMessage: string;
      errorFallback: string;
      intent: 'danger';
    };

function parseUserStatusFilter(value: string | null): UserStatusFilter {
  return value === 'active' || value === 'inactive' ? value : 'all';
}

function buildUsersQueryState({
  tab,
  search,
  status,
  page,
  pageSize,
}: {
  tab: ManagementTab;
  search: string;
  status: UserStatusFilter;
  page: number;
  pageSize: PageSizeOption;
}) {
  const params = new URLSearchParams();
  const normalizedSearch = search.trim();

  if (tab !== 'users') {
    params.set('tab', tab);
  }

  if (normalizedSearch) {
    params.set('search', normalizedSearch);
  }

  if (status !== 'all') {
    params.set('status', status);
  }

  if (page > 1) {
    params.set('page', String(page));
  }

  if (pageSize !== PAGE_SIZE_OPTIONS[0]) {
    params.set('pageSize', String(pageSize));
  }

  return params.toString();
}

const EMPTY_DELEGATION_DRAFT: DelegationDraft = {
  scopeType: 'subsidiary',
  scopeId: '',
  delegateType: 'user',
  delegateId: '',
};

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiRequestError ? reason.message : fallback;
}

function resolveInitialTab(tab: string | null): ManagementTab {
  if (tab === 'roles' || tab === 'delegation') {
    return tab;
  }

  return 'users';
}

function buildDelegationScopeOptions(tree: OrganizationTreeResponse, tenantRootLabel: string) {
  const options: DelegationScopeOption[] = [];

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
      hint: `${tenantRootLabel} / ${talent.displayName}`,
    });
  });

  walk(tree.subsidiaries);

  return options;
}

function ToneBadge({
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

  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${toneClasses}`}>{label}</span>;
}

function InlineActionButton({
  children,
  tone = 'neutral',
  disabled = false,
  onClick,
}: Readonly<{
  children: React.ReactNode;
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

function SummaryCard({
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

export function UserManagementScreen({
  workspaceKind = 'tenant',
}: Readonly<{
  workspaceKind?: 'tenant' | 'ac';
}> = {}) {
  const { request, requestEnvelope, session } = useSession();
  const { copy, currentLocale } = useUserManagementCopy();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAcWorkspace = workspaceKind === 'ac';
  const sharedCopy = copy.shared;
  const managementCopy = copy.management;
  const workspaceDisplayLabel = isAcWorkspace ? sharedCopy.acWorkspace : sharedCopy.tenantWorkspace;
  const workspaceAccessLabel = isAcWorkspace ? sharedCopy.acAccessLabel : sharedCopy.tenantAccessLabel;
  const workspaceSessionLabel = isAcWorkspace ? sharedCopy.acSessionLabel : sharedCopy.tenantSessionLabel;
  const workspaceDirectoryLabel = isAcWorkspace ? sharedCopy.acDirectoryLabel : sharedCopy.tenantDirectoryLabel;
  const userManagementPath = pathname.split('?')[0];
  const userCreateHref = `${userManagementPath}/new`;
  const buildUserEditorHref = (systemUserId: string) => `${userManagementPath}/${systemUserId}`;
  const roleCreateHref = `${userManagementPath}/roles/new`;
  const buildRoleEditorHref = (systemRoleId: string) => `${userManagementPath}/roles/${systemRoleId}`;

  const currentSearchParamsTab = resolveInitialTab(searchParams.get('tab'));
  const urlUserSearch = searchParams.get('search') ?? '';
  const urlUserStatusFilter = parseUserStatusFilter(searchParams.get('status'));
  const urlUsersPage = parsePageParam(searchParams.get('page'));
  const urlUsersPageSize = parsePageSizeParam(searchParams.get('pageSize'));

  const [activeTab, setActiveTab] = useState<ManagementTab>(currentSearchParamsTab);
  const [userSearch, setUserSearch] = useState(urlUserSearch);
  const deferredUserSearch = useDeferredValue(userSearch);
  const [userStatusFilter, setUserStatusFilter] = useState<UserStatusFilter>(urlUserStatusFilter);
  const [usersPage, setUsersPage] = useState(urlUsersPage);
  const [usersPageSize, setUsersPageSize] = useState<PageSizeOption>(urlUsersPageSize);
  const [rolesPage, setRolesPage] = useState(1);
  const [rolesPageSize, setRolesPageSize] = useState<PageSizeOption>(PAGE_SIZE_OPTIONS[0]);
  const [delegationsPage, setDelegationsPage] = useState(1);
  const [delegationsPageSize, setDelegationsPageSize] = useState<PageSizeOption>(PAGE_SIZE_OPTIONS[0]);
  const [usersPanel, setUsersPanel] = useState<PanelState<SystemUserListItem>>({
    data: [],
    pagination: buildFallbackPagination(0, 1, PAGE_SIZE_OPTIONS[0]),
    loading: true,
    error: null,
  });
  const [rolesPanel, setRolesPanel] = useState<PanelState<SystemRoleListItem>>({
    data: [],
    pagination: buildFallbackPagination(0, 1, PAGE_SIZE_OPTIONS[0]),
    loading: true,
    error: null,
  });
  const [delegationsPanel, setDelegationsPanel] = useState<PanelState<DelegatedAdminListItem>>({
    data: [],
    pagination: buildFallbackPagination(0, 1, PAGE_SIZE_OPTIONS[0]),
    loading: true,
    error: null,
  });
  const [scopeOptionsPanel, setScopeOptionsPanel] = useState<PanelState<DelegationScopeOption>>({
    data: [],
    pagination: buildFallbackPagination(0, 1, PAGE_SIZE_OPTIONS[0]),
    loading: true,
    error: null,
  });
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [dialogState, setDialogState] = useState<DialogState | null>(null);
  const [dialogPending, setDialogPending] = useState(false);
  const [delegationDraft, setDelegationDraft] = useState<DelegationDraft>(EMPTY_DELEGATION_DRAFT);
  const [delegationPending, setDelegationPending] = useState(false);

  useEffect(() => {
    setActiveTab(currentSearchParamsTab);
  }, [currentSearchParamsTab]);

  useEffect(() => {
    setUserSearch((current) => (current === urlUserSearch ? current : urlUserSearch));
    setUserStatusFilter((current) => (current === urlUserStatusFilter ? current : urlUserStatusFilter));
    setUsersPage((current) => (current === urlUsersPage ? current : urlUsersPage));
    setUsersPageSize((current) => (current === urlUsersPageSize ? current : urlUsersPageSize));
  }, [urlUserSearch, urlUserStatusFilter, urlUsersPage, urlUsersPageSize]);

  function applyUsersQueryState(
    nextState: Partial<{
      tab: ManagementTab;
      search: string;
      status: UserStatusFilter;
      page: number;
      pageSize: PageSizeOption;
    }>,
  ) {
    const nextTab = nextState.tab ?? activeTab;
    const nextSearch = nextState.search ?? userSearch;
    const nextStatus = nextState.status ?? userStatusFilter;
    const nextPage = nextState.page ?? usersPage;
    const nextPageSize = nextState.pageSize ?? usersPageSize;

    if (nextState.tab !== undefined) {
      setActiveTab(nextTab);
    }

    if (nextState.search !== undefined) {
      setUserSearch(nextSearch);
    }

    if (nextState.status !== undefined) {
      setUserStatusFilter(nextStatus);
    }

    if (nextState.page !== undefined) {
      setUsersPage(nextPage);
    }

    if (nextState.pageSize !== undefined) {
      setUsersPageSize(nextPageSize);
    }

    const nextQuery = buildUsersQueryState({
      tab: nextTab,
      search: nextSearch,
      status: nextStatus,
      page: nextPage,
      pageSize: nextPageSize,
    });

    const currentQuery = buildUsersQueryState({
      tab: activeTab,
      search: userSearch,
      status: userStatusFilter,
      page: usersPage,
      pageSize: usersPageSize,
    });

    if (nextQuery === currentQuery) {
      return;
    }

    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  }

  async function refreshUsers() {
    const normalizedSearch = deferredUserSearch.trim();
    const isActive = userStatusFilter === 'all' ? undefined : userStatusFilter === 'active';

    setUsersPanel((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    try {
      const result = await listSystemUsers(requestEnvelope, {
        page: usersPage,
        pageSize: usersPageSize,
        search: normalizedSearch || undefined,
        isActive,
      });

      setUsersPanel({
        data: result.items,
        pagination: result.pagination,
        loading: false,
        error: null,
      });
    } catch (reason) {
      setUsersPanel((current) => ({
        data: current.data,
        pagination: current.pagination,
        loading: false,
        error: getErrorMessage(reason, managementCopy.users.unavailableTitle),
      }));
    }
  }

  async function refreshRoles() {
    setRolesPanel((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    try {
      const data = await listSystemRoles(request, { isActive: true });
      const visibleRoles = data.filter((role) => isRoleVisibleInWorkspace(role, session?.tenantTier));

      setRolesPanel({
        data: visibleRoles,
        pagination: buildFallbackPagination(visibleRoles.length, 1, Math.max(visibleRoles.length, 1)),
        loading: false,
        error: null,
      });
    } catch (reason) {
      setRolesPanel((current) => ({
        data: current.data,
        pagination: current.pagination,
        loading: false,
        error: getErrorMessage(reason, managementCopy.roles.unavailableTitle),
      }));
    }
  }

  async function refreshDelegations() {
    setDelegationsPanel((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    try {
      const data = await listDelegatedAdmins(request);

      setDelegationsPanel({
        data,
        pagination: buildFallbackPagination(data.length, 1, Math.max(data.length, 1)),
        loading: false,
        error: null,
      });
    } catch (reason) {
      setDelegationsPanel((current) => ({
        data: current.data,
        pagination: current.pagination,
        loading: false,
        error: getErrorMessage(reason, managementCopy.delegation.unavailableTitle),
      }));
    }
  }

  async function refreshDelegationScopes() {
    setScopeOptionsPanel((current) => ({
      data: current.data,
      pagination: current.pagination,
      loading: true,
      error: null,
    }));

    try {
      const tree = await readOrganizationTree(request);

      setScopeOptionsPanel({
        data: buildDelegationScopeOptions(tree, sharedCopy.tenantRoot),
        pagination: buildFallbackPagination(
          tree.directTalents.length + tree.subsidiaries.length,
          1,
          Math.max(tree.directTalents.length + tree.subsidiaries.length, 1),
        ),
        loading: false,
        error: null,
      });
    } catch (reason) {
      setScopeOptionsPanel((current) => ({
        data: current.data,
        pagination: current.pagination,
        loading: false,
        error: getErrorMessage(reason, managementCopy.delegation.loadingTitle),
      }));
    }
  }

  useEffect(() => {
    void refreshUsers();
  }, [deferredUserSearch, requestEnvelope, userStatusFilter, usersPage, usersPageSize]);

  useEffect(() => {
    void Promise.all([refreshRoles(), refreshDelegations(), refreshDelegationScopes()]);
  }, [request, session?.tenantTier]);

  const rolesPagination = buildPaginationMeta(rolesPanel.data.length, rolesPage, rolesPageSize);
  const paginatedRoles = rolesPanel.data.slice(
    (rolesPagination.page - 1) * rolesPagination.pageSize,
    rolesPagination.page * rolesPagination.pageSize,
  );
  const delegationsPagination = buildPaginationMeta(
    delegationsPanel.data.length,
    delegationsPage,
    delegationsPageSize,
  );
  const paginatedDelegations = delegationsPanel.data.slice(
    (delegationsPagination.page - 1) * delegationsPagination.pageSize,
    delegationsPagination.page * delegationsPagination.pageSize,
  );

  useEffect(() => {
    if (rolesPage !== rolesPagination.page) {
      setRolesPage(rolesPagination.page);
    }
  }, [rolesPage, rolesPagination.page]);

  useEffect(() => {
    if (delegationsPage !== delegationsPagination.page) {
      setDelegationsPage(delegationsPagination.page);
    }
  }, [delegationsPage, delegationsPagination.page]);

  useEffect(() => {
    setDelegationDraft((current) => {
      const scopeOptions = scopeOptionsPanel.data.filter((option) => option.type === current.scopeType);
      const scopeId = scopeOptions.some((option) => option.id === current.scopeId)
        ? current.scopeId
        : (scopeOptions[0]?.id ?? '');
      const delegateOptions = current.delegateType === 'user'
        ? usersPanel.data
        : rolesPanel.data.filter((role) => role.isActive);
      const delegateId = delegateOptions.some((option) => option.id === current.delegateId)
        ? current.delegateId
        : (delegateOptions[0]?.id ?? '');

      if (scopeId === current.scopeId && delegateId === current.delegateId) {
        return current;
      }

      return {
        ...current,
        scopeId,
        delegateId,
      };
    });
  }, [rolesPanel.data, scopeOptionsPanel.data, usersPanel.data]);

  function handleTabChange(nextTab: ManagementTab) {
    setNotice(null);
    applyUsersQueryState({ tab: nextTab });
  }

  async function handleSaveDelegation() {
    if (!delegationDraft.scopeId) {
      setNotice({
        scope: 'delegation',
        tone: 'error',
        message: managementCopy.delegation.selectScopeError,
      });
      return;
    }

    if (!delegationDraft.delegateId) {
      setNotice({
        scope: 'delegation',
        tone: 'error',
        message: managementCopy.delegation.selectDelegateError,
      });
      return;
    }

    setDelegationPending(true);
    setNotice(null);

    try {
      const created = await createDelegatedAdmin(request, delegationDraft);
      await refreshDelegations();
      setNotice({
        scope: 'delegation',
        tone: 'success',
        message: managementCopy.delegation.createSuccess(created.delegateName, created.scopeName),
      });
    } catch (reason) {
      setNotice({
        scope: 'delegation',
        tone: 'error',
        message: getErrorMessage(reason, managementCopy.delegation.createError),
      });
    } finally {
      setDelegationPending(false);
    }
  }

  async function handleDialogConfirm() {
    if (!dialogState) {
      return;
    }

    const currentDialog = dialogState;
    setDialogPending(true);
    setNotice(null);

    try {
      switch (currentDialog.kind) {
        case 'deactivate-user':
          await deactivateSystemUser(request, currentDialog.id);
          await refreshUsers();
          break;
        case 'reactivate-user':
          await reactivateSystemUser(request, currentDialog.id);
          await refreshUsers();
          break;
        case 'force-totp':
          await forceSystemUserTotp(request, currentDialog.id);
          break;
        case 'delete-role':
          await removeSystemRole(request, currentDialog.id);
          await refreshRoles();
          break;
        case 'remove-delegation':
          await removeDelegatedAdmin(request, currentDialog.id);
          await refreshDelegations();
          break;
      }

      setNotice({
        scope: currentDialog.scope,
        tone: 'success',
        message: currentDialog.successMessage,
      });
    } catch (reason) {
      setNotice({
        scope: currentDialog.scope,
        tone: 'error',
        message: getErrorMessage(reason, currentDialog.errorFallback),
      });
    } finally {
      setDialogPending(false);
      setDialogState(null);
    }
  }

  const tabs: Array<{ key: ManagementTab; label: string; count: number }> = [
    { key: 'users', label: managementCopy.tabs.users, count: usersPanel.pagination.totalCount },
    { key: 'roles', label: managementCopy.tabs.roles, count: rolesPanel.data.length },
    { key: 'delegation', label: managementCopy.tabs.delegation, count: delegationsPanel.data.length },
  ];
  const delegationScopeOptions = scopeOptionsPanel.data.filter((option) => option.type === delegationDraft.scopeType);
  const delegationDelegateOptions: Array<SystemUserListItem | SystemRoleListItem> = delegationDraft.delegateType === 'user'
    ? usersPanel.data
    : rolesPanel.data.filter((role) => role.isActive);

  const allPanelsFailed =
    !usersPanel.loading &&
    !rolesPanel.loading &&
    !delegationsPanel.loading &&
    Boolean(usersPanel.error) &&
    Boolean(rolesPanel.error) &&
    Boolean(delegationsPanel.error) &&
    usersPanel.data.length === 0 &&
    rolesPanel.data.length === 0 &&
    delegationsPanel.data.length === 0;

  if (allPanelsFailed) {
    return (
      <StateView
        status="error"
        title={managementCopy.pageUnavailableTitle}
        description={managementCopy.pageUnavailableDescription(workspaceAccessLabel)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <GlassSurface className="p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              {managementCopy.badge(workspaceDisplayLabel)}
            </p>
            <h1 className="text-3xl font-semibold text-slate-950">{managementCopy.title}</h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">{managementCopy.description}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard
              label={managementCopy.summaryVisibleUsersLabel}
              value={String(usersPanel.pagination.totalCount)}
              hint={managementCopy.summaryVisibleUsersHint(workspaceSessionLabel)}
            />
            <SummaryCard
              label={managementCopy.summaryActiveRolesLabel}
              value={String(rolesPanel.data.length)}
              hint={managementCopy.summaryActiveRolesHint}
            />
            <SummaryCard
              label={managementCopy.summaryDelegationsLabel}
              value={String(delegationsPanel.data.length)}
              hint={managementCopy.summaryDelegationsHint}
            />
          </div>
        </div>
      </GlassSurface>

      <GlassSurface className="p-4">
        <div className="flex flex-wrap gap-3">
          {tabs.map((tab) => {
            const isActive = tab.key === activeTab;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  handleTabChange(tab.key);
                }}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                    : 'border-slate-200 bg-white/80 text-slate-700 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </GlassSurface>

      {activeTab === 'users' && (
        <section className="space-y-4">
          <GlassSurface className="p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <UsersRound className="h-4 w-4 text-slate-500" />
                  <h2 className="text-lg font-semibold text-slate-900">{managementCopy.users.title}</h2>
                </div>
                <p className="max-w-2xl text-sm leading-6 text-slate-600">{managementCopy.users.description}</p>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <Link
                  href={userCreateHref}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <UserRoundPlus className="h-4 w-4" />
                  {managementCopy.users.newUser}
                </Link>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-700">{managementCopy.users.searchLabel}</span>
                  <input
                    value={userSearch}
                    onChange={(event) => {
                      applyUsersQueryState({
                        search: event.target.value,
                        page: 1,
                      });
                    }}
                    placeholder={managementCopy.users.searchPlaceholder}
                    className="w-72 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-700">{managementCopy.users.statusLabel}</span>
                  <select
                    value={userStatusFilter}
                    onChange={(event) => {
                      applyUsersQueryState({
                        status: event.target.value as UserStatusFilter,
                        page: 1,
                      });
                    }}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  >
                    <option value="all">{managementCopy.users.statusAll}</option>
                    <option value="active">{managementCopy.users.statusActive}</option>
                    <option value="inactive">{managementCopy.users.statusInactive}</option>
                  </select>
                </label>
              </div>
            </div>
          </GlassSurface>

          {notice?.scope === 'users' ? <NoticeBanner tone={notice.tone} message={notice.message} /> : null}

          {usersPanel.error && usersPanel.data.length === 0 && !usersPanel.loading ? (
            <StateView status="error" title={managementCopy.users.unavailableTitle} description={usersPanel.error} />
          ) : (
            <GlassSurface className="p-4">
              {usersPanel.error ? <NoticeBanner tone="error" message={usersPanel.error} /> : null}
              <TableShell
                columns={[...managementCopy.users.columns]}
                dataLength={usersPanel.data.length}
                isLoading={usersPanel.loading}
                isEmpty={!usersPanel.loading && usersPanel.data.length === 0}
                emptyTitle={managementCopy.users.emptyTitle}
                emptyDescription={managementCopy.users.emptyDescription(workspaceDirectoryLabel)}
              >
                {usersPanel.data.map((user) => (
                  <tr key={user.id} className="align-top">
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900">{user.displayName || user.username}</p>
                        <p className="text-sm text-slate-500">{user.email}</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{user.username}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <ToneBadge
                          tone={user.isActive ? 'success' : 'warning'}
                          label={user.isActive ? managementCopy.users.active : managementCopy.users.inactive}
                        />
                        {user.forceReset ? <ToneBadge tone="warning" label={managementCopy.users.resetRequired} /> : null}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <ToneBadge
                          tone={user.isTotpEnabled ? 'info' : 'neutral'}
                          label={user.isTotpEnabled ? managementCopy.users.totpEnabled : managementCopy.users.noTotp}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatUserManagementDateTime(user.lastLoginAt, currentLocale, sharedCopy.never)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatUserManagementDateTime(user.createdAt, currentLocale, sharedCopy.unavailable)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={buildUserEditorHref(user.id)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          {managementCopy.users.edit}
                        </Link>
                        {!user.isTotpEnabled ? (
                          <InlineActionButton
                            tone="primary"
                            onClick={() => {
                              setDialogState({
                                kind: 'force-totp',
                                scope: 'users',
                                id: user.id,
                                title: managementCopy.users.requireTotpTitle(user.displayName || user.username),
                                description: managementCopy.users.requireTotpDescription,
                                confirmText: managementCopy.users.requireTotpConfirm,
                                pendingText: managementCopy.users.requireTotpPending,
                                successMessage: managementCopy.users.requireTotpSuccess(user.displayName || user.username),
                                errorFallback: managementCopy.users.requireTotpError,
                                intent: 'primary',
                              });
                            }}
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            {managementCopy.users.requireTotp}
                          </InlineActionButton>
                        ) : null}
                        {user.isActive ? (
                          <InlineActionButton
                            tone="danger"
                            onClick={() => {
                              setDialogState({
                                kind: 'deactivate-user',
                                scope: 'users',
                                id: user.id,
                                title: managementCopy.users.deactivateTitle(user.displayName || user.username),
                                description: managementCopy.users.deactivateDescription(workspaceAccessLabel),
                                confirmText: managementCopy.users.deactivateConfirm,
                                pendingText: managementCopy.users.deactivatePending,
                                successMessage: managementCopy.users.deactivateSuccess(user.displayName || user.username),
                                errorFallback: managementCopy.users.deactivateError,
                                intent: 'danger',
                              });
                            }}
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                            {managementCopy.users.deactivate}
                          </InlineActionButton>
                        ) : (
                          <InlineActionButton
                            tone="primary"
                            onClick={() => {
                              setDialogState({
                                kind: 'reactivate-user',
                                scope: 'users',
                                id: user.id,
                                title: managementCopy.users.reactivateTitle(user.displayName || user.username),
                                description: managementCopy.users.reactivateDescription(workspaceAccessLabel),
                                confirmText: managementCopy.users.reactivateConfirm,
                                pendingText: managementCopy.users.reactivatePending,
                                successMessage: managementCopy.users.reactivateSuccess(user.displayName || user.username),
                                errorFallback: managementCopy.users.reactivateError,
                                intent: 'primary',
                              });
                            }}
                          >
                            <UserRoundPlus className="h-3.5 w-3.5" />
                            {managementCopy.users.reactivate}
                          </InlineActionButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </TableShell>
              <div className="px-2 pt-4">
                <UserManagementPaginationFooter
                  currentLocale={currentLocale}
                  pagination={usersPanel.pagination}
                  itemCount={usersPanel.data.length}
                  pageSize={usersPageSize}
                  onPageSizeChange={(pageSize) => {
                    applyUsersQueryState({
                      pageSize,
                      page: 1,
                    });
                  }}
                  onPrevious={() => {
                    applyUsersQueryState({
                      page: Math.max(1, usersPanel.pagination.page - 1),
                    });
                  }}
                  onNext={() => {
                    applyUsersQueryState({
                      page: usersPanel.pagination.page + 1,
                    });
                  }}
                />
              </div>
            </GlassSurface>
          )}

        </section>
      )}

      {activeTab === 'roles' && (
        <section className="space-y-4">
          <GlassSurface className="p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-slate-500" />
                  <h2 className="text-lg font-semibold text-slate-900">{managementCopy.roles.title}</h2>
                </div>
                <p className="max-w-2xl text-sm leading-6 text-slate-600">{managementCopy.roles.description}</p>
              </div>
              <Link
                href={roleCreateHref}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <ShieldCheck className="h-4 w-4" />
                {managementCopy.roles.newRole}
              </Link>
            </div>
          </GlassSurface>

          {notice?.scope === 'roles' ? <NoticeBanner tone={notice.tone} message={notice.message} /> : null}

          {rolesPanel.error && rolesPanel.data.length === 0 && !rolesPanel.loading ? (
            <StateView status="error" title={managementCopy.roles.unavailableTitle} description={rolesPanel.error} />
          ) : (
            <GlassSurface className="p-4">
              {rolesPanel.error ? <NoticeBanner tone="error" message={rolesPanel.error} /> : null}
              <TableShell
                columns={[...managementCopy.roles.columns]}
                dataLength={paginatedRoles.length}
                isLoading={rolesPanel.loading}
                isEmpty={!rolesPanel.loading && rolesPanel.data.length === 0}
                emptyTitle={managementCopy.roles.emptyTitle}
                emptyDescription={managementCopy.roles.emptyDescription(workspaceAccessLabel)}
              >
                {paginatedRoles.map((role) => (
                  <tr key={role.id} className="align-top">
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {pickLocalizedName(
                            {
                              nameEn: role.nameEn || role.code,
                              nameZh: role.nameZh,
                              nameJa: role.nameJa,
                            },
                            currentLocale,
                          )}
                        </p>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{role.code}</p>
                        {role.description ? <p className="text-sm text-slate-500">{role.description}</p> : null}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{managementCopy.roles.permissions(role.permissionCount)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{managementCopy.roles.assignedUsers(role.userCount)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <ToneBadge
                          tone={role.isSystem ? 'info' : 'neutral'}
                          label={role.isSystem ? managementCopy.roles.protected : managementCopy.roles.custom}
                        />
                        <ToneBadge
                          tone={role.isActive ? 'success' : 'warning'}
                          label={role.isActive ? managementCopy.roles.active : managementCopy.roles.inactive}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatUserManagementDateTime(role.updatedAt, currentLocale, sharedCopy.unavailable)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={buildRoleEditorHref(role.id)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          {managementCopy.roles.edit}
                        </Link>
                        {role.isSystem ? (
                          <ToneBadge tone="neutral" label={managementCopy.roles.protected} />
                        ) : (
                          <InlineActionButton
                            tone="danger"
                            onClick={() => {
                              setDialogState({
                                kind: 'delete-role',
                                scope: 'roles',
                                id: role.id,
                                title: managementCopy.roles.deleteTitle(
                                  pickLocalizedName(
                                    {
                                      nameEn: role.nameEn || role.code,
                                      nameZh: role.nameZh,
                                      nameJa: role.nameJa,
                                    },
                                    currentLocale,
                                  ),
                                ),
                                description: managementCopy.roles.deleteDescription,
                                confirmText: managementCopy.roles.deleteConfirm,
                                pendingText: managementCopy.roles.deletePending,
                                successMessage: managementCopy.roles.deleteSuccess(
                                  pickLocalizedName(
                                    {
                                      nameEn: role.nameEn || role.code,
                                      nameZh: role.nameZh,
                                      nameJa: role.nameJa,
                                    },
                                    currentLocale,
                                  ),
                                ),
                                errorFallback: managementCopy.roles.deleteError,
                                intent: 'danger',
                              });
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {managementCopy.roles.delete}
                          </InlineActionButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </TableShell>
              <div className="px-2 pt-4">
                <UserManagementPaginationFooter
                  currentLocale={currentLocale}
                  pagination={rolesPagination}
                  itemCount={paginatedRoles.length}
                  pageSize={rolesPageSize}
                  onPageSizeChange={(pageSize) => {
                    setRolesPageSize(pageSize);
                    setRolesPage(1);
                  }}
                  onPrevious={() => {
                    setRolesPage((current) => Math.max(1, current - 1));
                  }}
                  onNext={() => {
                    setRolesPage((current) => current + 1);
                  }}
                />
              </div>
            </GlassSurface>
          )}
        </section>
      )}

      {activeTab === 'delegation' && (
        <section className="space-y-4">
          <GlassSurface className="p-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-slate-500" />
                <h2 className="text-lg font-semibold text-slate-900">{managementCopy.delegation.title}</h2>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">{managementCopy.delegation.description}</p>
            </div>
          </GlassSurface>

          <GlassSurface className="p-6">
            <FormSection
              title={managementCopy.delegation.grantTitle}
              description={managementCopy.delegation.grantDescription}
              actions={
                <AsyncSubmitButton
                  type="button"
                  isPending={delegationPending}
                  pendingText={managementCopy.delegation.grantPending}
                  onClick={() => {
                    void handleSaveDelegation();
                  }}
                  disabled={scopeOptionsPanel.loading}
                >
                  {managementCopy.delegation.grantButton}
                </AsyncSubmitButton>
              }
            >
              {scopeOptionsPanel.error ? <NoticeBanner tone="error" message={scopeOptionsPanel.error} /> : null}
              {scopeOptionsPanel.loading ? (
                <StateView
                  status="unavailable"
                  title={managementCopy.delegation.loadingTitle}
                  description={managementCopy.delegation.loadingDescription}
                />
              ) : scopeOptionsPanel.data.length === 0 ? (
                <StateView
                  status="unavailable"
                  title={managementCopy.delegation.noScopesTitle}
                  description={managementCopy.delegation.noScopesDescription}
                />
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-900">{managementCopy.delegation.scopeTypeLabel}</span>
                      <select
                        aria-label={managementCopy.delegation.scopeTypeLabel}
                        value={delegationDraft.scopeType}
                        onChange={(event) => {
                          const scopeType = event.target.value as DelegationDraft['scopeType'];
                          const nextScopeOptions = scopeOptionsPanel.data.filter((option) => option.type === scopeType);

                          setDelegationDraft((current) => ({
                            ...current,
                            scopeType,
                            scopeId: nextScopeOptions[0]?.id ?? '',
                          }));
                        }}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400"
                      >
                        <option value="subsidiary">{managementCopy.delegation.scopeTypeSubsidiary}</option>
                        <option value="talent">{managementCopy.delegation.scopeTypeTalent}</option>
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-900">{managementCopy.delegation.scopeTargetLabel}</span>
                      <select
                        aria-label={managementCopy.delegation.scopeTargetLabel}
                        value={delegationDraft.scopeId}
                        onChange={(event) => {
                          setDelegationDraft((current) => ({
                            ...current,
                            scopeId: event.target.value,
                          }));
                        }}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400"
                      >
                        {delegationScopeOptions.map((option) => (
                          <option key={`${option.type}-${option.id}`} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {delegationScopeOptions.length > 0 ? (
                        <p className="text-xs text-slate-500">
                          {delegationScopeOptions.find((option) => option.id === delegationDraft.scopeId)?.hint || delegationScopeOptions[0]?.hint}
                        </p>
                      ) : null}
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-900">{managementCopy.delegation.delegateTypeLabel}</span>
                      <select
                        aria-label={managementCopy.delegation.delegateTypeLabel}
                        value={delegationDraft.delegateType}
                        onChange={(event) => {
                          const delegateType = event.target.value as DelegationDraft['delegateType'];
                          const nextDelegateOptions = delegateType === 'user'
                            ? usersPanel.data
                            : rolesPanel.data.filter((role) => role.isActive);

                          setDelegationDraft((current) => ({
                            ...current,
                            delegateType,
                            delegateId: nextDelegateOptions[0]?.id ?? '',
                          }));
                        }}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400"
                      >
                        <option value="user">{managementCopy.delegation.delegateTypeUser}</option>
                        <option value="role">{managementCopy.delegation.delegateTypeRole}</option>
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-900">{managementCopy.delegation.delegateLabel}</span>
                      <select
                        aria-label={managementCopy.delegation.delegateLabel}
                        value={delegationDraft.delegateId}
                        onChange={(event) => {
                          setDelegationDraft((current) => ({
                            ...current,
                            delegateId: event.target.value,
                          }));
                        }}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400"
                      >
                        {delegationDelegateOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {'email' in option
                              ? `${option.displayName || option.username} (${option.email})`
                              : `${pickLocalizedName(
                                  {
                                    nameEn: option.nameEn || option.code,
                                    nameZh: option.nameZh,
                                    nameJa: option.nameJa,
                                  },
                                  currentLocale,
                                )} (${option.code})`}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                    {managementCopy.delegation.sourceNote}
                  </div>
                </>
              )}
            </FormSection>
          </GlassSurface>

          {notice?.scope === 'delegation' ? <NoticeBanner tone={notice.tone} message={notice.message} /> : null}

          {delegationsPanel.error && delegationsPanel.data.length === 0 && !delegationsPanel.loading ? (
            <StateView status="error" title={managementCopy.delegation.unavailableTitle} description={delegationsPanel.error} />
          ) : (
            <GlassSurface className="p-4">
              {delegationsPanel.error ? <NoticeBanner tone="error" message={delegationsPanel.error} /> : null}
              <TableShell
                columns={[...managementCopy.delegation.columns]}
                dataLength={paginatedDelegations.length}
                isLoading={delegationsPanel.loading}
                isEmpty={!delegationsPanel.loading && delegationsPanel.data.length === 0}
                emptyTitle={managementCopy.delegation.emptyTitle}
                emptyDescription={managementCopy.delegation.emptyDescription(isAcWorkspace)}
              >
                {paginatedDelegations.map((delegation) => (
                  <tr key={delegation.id} className="align-top">
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900">{delegation.scopeName}</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                          {getLocalizedScopeTypeLabel(delegation.scopeType, currentLocale)}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900">{delegation.delegateName}</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                          {getLocalizedDelegateTypeLabel(delegation.delegateType, currentLocale)}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {delegation.grantedBy ? delegation.grantedBy.username : managementCopy.delegation.systemGrantedBy}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatUserManagementDateTime(delegation.grantedAt, currentLocale, sharedCopy.unavailable)}
                    </td>
                    <td className="px-6 py-4">
                      <InlineActionButton
                        tone="danger"
                        onClick={() => {
                          setDialogState({
                            kind: 'remove-delegation',
                            scope: 'delegation',
                            id: delegation.id,
                            title: managementCopy.delegation.removeTitle(delegation.delegateName),
                            description: managementCopy.delegation.removeDescription,
                            confirmText: managementCopy.delegation.removeConfirm,
                            pendingText: managementCopy.delegation.removePending,
                            successMessage: managementCopy.delegation.removeSuccess(delegation.delegateName),
                            errorFallback: managementCopy.delegation.removeError,
                            intent: 'danger',
                          });
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {managementCopy.delegation.remove}
                      </InlineActionButton>
                    </td>
                  </tr>
                ))}
              </TableShell>
              <div className="px-2 pt-4">
                <UserManagementPaginationFooter
                  currentLocale={currentLocale}
                  pagination={delegationsPagination}
                  itemCount={paginatedDelegations.length}
                  pageSize={delegationsPageSize}
                  onPageSizeChange={(pageSize) => {
                    setDelegationsPageSize(pageSize);
                    setDelegationsPage(1);
                  }}
                  onPrevious={() => {
                    setDelegationsPage((current) => Math.max(1, current - 1));
                  }}
                  onNext={() => {
                    setDelegationsPage((current) => current + 1);
                  }}
                />
              </div>
            </GlassSurface>
          )}
        </section>
      )}

      <ConfirmActionDialog
        open={dialogState !== null}
        title={dialogState?.title || sharedCopy.confirmAction}
        description={dialogState?.description || ''}
        confirmText={dialogState?.confirmText || sharedCopy.confirm}
        intent={dialogState?.intent || 'danger'}
        isPending={dialogPending}
        onCancel={() => {
          if (!dialogPending) {
            setDialogState(null);
          }
        }}
        onConfirm={() => {
          void handleDialogConfirm();
        }}
      />
    </div>
  );
}
