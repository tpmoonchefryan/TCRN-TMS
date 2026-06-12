'use client';

import { DatabaseZap, ExternalLink, Network, RefreshCw, Save, Search, Settings, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
  type EventBackboneSummary,
  readEventBackboneSummary,
} from '@/domains/event-backbone/api/event-backbone.api';
import type {
  PlatformToolConnectionBundle,
  PlatformToolConnectionEnvironment,
  PlatformToolFamily,
  PlatformToolLocalDevMode,
} from '@/domains/platform-tool-connections/api/platform-tool-connections.api';
import {
  listPlatformToolConnections,
  readPlatformToolConnection,
  readPlatformToolDeepLink,
  runPlatformToolHealthCheck,
  savePlatformToolConnection,
} from '@/domains/platform-tool-connections/api/platform-tool-connections.api';
import { ApiRequestError } from '@/platform/http/api';
import { useSession } from '@/platform/runtime/session/session-provider';
import {
  ActionDrawer,
  ActionDrawerFooter,
  AsyncSubmitButton,
  StateView,
  TableShell,
} from '@/platform/ui';

import { usePlatformToolConnectionsCopy } from './platform-tool-connections.copy';

const ENVIRONMENTS: PlatformToolConnectionEnvironment[] = [
  'local',
  'shared_dev',
  'staging',
  'production',
];

const FAMILIES: PlatformToolFamily[] = [
  'identity_provider',
  'observability_console',
  'runtime_flags',
  'webhook_delivery',
  'event_backbone',
  'api_gateway',
  'internal_tooling',
  'developer_portal',
  'external_authorization',
];

const LOCAL_DEV_MODES: PlatformToolLocalDevMode[] = [
  'disabled',
  'stubbed',
  'compose_opt_in',
  'external_provided',
];

interface FormState {
  endpointUrl: string;
  internalServiceUrl: string;
  namespace: string;
  serviceName: string;
  deploymentMode: PlatformToolLocalDevMode;
  localDevMode: PlatformToolLocalDevMode;
  enabled: boolean;
  secretRef: string;
}

function formatCode(value: string) {
  return value.replace(/_/g, ' ');
}

function statusClass(value: string) {
  if (['ready', 'healthy', 'not_applicable'].includes(value)) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (['configured', 'degraded', 'sso_required'].includes(value)) {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  if (['blocked', 'unhealthy', 'unsafe_url', 'forbidden'].includes(value)) {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }

  return 'border-slate-200 bg-slate-50 text-slate-600';
}

function StatusBadge({ value }: Readonly<{ value: string }>) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(value)}`}
    >
      <span className="truncate">{formatCode(value)}</span>
    </span>
  );
}

function Field({
  label,
  children,
}: Readonly<{
  label: string;
  children: React.ReactNode;
}>) {
  return (
    <label className="space-y-1.5 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiRequestError ? reason.message : fallback;
}

function buildFormState(item: PlatformToolConnectionBundle): FormState {
  return {
    endpointUrl: item.connection.endpointUrl ?? '',
    internalServiceUrl: item.connection.internalServiceUrl ?? '',
    namespace: item.connection.namespace ?? '',
    serviceName: item.connection.serviceName ?? '',
    deploymentMode: item.connection.deploymentMode,
    localDevMode: item.connection.localDevMode,
    enabled: item.connection.enabled,
    secretRef:
      item.configValues.find((config) => config.configKey === 'client_secret')?.secretRef ?? '',
  };
}

function getReadinessReasons(
  item: PlatformToolConnectionBundle,
  copy: ReturnType<typeof usePlatformToolConnectionsCopy>
) {
  const reasons: string[] = [];

  if (item.connection.readinessState === 'ready') {
    reasons.push(copy.readinessReasons.ready);
  }

  if (item.connection.readinessState === 'not_configured' || !item.connection.enabled) {
    reasons.push(copy.readinessReasons.notConfigured);
  }

  if (item.connection.localDevMode === 'stubbed' || item.connection.deploymentMode === 'stubbed') {
    reasons.push(copy.readinessReasons.localStubbed);
  }

  if (item.connection.healthStatus === 'unknown') {
    reasons.push(copy.readinessReasons.healthUnknown);
  }

  if (item.ssoReadiness.status === 'blocked' || item.connection.ssoReadinessState === 'blocked') {
    reasons.push(copy.readinessReasons.ssoBlocked);
  } else if (item.ssoReadiness.status === 'not_applicable') {
    reasons.push(copy.readinessReasons.ssoNotApplicable);
  }

  return [...new Set(reasons)];
}

function canOpenTool(item: PlatformToolConnectionBundle) {
  return item.connection.enabled && item.definition.deepLink;
}

function normalizeInitialFamily(value?: PlatformToolFamily | 'all' | 'observability') {
  return value === 'observability' ? 'observability_console' : value ?? 'all';
}

export function PlatformToolConnectionsScreen({
  tenantId,
  initialFamily,
}: Readonly<{
  tenantId: string;
  initialFamily?: PlatformToolFamily | 'all' | 'observability';
}>) {
  const { request } = useSession();
  const copy = usePlatformToolConnectionsCopy();
  const [environment, setEnvironment] = useState<PlatformToolConnectionEnvironment>('local');
  const [family, setFamily] = useState<PlatformToolFamily | 'all'>(() =>
    normalizeInitialFamily(initialFamily)
  );
  const [items, setItems] = useState<PlatformToolConnectionBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<PlatformToolConnectionBundle | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [checkingCode, setCheckingCode] = useState<string | null>(null);
  const [eventBackboneSummary, setEventBackboneSummary] = useState<EventBackboneSummary | null>(
    null
  );
  const [eventBackboneError, setEventBackboneError] = useState<string | null>(null);
  const [eventBackboneLoading, setEventBackboneLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const result = await listPlatformToolConnections(request, {
        environment,
        family,
      });
      setItems(result);
    } catch (reason) {
      setError(getErrorMessage(reason, copy.states.error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [environment, family]);

  useEffect(() => {
    if (family !== 'event_backbone') {
      setEventBackboneSummary(null);
      setEventBackboneError(null);
      return;
    }

    let cancelled = false;
    setEventBackboneLoading(true);
    setEventBackboneError(null);

    readEventBackboneSummary(request, environment)
      .then((summary) => {
        if (!cancelled) {
          setEventBackboneSummary(summary);
        }
      })
      .catch((reason) => {
        if (!cancelled) {
          setEventBackboneError(getErrorMessage(reason, copy.states.error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setEventBackboneLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [copy.states.error, environment, family, request]);

  useEffect(() => {
    if (!selectedCode) {
      setSelectedDetail(null);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);

    readPlatformToolConnection(request, selectedCode, environment)
      .then((detail) => {
        if (!cancelled) {
          setSelectedDetail(detail);
          setFormState(buildFormState(detail));
        }
      })
      .catch((reason) => {
        if (!cancelled) {
          setNotice(getErrorMessage(reason, copy.states.error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDetailLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [copy.states.error, environment, request, selectedCode]);

  const selectedListItem = useMemo(
    () => items.find((item) => item.definition.code === selectedCode) ?? null,
    [items, selectedCode]
  );
  const selected = selectedDetail ?? selectedListItem;

  async function handleRunCheck(item: PlatformToolConnectionBundle) {
    setCheckingCode(item.definition.code);
    setNotice(null);

    try {
      await runPlatformToolHealthCheck(request, item.definition.code, environment);
      await load();
      if (selectedCode === item.definition.code) {
        const detail = await readPlatformToolConnection(request, item.definition.code, environment);
        setSelectedDetail(detail);
        setFormState(buildFormState(detail));
      }
    } catch (reason) {
      setNotice(getErrorMessage(reason, copy.states.error));
    } finally {
      setCheckingCode(null);
    }
  }

  async function handleOpen(item: PlatformToolConnectionBundle) {
    setNotice(null);

    try {
      const readiness = await readPlatformToolDeepLink(request, item.definition.code, environment);

      if (readiness.state === 'accepted' && readiness.url) {
        window.open(readiness.url, '_blank', 'noopener,noreferrer');
        return;
      }

      setNotice(`${copy.states.denied}: ${formatCode(readiness.state)}`);
    } catch (reason) {
      setNotice(getErrorMessage(reason, copy.states.denied));
    }
  }

  async function handleSave() {
    if (!selected || !formState) {
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      const saved = await savePlatformToolConnection(request, selected.definition.code, {
        environment,
        endpointUrl: formState.endpointUrl || null,
        internalServiceUrl: formState.internalServiceUrl || null,
        namespace: formState.namespace || null,
        serviceName: formState.serviceName || null,
        deploymentMode: formState.deploymentMode,
        localDevMode: formState.localDevMode,
        enabled: formState.enabled,
        version: selected.connection.version || undefined,
        configs: formState.secretRef
          ? [
              {
                configKey: 'client_secret',
                mutation: 'reference',
                isSecret: true,
                secretRef: formState.secretRef,
              },
            ]
          : undefined,
      });

      setSelectedDetail(saved);
      setFormState(buildFormState(saved));
      setIsConfigOpen(false);
      setNotice(copy.states.saved);
      await load();
    } catch (reason) {
      setNotice(getErrorMessage(reason, copy.states.error));
    } finally {
      setSaving(false);
    }
  }

  const renderActions = (item: PlatformToolConnectionBundle) => (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:h-9 sm:w-9"
        aria-label={`${copy.actions.inspect}: ${item.definition.label}`}
        onClick={() => setSelectedCode(item.definition.code)}
      >
        <Search className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:h-9 sm:w-9"
        aria-label={`${copy.actions.configure}: ${item.definition.label}`}
        onClick={() => {
          setSelectedCode(item.definition.code);
          setSelectedDetail(item);
          setFormState(buildFormState(item));
          setIsConfigOpen(true);
        }}
      >
        <Settings className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:w-9"
        aria-label={`${copy.actions.runCheck}: ${item.definition.label}`}
        disabled={checkingCode === item.definition.code}
        onClick={() => void handleRunCheck(item)}
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:w-9"
        aria-label={`${canOpenTool(item) ? copy.actions.open : copy.actions.disabledOpen}: ${item.definition.label}`}
        disabled={!canOpenTool(item)}
        onClick={() => void handleOpen(item)}
      >
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );

  const renderReadinessReasons = (item: PlatformToolConnectionBundle) => {
    const reasons = getReadinessReasons(item, copy);

    if (reasons.length === 0) {
      return null;
    }

    return (
      <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-600">
        {reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
        {!canOpenTool(item) && (
          <li>{copy.actions.openBlockedReason}</li>
        )}
      </ul>
    );
  };

  const tableRows = items.map((item) => (
    <tr key={item.definition.code} data-tool-code={item.definition.code}>
      <td className="px-4 py-3 align-top">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">{item.definition.label}</div>
          <div className="mt-1 truncate text-xs text-slate-500">{item.definition.ownerPhase}</div>
        </div>
      </td>
      <td className="px-4 py-3 align-top text-sm text-slate-600">
        {copy.familyLabel(item.definition.family)}
      </td>
      <td className="px-4 py-3 align-top">
        <StatusBadge value={item.connection.readinessState} />
        {renderReadinessReasons(item)}
      </td>
      <td className="px-4 py-3 align-top">
        <StatusBadge value={item.connection.healthStatus} />
      </td>
      <td className="px-4 py-3 align-top">
        <StatusBadge value={item.ssoReadiness.status} />
      </td>
      <td className="px-4 py-3 align-top">
        {renderActions(item)}
      </td>
    </tr>
  ));

  const selectedBoundary = selected?.definition.family === 'event_backbone'
    ? copy.eventBackbone.boundary
    : selected?.definition.sourceOfTruthBoundary;

  const renderEventBackboneSummary = () => {
    if (family !== 'event_backbone') {
      return null;
    }

    if (eventBackboneLoading) {
      return (
        <StateView
          status="unavailable"
          title={copy.eventBackbone.loading}
          description={copy.eventBackbone.boundary}
        />
      );
    }

    if (eventBackboneError) {
      return (
        <StateView
          status="error"
          title={copy.eventBackbone.error}
          description={eventBackboneError}
          action={
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              onClick={() => {
                setEventBackboneLoading(true);
                readEventBackboneSummary(request, environment)
                  .then(setEventBackboneSummary)
                  .catch((reason) => setEventBackboneError(getErrorMessage(reason, copy.states.error)))
                  .finally(() => setEventBackboneLoading(false));
              }}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {copy.actions.refresh}
            </button>
          }
        />
      );
    }

    if (!eventBackboneSummary) {
      return null;
    }

    return (
      <section
        className="min-w-0 space-y-4"
        data-event-backbone-summary="ac-readiness"
        aria-label={copy.eventBackbone.title}
      >
        <div className="grid min-w-0 gap-3 md:grid-cols-3">
          <div className="min-w-0 rounded-md border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Network className="h-4 w-4 text-indigo-600" aria-hidden="true" />
              {copy.eventBackbone.bridgeMode}
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {formatCode(eventBackboneSummary.bridgeMode)}
            </p>
            <p className="mt-1 text-sm text-slate-600">{copy.eventBackbone.disabledDefault}</p>
          </div>
          <div className="min-w-0 rounded-md border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <DatabaseZap className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              {copy.eventBackbone.registry}
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {eventBackboneSummary.registry.totalEvents}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {eventBackboneSummary.registry.families.length} {copy.eventBackbone.families}
            </p>
          </div>
          <div className="min-w-0 rounded-md border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-sky-600" aria-hidden="true" />
              {copy.eventBackbone.rawPayloadAccess}
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-950">0</p>
            <p className="mt-1 text-sm text-slate-600">{copy.eventBackbone.noRawPayload}</p>
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          {copy.eventBackbone.boundary}
        </div>

        <div className="grid min-w-0 gap-4 xl:grid-cols-2">
          <div className="min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-950">{copy.eventBackbone.streams}</h2>
            </div>
            <div className="max-w-full overflow-x-auto" data-overflow-check="event-backbone-stream-table">
              <table className="min-w-[620px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">{copy.eventBackbone.family}</th>
                    <th className="px-4 py-3">{copy.eventBackbone.stream}</th>
                    <th className="px-4 py-3">{copy.eventBackbone.status}</th>
                    <th className="px-4 py-3">{copy.eventBackbone.dlq}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {eventBackboneSummary.streams.map((stream) => (
                    <tr key={stream.family} data-event-backbone-stream={stream.family}>
                      <td className="px-4 py-3 font-medium text-slate-900">{formatCode(stream.family)}</td>
                      <td className="break-all px-4 py-3 text-slate-600">{stream.streamName}</td>
                      <td className="px-4 py-3"><StatusBadge value={stream.status} /></td>
                      <td className="px-4 py-3 text-slate-600">{stream.dlqCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-950">{copy.eventBackbone.consumers}</h2>
            </div>
            <div className="max-w-full overflow-x-auto" data-overflow-check="event-backbone-consumer-table">
              <table className="min-w-[700px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">{copy.eventBackbone.queue}</th>
                    <th className="px-4 py-3">{copy.eventBackbone.consumer}</th>
                    <th className="px-4 py-3">{copy.eventBackbone.classification}</th>
                    <th className="px-4 py-3">{copy.eventBackbone.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {eventBackboneSummary.consumers.map((consumer) => (
                    <tr key={consumer.durableName} data-event-backbone-consumer={consumer.queue}>
                      <td className="px-4 py-3 font-medium text-slate-900">{consumer.queue}</td>
                      <td className="break-all px-4 py-3 text-slate-600">{consumer.durableName}</td>
                      <td className="px-4 py-3 text-slate-600">{formatCode(consumer.classification)}</td>
                      <td className="px-4 py-3"><StatusBadge value={consumer.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    );
  };

  return (
    <div
      className="space-y-5"
      data-platform-tool-surface="ac-platform-tool-connections"
      data-tenant-id={tenantId}
    >
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold text-slate-950">{copy.title}</h1>
          <p className="max-w-3xl text-sm text-slate-600">{copy.statusLine}</p>
        </div>
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          onClick={() => void load()}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {copy.actions.refresh}
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Field label={copy.filters.environment}>
          <select
            value={environment}
            onChange={(event) => setEnvironment(event.target.value as PlatformToolConnectionEnvironment)}
            className="h-10 min-w-44 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          >
            {ENVIRONMENTS.map((item) => (
              <option key={item} value={item}>
                {formatCode(item)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={copy.filters.family}>
          <select
            value={family}
            onChange={(event) => setFamily(event.target.value as PlatformToolFamily | 'all')}
            className="h-10 min-w-56 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          >
            <option value="all">{copy.filters.allFamilies}</option>
            {FAMILIES.map((item) => (
              <option key={item} value={item}>
                {copy.familyLabel(item)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {notice ? (
        <div
          className="rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800"
          role="status"
          aria-live="polite"
        >
          {notice}
        </div>
      ) : null}

      {renderEventBackboneSummary()}

      {error ? (
        <StateView
          status="error"
          title={copy.states.error}
          description={error}
          action={
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              onClick={() => void load()}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {copy.actions.refresh}
            </button>
          }
        />
      ) : (
        <>
          <div className="hidden md:block" data-overflow-check="platform-tools-desktop-table">
            <TableShell
              columns={[
                copy.columns.tool,
                copy.columns.family,
                copy.columns.connection,
                copy.columns.health,
                copy.columns.sso,
                { id: 'actions', header: copy.columns.actions, align: 'right' },
              ]}
              dataLength={items.length}
              isLoading={loading}
              isEmpty={!loading && items.length === 0}
              emptyTitle={copy.states.empty}
              emptyDescription={copy.statusLine}
              ariaLabel={copy.title}
              density="compact"
              tableClassName="min-w-[860px]"
            >
              {tableRows}
            </TableShell>
          </div>
          <div className="space-y-3 md:hidden" data-overflow-check="platform-tools-mobile-list">
            {loading ? (
              <StateView status="unavailable" title={copy.states.loading} description={copy.statusLine} />
            ) : null}
            {!loading && items.length === 0 ? (
              <StateView status="empty" title={copy.states.empty} description={copy.statusLine} />
            ) : null}
            {!loading
              ? items.map((item) => (
                  <article
                    key={item.definition.code}
                    data-tool-code={item.definition.code}
                    className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-sm font-semibold text-slate-950">
                          {item.definition.label}
                        </h2>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {copy.familyLabel(item.definition.family)}
                        </p>
                      </div>
                      {renderActions(item)}
                    </div>
                    <dl className="mt-4 grid grid-cols-1 gap-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-xs font-semibold uppercase text-slate-500">
                          {copy.columns.connection}
                        </dt>
                        <dd className="min-w-0"><StatusBadge value={item.connection.readinessState} /></dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-xs font-semibold uppercase text-slate-500">
                          {copy.columns.health}
                        </dt>
                        <dd className="min-w-0"><StatusBadge value={item.connection.healthStatus} /></dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-xs font-semibold uppercase text-slate-500">
                          {copy.columns.sso}
                        </dt>
                        <dd className="min-w-0"><StatusBadge value={item.ssoReadiness.status} /></dd>
                      </div>
                    </dl>
                    {renderReadinessReasons(item)}
                  </article>
                ))
              : null}
          </div>
        </>
      )}

      <ActionDrawer
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCode(null);
            setSelectedDetail(null);
            setIsConfigOpen(false);
          }
        }}
        title={selected?.definition.label ?? copy.title}
        description={selected ? copy.familyLabel(selected.definition.family) : undefined}
        closeButtonAriaLabel={copy.actions.close}
        size="lg"
        footer={
          selected ? (
            <ActionDrawerFooter
              secondary={
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setIsConfigOpen((value) => !value)}
                >
                  <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                  {copy.actions.configure}
                </button>
              }
              primary={
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-700"
                  onClick={() => void handleRunCheck(selected)}
                >
                  <ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" />
                  {copy.actions.runCheck}
                </button>
              }
            />
          ) : null
        }
      >
        {selected ? (
          <div className="space-y-6">
            {detailLoading ? (
              <StateView
                status="unavailable"
                title={copy.states.loading}
                description={copy.statusLine}
              />
            ) : null}
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">{copy.columns.connection}</dt>
                <dd className="mt-1"><StatusBadge value={selected.connection.readinessState} /></dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">{copy.columns.health}</dt>
                <dd className="mt-1"><StatusBadge value={selected.connection.healthStatus} /></dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">{copy.columns.sso}</dt>
                <dd className="mt-1"><StatusBadge value={selected.ssoReadiness.status} /></dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">{copy.fields.deploymentMode}</dt>
                <dd className="mt-1 text-sm text-slate-800">{formatCode(selected.connection.deploymentMode)}</dd>
              </div>
            </dl>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              {selectedBoundary}
            </div>
            {renderReadinessReasons(selected)}
            {isConfigOpen && formState ? (
              <div className="space-y-4 border-t border-slate-200 pt-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label={copy.fields.endpointUrl}>
                    <input
                      value={formState.endpointUrl}
                      onChange={(event) => setFormState({ ...formState, endpointUrl: event.target.value })}
                      className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </Field>
                  <Field label={copy.fields.internalServiceUrl}>
                    <input
                      value={formState.internalServiceUrl}
                      onChange={(event) =>
                        setFormState({ ...formState, internalServiceUrl: event.target.value })
                      }
                      className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </Field>
                  <Field label={copy.fields.namespace}>
                    <input
                      value={formState.namespace}
                      onChange={(event) => setFormState({ ...formState, namespace: event.target.value })}
                      className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </Field>
                  <Field label={copy.fields.serviceName}>
                    <input
                      value={formState.serviceName}
                      onChange={(event) => setFormState({ ...formState, serviceName: event.target.value })}
                      className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </Field>
                  <Field label={copy.fields.deploymentMode}>
                    <select
                      value={formState.deploymentMode}
                      onChange={(event) =>
                        setFormState({
                          ...formState,
                          deploymentMode: event.target.value as PlatformToolLocalDevMode,
                        })
                      }
                      className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    >
                      {LOCAL_DEV_MODES.map((mode) => (
                        <option key={mode} value={mode}>
                          {formatCode(mode)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={copy.fields.localDevMode}>
                    <select
                      value={formState.localDevMode}
                      onChange={(event) =>
                        setFormState({
                          ...formState,
                          localDevMode: event.target.value as PlatformToolLocalDevMode,
                        })
                      }
                      className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    >
                      {LOCAL_DEV_MODES.map((mode) => (
                        <option key={mode} value={mode}>
                          {formatCode(mode)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={copy.fields.secretRef}>
                    <input
                      value={formState.secretRef}
                      onChange={(event) => setFormState({ ...formState, secretRef: event.target.value })}
                      placeholder="env:PLATFORM_TOOL_CLIENT_SECRET"
                      className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </Field>
                  <label className="flex items-center gap-2 pt-7 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={formState.enabled}
                      onChange={(event) => setFormState({ ...formState, enabled: event.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    {copy.fields.enabled}
                  </label>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="mr-2 inline-flex h-10 items-center rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      setFormState(buildFormState(selected));
                      setIsConfigOpen(false);
                    }}
                  >
                    {copy.actions.cancel}
                  </button>
                  <AsyncSubmitButton
                    isPending={saving}
                    pendingText={copy.actions.save}
                    onClick={() => void handleSave()}
                    className="inline-flex h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-700"
                  >
                    <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                    {copy.actions.save}
                  </AsyncSubmitButton>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </ActionDrawer>
    </div>
  );
}
