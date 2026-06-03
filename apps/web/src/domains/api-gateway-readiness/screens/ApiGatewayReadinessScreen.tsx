'use client';

import { Download, ExternalLink, Network, RefreshCw, Route, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type {
  ApiGatewayProvider,
  ApiGatewayReadinessSummary,
  ApiGatewayReadinessUiState,
  ApiGatewayRoutePolicy,
} from '@tcrn/shared';

import { ApiRequestError } from '@/platform/http/api';
import { useUiLocale } from '@/platform/runtime/locale/locale-provider';
import { useSession } from '@/platform/runtime/session/session-provider';
import { StateView } from '@/platform/ui';

import {
  readApiGatewayCutoverRunbook,
  readApiGatewayReadinessSummary,
  readApiGatewayRenderedArtifact,
  readApiGatewayRoutePolicy,
} from '../api/api-gateway-readiness.api';
import { useApiGatewayReadinessCopy } from './api-gateway-readiness.copy';

type LoadState = 'loading' | 'ready' | 'error' | 'denied';

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiRequestError ? reason.message : fallback;
}

function StatusBadge({
  children,
  tone = 'slate',
}: Readonly<{ children: React.ReactNode; tone?: 'green' | 'amber' | 'red' | 'slate' | 'blue' }>) {
  const toneClass = {
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    red: 'border-rose-200 bg-rose-50 text-rose-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    blue: 'border-sky-200 bg-sky-50 text-sky-700',
  }[tone];

  return (
    <span className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-medium ${toneClass}`}>
      <span className="truncate">{children}</span>
    </span>
  );
}

function Button({
  children,
  onClick,
  href,
  ariaLabel,
  disabled = false,
}: Readonly<{
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  ariaLabel?: string;
  disabled?: boolean;
}>) {
  const className = `inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 ${
    disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-slate-50'
  }`;

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className} aria-label={ariaLabel}>
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

function downloadJson(fileName: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadText(fileName: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function stateTone(state: ApiGatewayReadinessUiState) {
  if (state === 'clean_ready') {
    return 'green' as const;
  }
  if (state === 'render_failed' || state === 'trusted_header_warning') {
    return 'red' as const;
  }
  if (
    state === 'drift_or_parity_warning' ||
    state === 'canary_rollback_unavailable' ||
    state === 'stale_verification'
  ) {
    return 'amber' as const;
  }
  return 'slate' as const;
}

function policyState(policy: ApiGatewayRoutePolicy) {
  if (policy.routes.length === 0) {
    return 'empty_no_policy' as const;
  }
  if (!policy.trustedProxyPolicy.passed) {
    return 'trusted_header_warning' as const;
  }
  if (!policy.rateLimitCorsPolicy.passed || policy.rateLimitCorsPolicy.parityWarnings.length > 0) {
    return 'drift_or_parity_warning' as const;
  }
  return 'clean_ready' as const;
}

export function ApiGatewayReadinessScreen({ tenantId }: Readonly<{ tenantId: string }>) {
  const { locale } = useUiLocale();
  const copy = useApiGatewayReadinessCopy(locale);
  const { request } = useSession();
  const [state, setState] = useState<LoadState>('loading');
  const [summary, setSummary] = useState<ApiGatewayReadinessSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function load() {
    setState('loading');
    setErrorMessage(null);
    try {
      const result = await readApiGatewayReadinessSummary(request);
      setSummary(result);
      setState('ready');
    } catch (reason) {
      setErrorMessage(getErrorMessage(reason, copy.errorTitle));
      setState(reason instanceof ApiRequestError && reason.status === 403 ? 'denied' : 'error');
    }
  }

  useEffect(() => {
    void load();
  }, [tenantId]);

  const visibleRoutes = useMemo(() => summary?.routePolicy.routes.slice(0, 12) ?? [], [summary]);

  async function handleDownloadPolicy() {
    const policy = await readApiGatewayRoutePolicy(request);
    downloadJson(`api-gateway-route-policy-${policy.policyVersion}.json`, policy);
  }

  async function handleDownloadRender(provider: ApiGatewayProvider) {
    const artifact = await readApiGatewayRenderedArtifact(request, provider);
    downloadText(artifact.fileName, artifact.content);
  }

  async function handleDownloadRunbook() {
    const runbook = await readApiGatewayCutoverRunbook(request);
    downloadJson('api-gateway-cutover-runbook.json', runbook);
  }

  if (state === 'loading' && !summary) {
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

  if (!summary) {
    return (
      <StateView status="empty" title={copy.noRoutes} description={copy.noRoutesDescription} />
    );
  }

  const uiState = summary.uiState;
  const hasGeneratedPolicy = summary.routePolicy.routes.length > 0;
  const summaryItems = [
    [copy.activeProxy, summary.activeProxyBaseline],
    [copy.routePolicy, `${summary.routePolicy.routes.length}`],
    [copy.renderStatus, summary.renderValidation.passed ? 'pass' : 'fail'],
    [copy.trustedHeaders, summary.trustedProxyPolicy.passed ? 'pass' : 'fail'],
    [copy.rateCors, summary.rateLimitCorsPolicy.passed ? 'pass' : 'fail'],
    [copy.canaryRollback, summary.routePolicy.canaryRollback.status],
    [copy.verification, summary.routeDriftReport.result],
  ];

  return (
    <div className="space-y-6" data-api-gateway-readiness-route="ac-readonly">
      <section className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div
              className="flex flex-wrap items-center gap-2"
              role="status"
              aria-live="polite"
              data-api-gateway-status-region="true"
            >
              <StatusBadge tone="blue">{copy.readonly}</StatusBadge>
              <StatusBadge tone={stateTone(uiState)}>{copy.states[uiState]}</StatusBadge>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-950">{copy.title}</h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{copy.subtitle}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void load()} ariaLabel={copy.refresh}>
              <RefreshCw className="h-4 w-4" />
              {copy.refresh}
            </Button>
            <Button href={`/ac/${tenantId}/api-registry`} ariaLabel={copy.openRegistry}>
              <Route className="h-4 w-4" />
              {copy.openRegistry}
            </Button>
            <Button href="/api/docs" ariaLabel={copy.openSwagger}>
              <ExternalLink className="h-4 w-4" />
              {copy.openSwagger}
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-api-gateway-summary="true">
        {summaryItems.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="mt-2 break-words text-sm font-semibold text-slate-950">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Network className="h-5 w-5 shrink-0 text-sky-600" />
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-950">{copy.routePolicy}</h2>
              <p className="text-sm text-slate-500">
                {copy.routeCount}: {summary.routePolicy.routes.length}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void handleDownloadPolicy()} ariaLabel={copy.downloadPolicy}>
              <Download className="h-4 w-4" />
              {copy.downloadPolicy}
            </Button>
            <Button
              onClick={() => void handleDownloadRender('apisix')}
              ariaLabel={copy.downloadApisix}
              disabled={!hasGeneratedPolicy}
            >
              <Download className="h-4 w-4" />
              {copy.downloadApisix}
            </Button>
            <Button
              onClick={() => void handleDownloadRender('kong')}
              ariaLabel={copy.downloadKong}
              disabled={!hasGeneratedPolicy}
            >
              <Download className="h-4 w-4" />
              {copy.downloadKong}
            </Button>
            <Button onClick={() => void handleDownloadRunbook()} ariaLabel={copy.openRunbook}>
              <ExternalLink className="h-4 w-4" />
              {copy.openRunbook}
            </Button>
          </div>
        </div>

        {visibleRoutes.length === 0 ? (
          <div className="p-6">
            <StateView status="empty" title={copy.noRoutes} description={copy.noRoutesDescription} />
          </div>
        ) : (
          <div className="overflow-x-auto" data-api-gateway-table="desktop">
            <table className="min-w-[860px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">{copy.operation}</th>
                  <th className="px-4 py-3">{copy.method}</th>
                  <th className="px-4 py-3">{copy.path}</th>
                  <th className="px-4 py-3">{copy.auth}</th>
                  <th className="px-4 py-3">{copy.cutover}</th>
                  <th className="px-4 py-3">{copy.notApplied}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRoutes.map((route) => (
                  <tr key={`${route.method}-${route.pathTemplate}`}>
                    <td className="max-w-xs px-4 py-3 font-medium text-slate-900">
                      <span className="block truncate">{route.operationCode}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge>{route.method}</StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{route.pathTemplate}</td>
                    <td className="px-4 py-3 text-slate-700">{route.authPolicyRefs.join(', ')}</td>
                    <td className="px-4 py-3 text-slate-700">{String(route.cutoverDefault)}</td>
                    <td className="px-4 py-3 text-slate-700">{route.notAppliedReason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-3" data-api-gateway-safety="true">
        {[
          [copy.trustedHeaders, summary.trustedProxyPolicy.passed, summary.trustedProxyPolicy.strippedUntrustedHeaderNames.join(', ')],
          [copy.rateCors, summary.rateLimitCorsPolicy.passed, summary.rateLimitCorsPolicy.routeHints.map((hint) => hint.hint).join(', ')],
          [copy.canaryRollback, policyState(summary.routePolicy) === 'clean_ready', summary.routePolicy.canaryRollback.status],
        ].map(([label, passed, detail]) => (
          <div key={String(label)} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-950">{label}</h2>
              <ShieldCheck className={`h-4 w-4 ${passed ? 'text-emerald-600' : 'text-amber-600'}`} />
            </div>
            <p className="mt-3 break-words text-sm leading-6 text-slate-600">{detail}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
