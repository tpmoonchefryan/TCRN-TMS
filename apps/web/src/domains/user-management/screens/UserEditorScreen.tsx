'use client';

import { SUPPORTED_UI_LOCALES, type SupportedUiLocale } from '@tcrn/shared';
import { ArrowLeft, KeyRound, ShieldCheck, Trash2, UserRoundPlus, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { readOrganizationTree } from '@/domains/organization-access/api/organization.api';
import {
  createSystemUser,
  createUserRoleAssignment,
  listSystemRoles,
  readSystemUserDetail,
  removeUserRoleAssignment,
  type SystemRoleListItem,
  type SystemUserDetailResponse,
  updateSystemUser,
  updateUserRoleAssignment,
} from '@/domains/user-management/api/user-management.api';
import {
  buildAcUserEditorPath,
  buildAcUserManagementPath,
  buildTenantUserEditorPath,
  buildTenantUserManagementPath,
} from '@/platform/routing/workspace-paths';
import {
  buildPaginationMeta,
  PAGE_SIZE_OPTIONS,
  type PageSizeOption,
} from '@/platform/runtime/pagination/pagination';
import { useSession } from '@/platform/runtime/session/session-provider';
import { AsyncSubmitButton, GlassSurface, StateView } from '@/platform/ui';

import {
  formatUserManagementDateTime,
  getLocalizedLanguageLabel,
  getLocalizedScopeTypeLabel,
  pickLocalizedName,
  useUserManagementCopy,
} from './user-management.copy';
import {
  buildOrganizationScopeOptions,
  filterAssignableRoles,
  getErrorMessage,
  NoticeBanner,
  type OrganizationScopeOption,
  resolveScopedLabel,
  ScopeAssignmentCard,
  SummaryCard,
  ToneBadge,
  UserManagementPaginationFooter,
} from './user-management.shared';

interface UserEditorDraft {
  username: string;
  email: string;
  password: string;
  displayName: string;
  phone: string;
  preferredLanguage: SupportedUiLocale;
  forceReset: boolean;
}

interface AssignmentComposerDraft {
  scopeType: 'tenant' | 'subsidiary' | 'talent';
  scopeId: string;
  roleId: string;
  inherit: boolean;
  expiresAt: string;
}

interface AssignmentDraft {
  inherit: boolean;
  expiresAt: string;
}

const EMPTY_USER_EDITOR_DRAFT: UserEditorDraft = {
  username: '',
  email: '',
  password: '',
  displayName: '',
  phone: '',
  preferredLanguage: 'en',
  forceReset: true,
};

const inputClassName =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100';

function buildUserEditorDraft(detail?: SystemUserDetailResponse | null): UserEditorDraft {
  if (!detail) {
    return EMPTY_USER_EDITOR_DRAFT;
  }

  return {
    username: detail.username,
    email: detail.email,
    password: '',
    displayName: detail.displayName || '',
    phone: detail.phone || '',
    preferredLanguage: detail.preferredLanguage,
    forceReset: detail.forceReset,
  };
}

function validateUserEditorDraft(
  mode: 'create' | 'edit',
  draft: UserEditorDraft,
  editorCopy: ReturnType<typeof useUserManagementCopy>['copy']['editor'],
) {
  if (mode === 'create') {
    if (draft.username.trim().length < 3) {
      return editorCopy.validation.username;
    }

    if (!draft.email.includes('@')) {
      return editorCopy.validation.email;
    }

    if (draft.password.length < 12) {
      return editorCopy.validation.initialPassword;
    }
  }

  return null;
}

function normalizeOptionalString(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const pad = (segment: number) => String(segment).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoOrNull(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function buildAssignmentDrafts(detail: SystemUserDetailResponse | null) {
  return Object.fromEntries(
    (detail?.roleAssignments || []).map((assignment) => [
      assignment.id,
      {
        inherit: assignment.inherit,
        expiresAt: toDateTimeLocal(assignment.expiresAt),
      },
    ]),
  ) as Record<string, AssignmentDraft>;
}

export function UserEditorScreen({
  tenantId,
  mode,
  systemUserId,
  workspaceKind = 'tenant',
}: Readonly<{
  tenantId: string;
  mode: 'create' | 'edit';
  systemUserId?: string;
  workspaceKind?: 'tenant' | 'ac';
}>) {
  const router = useRouter();
  const { request, session } = useSession();
  const { copy, currentLocale } = useUserManagementCopy();
  const isAcWorkspace = workspaceKind === 'ac';
  const sharedCopy = copy.shared;
  const editorCopy = copy.editor;
  const workspaceDisplayLabel = isAcWorkspace ? sharedCopy.acWorkspace : sharedCopy.tenantWorkspace;
  const managementHref = isAcWorkspace
    ? buildAcUserManagementPath(tenantId)
    : buildTenantUserManagementPath(tenantId);

  const [draft, setDraft] = useState<UserEditorDraft>(EMPTY_USER_EDITOR_DRAFT);
  const [detail, setDetail] = useState<SystemUserDetailResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(mode === 'edit');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [roles, setRoles] = useState<SystemRoleListItem[]>([]);
  const [roleLoadError, setRoleLoadError] = useState<string | null>(null);
  const [scopeOptions, setScopeOptions] = useState<OrganizationScopeOption[]>([
    {
      id: 'tenant-root',
      type: 'tenant',
      label: session?.tenantName || sharedCopy.tenantRoot,
      hint: session?.tenantName || sharedCopy.tenantRoot,
    },
  ]);
  const [assignmentComposer, setAssignmentComposer] = useState<AssignmentComposerDraft>({
    scopeType: 'tenant',
    scopeId: 'tenant-root',
    roleId: '',
    inherit: false,
    expiresAt: '',
  });
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, AssignmentDraft>>({});
  const [assignmentSubmittingId, setAssignmentSubmittingId] = useState<string | null>(null);
  const [assignmentPage, setAssignmentPage] = useState(1);
  const [assignmentPageSize, setAssignmentPageSize] = useState<PageSizeOption>(PAGE_SIZE_OPTIONS[0]);
  const [scopeAccessPage, setScopeAccessPage] = useState(1);
  const [scopeAccessPageSize, setScopeAccessPageSize] = useState<PageSizeOption>(PAGE_SIZE_OPTIONS[0]);

  useEffect(() => {
    let cancelled = false;

    async function loadSupportingData() {
      try {
        const [availableRoles, organizationTree] = await Promise.all([
          listSystemRoles(request, { isActive: true }),
          readOrganizationTree(request),
        ]);

        if (cancelled) {
          return;
        }

        setRoles(availableRoles);
        setScopeOptions(
          buildOrganizationScopeOptions(
            organizationTree,
            session?.tenantName || sharedCopy.tenantRoot,
          ),
        );
      } catch (reason) {
        if (!cancelled) {
          setRoleLoadError(getErrorMessage(reason, editorCopy.supportDataError));
        }
      }
    }

    void loadSupportingData();

    return () => {
      cancelled = true;
    };
  }, [editorCopy.supportDataError, request, session?.tenantName, sharedCopy.tenantRoot]);

  useEffect(() => {
    if (mode !== 'edit' || !systemUserId) {
      return;
    }

    const targetSystemUserId = systemUserId;
    let cancelled = false;

    async function loadDetail() {
      setLoading(true);
      setLoadError(null);

      try {
        const nextDetail = await readSystemUserDetail(request, targetSystemUserId);

        if (cancelled) {
          return;
        }

        setDetail(nextDetail);
        setDraft(buildUserEditorDraft(nextDetail));
        setAssignmentDrafts(buildAssignmentDrafts(nextDetail));
      } catch (reason) {
        if (!cancelled) {
          setLoadError(getErrorMessage(reason, editorCopy.loadError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [editorCopy.loadError, mode, request, systemUserId]);

  const availableRoles = useMemo(
    () => filterAssignableRoles(roles, session?.tenantTier, assignmentComposer.scopeType),
    [assignmentComposer.scopeType, roles, session?.tenantTier],
  );
  const roleAssignments = detail?.roleAssignments ?? [];
  const scopeAccess = detail?.scopeAccess ?? [];
  const assignmentPagination = buildPaginationMeta(roleAssignments.length, assignmentPage, assignmentPageSize);
  const paginatedRoleAssignments = roleAssignments.slice(
    (assignmentPagination.page - 1) * assignmentPagination.pageSize,
    assignmentPagination.page * assignmentPagination.pageSize,
  );
  const scopeAccessPagination = buildPaginationMeta(scopeAccess.length, scopeAccessPage, scopeAccessPageSize);
  const paginatedScopeAccess = scopeAccess.slice(
    (scopeAccessPagination.page - 1) * scopeAccessPagination.pageSize,
    scopeAccessPagination.page * scopeAccessPagination.pageSize,
  );

  useEffect(() => {
    setAssignmentComposer((current) => {
      const matchingScope = scopeOptions.find(
        (option) =>
          option.type === current.scopeType &&
          (current.scopeType === 'tenant' ? option.id === 'tenant-root' : option.id === current.scopeId),
      );
      const nextScopeId =
        current.scopeType === 'tenant'
          ? 'tenant-root'
          : matchingScope?.id || scopeOptions.find((option) => option.type === current.scopeType)?.id || '';
      const nextRoleId = availableRoles.some((role) => role.id === current.roleId)
        ? current.roleId
        : (availableRoles[0]?.id || '');

      if (nextScopeId === current.scopeId && nextRoleId === current.roleId) {
        return current;
      }

      return {
        ...current,
        scopeId: nextScopeId,
        roleId: nextRoleId,
      };
    });
  }, [availableRoles, scopeOptions]);

  useEffect(() => {
    if (assignmentPage > assignmentPagination.totalPages) {
      setAssignmentPage(assignmentPagination.totalPages);
    }
  }, [assignmentPage, assignmentPagination.totalPages]);

  useEffect(() => {
    if (scopeAccessPage > scopeAccessPagination.totalPages) {
      setScopeAccessPage(scopeAccessPagination.totalPages);
    }
  }, [scopeAccessPage, scopeAccessPagination.totalPages]);

  async function refreshDetail() {
    if (!systemUserId) {
      return;
    }

    const nextDetail = await readSystemUserDetail(request, systemUserId);
    setDetail(nextDetail);
    setDraft(buildUserEditorDraft(nextDetail));
    setAssignmentDrafts(buildAssignmentDrafts(nextDetail));
  }

  async function handleSaveProfile() {
    const validationError = validateUserEditorDraft(mode, draft, editorCopy);

    if (validationError) {
      setNotice({
        tone: 'error',
        message: validationError,
      });
      return;
    }

    setSubmitting(true);
    setNotice(null);

    try {
      if (mode === 'create') {
        const created = await createSystemUser(request, {
          username: draft.username.trim(),
          email: draft.email.trim(),
          password: draft.password,
          displayName: normalizeOptionalString(draft.displayName),
          phone: normalizeOptionalString(draft.phone),
          preferredLanguage: draft.preferredLanguage,
          forceReset: draft.forceReset,
        });

        router.replace(
          isAcWorkspace
            ? buildAcUserEditorPath(tenantId, created.id)
            : buildTenantUserEditorPath(tenantId, created.id),
        );
        return;
      }

      if (!systemUserId) {
        throw new Error(editorCopy.missingTargetError);
      }

      await updateSystemUser(request, systemUserId, {
        displayName: draft.displayName.trim(),
        phone: draft.phone.trim(),
        preferredLanguage: draft.preferredLanguage,
      });

      await refreshDetail();

      setNotice({
        tone: 'success',
        message: editorCopy.updateSuccess(draft.displayName.trim() || draft.username),
      });
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(
          reason,
          mode === 'create' ? editorCopy.createError : editorCopy.updateError,
        ),
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateAssignment() {
    if (!systemUserId) {
      return;
    }

    if (!assignmentComposer.roleId) {
      setNotice({
        tone: 'error',
        message: editorCopy.assignmentSelectRoleError,
      });
      return;
    }

    setAssignmentSubmittingId('create');
    setNotice(null);

    try {
      const selectedRole = roles.find((role) => role.id === assignmentComposer.roleId);

      await createUserRoleAssignment(request, systemUserId, {
        roleId: assignmentComposer.roleId,
        scopeType: assignmentComposer.scopeType,
        scopeId: assignmentComposer.scopeType === 'tenant' ? null : assignmentComposer.scopeId,
        inherit: assignmentComposer.inherit,
        expiresAt: toIsoOrNull(assignmentComposer.expiresAt),
      });

      await refreshDetail();
      setAssignmentComposer((current) => ({
        ...current,
        inherit: false,
        expiresAt: '',
      }));
      setNotice({
        tone: 'success',
        message: editorCopy.assignmentCreated(
          selectedRole
            ? pickLocalizedName(
                {
                  nameEn: selectedRole.nameEn || selectedRole.code,
                  nameZh: selectedRole.nameZh,
                  nameJa: selectedRole.nameJa,
                },
                currentLocale,
              )
            : editorCopy.roleField,
        ),
      });
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, editorCopy.assignmentCreateError),
      });
    } finally {
      setAssignmentSubmittingId(null);
    }
  }

  async function handleUpdateAssignment(assignmentId: string) {
    if (!systemUserId) {
      return;
    }

    const assignmentDraft = assignmentDrafts[assignmentId];

    if (!assignmentDraft) {
      return;
    }

    setAssignmentSubmittingId(assignmentId);
    setNotice(null);

    try {
      await updateUserRoleAssignment(request, systemUserId, assignmentId, {
        inherit: assignmentDraft.inherit,
        expiresAt: toIsoOrNull(assignmentDraft.expiresAt),
      });
      await refreshDetail();
      setNotice({
        tone: 'success',
        message: editorCopy.assignmentUpdated,
      });
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, editorCopy.assignmentUpdateError),
      });
    } finally {
      setAssignmentSubmittingId(null);
    }
  }

  async function handleRemoveAssignment(assignmentId: string) {
    if (!systemUserId) {
      return;
    }

    setAssignmentSubmittingId(assignmentId);
    setNotice(null);

    try {
      await removeUserRoleAssignment(request, systemUserId, assignmentId);
      await refreshDetail();
      setNotice({
        tone: 'success',
        message: editorCopy.assignmentRemoved,
      });
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, editorCopy.assignmentRemoveError),
      });
    } finally {
      setAssignmentSubmittingId(null);
    }
  }

  if (mode === 'edit' && loading) {
    return (
      <GlassSurface className="p-8">
        <p className="text-sm font-medium text-slate-500">{editorCopy.loading}</p>
      </GlassSurface>
    );
  }

  if (mode === 'edit' && (loadError || !detail)) {
    return <StateView status="error" title={editorCopy.unavailableTitle} description={loadError || undefined} />;
  }

  return (
    <div className="space-y-6">
      <GlassSurface className="p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3">
            <Link
              href={managementHref}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              {editorCopy.backToInventory}
            </Link>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              {editorCopy.badge(workspaceDisplayLabel)}
            </p>
            <h1 className="text-3xl font-semibold text-slate-950">
              {mode === 'create' ? editorCopy.createTitle : draft.displayName || draft.username}
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              {mode === 'create' ? editorCopy.createDescription : editorCopy.editDescription}
            </p>
          </div>

          {mode === 'edit' && detail ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryCard
                label={editorCopy.summaryRoleAssignmentsLabel}
                value={String(detail.roleAssignments.length)}
                hint={editorCopy.summaryRoleAssignmentsHint}
              />
              <SummaryCard
                label={editorCopy.summaryScopeAccessLabel}
                value={String(detail.scopeAccess.length)}
                hint={editorCopy.summaryScopeAccessHint}
              />
              <SummaryCard
                label={editorCopy.summaryLastLoginLabel}
                value={detail.lastLoginAt ? sharedCopy.seen : sharedCopy.never}
                hint={
                  detail.lastLoginAt
                    ? formatUserManagementDateTime(detail.lastLoginAt, currentLocale, sharedCopy.unavailable)
                    : editorCopy.lastLoginNeverHint
                }
              />
            </div>
          ) : null}
        </div>
      </GlassSurface>

      {notice ? <NoticeBanner tone={notice.tone} message={notice.message} /> : null}

      <GlassSurface className="p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-900">{editorCopy.accountProfileTitle}</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">{editorCopy.fields.username}</span>
              <input
                aria-label={editorCopy.fields.username}
                name="username"
                autoComplete="username"
                spellCheck={false}
                value={draft.username}
                onChange={(event) => setDraft((current) => ({ ...current, username: event.target.value }))}
                disabled={mode === 'edit'}
                className={inputClassName}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">{editorCopy.fields.email}</span>
              <input
                aria-label={editorCopy.fields.email}
                name="email"
                type="email"
                autoComplete="email"
                spellCheck={false}
                value={draft.email}
                onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
                disabled={mode === 'edit'}
                className={inputClassName}
              />
            </label>
          </div>

          {mode === 'create' ? (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-900">{editorCopy.fields.initialPassword}</span>
                <input
                  aria-label={editorCopy.fields.initialPassword}
                  name="initialPassword"
                  type="password"
                  autoComplete="new-password"
                  spellCheck={false}
                  value={draft.password}
                  onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))}
                  className={inputClassName}
                />
              </label>
              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                <input
                  aria-label={editorCopy.fields.forceReset}
                  name="forceReset"
                  type="checkbox"
                  checked={draft.forceReset}
                  onChange={(event) => setDraft((current) => ({ ...current, forceReset: event.target.checked }))}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-950">{editorCopy.fields.forceReset}</p>
                  <p className="text-sm leading-6 text-slate-600">{editorCopy.forceResetDescription}</p>
                </div>
              </label>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              {editorCopy.immutableIdentityDescription}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">{editorCopy.fields.displayName}</span>
              <input
                aria-label={editorCopy.fields.displayName}
                name="displayName"
                autoComplete="name"
                spellCheck={false}
                value={draft.displayName}
                onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))}
                className={inputClassName}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">{editorCopy.fields.phone}</span>
              <input
                aria-label={editorCopy.fields.phone}
                name="phone"
                type="tel"
                autoComplete="tel"
                spellCheck={false}
                value={draft.phone}
                onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
                className={inputClassName}
              />
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-900">{editorCopy.fields.preferredLanguage}</span>
            <select
              aria-label={editorCopy.fields.preferredLanguage}
              name="preferredLanguage"
              value={draft.preferredLanguage}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  preferredLanguage: event.target.value as SupportedUiLocale,
                }))
              }
              className={inputClassName}
            >
              {SUPPORTED_UI_LOCALES.map((option) => (
                <option key={option} value={option}>
                  {getLocalizedLanguageLabel(option, currentLocale)}
                </option>
              ))}
            </select>
          </label>

          <div className="flex justify-end">
            <AsyncSubmitButton
              type="button"
              isPending={submitting}
              pendingText={mode === 'create' ? editorCopy.pendingCreate : editorCopy.pendingSave}
              onClick={() => {
                void handleSaveProfile();
              }}
            >
              {mode === 'create' ? editorCopy.submitCreate : editorCopy.submitSave}
            </AsyncSubmitButton>
          </div>
        </div>
      </GlassSurface>

      {mode === 'edit' && detail ? (
        <>
          <GlassSurface className="p-6">
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-slate-500" />
                    <h2 className="text-lg font-semibold text-slate-900">{editorCopy.scopedAssignmentsTitle}</h2>
                  </div>
                  <p className="max-w-3xl text-sm leading-6 text-slate-600">{editorCopy.scopedAssignmentsDescription}</p>
                </div>
                <ToneBadge tone="info" label={sharedCopy.assignLinks(detail.roleAssignments.length)} />
              </div>

              {roleLoadError ? <NoticeBanner tone="error" message={roleLoadError} /> : null}

              <div className="grid gap-4 xl:grid-cols-[1.2fr,1fr,1fr]">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-900">{editorCopy.scopeField}</span>
                  <select
                    aria-label={editorCopy.scopeField}
                    value={`${assignmentComposer.scopeType}:${assignmentComposer.scopeId}`}
                    onChange={(event) => {
                      const [scopeType, scopeId] = event.target.value.split(':');
                      setAssignmentComposer((current) => ({
                        ...current,
                        scopeType: scopeType as AssignmentComposerDraft['scopeType'],
                        scopeId,
                      }));
                    }}
                    className={inputClassName}
                  >
                    {scopeOptions.map((option) => (
                      <option key={`${option.type}:${option.id}`} value={`${option.type}:${option.id}`}>
                        {option.hint}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-900">{editorCopy.roleField}</span>
                  <select
                    aria-label={editorCopy.roleField}
                    value={assignmentComposer.roleId}
                    onChange={(event) =>
                      setAssignmentComposer((current) => ({
                        ...current,
                        roleId: event.target.value,
                      }))
                    }
                    className={inputClassName}
                  >
                    {availableRoles.length === 0 ? <option value="">{sharedCopy.noCompatibleRoles}</option> : null}
                    {availableRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {pickLocalizedName(
                          {
                            nameEn: role.nameEn || role.code,
                            nameZh: role.nameZh,
                            nameJa: role.nameJa,
                          },
                          currentLocale,
                        )}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-900">{editorCopy.expiresAtField}</span>
                  <input
                    aria-label={editorCopy.expiresAtField}
                    type="datetime-local"
                    value={assignmentComposer.expiresAt}
                    onChange={(event) =>
                      setAssignmentComposer((current) => ({
                        ...current,
                        expiresAt: event.target.value,
                      }))
                    }
                    className={inputClassName}
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-800">
                  <input
                    aria-label={sharedCopy.inherit}
                    type="checkbox"
                    checked={assignmentComposer.inherit}
                    onChange={(event) =>
                      setAssignmentComposer((current) => ({
                        ...current,
                        inherit: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                  />
                  {editorCopy.assignmentInheritLabel}
                </label>

                <AsyncSubmitButton
                  type="button"
                  isPending={assignmentSubmittingId === 'create'}
                  pendingText={editorCopy.assignmentPending}
                  onClick={() => {
                    void handleCreateAssignment();
                  }}
                  disabled={availableRoles.length === 0}
                >
                  <UserRoundPlus className="h-4 w-4" />
                  {editorCopy.assignmentSubmit}
                </AsyncSubmitButton>
              </div>

              {roleAssignments.length === 0 ? (
                <StateView
                  status="unavailable"
                  title={editorCopy.noAssignmentsTitle}
                  description={editorCopy.noAssignmentsDescription}
                />
              ) : (
                <div className="space-y-3">
                  {paginatedRoleAssignments.map((assignment) => (
                    <ScopeAssignmentCard
                      key={assignment.id}
                      assignment={assignment}
                      sharedCopy={sharedCopy}
                      currentLocale={currentLocale}
                    >
                      <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                        <input
                          aria-label={`${sharedCopy.inherit} ${assignment.roleCode}`}
                          type="checkbox"
                          checked={assignmentDrafts[assignment.id]?.inherit ?? assignment.inherit}
                          onChange={(event) =>
                            setAssignmentDrafts((current) => ({
                              ...current,
                              [assignment.id]: {
                                ...current[assignment.id],
                                inherit: event.target.checked,
                              },
                            }))
                          }
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                        />
                        {sharedCopy.inherit}
                      </label>
                      <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                        {sharedCopy.expiresLabel}
                        <input
                          aria-label={`${sharedCopy.expiresLabel} ${assignment.roleCode}`}
                          type="datetime-local"
                          value={assignmentDrafts[assignment.id]?.expiresAt ?? ''}
                          onChange={(event) =>
                            setAssignmentDrafts((current) => ({
                              ...current,
                              [assignment.id]: {
                                ...current[assignment.id],
                                expiresAt: event.target.value,
                              },
                            }))
                          }
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900"
                        />
                      </label>
                      <AsyncSubmitButton
                        type="button"
                        isPending={assignmentSubmittingId === assignment.id}
                        pendingText={editorCopy.assignmentSavePending}
                        onClick={() => {
                          void handleUpdateAssignment(assignment.id);
                        }}
                      >
                        {sharedCopy.save}
                      </AsyncSubmitButton>
                      <button
                        type="button"
                        onClick={() => {
                          void handleRemoveAssignment(assignment.id);
                        }}
                        disabled={assignmentSubmittingId === assignment.id}
                        className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:opacity-60"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {sharedCopy.remove}
                      </button>
                    </ScopeAssignmentCard>
                  ))}
                  <UserManagementPaginationFooter
                    currentLocale={currentLocale}
                    pagination={assignmentPagination}
                    itemCount={paginatedRoleAssignments.length}
                    pageSize={assignmentPageSize}
                    onPageSizeChange={(nextPageSize) => {
                      setAssignmentPageSize(nextPageSize);
                      setAssignmentPage(1);
                    }}
                    onPrevious={() => setAssignmentPage((current) => Math.max(1, current - 1))}
                    onNext={() =>
                      setAssignmentPage((current) => Math.min(assignmentPagination.totalPages, current + 1))
                    }
                  />
                </div>
              )}
            </div>
          </GlassSurface>

          <GlassSurface className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-slate-500" />
                <h2 className="text-lg font-semibold text-slate-900">{editorCopy.directScopeAccessTitle}</h2>
              </div>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">{editorCopy.directScopeAccessDescription}</p>
              {scopeAccess.length === 0 ? (
                <StateView
                  status="unavailable"
                  title={editorCopy.noDirectScopeAccessTitle}
                  description={editorCopy.noDirectScopeAccessDescription}
                />
              ) : (
                <div className="space-y-3">
                  <div className="grid gap-3 lg:grid-cols-2">
                    {paginatedScopeAccess.map((access) => (
                      <div key={access.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-900">
                              {resolveScopedLabel(access.scopeType, access.scopeName, sharedCopy)}
                            </p>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                              {getLocalizedScopeTypeLabel(access.scopeType, currentLocale)}
                            </p>
                          </div>
                          {access.includeSubunits ? <ToneBadge tone="info" label={sharedCopy.includesSubunits} /> : null}
                        </div>
                        <p className="mt-2 text-xs text-slate-500">{access.scopePath || sharedCopy.tenantWideVisibility}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          {sharedCopy.grantedLabel}{' '}
                          {formatUserManagementDateTime(access.grantedAt, currentLocale, sharedCopy.unavailable)}
                        </p>
                      </div>
                    ))}
                  </div>
                  <UserManagementPaginationFooter
                    currentLocale={currentLocale}
                    pagination={scopeAccessPagination}
                    itemCount={paginatedScopeAccess.length}
                    pageSize={scopeAccessPageSize}
                    onPageSizeChange={(nextPageSize) => {
                      setScopeAccessPageSize(nextPageSize);
                      setScopeAccessPage(1);
                    }}
                    onPrevious={() => setScopeAccessPage((current) => Math.max(1, current - 1))}
                    onNext={() =>
                      setScopeAccessPage((current) => Math.min(scopeAccessPagination.totalPages, current + 1))
                    }
                  />
                </div>
              )}
            </div>
          </GlassSurface>
        </>
      ) : null}
    </div>
  );
}
