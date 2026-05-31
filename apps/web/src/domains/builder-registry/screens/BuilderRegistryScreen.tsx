'use client';

import {
  Boxes,
  Braces,
  Download,
  ExternalLink,
  FileJson,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  BUILDER_REGISTRY_ARTIFACT_KINDS,
  type BuilderComposedOperationDryRun,
  type BuilderGeneratedArtifactStatus,
  type BuilderRegistryArtifactKind,
  type BuilderRegistryModuleRow,
  type BuilderRegistryOperationDetail,
  type BuilderRegistrySummary,
} from '@tcrn/shared';

import {
  readBuilderRegistryArtifact,
  readBuilderRegistryComposedDryRun,
  readBuilderRegistryModules,
  readBuilderRegistryOperation,
  readBuilderRegistrySummary,
  type RequestFn,
} from '@/domains/builder-registry/api/builder-registry.api';
import { ApiRequestError } from '@/platform/http/api';
import { useUiLocale } from '@/platform/runtime/locale/locale-provider';
import { useSession } from '@/platform/runtime/session/session-provider';
import { ActionDrawer, ActionDrawerFooter, StateView } from '@/platform/ui';

import { useBuilderRegistryCopy } from './builder-registry.copy';

type LoadState = 'loading' | 'ready' | 'empty' | 'error' | 'denied';
type BuilderRegistryStatus = BuilderRegistrySummary['status'];
type BuilderModuleArtifactStatus = BuilderRegistryModuleRow['artifactStatus'];

const DOWNLOAD_BLOCKING_STATUSES = new Set<BuilderRegistryStatus>([
  'empty_no_manifest',
  'redaction_warning',
  'drift_warning',
  'stale_verification',
]);

interface Payload {
  summary: BuilderRegistrySummary;
  modules: readonly BuilderRegistryModuleRow[];
  dryRun: BuilderComposedOperationDryRun | null;
}

function Badge({
  children,
  tone = 'slate',
}: Readonly<{ children: React.ReactNode; tone?: 'slate' | 'green' | 'amber' | 'blue' | 'red' }>) {
  const toneClass = {
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    blue: 'border-sky-200 bg-sky-50 text-sky-700',
    red: 'border-rose-200 bg-rose-50 text-rose-700',
  }[tone];

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${toneClass}`}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiRequestError ? reason.message : fallback;
}

function downloadText(fileName: string, content: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function fallbackLabel(value: string) {
  return value.replace(/_/g, ' ');
}

function formatDateTime(value: string, locale: string) {
  const localeMap: Record<string, string> = {
    en: 'en-US',
    zh_HANS: 'zh-CN',
    zh_HANT: 'zh-TW',
    ja: 'ja-JP',
    ko: 'ko-KR',
    fr: 'fr-FR',
  };

  return new Date(value).toLocaleString(localeMap[locale] ?? 'en-US');
}

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export function BuilderRegistryScreen({ tenantId }: Readonly<{ tenantId: string }>) {
  const { locale } = useUiLocale();
  const copy = useBuilderRegistryCopy(locale);
  const { request } = useSession();
  const [state, setState] = useState<LoadState>('loading');
  const [payload, setPayload] = useState<Payload | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState('all');
  const [stabilityFilter, setStabilityFilter] = useState('all');
  const [artifactFilter, setArtifactFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [warningFilter, setWarningFilter] = useState('all');
  const [downloadMenuKind, setDownloadMenuKind] =
    useState<BuilderRegistryArtifactKind>('manifest');
  const [selectedRow, setSelectedRow] = useState<BuilderRegistryModuleRow | null>(null);
  const [selectedOperation, setSelectedOperation] = useState<BuilderRegistryOperationDetail | null>(
    null
  );
  const [isDownloading, setIsDownloading] = useState(false);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);

  async function load(nextRequest: RequestFn = request, fresh = false) {
    setState('loading');
    setErrorMessage(null);

    try {
      const [summary, modules, dryRun] = await Promise.all([
        readBuilderRegistrySummary(nextRequest, fresh),
        readBuilderRegistryModules(nextRequest, locale),
        readBuilderRegistryComposedDryRun(nextRequest).catch(() => null),
      ]);
      setPayload({ summary, modules: modules.rows, dryRun });
      setState(summary.status === 'empty_no_manifest' ? 'empty' : 'ready');
    } catch (reason) {
      setErrorMessage(getErrorMessage(reason, copy.errorTitle));
      setState(reason instanceof ApiRequestError && reason.status === 403 ? 'denied' : 'error');
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, locale]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return (payload?.modules ?? []).filter((row) => {
      if (moduleFilter !== 'all' && row.moduleCode !== moduleFilter) {
        return false;
      }
      if (scopeFilter !== 'all' && !row.scopeApplicability.includes(scopeFilter)) {
        return false;
      }
      if (stabilityFilter !== 'all' && row.stability !== stabilityFilter) {
        return false;
      }
      if (artifactFilter !== 'all' && row.artifactStatus !== artifactFilter) {
        return false;
      }
      if (warningFilter === 'with' && row.warningCodes.length === 0) {
        return false;
      }
      if (warningFilter === 'without' && row.warningCodes.length > 0) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      return `${row.moduleCode} ${row.moduleName} ${row.capabilityCode} ${row.capabilityName} ${row.permissionSummary.join(' ')}`
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [artifactFilter, moduleFilter, payload?.modules, query, scopeFilter, stabilityFilter, warningFilter]);

  async function openDetail(row: BuilderRegistryModuleRow, trigger: HTMLButtonElement) {
    lastTriggerRef.current = trigger;
    setSelectedRow(row);
    setSelectedOperation(null);
    const firstOperationCode = row.operationCodes[0];
    if (!firstOperationCode) {
      return;
    }
    try {
      setSelectedOperation(await readBuilderRegistryOperation(request, firstOperationCode));
    } catch {
      setSelectedOperation(null);
    }
  }

  async function handleDownload(kind: BuilderRegistryArtifactKind) {
    setIsDownloading(true);
    try {
      const artifact = await readBuilderRegistryArtifact(request, kind);
      downloadText(artifact.fileName, artifact.content, artifact.contentType);
    } finally {
      setIsDownloading(false);
    }
  }

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
            onClick={() => void load()}
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

  const summary = payload.summary;
  const statusTone =
    summary.status === 'ready' ? 'green' : summary.status.includes('warning') ? 'amber' : 'red';
  const metrics = [
    [copy.modulesMetric, summary.moduleCount],
    [copy.capabilitiesMetric, summary.capabilityCount],
    [copy.operationsMetric, summary.operationCount],
    [copy.generatedMetric, summary.artifactStatuses.filter((artifact) => artifact.status === 'ready').length],
  ];
  const artifactStatusByKind = new Map(
    summary.artifactStatuses.map((artifact) => [artifact.artifactKind, artifact])
  );
  const moduleOptions = [
    ...new Map(
      payload.modules.map((row) => [
        row.moduleCode,
        {
          code: row.moduleCode,
          label: row.moduleName,
        },
      ])
    ).values(),
  ];
  const summaryWarningCount =
    summary.warnings.length + payload.modules.reduce((count, row) => count + row.warningCodes.length, 0);
  const statusLabel = copy.statusLabels[summary.status] ?? fallbackLabel(summary.status);
  const getScopeLabel = (scope: string) =>
    copy.scopeLabels[scope as keyof typeof copy.scopeLabels] ?? fallbackLabel(scope);
  const getScopeLabels = (scopes: readonly string[]) => scopes.map(getScopeLabel).join(', ');
  const getStabilityLabel = (stability: string) =>
    copy.stabilityLabels[stability as keyof typeof copy.stabilityLabels] ??
    fallbackLabel(stability);
  const getArtifactStatusLabel = (
    artifactStatus: BuilderModuleArtifactStatus | BuilderGeneratedArtifactStatus['status']
  ) =>
    copy.artifactStatusLabels[artifactStatus as keyof typeof copy.artifactStatusLabels] ??
    fallbackLabel(artifactStatus);
  const getArtifactKindLabel = (artifactKind: BuilderRegistryArtifactKind) =>
    copy.artifactKindLabels[artifactKind];
  const getSummaryDownloadReason = () => {
    if (!DOWNLOAD_BLOCKING_STATUSES.has(summary.status)) {
      return null;
    }

    return (
      copy.downloadDisabledReasons[
        summary.status as keyof typeof copy.downloadDisabledReasons
      ] ?? copy.downloadUnavailable
    );
  };
  const getDownloadState = (artifactKind: BuilderRegistryArtifactKind) => {
    const artifactStatus = artifactStatusByKind.get(artifactKind);

    if (!artifactStatus) {
      return {
        disabled: true,
        reason: copy.downloadDisabledReasons.missing_status,
        label: copy.downloadUnavailable,
      };
    }

    if (artifactStatus.redactionStatus !== 'passed') {
      return {
        disabled: true,
        reason: artifactStatus.disabledReason ?? copy.downloadDisabledReasons.redaction_failed,
        label: getArtifactStatusLabel(artifactStatus.status),
      };
    }

    if (artifactStatus.status !== 'ready') {
      return {
        disabled: true,
        reason: artifactStatus.disabledReason ?? copy.downloadDisabledReasons.artifact_disabled,
        label: getArtifactStatusLabel(artifactStatus.status),
      };
    }

    const summaryReason = getSummaryDownloadReason();
    if (summaryReason) {
      return {
        disabled: true,
        reason: summaryReason,
        label: getArtifactStatusLabel(artifactStatus.status),
      };
    }

    return {
      disabled: false,
      reason: null,
      label: getArtifactStatusLabel(artifactStatus.status),
    };
  };
  const manifestDownloadState = getDownloadState('manifest');
  const apiExportDownloadState = getDownloadState('api-readonly-export');
  const sdkDownloadState = getDownloadState('sdk-readonly');
  const openapiDownloadState = getDownloadState('openapi-readonly');
  const composedDryRunDownloadState = getDownloadState('composed-dry-run');
  const downloadMenuState = getDownloadState(downloadMenuKind);
  const readyArtifactCount = summary.artifactStatuses.filter((artifact) => artifact.status === 'ready').length;
  const redactionPassedCount = summary.artifactStatuses.filter(
    (artifact) => artifact.redactionStatus === 'passed'
  ).length;
  const sdkDocsReadyCount = [sdkDownloadState, openapiDownloadState].filter(
    (downloadState) => !downloadState.disabled
  ).length;

  return (
    <div
      className="space-y-6"
      data-builder-registry-route="ac-readonly"
      data-tenant-id={tenantId}
    >
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
            {copy.eyebrow}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-950">{copy.title}</h1>
            <Badge tone="blue">{copy.readonly}</Badge>
            <Badge tone={statusTone}>{statusLabel}</Badge>
            <Badge tone={summaryWarningCount > 0 ? 'amber' : 'green'}>
              {copy.warning}: {summaryWarningCount}
            </Badge>
          </div>
          <p className="max-w-3xl text-sm text-slate-600">{copy.subtitle}</p>
          <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <div className="flex gap-1">
              <dt>{copy.generatedAt}</dt>
              <dd className="font-medium text-slate-700">{formatDateTime(summary.generatedAt, locale)}</dd>
            </div>
            <div className="flex gap-1">
              <dt>{copy.sourceCommit}</dt>
              <dd className="font-medium text-slate-700">{summary.sourceCommit.slice(0, 12)}</dd>
            </div>
            <div className="flex gap-1">
              <dt>{copy.manifestVersion}</dt>
              <dd className="font-medium text-slate-700">{summary.manifestVersion}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2" data-builder-registry-header-chips="true">
            <Badge tone={manifestDownloadState.disabled ? 'amber' : 'green'}>
              {copy.manifestChip}: {manifestDownloadState.label}
            </Badge>
            <Badge tone={sdkDocsReadyCount === 2 ? 'green' : 'amber'}>
              {copy.sdkDocsChip}: {sdkDocsReadyCount}/2
            </Badge>
            <Badge tone={summary.schemaCount >= summary.operationCount ? 'green' : 'amber'}>
              {copy.schemaCoverageChip}: {summary.schemaCount}/{summary.operationCount}
            </Badge>
            <Badge tone={composedDryRunDownloadState.disabled ? 'amber' : 'green'}>
              {copy.composedDryRunChip}: {composedDryRunDownloadState.label}
            </Badge>
            <Badge tone={redactionPassedCount === summary.artifactStatuses.length ? 'green' : 'amber'}>
              {copy.redactionChip}: {redactionPassedCount}/{summary.artifactStatuses.length}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-start gap-2" data-builder-registry-header-actions="true">
          <button
            type="button"
            onClick={() => void load(request, true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            {copy.refresh}
          </button>
          <button
            type="button"
            onClick={() => void handleDownload('manifest')}
            disabled={isDownloading || manifestDownloadState.disabled}
            title={manifestDownloadState.reason ?? undefined}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            data-builder-registry-download-kind="manifest"
            data-download-state={manifestDownloadState.disabled ? 'disabled' : 'ready'}
          >
            <Download className="h-4 w-4" />
            {isDownloading ? copy.downloading : copy.artifactKindLabels.manifest}
          </button>
          {manifestDownloadState.reason ? (
            <p className="basis-full text-xs text-amber-700" data-download-disabled-reason>
              {copy.downloadDisabledReason}: {manifestDownloadState.reason}
            </p>
          ) : null}
          <a
            href="/api/docs/config"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ExternalLink className="h-4 w-4" />
            {copy.openSwagger}
          </a>
        </div>
      </header>

      <div role="status" aria-live="polite" className="sr-only">
        {statusLabel}. {filteredRows.length} {copy.capabilitiesMetric}.
      </div>

      <section
        className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        aria-label={copy.generatedMetric}
        data-builder-registry-summary="true"
      >
        {metrics.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="mt-1 text-xl font-semibold text-slate-950">{value}</p>
          </div>
        ))}
      </section>

      <section
        className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        aria-label={copy.downloads}
        data-builder-registry-downloads="true"
      >
        {BUILDER_REGISTRY_ARTIFACT_KINDS.map((artifactKind) => {
          const downloadState = getDownloadState(artifactKind);

          return (
            <div
              key={artifactKind}
              className="rounded-lg border border-slate-200 bg-white p-4"
              data-builder-registry-download-card={artifactKind}
              data-download-state={downloadState.disabled ? 'disabled' : 'ready'}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-950">
                    {getArtifactKindLabel(artifactKind)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{downloadState.label}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDownload(artifactKind)}
                  disabled={isDownloading || downloadState.disabled}
                  title={downloadState.reason ?? undefined}
                  aria-label={`${copy.download}: ${getArtifactKindLabel(artifactKind)}`}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  data-builder-registry-download-kind={artifactKind}
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
              {downloadState.reason ? (
                <p className="mt-3 text-xs text-amber-700" data-download-disabled-reason>
                  {copy.downloadDisabledReason}: {downloadState.reason}
                </p>
              ) : null}
            </div>
          );
        })}
      </section>

      <section
        className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_repeat(5,minmax(120px,150px))_minmax(220px,260px)]"
        aria-label={copy.search}
        data-builder-registry-toolbar="true"
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
          [copy.moduleFilter, moduleFilter, setModuleFilter, ['all', ...moduleOptions.map((module) => module.code)]],
          [copy.scope, scopeFilter, setScopeFilter, ['all', 'tenant', 'subsidiary', 'talent']],
          [copy.stability, stabilityFilter, setStabilityFilter, ['all', 'active', 'deprecated', 'future']],
          [
            copy.artifacts,
            artifactFilter,
            setArtifactFilter,
            ['all', 'ready', 'empty_no_manifest', 'partial_metadata_warning'],
          ],
          [copy.warningFilter, warningFilter, setWarningFilter, ['all', 'with', 'without']],
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
                    : label === copy.moduleFilter
                      ? (moduleOptions.find((module) => module.code === option)?.label ?? option)
                      : label === copy.scope
                      ? getScopeLabel(option)
                      : label === copy.stability
                        ? getStabilityLabel(option)
                        : label === copy.warningFilter
                          ? option === 'with'
                            ? copy.withWarnings
                            : copy.withoutWarnings
                          : getArtifactStatusLabel(option as BuilderModuleArtifactStatus)}
                </option>
              ))}
            </select>
          </label>
        ))}
        <div
          className="space-y-1 text-xs font-medium text-slate-600"
          data-builder-registry-download-menu="true"
        >
          <span>{copy.downloadMenu}</span>
          <div className="grid grid-cols-[minmax(0,1fr)_44px] gap-2">
            <select
              value={downloadMenuKind}
              onChange={(event) =>
                setDownloadMenuKind(event.currentTarget.value as BuilderRegistryArtifactKind)
              }
              aria-label={copy.downloadMenu}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              data-builder-registry-download-menu-select="true"
            >
              {BUILDER_REGISTRY_ARTIFACT_KINDS.map((artifactKind) => (
                <option key={artifactKind} value={artifactKind}>
                  {getArtifactKindLabel(artifactKind)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void handleDownload(downloadMenuKind)}
              disabled={isDownloading || downloadMenuState.disabled}
              title={downloadMenuState.reason ?? undefined}
              aria-label={`${copy.download}: ${getArtifactKindLabel(downloadMenuKind)}`}
              data-builder-registry-download-kind={downloadMenuKind}
              data-download-state={downloadMenuState.disabled ? 'disabled' : 'ready'}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
          {downloadMenuState.reason ? (
            <p className="text-xs text-amber-700" data-download-disabled-reason>
              {copy.downloadDisabledReason}: {downloadMenuState.reason}
            </p>
          ) : null}
        </div>
      </section>

      <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white md:block" data-builder-registry-table="desktop">
        <table className="w-full min-w-[1280px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3">{copy.module}</th>
              <th className="px-4 py-3">{copy.capability}</th>
              <th className="px-4 py-3">{copy.scope}</th>
              <th className="px-4 py-3">{copy.readOperations}</th>
              <th className="px-4 py-3">{copy.stability}</th>
              <th className="px-4 py-3">{copy.lastVerified}</th>
              <th className="px-4 py-3">{copy.permissions}</th>
              <th className="px-4 py-3">{copy.artifacts}</th>
              <th className="px-4 py-3">{copy.actions}</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.capabilityCode} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-900">{row.moduleName}</td>
                <td className="px-4 py-3 text-slate-700">
                  {row.capabilityName}
                  <p className="text-xs text-slate-500">{row.capabilityCode}</p>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  {getScopeLabels(row.scopeApplicability)}
                </td>
                <td className="px-4 py-3 text-slate-700">{row.readOperationCount}</td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  {getStabilityLabel(row.stability)}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  {formatDateTime(row.lastVerifiedAt, locale)}
                </td>
                <td className="max-w-[240px] px-4 py-3 text-xs break-words text-slate-600">
                  {row.permissionSummary.join(', ') || copy.noPermission}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={row.artifactStatus === 'ready' ? 'green' : 'amber'}>
                    {getArtifactStatusLabel(row.artifactStatus)}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={(event) => void openDetail(row, event.currentTarget)}
                      aria-label={`${copy.inspect}: ${row.capabilityCode}`}
                      data-capability-code={row.capabilityCode}
                      data-builder-registry-row-action="inspect"
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Boxes className="h-4 w-4" />
                      {copy.inspect}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDownload('manifest')}
                      disabled={isDownloading || manifestDownloadState.disabled}
                      aria-label={`${copy.artifactKindLabels.manifest}: ${row.capabilityCode}`}
                      data-builder-registry-download-kind="manifest"
                      data-builder-registry-row-action="manifest-subset-download"
                      data-download-state={manifestDownloadState.disabled ? 'disabled' : 'ready'}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FileJson className="h-4 w-4" />
                      {copy.artifactKindLabels.manifest}
                    </button>
                    <a
                      href="/api/docs/config"
                      target="_blank"
                      rel="noreferrer"
                      data-builder-registry-row-action="swagger-docs"
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {copy.openSwagger}
                    </a>
                    <button
                      type="button"
                      onClick={(event) => void openDetail(row, event.currentTarget)}
                      data-builder-registry-row-action="dry-run"
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Braces className="h-4 w-4" />
                      {copy.inspectDryRun}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDownload('api-readonly-export')}
                      disabled={isDownloading || apiExportDownloadState.disabled}
                      aria-label={`${copy.download}: ${row.capabilityCode}`}
                      data-builder-registry-download-kind="api-readonly-export"
                      data-builder-registry-row-action="api-export-download"
                      data-download-state={apiExportDownloadState.disabled ? 'disabled' : 'ready'}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Download className="h-4 w-4" />
                      {copy.download}
                    </button>
                    {[manifestDownloadState.reason, apiExportDownloadState.reason]
                      .filter(Boolean)
                      .map((reason, index) => (
                        <p
                          key={`${index}-${reason}`}
                          className="basis-full text-xs text-amber-700"
                          data-download-disabled-reason
                        >
                          {copy.downloadDisabledReason}: {reason}
                        </p>
                      ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden" data-builder-registry-table="mobile">
        {filteredRows.map((row) => (
          <button
            key={row.capabilityCode}
            type="button"
            onClick={(event) => void openDetail(row, event.currentTarget)}
            aria-label={`${copy.inspect}: ${row.capabilityCode}`}
            data-capability-code={row.capabilityCode}
            className="w-full rounded-lg border border-slate-200 bg-white p-4 text-left"
          >
            <div className="flex items-start justify-between gap-3">
              <Badge>{row.moduleCode}</Badge>
              <Badge tone={row.artifactStatus === 'ready' ? 'green' : 'amber'}>
                {getArtifactStatusLabel(row.artifactStatus)}
              </Badge>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-950">{row.capabilityName}</p>
            <p className="mt-1 text-xs break-all text-slate-600">{row.capabilityCode}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
              <dt>{copy.scope}</dt>
              <dd>{getScopeLabels(row.scopeApplicability)}</dd>
              <dt>{copy.readOperations}</dt>
              <dd>{row.readOperationCount}</dd>
              <dt>{copy.stability}</dt>
              <dd>{getStabilityLabel(row.stability)}</dd>
              <dt>{copy.lastVerified}</dt>
              <dd>{formatDateTime(row.lastVerifiedAt, locale)}</dd>
            </dl>
          </button>
        ))}
      </div>

      <ActionDrawer
        open={Boolean(selectedRow)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRow(null);
            setSelectedOperation(null);
            window.requestAnimationFrame(() => lastTriggerRef.current?.focus());
          }
        }}
        title={copy.detailTitle}
        closeButtonAriaLabel={copy.close}
        size="lg"
        footer={
          <ActionDrawerFooter>
            {apiExportDownloadState.reason ? (
              <span className="mr-auto text-xs text-amber-700" data-download-disabled-reason>
                {copy.downloadDisabledReason}: {apiExportDownloadState.reason}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => void handleDownload('api-readonly-export')}
              disabled={isDownloading || apiExportDownloadState.disabled}
              title={apiExportDownloadState.reason ?? undefined}
              data-builder-registry-download-kind="api-readonly-export"
              data-download-state={apiExportDownloadState.disabled ? 'disabled' : 'ready'}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <FileJson className="h-4 w-4" />
              {copy.download}
            </button>
            <a
              href={`/ac/${tenantId}/api-registry`}
              className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
            >
              <ExternalLink className="h-4 w-4" />
              {copy.openApiRegistry}
            </a>
          </ActionDrawerFooter>
        }
      >
        {selectedRow ? (
          <div className="space-y-5 p-6" data-builder-registry-detail="true">
            <div className="flex flex-wrap gap-2">
              <Badge tone="blue">{copy.readonly}</Badge>
              <Badge tone={selectedRow.artifactStatus === 'ready' ? 'green' : 'amber'}>
                {getArtifactStatusLabel(selectedRow.artifactStatus)}
              </Badge>
              <Badge>{getStabilityLabel(selectedRow.stability)}</Badge>
            </div>
            {[
              [copy.module, `${selectedRow.moduleName} (${selectedRow.moduleCode})`],
              [copy.capability, `${selectedRow.capabilityName} (${selectedRow.capabilityCode})`],
              [copy.scope, getScopeLabels(selectedRow.scopeApplicability)],
              [copy.permissions, selectedRow.permissionSummary.join(', ') || copy.noPermission],
              [copy.operations, selectedRow.operationCodes.join(', ') || '-'],
              [copy.lastVerified, formatDateTime(selectedRow.lastVerifiedAt, locale)],
            ].map(([label, value]) => (
              <div key={label} className="space-y-1">
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <p className="text-sm break-words text-slate-900">{value}</p>
              </div>
            ))}
            <section className="rounded-lg border border-slate-200 bg-white p-4" data-builder-registry-source-refs="true">
              <p className="text-sm font-semibold text-slate-900">{copy.sourceRefs}</p>
              <dl className="mt-3 grid gap-2 text-xs text-slate-600">
                <div className="grid gap-1 sm:grid-cols-[150px_minmax(0,1fr)]">
                  <dt>{copy.sourceRegistryRefs}</dt>
                  <dd className="break-words">
                    {summary.manifestVersion}, {summary.registryVersion}
                  </dd>
                </div>
                <div className="grid gap-1 sm:grid-cols-[150px_minmax(0,1fr)]">
                  <dt>{copy.operationSource}</dt>
                  <dd className="break-words">{selectedOperation?.source.operationId ?? '-'}</dd>
                </div>
                <div className="grid gap-1 sm:grid-cols-[150px_minmax(0,1fr)]">
                  <dt>{copy.controllerSource}</dt>
                  <dd className="break-words">{selectedOperation?.source.controllerFile ?? '-'}</dd>
                </div>
                <div className="grid gap-1 sm:grid-cols-[150px_minmax(0,1fr)]">
                  <dt>{copy.openapiSource}</dt>
                  <dd className="break-words">{selectedOperation?.source.openapiFile ?? '-'}</dd>
                </div>
              </dl>
            </section>
            {selectedOperation ? (
              <section className="rounded-lg border border-slate-200 bg-slate-50 p-4" data-builder-registry-operation-detail="true">
                <div className="mb-3 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-sky-600" />
                  <p className="text-sm font-semibold text-slate-900">
                    {selectedOperation.operationCode}
                  </p>
                </div>
                <p className="text-xs text-slate-600">
                  {selectedOperation.method} {selectedOperation.pathTemplate}
                </p>
                <p className="mt-2 text-xs text-slate-600">
                  {copy.schemaRefs}: {[selectedOperation.requestSchemaRef, selectedOperation.responseSchemaRef].filter(Boolean).join(', ') || '-'}
                </p>
                {selectedOperation.dynamicPermissionResolver.enabled ? (
                  <p className="mt-2 text-xs text-amber-700">{copy.dynamicPermission}</p>
                ) : null}
              </section>
            ) : null}
            <section className="rounded-lg border border-slate-200 bg-white p-4" data-builder-registry-detail-artifacts="true">
              <p className="text-sm font-semibold text-slate-900">{copy.generatedArtifactsTitle}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {summary.artifactStatuses.map((artifact) => {
                  const downloadState = getDownloadState(artifact.artifactKind);

                  return (
                    <div
                      key={artifact.artifactKind}
                      className="rounded-lg border border-slate-200 p-3"
                      data-builder-registry-download-card={artifact.artifactKind}
                      data-download-state={downloadState.disabled ? 'disabled' : 'ready'}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900">
                            {getArtifactKindLabel(artifact.artifactKind)}
                          </p>
                          <p className="mt-1 break-all text-xs text-slate-500">
                            {artifact.fileName}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleDownload(artifact.artifactKind)}
                          disabled={isDownloading || downloadState.disabled}
                          aria-label={`${copy.download}: ${getArtifactKindLabel(artifact.artifactKind)}`}
                          data-builder-registry-download-kind={artifact.artifactKind}
                          data-download-state={downloadState.disabled ? 'disabled' : 'ready'}
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-slate-600">
                        {artifact.contentHash.slice(0, 16)}
                      </p>
                      {downloadState.reason ? (
                        <p className="mt-2 text-xs text-amber-700" data-download-disabled-reason>
                          {copy.downloadDisabledReason}: {downloadState.reason}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
            <section className="rounded-lg border border-slate-200 bg-white p-4" data-builder-registry-warnings="true">
              <p className="text-sm font-semibold text-slate-900">{copy.warningsTitle}</p>
              {[...selectedRow.warningCodes, ...summary.warnings].length > 0 ? (
                <ul className="mt-3 space-y-2 text-xs text-amber-700">
                  {[...selectedRow.warningCodes, ...summary.warnings].map((warning) => (
                    <li key={warning} className="break-words">
                      {warning}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-slate-600">{copy.noWarnings}</p>
              )}
            </section>
            <section
              className="overflow-hidden rounded-lg border border-slate-200 bg-white p-4"
              data-builder-registry-dry-run="true"
            >
              <div className="mb-2 flex items-center gap-2">
                <Braces className="h-4 w-4 text-slate-600" />
                <p className="text-sm font-semibold text-slate-900">{copy.dryRunTitle}</p>
              </div>
              <p className="text-xs text-slate-600">{copy.dryRunNote}</p>
              <p className="mt-3 max-w-full break-all text-xs font-medium text-slate-500">
                {payload.dryRun?.operationCode ?? 'builder.acCapabilitySurfaceOverview.read'}
              </p>
              <p
                className="mt-2 max-w-full break-all text-xs text-slate-600"
                data-builder-registry-dry-run-unsupported="true"
              >
                {copy.unsupportedReasons}:{' '}
                {payload.dryRun?.unsupportedReasons.length
                  ? payload.dryRun.unsupportedReasons.join(', ')
                  : copy.noWarnings}
              </p>
              {payload.dryRun ? (
                <dl className="mt-4 grid min-w-0 gap-3 text-xs text-slate-600">
                  <div className="min-w-0">
                    <dt className="font-medium text-slate-500">{copy.dryRunMode}</dt>
                    <dd className="mt-1 max-w-full break-all">{payload.dryRun.mode}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="font-medium text-slate-500">{copy.inputSchema}</dt>
                    <dd className="mt-1 max-w-full whitespace-pre-wrap break-all">
                      {formatJson(payload.dryRun.inputSchema)}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="font-medium text-slate-500">{copy.nativeRefs}</dt>
                    <dd className="mt-1 max-w-full break-all">
                      {payload.dryRun.nativeOperationRefs
                        .map((ref) => `${ref.ref} ${ref.method} ${ref.pathTemplate}`)
                        .join(', ')}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="font-medium text-slate-500">{copy.permissionRequirements}</dt>
                    <dd className="mt-1 max-w-full break-all">
                      {payload.dryRun.permissionRequirements
                        .map((permission) => `${permission.resource}:${permission.action}`)
                        .join(', ')}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="font-medium text-slate-500">{copy.scopeRequirements}</dt>
                    <dd className="mt-1 max-w-full break-all">{payload.dryRun.scopeRequirements.join(', ')}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="font-medium text-slate-500">{copy.dryRunPlan}</dt>
                    <dd className="mt-1 max-w-full break-all">{payload.dryRun.dryRunPlan.join(' ')}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="font-medium text-slate-500">{copy.redactedSampleOutput}</dt>
                    <dd className="mt-1 max-w-full break-all">
                      {JSON.stringify(payload.dryRun.redactedSampleOutput)}
                    </dd>
                  </div>
                </dl>
              ) : null}
            </section>
          </div>
        ) : null}
      </ActionDrawer>
    </div>
  );
}
