'use client';

import {
  INITIAL_ADMIN_ROLE_CODE,
  RBAC_RESOURCES,
} from '@tcrn/shared';
import { ArrowLeft, Languages } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  createSystemRole,
  readSystemRoleDetail,
  type SystemRoleDetailResponse,
  type SystemRolePermissionRecord,
  updateSystemRole,
} from '@/domains/user-management/api/user-management.api';
import {
  buildAcRoleEditorPath,
  buildAcUserManagementPath,
  buildTenantRoleEditorPath,
  buildTenantUserManagementPath,
} from '@/platform/routing/workspace-paths';
import {
  buildLocalizedTextPayload,
  extractLocalizedTextPayload,
  extractSingleFieldTranslationPayload,
  loadTranslationLanguageOptions,
  pickLocaleText,
  type TranslationLanguageOption,
} from '@/platform/runtime/locale/locale-text';
import {
  buildPaginationMeta,
  PAGE_SIZE_OPTIONS,
  type PageSizeOption,
} from '@/platform/runtime/pagination/pagination';
import { useSession } from '@/platform/runtime/session/session-provider';
import { AsyncSubmitButton, GlassSurface, StateView, TranslationDrawer } from '@/platform/ui';

import {
  RoleAdvancedPermissionMatrix,
  type RolePermissionSelection,
} from './RoleAdvancedPermissionMatrix';
import { RoleCapabilityPackEditor } from './RoleCapabilityPackEditor';
import {
  formatUserManagementDateTime,
  getLocalizedExplicitPermissionCountLabel,
  getLocalizedScopeTypeLabel,
  useUserManagementCopy,
} from './user-management.copy';
import {
  getErrorMessage,
  NoticeBanner,
  resolveScopedLabel,
  SummaryCard,
  ToneBadge,
  UserManagementPaginationFooter,
} from './user-management.shared';

interface RoleEditorDraft {
  code: string;
  nameBase: string;
  nameLocaleValues: Record<string, string>;
  description: string;
  permissionStates: Record<string, RolePermissionSelection>;
}

interface TranslationOptionsState {
  data: TranslationLanguageOption[];
  error: string | null;
  loading: boolean;
}

const inputClassName =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100';

const EMPTY_ROLE_PERMISSION_STATES = Object.fromEntries(
  RBAC_RESOURCES.flatMap((resource) =>
    resource.supportedActions.map((action) => [`${resource.code}:${action}`, 'unset'])
  )
) as Record<string, RolePermissionSelection>;

function createEmptyRoleEditorDraft(): RoleEditorDraft {
  return {
    code: '',
    nameBase: '',
    nameLocaleValues: {},
    description: '',
    permissionStates: { ...EMPTY_ROLE_PERMISSION_STATES },
  };
}

function buildRoleEditorDraft(detail?: SystemRoleDetailResponse | null): RoleEditorDraft {
  const permissionStates = { ...EMPTY_ROLE_PERMISSION_STATES };

  detail?.permissions.forEach((permission) => {
    permissionStates[`${permission.resource}:${permission.action}`] = permission.effect;
  });

  return {
    code: detail?.code || '',
    nameBase: detail?.name.en || '',
    nameLocaleValues: extractLocalizedTextPayload(detail?.name),
    description: detail?.description || '',
    permissionStates,
  };
}

function buildRolePermissionPayload(permissionStates: Record<string, RolePermissionSelection>) {
  const permissions: SystemRolePermissionRecord[] = [];

  RBAC_RESOURCES.forEach((resource) => {
    resource.supportedActions.forEach((action) => {
      const effect = permissionStates[`${resource.code}:${action}`];

      if (effect && effect !== 'unset') {
        permissions.push({
          resource: resource.code,
          action,
          effect,
        });
      }
    });
  });

  return permissions;
}

function normalizeOptionalString(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function validateRoleEditorDraft(
  mode: 'create' | 'edit',
  draft: RoleEditorDraft,
  roleEditorCopy: ReturnType<typeof useUserManagementCopy>['copy']['roleEditor']
) {
  if (mode === 'create') {
    const normalizedCode = draft.code.trim().toUpperCase();

    if (!/^[A-Z0-9_]{3,32}$/.test(normalizedCode)) {
      return roleEditorCopy.validation.code;
    }
  }

  if (draft.nameBase.trim().length === 0) {
    return roleEditorCopy.validation.nameBase;
  }

  return null;
}

export function RoleEditorScreen({
  tenantId,
  mode,
  systemRoleId,
  workspaceKind = 'tenant',
}: Readonly<{
  tenantId: string;
  mode: 'create' | 'edit';
  systemRoleId?: string;
  workspaceKind?: 'tenant' | 'ac';
}>) {
  const router = useRouter();
  const { request, requestEnvelope } = useSession();
  const { copy, locale } = useUserManagementCopy();
  const isAcWorkspace = workspaceKind === 'ac';
  const sharedCopy = copy.shared;
  const roleEditorCopy = copy.roleEditor;
  const workspaceDisplayLabel = isAcWorkspace ? sharedCopy.acWorkspace : sharedCopy.tenantWorkspace;
  const inventoryBaseHref = isAcWorkspace
    ? buildAcUserManagementPath(tenantId)
    : buildTenantUserManagementPath(tenantId);
  const inventoryHref = `${inventoryBaseHref}?tab=roles`;
  const buildRoleHref = (roleId: string) =>
    isAcWorkspace
      ? buildAcRoleEditorPath(tenantId, roleId)
      : buildTenantRoleEditorPath(tenantId, roleId);
  const [draft, setDraft] = useState<RoleEditorDraft>(createEmptyRoleEditorDraft);
  const [detail, setDetail] = useState<SystemRoleDetailResponse | null>(null);
  const [loading, setLoading] = useState(mode === 'edit');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [translationDrawerOpen, setTranslationDrawerOpen] = useState(false);
  const [translationOptionsState, setTranslationOptionsState] = useState<TranslationOptionsState>({
    data: [],
    error: null,
    loading: false,
  });
  const [scopeBindingsPage, setScopeBindingsPage] = useState(1);
  const [scopeBindingsPageSize, setScopeBindingsPageSize] = useState<PageSizeOption>(
    PAGE_SIZE_OPTIONS[0]
  );
  const [assignedUsersPage, setAssignedUsersPage] = useState(1);
  const [assignedUsersPageSize, setAssignedUsersPageSize] = useState<PageSizeOption>(
    PAGE_SIZE_OPTIONS[0]
  );

  useEffect(() => {
    if (mode !== 'edit' || !systemRoleId) {
      return;
    }

    const targetSystemRoleId = systemRoleId;
    let cancelled = false;

    async function loadRoleDetail() {
      setLoading(true);
      setLoadError(null);

      try {
        const nextDetail = await readSystemRoleDetail(request, targetSystemRoleId);

        if (cancelled) {
          return;
        }

        setDetail(nextDetail);
        setDraft(buildRoleEditorDraft(nextDetail));
      } catch (reason) {
        if (!cancelled) {
          setLoadError(getErrorMessage(reason, roleEditorCopy.loadError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRoleDetail();

    return () => {
      cancelled = true;
    };
  }, [mode, request, roleEditorCopy.loadError, systemRoleId]);

  useEffect(() => {
    if (!translationDrawerOpen) {
      return;
    }

    let cancelled = false;

    async function loadTranslationOptions() {
      setTranslationOptionsState((current) => ({
        data: current.data,
        error: null,
        loading: true,
      }));

      const result = await loadTranslationLanguageOptions(
        request,
        requestEnvelope,
        locale,
        roleEditorCopy.translationManagement.languageLoadError
      );

      if (cancelled) {
        return;
      }

      setTranslationOptionsState({
        data: result.options,
        error: result.error,
        loading: false,
      });
    }

    void loadTranslationOptions();

    return () => {
      cancelled = true;
    };
  }, [
    request,
    requestEnvelope,
    roleEditorCopy.translationManagement.languageLoadError,
    locale,
    translationDrawerOpen,
  ]);

  const scopeBindingsPagination = buildPaginationMeta(
    detail?.scopeBindings.length ?? 0,
    scopeBindingsPage,
    scopeBindingsPageSize
  );
  const paginatedScopeBindings =
    detail?.scopeBindings.slice(
      (scopeBindingsPagination.page - 1) * scopeBindingsPagination.pageSize,
      scopeBindingsPagination.page * scopeBindingsPagination.pageSize
    ) ?? [];
  const assignedUsersPagination = buildPaginationMeta(
    detail?.assignedUsers.length ?? 0,
    assignedUsersPage,
    assignedUsersPageSize
  );
  const paginatedAssignedUsers =
    detail?.assignedUsers.slice(
      (assignedUsersPagination.page - 1) * assignedUsersPagination.pageSize,
      assignedUsersPagination.page * assignedUsersPagination.pageSize
    ) ?? [];
  const isInitialAdminReadOnly =
    mode === 'edit' && (detail?.code === INITIAL_ADMIN_ROLE_CODE || detail?.isSystem === true);

  useEffect(() => {
    if (scopeBindingsPage !== scopeBindingsPagination.page) {
      setScopeBindingsPage(scopeBindingsPagination.page);
    }
  }, [scopeBindingsPage, scopeBindingsPagination.page]);

  useEffect(() => {
    if (assignedUsersPage !== assignedUsersPagination.page) {
      setAssignedUsersPage(assignedUsersPagination.page);
    }
  }, [assignedUsersPage, assignedUsersPagination.page]);

  async function handleSaveRole() {
    const validationError = validateRoleEditorDraft(mode, draft, roleEditorCopy);

    if (validationError) {
      setNotice({
        tone: 'error',
        message: validationError,
      });
      return;
    }

    setSubmitting(true);
    setNotice(null);

    const displayName =
      draft.nameBase.trim() ||
      draft.nameLocaleValues.zh_HANS?.trim() ||
      draft.nameLocaleValues.ja?.trim() ||
      draft.code.trim().toUpperCase();
    const permissions = buildRolePermissionPayload(draft.permissionStates);

    try {
      if (mode === 'create') {
        const created = await createSystemRole(request, {
          code: draft.code.trim().toUpperCase(),
          name: buildLocalizedTextPayload(draft.nameBase, draft.nameLocaleValues),
          description: normalizeOptionalString(draft.description),
          permissions,
        });

        router.replace(buildRoleHref(created.id));
        return;
      }

      const targetRoleId = systemRoleId;

      if (!targetRoleId) {
        throw new Error(roleEditorCopy.missingTargetError);
      }

      await updateSystemRole(request, targetRoleId, {
        name: buildLocalizedTextPayload(draft.nameBase, draft.nameLocaleValues),
        description: normalizeOptionalString(draft.description),
        permissions,
        version: detail?.version,
      });

      const refreshed = await readSystemRoleDetail(request, targetRoleId);
      setDetail(refreshed);
      setDraft(buildRoleEditorDraft(refreshed));
      setNotice({
        tone: 'success',
        message: roleEditorCopy.updateSuccess(displayName),
      });
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(
          reason,
          mode === 'create' ? roleEditorCopy.createError : roleEditorCopy.updateError
        ),
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (mode === 'edit' && loading) {
    return (
      <div className="space-y-6">
        <GlassSurface className="p-8">
          <p className="text-sm font-medium text-slate-500">{roleEditorCopy.loading}</p>
        </GlassSurface>
      </div>
    );
  }

  if (mode === 'edit' && (loadError || !detail)) {
    return (
      <StateView
        status="error"
        title={roleEditorCopy.unavailableTitle}
        description={loadError || undefined}
      />
    );
  }

  const title =
    mode === 'create'
      ? roleEditorCopy.createTitle
      : detail?.localizedName || detail?.name.en || detail?.code || roleEditorCopy.titleFallback;
  const explicitPermissionCount = buildRolePermissionPayload(draft.permissionStates).length;
  const configuredTranslationCount = Object.values(draft.nameLocaleValues).filter(
    (value) => value.trim().length > 0
  ).length;
  const translationDrawerLabels = {
    addLanguageLabel: pickLocaleText(locale, {
      en: 'Add language',
      zh_HANS: '添加语言',
      zh_HANT: '新增語言',
      ja: '言語を追加',
      ko: '언어 추가',
      fr: 'Ajouter une langue',
    }),
    addOtherLanguageLabel: pickLocaleText(locale, {
      en: 'Add other language...',
      zh_HANS: '添加其它语言…',
      zh_HANT: '新增其它語言…',
      ja: '他の言語を追加…',
      ko: '다른 언어 추가…',
      fr: 'Ajouter une autre langue…',
    }),
    removeLanguageVisibleLabel: pickLocaleText(locale, {
      en: 'Remove',
      zh_HANS: '移除',
      zh_HANT: '移除',
      ja: '削除',
      ko: '제거',
      fr: 'Retirer',
    }),
    emptyTranslationsText: pickLocaleText(locale, {
      en: 'No translations added yet.',
      zh_HANS: '当前还没有添加翻译。',
      zh_HANT: '目前尚未新增翻譯。',
      ja: 'まだ翻訳は追加されていません。',
      ko: '아직 추가된 번역이 없습니다.',
      fr: 'Aucune traduction n’a encore été ajoutée.',
    }),
    baseValueSuffix: pickLocaleText(locale, {
      en: '(Base / English)',
      zh_HANS: '（英文主值）',
      zh_HANT: '（英文主值）',
      ja: '（英語の基準値）',
      ko: '(영문 기본값)',
      fr: '(Valeur de base / anglais)',
    }),
  };
  const permissionStateHelp = {
    grant: pickLocaleText(locale, {
      en: 'Grant: this role grants the selected permission when assigned in the matching scope.',
      zh_HANS: '允许：此角色在匹配范围内被分配时授予所选权限。',
      zh_HANT: '允許：此角色在匹配範圍內被分配時授予所選權限。',
      ja: '許可: 一致するスコープで割り当てられると、このロールが権限を付与します。',
      ko: 'Grant: this role grants the selected permission when assigned in the matching scope.',
      fr: 'Grant: this role grants the selected permission when assigned in the matching scope.',
    }),
    deny: pickLocaleText(locale, {
      en: 'Deny: this role denies the selected permission. Deny wins over grants from other roles.',
      zh_HANS: '拒绝：此角色拒绝所选权限，并优先于其它角色的允许。',
      zh_HANT: '拒絕：此角色拒絕所選權限，並優先於其它角色的允許。',
      ja: '拒否: このロールが権限を拒否します。他のロールの許可より優先されます。',
      ko: 'Deny: this role denies the selected permission. Deny wins over grants from other roles.',
      fr: 'Deny: this role denies the selected permission. Deny wins over grants from other roles.',
    }),
    unset: pickLocaleText(locale, {
      en: 'Unset: this role makes no decision. Another assigned role may still grant access unless any role denies it.',
      zh_HANS: '未设置：此角色不做决定。其它已分配角色仍可授予访问，除非任一角色拒绝。',
      zh_HANT: '未設定：此角色不做決定。其它已分配角色仍可授予存取，除非任一角色拒絕。',
      ja: '未設定: このロールは判断しません。他のロールが拒否しない限り、別の割当ロールが許可できます。',
      ko: 'Unset: this role makes no decision. Another assigned role may still grant access unless any role denies it.',
      fr: 'Unset: this role makes no decision. Another assigned role may still grant access unless any role denies it.',
    }),
  };

  return (
    <div className="space-y-6">
      <GlassSurface className="p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3">
            <Link
              href={inventoryHref}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              {roleEditorCopy.backToInventory}
            </Link>
            <p className="text-xs font-semibold tracking-[0.24em] text-slate-500 uppercase">
              {roleEditorCopy.badge(workspaceDisplayLabel)}
            </p>
            <h1 className="text-3xl font-semibold text-slate-950">{title}</h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              {mode === 'create'
                ? roleEditorCopy.createDescription
                : roleEditorCopy.editDescription}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard
              label={roleEditorCopy.summaryExplicitPermissionsLabel}
              value={String(explicitPermissionCount)}
              hint={roleEditorCopy.summaryExplicitPermissionsHint}
            />
            <SummaryCard
              label={roleEditorCopy.summaryAssignedUsersLabel}
              value={String(detail?.assignedUsers.length || 0)}
              hint={roleEditorCopy.summaryAssignedUsersHint}
            />
            <SummaryCard
              label={roleEditorCopy.summaryBoundScopesLabel}
              value={String(detail?.scopeBindings.length || 0)}
              hint={roleEditorCopy.summaryBoundScopesHint}
            />
          </div>
        </div>
      </GlassSurface>

      {notice ? <NoticeBanner tone={notice.tone} message={notice.message} /> : null}

      {mode === 'edit' && detail ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <GlassSurface className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-900">
                  {roleEditorCopy.scopeBindingsTitle}
                </h2>
                <p className="text-sm leading-6 text-slate-600">
                  {roleEditorCopy.scopeBindingsDescription}
                </p>
              </div>
              <ToneBadge tone="info" label={sharedCopy.scopeCount(detail.scopeBindings.length)} />
            </div>

            <div className="mt-4 space-y-3">
              {detail.scopeBindings.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  {roleEditorCopy.scopeBindingsEmpty}
                </p>
              ) : (
                paginatedScopeBindings.map((binding) => (
                  <div
                    key={`${binding.scopeType}-${binding.scopeId || 'tenant-root'}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {resolveScopedLabel(binding.scopeType, binding.scopeName, sharedCopy)}
                        </p>
                        <p className="text-xs tracking-[0.18em] text-slate-400 uppercase">
                          {getLocalizedScopeTypeLabel(binding.scopeType, locale)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <ToneBadge tone="info" label={sharedCopy.userCount(binding.userCount)} />
                        <ToneBadge
                          tone="neutral"
                          label={sharedCopy.assignmentCount(binding.assignmentCount)}
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {binding.scopePath || sharedCopy.tenantWideBinding}
                    </p>
                    {binding.inheritedAssignmentCount > 0 ? (
                      <p className="mt-2 text-xs text-slate-500">
                        {sharedCopy.inheritedAssignments(binding.inheritedAssignmentCount)}
                      </p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
            {detail.scopeBindings.length > 0 ? (
              <div className="mt-4">
                <UserManagementPaginationFooter
                  locale={locale}
                  pagination={scopeBindingsPagination}
                  itemCount={paginatedScopeBindings.length}
                  pageSize={scopeBindingsPageSize}
                  onPageSizeChange={(pageSize) => {
                    setScopeBindingsPageSize(pageSize);
                    setScopeBindingsPage(1);
                  }}
                  onPrevious={() => {
                    setScopeBindingsPage((current) => Math.max(1, current - 1));
                  }}
                  onNext={() => {
                    setScopeBindingsPage((current) => current + 1);
                  }}
                />
              </div>
            ) : null}
          </GlassSurface>

          <GlassSurface className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-900">
                  {roleEditorCopy.assignedUsersTitle}
                </h2>
                <p className="text-sm leading-6 text-slate-600">
                  {roleEditorCopy.assignedUsersDescription}
                </p>
              </div>
              <ToneBadge
                tone="info"
                label={sharedCopy.assignmentCount(detail.assignedUsers.length)}
              />
            </div>

            <div className="mt-4 space-y-3">
              {detail.assignedUsers.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  {roleEditorCopy.assignedUsersEmpty}
                </p>
              ) : (
                paginatedAssignedUsers.map((assignment) => (
                  <div
                    key={assignment.assignmentId}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {assignment.displayName || assignment.username}
                        </p>
                        <p className="text-sm text-slate-500">{assignment.email}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <ToneBadge
                          tone={assignment.isActive ? 'success' : 'warning'}
                          label={
                            assignment.isActive ? sharedCopy.userActive : sharedCopy.userInactive
                          }
                        />
                        {assignment.inherit ? (
                          <ToneBadge tone="neutral" label={sharedCopy.inherit} />
                        ) : null}
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
                      {formatUserManagementDateTime(
                        assignment.grantedAt,
                        locale,
                        sharedCopy.unavailable
                      )}
                      {assignment.expiresAt
                        ? ` • ${sharedCopy.expiresLabel} ${formatUserManagementDateTime(
                            assignment.expiresAt,
                            locale,
                            sharedCopy.unavailable
                          )}`
                        : ''}
                    </p>
                  </div>
                ))
              )}
            </div>
            {detail.assignedUsers.length > 0 ? (
              <div className="mt-4">
                <UserManagementPaginationFooter
                  locale={locale}
                  pagination={assignedUsersPagination}
                  itemCount={paginatedAssignedUsers.length}
                  pageSize={assignedUsersPageSize}
                  onPageSizeChange={(pageSize) => {
                    setAssignedUsersPageSize(pageSize);
                    setAssignedUsersPage(1);
                  }}
                  onPrevious={() => {
                    setAssignedUsersPage((current) => Math.max(1, current - 1));
                  }}
                  onNext={() => {
                    setAssignedUsersPage((current) => current + 1);
                  }}
                />
              </div>
            ) : null}
          </GlassSurface>
        </div>
      ) : null}

      <GlassSurface className="p-6">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">
                {roleEditorCopy.fields.roleCode}
              </span>
              <input
                aria-label={roleEditorCopy.fields.roleCode}
                value={draft.code}
                onChange={(event) => {
                  setDraft((current) => ({
                    ...current,
                    code: event.target.value.toUpperCase(),
                  }));
                }}
                disabled={mode === 'edit' || isInitialAdminReadOnly}
                className={`${inputClassName} uppercase`}
              />
            </label>
            <div className="space-y-3">
              <div className="flex flex-wrap items-end gap-3">
                <label className="min-w-0 flex-1 space-y-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {roleEditorCopy.fields.nameBase}
                  </span>
                  <input
                    aria-label={roleEditorCopy.fields.nameBase}
                    value={draft.nameBase}
                    onChange={(event) => {
                      setDraft((current) => ({
                        ...current,
                        nameBase: event.target.value,
                      }));
                    }}
                    disabled={isInitialAdminReadOnly}
                    className={inputClassName}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setTranslationDrawerOpen(true)}
                  disabled={isInitialAdminReadOnly}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={roleEditorCopy.translationManagement.trigger}
                >
                  <Languages className="h-4 w-4" />
                  <span>{roleEditorCopy.translationManagement.trigger}</span>
                  {configuredTranslationCount > 0 ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      {configuredTranslationCount}
                    </span>
                  ) : null}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                {configuredTranslationCount > 0
                  ? roleEditorCopy.translationManagement.summary(configuredTranslationCount)
                  : roleEditorCopy.translationManagement.empty}
              </p>
              {translationOptionsState.error ? (
                <p className="text-xs text-amber-700">{translationOptionsState.error}</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">
                {roleEditorCopy.fields.description}
              </span>
              <textarea
                aria-label={roleEditorCopy.fields.description}
                rows={4}
                value={draft.description}
                onChange={(event) => {
                  setDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }));
                }}
                disabled={isInitialAdminReadOnly}
                className={inputClassName}
              />
            </label>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            {mode === 'create' ? roleEditorCopy.createHint : roleEditorCopy.editHint}
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-900">
                  {roleEditorCopy.permissionMatrixTitle}
                </h2>
                <p className="text-sm leading-6 text-slate-600">
                  {roleEditorCopy.permissionMatrixDescription}
                </p>
              </div>
              <ToneBadge
                tone="info"
                label={getLocalizedExplicitPermissionCountLabel(explicitPermissionCount, locale)}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                {permissionStateHelp.grant}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                {permissionStateHelp.deny}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                {permissionStateHelp.unset}
              </div>
            </div>

            <RoleCapabilityPackEditor
              permissionStates={draft.permissionStates}
              locale={locale}
              readOnly={isInitialAdminReadOnly}
              onPermissionStateChange={(permissionKey, nextValue) => {
                setDraft((current) => ({
                  ...current,
                  permissionStates: {
                    ...current.permissionStates,
                    [permissionKey]: nextValue,
                  },
                }));
              }}
            />

            <RoleAdvancedPermissionMatrix
              permissionStates={draft.permissionStates}
              explicitPermissionCount={explicitPermissionCount}
              locale={locale}
              readOnly={isInitialAdminReadOnly}
              onPermissionStateChange={(permissionKey, nextValue) => {
                setDraft((current) => ({
                  ...current,
                  permissionStates: {
                    ...current.permissionStates,
                    [permissionKey]: nextValue,
                  },
                }));
              }}
            />
          </div>

          {isInitialAdminReadOnly ? null : (
          <div className="flex justify-end">
            <AsyncSubmitButton
              type="button"
              isPending={submitting}
              pendingText={
                mode === 'create' ? roleEditorCopy.pendingCreate : roleEditorCopy.pendingSave
              }
              onClick={() => {
                void handleSaveRole();
              }}
            >
              {mode === 'create' ? roleEditorCopy.submitCreate : roleEditorCopy.submitSave}
            </AsyncSubmitButton>
          </div>
          )}
        </div>
      </GlassSurface>

      <TranslationDrawer
        open={translationDrawerOpen}
        onOpenChange={setTranslationDrawerOpen}
        title={roleEditorCopy.translationManagement.title}
        baseValue={draft.nameBase}
        translations={draft.nameLocaleValues}
        legacyFieldLabel={roleEditorCopy.fields.nameBase}
        availableLocales={translationOptionsState.data}
        onSave={async (payload) => {
          const translations = extractSingleFieldTranslationPayload(payload);

          setDraft((current) => ({
            ...current,
            nameLocaleValues: translations,
          }));
        }}
        saveButtonLabel={roleEditorCopy.translationManagement.save}
        cancelButtonLabel={roleEditorCopy.translationManagement.cancel}
        closeButtonAriaLabel={roleEditorCopy.translationManagement.closeButtonAriaLabel}
        addLanguageLabel={translationDrawerLabels.addLanguageLabel}
        addOtherLanguageLabel={translationDrawerLabels.addOtherLanguageLabel}
        removeLanguageVisibleLabel={translationDrawerLabels.removeLanguageVisibleLabel}
        removeLanguageAriaLabel={(language) =>
          `${translationDrawerLabels.removeLanguageVisibleLabel} ${language}`
        }
        emptyTranslationsText={translationDrawerLabels.emptyTranslationsText}
        baseValueSuffix={translationDrawerLabels.baseValueSuffix}
      />
    </div>
  );
}
