'use client';

import {
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type {
  ApiOperationDefinition,
  ApiRegistryDocument,
  ApiRegistryDriftReport,
} from '@tcrn/shared';

import {
  readApiRegistryDocument,
  readApiRegistryDriftReport,
  readSwaggerExposurePolicy,
  type RequestFn,
} from '@/domains/api-registry/api/api-registry.api';
import { ApiRequestError } from '@/platform/http/api';
import { useUiLocale } from '@/platform/runtime/locale/locale-provider';
import { useSession } from '@/platform/runtime/session/session-provider';
import { ActionDrawer, ActionDrawerFooter, StateView, TableShell } from '@/platform/ui';

import { useApiRegistryCopy } from './api-registry.copy';

type LoadState = 'loading' | 'ready' | 'empty' | 'error' | 'denied';

interface RegistryPayload {
  document: ApiRegistryDocument;
  drift: ApiRegistryDriftReport;
  exposurePolicy: Awaited<ReturnType<typeof readSwaggerExposurePolicy>>;
}

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiRequestError ? reason.message : fallback;
}

function Badge({
  children,
  tone = 'slate',
}: Readonly<{ children: React.ReactNode; tone?: 'slate' | 'green' | 'amber' | 'red' | 'blue' }>) {
  const toneClass = {
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    red: 'border-rose-200 bg-rose-50 text-rose-700',
    blue: 'border-sky-200 bg-sky-50 text-sky-700',
  }[tone];

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-medium ${toneClass}`}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}

function formatPermission(operation: ApiOperationDefinition, fallback: string) {
  if (operation.requiredPermissions.length === 0) {
    return fallback;
  }

  return operation.requiredPermissions
    .map((permission) => `${permission.resource}:${permission.action}`)
    .join(', ');
}

function docsHref(group: ApiOperationDefinition['documentGroup']) {
  return `/api/docs/${group}`;
}

function downloadRegistryJson(document: ApiRegistryDocument) {
  const blob = new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = `api-registry-${document.registryVersion}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function ApiRegistryScreen({ tenantId }: Readonly<{ tenantId: string }>) {
  const { locale } = useUiLocale();
  const copy = useApiRegistryCopy(locale);
  const { request } = useSession();
  const [state, setState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [payload, setPayload] = useState<RegistryPayload | null>(null);
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [capabilityFilter, setCapabilityFilter] = useState<string>('all');
  const [exposureFilter, setExposureFilter] = useState<string>('all');
  const [stabilityFilter, setStabilityFilter] = useState<string>('all');
  const [deprecationFilter, setDeprecationFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [selectedOperation, setSelectedOperation] = useState<ApiOperationDefinition | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);

  async function loadRegistry(nextRequest: RequestFn = request) {
    setState('loading');
    setErrorMessage(null);

    try {
      const [document, drift, exposurePolicy] = await Promise.all([
        readApiRegistryDocument(nextRequest),
        readApiRegistryDriftReport(nextRequest),
        readSwaggerExposurePolicy(nextRequest),
      ]);

      setPayload({ document, drift, exposurePolicy });
      setState(document.operations.length === 0 ? 'empty' : 'ready');
    } catch (reason) {
      setErrorMessage(getErrorMessage(reason, copy.errorTitle));
      setState(reason instanceof ApiRequestError && reason.status === 403 ? 'denied' : 'error');
    }
  }

  useEffect(() => {
    void loadRegistry();
  }, [tenantId]);

  const filteredOperations = useMemo(() => {
    const operations = payload?.document.operations ?? [];
    const normalizedQuery = query.trim().toLowerCase();

    return operations.filter((operation) => {
      if (groupFilter !== 'all' && operation.documentGroup !== groupFilter) {
        return false;
      }
      if (moduleFilter !== 'all' && operation.ownerModuleCode !== moduleFilter) {
        return false;
      }
      if (capabilityFilter !== 'all' && operation.ownerCapabilityCode !== capabilityFilter) {
        return false;
      }
      if (exposureFilter !== 'all' && operation.exposure !== exposureFilter) {
        return false;
      }
      if (stabilityFilter !== 'all' && operation.stability !== stabilityFilter) {
        return false;
      }
      if (
        deprecationFilter !== 'all' &&
        String(operation.deprecation.isDeprecated) !== deprecationFilter
      ) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      return `${operation.operationCode} ${operation.method} ${operation.pathTemplate} ${operation.summary} ${operation.ownerModuleCode} ${operation.ownerCapabilityCode}`
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [
    capabilityFilter,
    deprecationFilter,
    exposureFilter,
    groupFilter,
    moduleFilter,
    payload?.document.operations,
    query,
    stabilityFilter,
  ]);

  if (state === 'loading' && !payload) {
    return (
      <StateView
        status="unavailable"
        title={copy.loadingTitle}
        description={copy.loadingDescription}
      />
    );
  }

  if (state === 'error' || state === 'denied') {
    return (
      <StateView
        status={state === 'denied' ? 'denied' : 'error'}
        title={state === 'denied' ? copy.deniedTitle : copy.errorTitle}
        description={errorMessage ?? copy.errorTitle}
        action={
          <button
            type="button"
            onClick={() => void loadRegistry()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            {copy.retry}
          </button>
        }
      />
    );
  }

  if (!payload) {
    return <StateView status="empty" title={copy.emptyTitle} description={copy.emptyDescription} />;
  }

  const document = payload.document;
  const driftPassed = payload.drift.result === 'pass';
  const moduleOptions = ['all', ...Object.keys(document.moduleLinks).sort()];
  const capabilityOptions = ['all', ...Object.keys(document.capabilityLinks).sort()];
  const summaryItems = [
    [copy.version, document.registryVersion],
    [copy.sourceCommit, document.sourceCommit.slice(0, 12)],
    [copy.generatedAt, new Date(document.generatedAt).toLocaleString()],
    [copy.drift, driftPassed ? copy.clean : copy.failed],
    [copy.policy, payload.exposurePolicy.persistAuthorizationPolicy],
  ];
  const openDetail = (operation: ApiOperationDefinition, trigger: HTMLButtonElement) => {
    lastTriggerRef.current = trigger;
    setSelectedOperation(operation);
  };

  return (
    <div className="space-y-6" data-api-registry-route="ac-readonly" data-tenant-id={tenantId}>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-950">{copy.title}</h1>
            <Badge tone="blue">{copy.readonly}</Badge>
            <Badge tone={driftPassed ? 'green' : 'red'}>
              {driftPassed ? copy.clean : copy.failed}
            </Badge>
          </div>
          <p className="max-w-3xl text-sm text-slate-600">{copy.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadRegistry()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            {copy.refresh}
          </button>
          <button
            type="button"
            onClick={() => downloadRegistryJson(document)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            {copy.download}
          </button>
          <a
            href="/api/v1/api-registry/drift-report"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ExternalLink className="h-4 w-4" />
            {copy.openDrift}
          </a>
        </div>
      </header>

      <div role="status" aria-live="polite" className="sr-only">
        {driftPassed ? copy.clean : copy.failed}. {filteredOperations.length} {copy.operationsShown}.
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5" aria-label={copy.version}>
        {summaryItems.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-900">{value}</p>
          </div>
        ))}
      </section>

      <section
        className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_repeat(6,160px)]"
        aria-label={copy.search}
      >
        <label className="relative block">
          <span className="sr-only">{copy.search}</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            aria-label={copy.search}
            placeholder={copy.search}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
        </label>
        {[
          [copy.group, groupFilter, setGroupFilter, ['all', 'operations', 'config', 'public']],
          [copy.module, moduleFilter, setModuleFilter, moduleOptions],
          [copy.capability, capabilityFilter, setCapabilityFilter, capabilityOptions],
          [
            copy.exposure,
            exposureFilter,
            setExposureFilter,
            ['all', 'public', 'tenant_private', 'internal', 'ac_only'],
          ],
          [
            copy.stability,
            stabilityFilter,
            setStabilityFilter,
            ['all', 'stable', 'preview', 'deprecated'],
          ],
          [copy.deprecation, deprecationFilter, setDeprecationFilter, ['all', 'true', 'false']],
        ].map(([label, value, setter, options]) => (
          <label key={label as string} className="space-y-1 text-xs font-medium text-slate-600">
            <span>{label as string}</span>
            <select
              value={value as string}
              onChange={(event) => (setter as (next: string) => void)(event.currentTarget.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            >
              {(options as string[]).map((option) => (
                <option key={option} value={option}>
                  {option === 'all'
                    ? copy.all
                    : option === 'true'
                      ? copy.deprecated
                      : option === 'false'
                        ? copy.notDeprecated
                        : option.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </label>
        ))}
      </section>

      {document.warnings.length > 0 ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">{copy.warnings}</p>
          <p className="mt-1 break-words">{document.warnings.join(', ')}</p>
        </section>
      ) : null}

      <div className="hidden md:block" data-api-registry-table="desktop">
        <TableShell
          columns={[
            { id: 'method', header: copy.method, width: '76px' },
            { id: 'path', header: copy.path, width: '190px' },
            { id: 'operation', header: copy.operation, width: '220px' },
            { id: 'owner', header: copy.module, width: '140px' },
            { id: 'permissions', header: copy.permissions, width: '160px' },
            { id: 'scope', header: copy.scope, width: '96px' },
            { id: 'exposure', header: copy.exposure, width: '104px' },
            { id: 'stability', header: copy.stability, width: '92px' },
            { id: 'docs', header: copy.docs, width: '72px' },
          ]}
          dataLength={filteredOperations.length}
          isEmpty={filteredOperations.length === 0}
          emptyTitle={copy.emptyTitle}
          emptyDescription={copy.emptyDescription}
          ariaLabel={copy.title}
          density="compact"
          tableClassName="min-w-[1150px]"
        >
          {filteredOperations.map((operation) => (
            <tr
              key={operation.operationCode}
              className="border-t border-slate-100 hover:bg-slate-50"
            >
              <td className="px-4 py-3">
                <Badge tone="slate">{operation.method}</Badge>
              </td>
              <td className="max-w-[280px] px-4 py-3 text-sm font-medium break-all text-slate-900">
                {operation.pathTemplate}
              </td>
              <td className="max-w-[260px] px-4 py-3 text-sm break-all text-slate-700">
                <button
                  type="button"
                  onClick={(event) => openDetail(operation, event.currentTarget)}
                  className="text-left font-medium text-sky-700 underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-sky-200"
                  aria-label={`${copy.viewDetails}: ${operation.operationCode}`}
                >
                  {operation.operationCode}
                </button>
              </td>
              <td className="px-4 py-3 text-sm text-slate-700">
                {operation.ownerModuleCode}
                <br />
                <span className="text-xs text-slate-500">{operation.ownerCapabilityCode}</span>
              </td>
              <td className="max-w-[260px] px-4 py-3 text-xs break-words text-slate-600">
                {formatPermission(operation, copy.noPermission)}
              </td>
              <td className="px-4 py-3 text-xs text-slate-600">
                {operation.scopeType.replace(/_/g, ' ')}
              </td>
              <td className="px-4 py-3">
                <Badge
                  tone={
                    operation.exposure === 'public'
                      ? 'green'
                      : operation.exposure === 'ac_only'
                        ? 'amber'
                        : 'blue'
                  }
                >
                  {operation.exposure.replace(/_/g, ' ')}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <Badge tone={operation.stability === 'deprecated' ? 'amber' : 'green'}>
                  {operation.stability}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <a
                  href={docsHref(operation.documentGroup)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:underline"
                  aria-label={`${copy.openDocs}: ${operation.documentGroup}`}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {copy.docs}
                </a>
              </td>
            </tr>
          ))}
        </TableShell>
      </div>

      <div className="space-y-3 md:hidden" data-api-registry-table="mobile">
        {filteredOperations.map((operation) => (
          <button
            key={operation.operationCode}
            type="button"
            onClick={(event) => openDetail(operation, event.currentTarget)}
            className="w-full rounded-lg border border-slate-200 bg-white p-4 text-left"
          >
            <div className="flex items-start justify-between gap-3">
              <Badge>{operation.method}</Badge>
              <Badge
                tone={
                  operation.exposure === 'public'
                    ? 'green'
                    : operation.exposure === 'ac_only'
                      ? 'amber'
                      : 'blue'
                }
              >
                {operation.exposure.replace(/_/g, ' ')}
              </Badge>
            </div>
            <p className="mt-3 text-sm font-semibold break-all text-slate-900">
              {operation.pathTemplate}
            </p>
            <p className="mt-2 text-xs break-all text-slate-600">{operation.operationCode}</p>
            <div className="mt-3 grid gap-2 text-xs text-slate-600">
              <span>
                {copy.module}: {operation.ownerModuleCode} / {operation.ownerCapabilityCode}
              </span>
              <span>
                {copy.scope}: {operation.scopeType.replace(/_/g, ' ')}
              </span>
              <span>
                {copy.stability}: {operation.stability}
              </span>
            </div>
          </button>
        ))}
      </div>

      <ActionDrawer
        open={Boolean(selectedOperation)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedOperation(null);
            window.requestAnimationFrame(() => lastTriggerRef.current?.focus());
          }
        }}
        title={copy.detailTitle}
        closeButtonAriaLabel={copy.close}
        size="lg"
        footer={
          selectedOperation ? (
            <ActionDrawerFooter>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(selectedOperation.operationCode);
                  setCopiedCode(selectedOperation.operationCode);
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {copiedCode === selectedOperation.operationCode ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copiedCode === selectedOperation.operationCode ? copy.copied : copy.copyCode}
              </button>
              <a
                href={docsHref(selectedOperation.documentGroup)}
                target="_blank"
                rel="noreferrer"
                data-api-registry-detail-docs="true"
                className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
              >
                <ExternalLink className="h-4 w-4" />
                {copy.openDocs}
              </a>
            </ActionDrawerFooter>
          ) : null
        }
      >
        {selectedOperation ? (
          <div className="space-y-5 p-6">
            <div className="flex flex-wrap gap-2">
              <Badge>{selectedOperation.documentGroup}</Badge>
              <Badge tone={selectedOperation.stability === 'deprecated' ? 'amber' : 'green'}>
                {selectedOperation.stability}
              </Badge>
              <Badge tone="blue">
                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                {selectedOperation.examplePolicy.replace(/_/g, ' ')}
              </Badge>
            </div>
            {[
              [copy.operation, selectedOperation.operationCode],
              [copy.path, `${selectedOperation.method} ${selectedOperation.pathTemplate}`],
              [
                copy.module,
                `${selectedOperation.ownerModuleCode} / ${selectedOperation.ownerCapabilityCode}`,
              ],
              [copy.permissions, formatPermission(selectedOperation, copy.noPermission)],
              [copy.scope, `${selectedOperation.scopeType} (${selectedOperation.scopeSource})`],
              [
                copy.schemas,
                [selectedOperation.requestSchemaRef, ...selectedOperation.responseSchemaRefs]
                  .filter(Boolean)
                  .join(', ') || '-',
              ],
              [copy.gateway, selectedOperation.gatewayEligible ? copy.eligible : copy.notEligible],
              [
                copy.builder,
                selectedOperation.builderExportEligible ? copy.eligible : copy.notEligible,
              ],
            ].map(([label, value]) => (
              <div key={label} className="space-y-1">
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <p className="text-sm break-words text-slate-900">{value}</p>
              </div>
            ))}
            {selectedOperation.dynamicPermissionResolver.enabled ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                {copy.dynamicPermission}
              </div>
            ) : null}
          </div>
        ) : null}
      </ActionDrawer>
    </div>
  );
}
