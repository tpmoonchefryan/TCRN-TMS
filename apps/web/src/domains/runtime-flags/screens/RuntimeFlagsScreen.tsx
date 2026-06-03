'use client';

import { ExternalLink, Flag, Play, RefreshCw, ShieldAlert, Undo2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { ApiRequestError } from '@/platform/http/api';
import { pickLocaleText } from '@/platform/runtime/locale/locale-text';
import { useSession } from '@/platform/runtime/session/session-provider';
import {
  ActionDrawer,
  ActionDrawerFooter,
  AsyncSubmitButton,
  GlassSurface,
  StateView,
} from '@/platform/ui';

import {
  activateRuntimeKillSwitch,
  deactivateRuntimeKillSwitch,
  evaluateRuntimeFlag,
  readRuntimeFlagSummary,
  type RuntimeFlagDefinition,
  type RuntimeFlagEvaluationResult,
  type RuntimeFlagKillSwitch,
  type RuntimeFlagSummary,
} from '../api/runtime-flags.api';
import { useRuntimeFlagsCopy } from './runtime-flags.copy';

interface RuntimeFlagsScreenProps {
  tenantId: string;
}

interface KillSwitchFormState {
  flagCode: string;
  affectedBehavior: string;
  reason: string;
  expiresAt: string;
  rollbackInstruction: string;
  explicitConfirmation: boolean;
}

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiRequestError ? reason.message : fallback;
}

function defaultExpiry() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  return date.toISOString().slice(0, 16);
}

function formatValue(value: unknown) {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (value === null || value === undefined || value === '') {
    return 'n/a';
  }

  return String(value);
}

function formatTimestamp(value: string | null | undefined) {
  return value ? value : 'n/a';
}

function formatProviderMapping(definition: RuntimeFlagDefinition) {
  return definition.providerMapping.providerKey
    ? `${definition.providerMapping.adapterCode}:${definition.providerMapping.providerKey}`
    : definition.providerMapping.adapterCode;
}

function formatContextKeys(keys: readonly string[]) {
  return keys.length > 0 ? keys.join(', ') : 'n/a';
}

function formatRedactedContext(context: Record<string, unknown> | null | undefined) {
  return JSON.stringify(context ?? {}, null, 2);
}

export function RuntimeFlagsScreen({ tenantId }: Readonly<RuntimeFlagsScreenProps>) {
  const { request } = useSession();
  const router = useRouter();
  const copy = useRuntimeFlagsCopy();
  const [summary, setSummary] = useState<RuntimeFlagSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewTarget, setPreviewTarget] = useState<RuntimeFlagDefinition | null>(null);
  const [previewResult, setPreviewResult] = useState<RuntimeFlagEvaluationResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [killSwitchTarget, setKillSwitchTarget] = useState<RuntimeFlagDefinition | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<RuntimeFlagKillSwitch | null>(null);
  const [killSwitchSaving, setKillSwitchSaving] = useState(false);
  const killSwitchHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const [formState, setFormState] = useState<KillSwitchFormState>({
    flagCode: '',
    affectedBehavior: '',
    reason: '',
    expiresAt: defaultExpiry(),
    rollbackInstruction: '',
    explicitConfirmation: false,
  });

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const result = await readRuntimeFlagSummary(request, { environment: 'local' });
      setSummary(result);
    } catch (reason) {
      setError(getErrorMessage(reason, copy.states.error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const provider = summary?.adapters.find(
    (entry) => entry.definition.code === 'flagsmith_provider'
  );
  const definitions = useMemo(() => summary?.definitions ?? [], [summary]);
  const killSwitchTriggerDisabled = provider?.profile.readinessState === 'provider_unavailable';
  const missingKillSwitchFields = {
    affectedBehavior: !formState.affectedBehavior.trim(),
    reason: !formState.reason.trim(),
    expiresAt: !formState.expiresAt,
    rollbackInstruction: !formState.rollbackInstruction.trim(),
    explicitConfirmation: !formState.explicitConfirmation,
  };
  const canSubmitKillSwitch =
    Boolean(formState.flagCode) && !Object.values(missingKillSwitchFields).some(Boolean);

  function openKillSwitch(definition: RuntimeFlagDefinition) {
    setKillSwitchTarget(definition);
    setFormState({
      flagCode: definition.code,
      affectedBehavior: definition.label,
      reason: '',
      expiresAt: defaultExpiry(),
      rollbackInstruction: '',
      explicitConfirmation: false,
    });
  }

  async function handlePreview(definition: RuntimeFlagDefinition) {
    setPreviewTarget(definition);
    setPreviewResult(null);
    setPreviewLoading(true);
    setNotice(null);

    try {
      const result = await evaluateRuntimeFlag(request, definition.code, {
        environment: 'local',
        service: 'web',
        actorClass: 'ac_operator',
        requestCategory: 'acceptance_preview',
        correlationId: `p6-${definition.code}`,
      });
      setPreviewResult(result);
      setNotice(copy.states.previewReady);
    } catch (reason) {
      setNotice(getErrorMessage(reason, copy.states.blockedContext));
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleActivateKillSwitch() {
    setKillSwitchSaving(true);
    setNotice(null);

    try {
      await activateRuntimeKillSwitch(request, {
        ...formState,
        expiresAt: new Date(formState.expiresAt).toISOString(),
        metadata: {
          uiSurface: 'ac_runtime_flags',
          rawProviderRuleLogged: false,
        },
      });
      setKillSwitchTarget(null);
      setNotice(copy.states.saved);
      await load();
    } catch (reason) {
      setNotice(getErrorMessage(reason, copy.states.error));
    } finally {
      setKillSwitchSaving(false);
    }
  }

  async function handleDeactivateKillSwitch() {
    if (!deactivateTarget) {
      return;
    }

    setKillSwitchSaving(true);
    setNotice(null);

    try {
      await deactivateRuntimeKillSwitch(request, deactivateTarget.id, {
        rollbackInstruction: deactivateTarget.rollbackInstruction,
        metadata: {
          uiSurface: 'ac_runtime_flags',
          action: 'deactivate',
        },
      });
      setDeactivateTarget(null);
      setNotice(copy.states.saved);
      await load();
    } catch (reason) {
      setNotice(getErrorMessage(reason, copy.states.error));
    } finally {
      setKillSwitchSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="space-y-6" data-runtime-flags-state="loading">
        <StateView status="unavailable" title={copy.states.loading} />
      </main>
    );
  }

  if (error) {
    return (
      <main className="space-y-6" data-runtime-flags-state="error">
        <StateView
          status={error.toLowerCase().includes('permission') ? 'denied' : 'error'}
          title={
            error.toLowerCase().includes('permission')
              ? copy.states.permissionDenied
              : copy.states.error
          }
          description={error}
          action={
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
            >
              <RefreshCw className="h-4 w-4" />
              {copy.actions.refresh}
            </button>
          }
        />
      </main>
    );
  }

  return (
    <main className="space-y-6" data-runtime-flags-state="ready">
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-wide text-indigo-600 uppercase">
            {copy.labels.platformControlPlane}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">{copy.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{copy.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => router.push(`/ac/${tenantId}/platform-tools?family=runtime_flags`)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm"
          >
            <ExternalLink className="h-4 w-4" />
            {copy.actions.openProvider}
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm"
          >
            <RefreshCw className="h-4 w-4" />
            {copy.actions.refresh}
          </button>
        </div>
      </section>

      {notice && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800"
        >
          {notice}
        </div>
      )}

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6" data-runtime-flags-summary>
        {[
          [copy.labels.registeredFlags, summary?.summary.registeredFlagCount ?? 0],
          [copy.labels.activeSwitches, summary?.summary.activeKillSwitchCount ?? 0],
          [copy.labels.providerMode, summary?.summary.providerMode ?? 'disabled'],
          [copy.labels.providerHealth, summary?.summary.providerHealth ?? 'disabled'],
          [
            copy.labels.lastEvaluationFallback,
            summary?.summary.lastEvaluationFallback ?? 'tcrn_registry_default',
          ],
          [copy.labels.lastAuditEvent, formatTimestamp(summary?.summary.lastAuditEvent)],
        ].map(([label, value]) => (
          <GlassSurface key={label} variant="solid" className="p-4">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</p>
            <p className="mt-2 text-lg font-bold break-words text-slate-950">{String(value)}</p>
          </GlassSurface>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <GlassSurface variant="solid" className="overflow-hidden">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-base font-semibold text-slate-950">
              {copy.labels.registeredFlags}
            </h2>
            <p className="text-sm text-slate-600">{summary?.policy.productAuthority}</p>
          </div>
          {definitions.length === 0 ? (
            <StateView status="empty" title={copy.states.empty} />
          ) : (
            <div
              className="hidden overflow-x-auto md:block"
              data-overflow-check="runtime-flags-table"
            >
              <table className="min-w-[1160px] divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3">{copy.labels.flagCode}</th>
                    <th className="px-4 py-3">{copy.labels.status}</th>
                    <th className="px-4 py-3">{copy.labels.category}</th>
                    <th className="px-4 py-3">{copy.labels.owner}</th>
                    <th className="px-4 py-3">{copy.labels.defaultValue}</th>
                    <th className="px-4 py-3">{copy.labels.failBehavior}</th>
                    <th className="px-4 py-3">{copy.labels.providerMapping}</th>
                    <th className="px-4 py-3">{copy.labels.lastUpdated}</th>
                    <th className="px-4 py-3">{copy.labels.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {definitions.map((definition) => (
                    <tr key={definition.code} data-runtime-flag-code={definition.code}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-950">{definition.code}</div>
                        <div className="text-xs text-slate-500">
                          {pickLocaleText(copy.locale, definition.localizedLabel)}
                        </div>
                        <dl className="mt-2 grid gap-1 text-[11px] text-slate-500">
                          <div>
                            <dt className="inline font-medium">{copy.labels.status}: </dt>
                            <dd className="inline">{definition.status}</dd>
                          </div>
                          <div>
                            <dt className="inline font-medium">{copy.labels.providerMapping}: </dt>
                            <dd className="inline break-all">
                              {formatProviderMapping(definition)}
                            </dd>
                          </div>
                          <div>
                            <dt className="inline font-medium">{copy.labels.lastUpdated}: </dt>
                            <dd className="inline">{formatTimestamp(definition.updatedAt)}</dd>
                          </div>
                        </dl>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{definition.status}</td>
                      <td className="px-4 py-3 text-slate-700">{definition.category}</td>
                      <td className="px-4 py-3 text-slate-700">{definition.ownerModule}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatValue(definition.defaultValue)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{definition.failBehavior}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatProviderMapping(definition)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatTimestamp(definition.updatedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void handlePreview(definition)}
                            aria-label={`${copy.actions.preview}: ${definition.code}`}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-700 sm:h-9 sm:w-9"
                          >
                            <Play className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openKillSwitch(definition)}
                            aria-label={`${copy.actions.activate}: ${definition.code}`}
                            disabled={killSwitchTriggerDisabled}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-red-200 text-red-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 sm:h-9 sm:w-9"
                          >
                            <ShieldAlert className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {definitions.length > 0 && (
            <div className="divide-y divide-slate-100 md:hidden" data-runtime-flags-mobile-list>
              {definitions.map((definition) => (
                <article
                  key={definition.code}
                  className="space-y-3 bg-white px-4 py-4"
                  data-runtime-flag-code={definition.code}
                >
                  <div>
                    <h3 className="text-sm font-semibold break-words text-slate-950">
                      {definition.code}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {pickLocaleText(copy.locale, definition.localizedLabel)}
                    </p>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-slate-500">{copy.labels.status}</dt>
                      <dd className="mt-1 font-medium break-words text-slate-900">
                        {definition.status}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">{copy.labels.category}</dt>
                      <dd className="mt-1 font-medium break-words text-slate-900">
                        {definition.category}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">{copy.labels.owner}</dt>
                      <dd className="mt-1 font-medium break-words text-slate-900">
                        {definition.ownerModule}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">{copy.labels.defaultValue}</dt>
                      <dd className="mt-1 font-medium break-words text-slate-900">
                        {formatValue(definition.defaultValue)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">{copy.labels.failBehavior}</dt>
                      <dd className="mt-1 font-medium break-words text-slate-900">
                        {definition.failBehavior}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">{copy.labels.providerMapping}</dt>
                      <dd className="mt-1 font-medium break-words text-slate-900">
                        {formatProviderMapping(definition)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">{copy.labels.lastUpdated}</dt>
                      <dd className="mt-1 font-medium break-words text-slate-900">
                        {formatTimestamp(definition.updatedAt)}
                      </dd>
                    </div>
                  </dl>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handlePreview(definition)}
                      aria-label={`${copy.actions.preview}: ${definition.code}`}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-700"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openKillSwitch(definition)}
                      aria-label={`${copy.actions.activate}: ${definition.code}`}
                      disabled={killSwitchTriggerDisabled}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-red-200 text-red-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                    >
                      <ShieldAlert className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </GlassSurface>

        <aside className="space-y-4">
          <GlassSurface variant="solid" className="p-4" data-runtime-provider-readiness>
            <div className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-indigo-600" />
              <h2 className="text-base font-semibold text-slate-950">{copy.labels.provider}</h2>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Flagsmith</dt>
                <dd className="font-medium text-slate-950">
                  {provider?.profile.readinessState ?? 'disabled'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">{copy.labels.sso}</dt>
                <dd className="font-medium text-slate-950">
                  {provider?.profile.ssoState ?? 'blocked'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">{copy.labels.endpoint}</dt>
                <dd className="font-medium text-slate-950">
                  {provider?.profile.endpointConfigured
                    ? copy.labels.configured
                    : copy.labels.notConfigured}
                </dd>
              </div>
            </dl>
          </GlassSurface>

          <GlassSurface variant="solid" className="p-4" data-runtime-kill-switch-panel>
            <h2 className="text-base font-semibold text-slate-950">{copy.labels.activeSwitches}</h2>
            <div className="mt-3 space-y-3">
              {(summary?.activeKillSwitches ?? []).length === 0 ? (
                <p className="text-sm text-slate-600">{copy.states.noActiveSwitches}</p>
              ) : (
                summary?.activeKillSwitches.map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-950">{item.flagCode}</p>
                    <dl
                      className="mt-3 grid gap-2 text-xs text-slate-700"
                      data-runtime-kill-switch-details
                    >
                      <div>
                        <dt className="font-semibold text-slate-500">{copy.labels.status}</dt>
                        <dd className="mt-0.5 break-words text-slate-950">{item.status}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-500">
                          {copy.labels.affectedBehavior}
                        </dt>
                        <dd className="mt-0.5 break-words text-slate-950">
                          {item.affectedBehavior}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-500">{copy.labels.reason}</dt>
                        <dd className="mt-0.5 break-words text-slate-950">{item.reason}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-500">{copy.labels.expiry}</dt>
                        <dd className="mt-0.5 break-words text-slate-950">
                          {formatTimestamp(item.expiresAt)}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-500">{copy.labels.actor}</dt>
                        <dd className="mt-0.5 break-words text-slate-950">
                          {item.activatedBy ?? 'n/a'}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-500">{copy.labels.source}</dt>
                        <dd className="mt-0.5 break-words text-slate-950">{item.source}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-500">{copy.labels.rollback}</dt>
                        <dd className="mt-0.5 break-words text-slate-950">
                          {item.rollbackInstruction}
                        </dd>
                      </div>
                    </dl>
                    <button
                      type="button"
                      onClick={() => setDeactivateTarget(item)}
                      className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
                    >
                      <Undo2 className="h-4 w-4" />
                      {copy.actions.deactivate}
                    </button>
                  </div>
                ))
              )}
            </div>
          </GlassSurface>
        </aside>
      </section>

      <ActionDrawer
        open={Boolean(previewTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewTarget(null);
          }
        }}
        title={copy.actions.preview}
        description={previewTarget?.code ?? copy.states.previewReady}
        closeButtonAriaLabel={copy.actions.close}
        size="lg"
      >
        <div className="space-y-4" data-runtime-evaluation-preview>
          <AsyncSubmitButton
            type="button"
            isPending={previewLoading}
            pendingText={copy.states.loading}
            onClick={() => previewTarget && void handlePreview(previewTarget)}
          >
            {copy.actions.preview}
          </AsyncSubmitButton>
          {previewResult && (
            <div className="space-y-4">
              <dl className="grid gap-3 rounded-lg border border-slate-200 p-4 text-sm md:grid-cols-2">
                <div>
                  <dt className="text-slate-500">{copy.labels.value}</dt>
                  <dd className="font-medium text-slate-950">{formatValue(previewResult.value)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">{copy.labels.reason}</dt>
                  <dd className="font-medium text-slate-950">{previewResult.reason}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">{copy.labels.source}</dt>
                  <dd className="font-medium text-slate-950">{previewResult.source}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">{copy.labels.fallback}</dt>
                  <dd className="font-medium text-slate-950">{String(previewResult.fallback)}</dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="text-slate-500">{copy.labels.approvedContextKeys}</dt>
                  <dd className="font-medium break-words text-slate-950">
                    {formatContextKeys(previewTarget?.allowedContextKeys ?? [])}
                  </dd>
                </div>
              </dl>
              <div className="rounded-lg border border-slate-200 p-4 text-sm">
                <p className="font-semibold text-slate-950">{copy.labels.redactedContext}</p>
                <pre className="mt-3 max-h-56 overflow-auto rounded-lg bg-slate-950 p-3 text-xs whitespace-pre-wrap text-slate-50">
                  {formatRedactedContext(previewResult.context)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </ActionDrawer>

      <ActionDrawer
        open={Boolean(killSwitchTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setKillSwitchTarget(null);
          }
        }}
        title={copy.actions.activate}
        description={killSwitchTarget?.code}
        closeButtonAriaLabel={copy.actions.close}
        initialFocusRef={killSwitchHeadingRef}
        size="md"
        footer={
          <ActionDrawerFooter
            secondary={
              <button
                type="button"
                onClick={() => setKillSwitchTarget(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
              >
                {copy.actions.cancel}
              </button>
            }
            destructive={
              <AsyncSubmitButton
                type="button"
                intent="danger"
                isPending={killSwitchSaving}
                pendingText={copy.states.loading}
                disabled={!canSubmitKillSwitch}
                onClick={() => void handleActivateKillSwitch()}
              >
                {copy.actions.activate}
              </AsyncSubmitButton>
            }
          />
        }
      >
        <div className="space-y-4" data-runtime-kill-switch-confirmation>
          <h2
            ref={killSwitchHeadingRef}
            tabIndex={-1}
            className="text-lg font-semibold text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            data-runtime-kill-switch-heading
          >
            {copy.labels.killSwitchConfirmation}
          </h2>
          <section
            className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm"
            data-runtime-kill-switch-impact-preview
          >
            <h3 className="font-semibold text-amber-950">{copy.labels.impactPreview}</h3>
            <dl className="mt-3 grid gap-2 text-amber-950">
              <div>
                <dt className="font-medium">{copy.labels.flagCode}</dt>
                <dd className="break-words">{formState.flagCode || 'n/a'}</dd>
              </div>
              <div>
                <dt className="font-medium">{copy.labels.affectedBehavior}</dt>
                <dd className="break-words">{formState.affectedBehavior || 'n/a'}</dd>
              </div>
              <div>
                <dt className="font-medium">{copy.labels.expiry}</dt>
                <dd className="break-words">{formState.expiresAt || 'n/a'}</dd>
              </div>
              <div>
                <dt className="font-medium">{copy.labels.rollback}</dt>
                <dd className="break-words">{formState.rollbackInstruction || 'n/a'}</dd>
              </div>
            </dl>
          </section>
          {(
            [
              ['affectedBehavior', copy.labels.affectedBehavior],
              ['reason', copy.labels.reason],
              ['rollbackInstruction', copy.labels.rollback],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label
                htmlFor={`runtime-kill-switch-${key}`}
                className="block text-sm font-medium text-slate-700"
              >
                {label}
              </label>
              <textarea
                id={`runtime-kill-switch-${key}`}
                className="mt-1 min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                aria-invalid={missingKillSwitchFields[key]}
                value={String(formState[key as keyof KillSwitchFormState])}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    [key]: event.target.value,
                  }))
                }
              />
              {missingKillSwitchFields[key] ? (
                <p className="mt-1 text-xs font-medium text-red-700">
                  {copy.labels.requiredBeforeActivation}
                </p>
              ) : null}
            </div>
          ))}
          <div>
            <label
              htmlFor="runtime-kill-switch-expiresAt"
              className="block text-sm font-medium text-slate-700"
            >
              {copy.labels.expiry}
            </label>
            <input
              id="runtime-kill-switch-expiresAt"
              type="datetime-local"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              aria-invalid={missingKillSwitchFields.expiresAt}
              value={formState.expiresAt}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  expiresAt: event.target.value,
                }))
              }
            />
            {missingKillSwitchFields.expiresAt ? (
              <p className="mt-1 text-xs font-medium text-red-700">
                {copy.labels.requiredBeforeActivation}
              </p>
            ) : null}
          </div>
          <div>
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                aria-invalid={missingKillSwitchFields.explicitConfirmation}
                checked={formState.explicitConfirmation}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    explicitConfirmation: event.target.checked,
                  }))
                }
              />
              <span>{copy.labels.confirm}</span>
            </label>
            {missingKillSwitchFields.explicitConfirmation ? (
              <p className="mt-1 text-xs font-medium text-red-700">
                {copy.labels.requiredBeforeActivation}
              </p>
            ) : null}
          </div>
        </div>
      </ActionDrawer>

      <ActionDrawer
        open={Boolean(deactivateTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeactivateTarget(null);
          }
        }}
        title={copy.actions.deactivate}
        description={deactivateTarget?.flagCode}
        closeButtonAriaLabel={copy.actions.close}
        size="sm"
        footer={
          <ActionDrawerFooter
            secondary={
              <button
                type="button"
                onClick={() => setDeactivateTarget(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
              >
                {copy.actions.cancel}
              </button>
            }
            primary={
              <AsyncSubmitButton
                type="button"
                isPending={killSwitchSaving}
                pendingText={copy.states.loading}
                onClick={() => void handleDeactivateKillSwitch()}
              >
                {copy.actions.deactivate}
              </AsyncSubmitButton>
            }
          />
        }
      >
        <p className="text-sm text-slate-600">{deactivateTarget?.rollbackInstruction}</p>
      </ActionDrawer>
    </main>
  );
}
