'use client';

import { ArrowLeft, Building2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  activateTenant,
  createTenant,
  deactivateTenant,
  readTenant,
  updateTenant,
} from '@/domains/platform-tenant-management/api/tenant-management.api';
import { useSession } from '@/platform/runtime/session/session-provider';
import { AsyncSubmitButton, GlassSurface, StateView } from '@/platform/ui';

import { formatTenantDateTime, useTenantManagementCopy } from './tenant-management.copy';
import {
  buildDraftFromTenant,
  emptyTenantDraft,
  Field,
  formatDateTime,
  getErrorMessage,
  inputClassName,
  NoticeBanner,
  readPositiveInteger,
  splitFeatures,
  SummaryCard,
  type TenantDraft,
  ToneBadge,
} from './tenant-management.shared';

export function TenantEditorScreen({
  acTenantId,
  mode,
  managedTenantId,
}: Readonly<{
  acTenantId: string;
  mode: 'create' | 'edit';
  managedTenantId?: string;
}>) {
  const router = useRouter();
  const { request, session } = useSession();
  const { copy, selectedLocale } = useTenantManagementCopy();
  const editorCopy = copy.editor;
  const [draft, setDraft] = useState<TenantDraft>(emptyTenantDraft);
  const [loading, setLoading] = useState(mode === 'edit');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tenantState, setTenantState] = useState<{
    id: string;
    name: string;
    code: string;
    schemaName: string;
    tier: 'ac' | 'standard';
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    stats: {
      subsidiaryCount: number;
      talentCount: number;
      userCount: number;
    };
  } | null>(null);

  useEffect(() => {
    if (mode !== 'edit' || !managedTenantId) {
      return;
    }

    const targetTenantId = managedTenantId;
    let cancelled = false;

    async function loadTenant() {
      setLoading(true);
      setLoadError(null);

      try {
        const detail = await readTenant(request, targetTenantId);

        if (cancelled) {
          return;
        }

        setTenantState(detail);
        setDraft(buildDraftFromTenant(detail));
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

    void loadTenant();

    return () => {
      cancelled = true;
    };
  }, [managedTenantId, mode, request]);

  async function handleSubmit() {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setNotice(null);

    try {
      if (mode === 'create') {
        const created = await createTenant(request, {
          code: draft.code.trim().toUpperCase(),
          name: draft.name.trim(),
          adminUser: {
            username: draft.adminUsername.trim(),
            email: draft.adminEmail.trim(),
            password: draft.adminPassword,
            displayName: draft.adminDisplayName.trim() || undefined,
          },
          settings: {
            maxTalents: readPositiveInteger(draft.maxTalents),
            maxCustomersPerTalent: readPositiveInteger(draft.maxCustomersPerTalent),
            features: splitFeatures(draft.featuresText),
          },
        });

        router.replace(`/ac/${acTenantId}/tenants/${created.id}`);
        return;
      }

      if (!managedTenantId) {
        throw new Error('Missing managed tenant id.');
      }

      const updated = await updateTenant(request, managedTenantId, {
        name: draft.name.trim() || undefined,
        settings: {
          maxTalents: readPositiveInteger(draft.maxTalents),
          maxCustomersPerTalent: readPositiveInteger(draft.maxCustomersPerTalent),
          features: splitFeatures(draft.featuresText),
        },
      });

      setTenantState(updated);
      setDraft(buildDraftFromTenant(updated));
      setNotice({
        tone: 'success',
        message: `${updated.name} ${editorCopy.successUpdate}`,
      });
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, mode === 'create' ? editorCopy.createError : editorCopy.updateError),
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLifecycle(nextState: 'activate' | 'deactivate') {
    if (!managedTenantId || !tenantState) {
      return;
    }

    setSubmitting(true);
    setNotice(null);

    try {
      if (nextState === 'activate') {
        await activateTenant(request, managedTenantId);
      } else {
        await deactivateTenant(request, managedTenantId, 'Deactivated from tenant editor');
      }

      const refreshed = await readTenant(request, managedTenantId);
      setTenantState(refreshed);
      setDraft(buildDraftFromTenant(refreshed));
      setNotice({
        tone: 'success',
        message:
          nextState === 'activate'
            ? `${refreshed.name} ${editorCopy.successReactivate}`
            : `${refreshed.name} ${editorCopy.successDeactivate}`,
      });
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, nextState === 'activate' ? editorCopy.reactivateError : editorCopy.deactivateError),
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (mode === 'edit' && loading) {
    return (
      <div className="space-y-6">
        <GlassSurface className="p-8">
          <p className="text-sm font-medium text-slate-500">{editorCopy.loading}</p>
        </GlassSurface>
      </div>
    );
  }

  if (mode === 'edit' && (loadError || !tenantState)) {
    return <StateView status="error" title={editorCopy.tenantEditorFallbackTitle} description={loadError || undefined} />;
  }

  const editorTitle =
    mode === 'create' ? editorCopy.provisionTitle : tenantState?.name || editorCopy.tenantEditorFallbackTitle;

  return (
    <div className="space-y-6">
      <GlassSurface className="p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3">
            <Link
              href={`/ac/${acTenantId}/tenants`}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              {editorCopy.backToInventory}
            </Link>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              {editorCopy.badge}
            </p>
            <h1 className="text-3xl font-semibold text-slate-950">{editorTitle}</h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              {mode === 'create'
                ? editorCopy.createDescription
                : editorCopy.editDescription}
            </p>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              {session?.tenantName || copy.currentAcTenantFallback}
            </p>
          </div>

          {tenantState ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryCard
                label={editorCopy.summarySubsidiariesLabel}
                value={String(tenantState.stats.subsidiaryCount)}
                hint={editorCopy.summarySubsidiariesHint}
              />
              <SummaryCard
                label={editorCopy.summaryTalentsLabel}
                value={String(tenantState.stats.talentCount)}
                hint={editorCopy.summaryTalentsHint}
              />
              <SummaryCard
                label={editorCopy.summaryUsersLabel}
                value={String(tenantState.stats.userCount)}
                hint={editorCopy.summaryUsersHint}
              />
            </div>
          ) : null}
        </div>
      </GlassSurface>

      {notice ? <NoticeBanner tone={notice.tone} message={notice.message} /> : null}

      <GlassSurface className="p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label={editorCopy.tenantCodeLabel}
            hint={mode === 'create' ? editorCopy.tenantCodeHintCreate : editorCopy.tenantCodeHintEdit}
          >
            <input
              aria-label={editorCopy.tenantCodeLabel}
              value={draft.code}
              onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
              disabled={mode === 'edit'}
              className={inputClassName}
              placeholder={editorCopy.tenantCodePlaceholder}
            />
          </Field>

          <Field label={editorCopy.tenantNameLabel}>
            <input
              aria-label={editorCopy.tenantNameLabel}
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              className={inputClassName}
              placeholder={editorCopy.tenantNamePlaceholder}
            />
          </Field>

          <Field label={editorCopy.maxTalentsLabel}>
            <input
              aria-label={editorCopy.maxTalentsLabel}
              value={draft.maxTalents}
              onChange={(event) => setDraft((current) => ({ ...current, maxTalents: event.target.value }))}
              className={inputClassName}
              inputMode="numeric"
              placeholder={editorCopy.maxTalentsPlaceholder}
            />
          </Field>

          <Field label={editorCopy.maxCustomersLabel}>
            <input
              aria-label={editorCopy.maxCustomersLabel}
              value={draft.maxCustomersPerTalent}
              onChange={(event) => setDraft((current) => ({ ...current, maxCustomersPerTalent: event.target.value }))}
              className={inputClassName}
              inputMode="numeric"
              placeholder={editorCopy.maxCustomersPlaceholder}
            />
          </Field>

          <Field label={editorCopy.featuresLabel} hint={editorCopy.featuresHint}>
            <input
              aria-label={editorCopy.featuresLabel}
              value={draft.featuresText}
              onChange={(event) => setDraft((current) => ({ ...current, featuresText: event.target.value }))}
              className={inputClassName}
              placeholder={editorCopy.featuresPlaceholder}
            />
          </Field>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Building2 className="h-4 w-4 text-slate-500" />
              {editorCopy.currentSelection}
            </div>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p>{editorCopy.tenantSelectionLabel}: {tenantState?.name || editorCopy.newTenant}</p>
              <p>{editorCopy.tenantCodeLabel}: {tenantState?.code || draft.code || editorCopy.newTenant}</p>
              <p>
                {editorCopy.selectionTierLabel}:{' '}
                {tenantState
                  ? tenantState.tier === 'ac'
                    ? editorCopy.acTierLabel
                    : editorCopy.standardTierLabel
                  : editorCopy.standardTierLabel}
              </p>
              {tenantState ? (
                <p>
                  {editorCopy.updatedLabel}: {formatTenantDateTime(tenantState.updatedAt, selectedLocale, editorCopy.updatedLabel)}
                </p>
              ) : null}
            </div>
          </div>

          {mode === 'create' ? (
            <>
              <Field label={editorCopy.adminUsernameLabel}>
                <input
                  aria-label={editorCopy.adminUsernameLabel}
                  value={draft.adminUsername}
                  onChange={(event) => setDraft((current) => ({ ...current, adminUsername: event.target.value }))}
                  className={inputClassName}
                  placeholder={editorCopy.adminUsernamePlaceholder}
                />
              </Field>

              <Field label={editorCopy.adminEmailLabel}>
                <input
                  aria-label={editorCopy.adminEmailLabel}
                  value={draft.adminEmail}
                  onChange={(event) => setDraft((current) => ({ ...current, adminEmail: event.target.value }))}
                  className={inputClassName}
                  placeholder={editorCopy.adminEmailPlaceholder}
                />
              </Field>

              <Field label={editorCopy.adminPasswordLabel}>
                <input
                  aria-label={editorCopy.adminPasswordLabel}
                  type="password"
                  value={draft.adminPassword}
                  onChange={(event) => setDraft((current) => ({ ...current, adminPassword: event.target.value }))}
                  className={inputClassName}
                  placeholder={editorCopy.adminPasswordPlaceholder}
                />
              </Field>

              <Field label={editorCopy.adminDisplayNameLabel}>
                <input
                  aria-label={editorCopy.adminDisplayNameLabel}
                  value={draft.adminDisplayName}
                  onChange={(event) => setDraft((current) => ({ ...current, adminDisplayName: event.target.value }))}
                  className={inputClassName}
                  placeholder={editorCopy.adminDisplayNamePlaceholder}
                />
              </Field>
            </>
          ) : null}
        </div>

        {tenantState ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <ToneBadge
                tone={tenantState.tier === 'ac' ? 'info' : 'neutral'}
                label={tenantState.tier === 'ac' ? editorCopy.acTierLabel : editorCopy.standardTierLabel}
              />
              <ToneBadge
                tone={tenantState.isActive ? 'success' : 'warning'}
                label={tenantState.isActive ? editorCopy.activeStatus : editorCopy.inactiveStatus}
              />
              <p className="text-sm text-slate-600">
                {editorCopy.createdLabel} {formatDateTime(tenantState.createdAt, selectedLocale, editorCopy.createdLabel)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {tenantState.isActive ? (
                <button
                  type="button"
                  onClick={() => void handleLifecycle('deactivate')}
                  disabled={submitting}
                  className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {editorCopy.deactivateSubmit}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleLifecycle('activate')}
                  disabled={submitting}
                  className="rounded-full border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {editorCopy.reactivateSubmit}
                </button>
              )}
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end">
          <AsyncSubmitButton
            type="button"
            isPending={submitting}
            pendingText={mode === 'create' ? editorCopy.createSubmit : editorCopy.savePending}
            onClick={() => void handleSubmit()}
          >
            {mode === 'create' ? editorCopy.createSubmit : editorCopy.saveSubmit}
          </AsyncSubmitButton>
        </div>
      </GlassSurface>
    </div>
  );
}
