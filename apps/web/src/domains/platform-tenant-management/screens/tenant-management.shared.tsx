import type { SupportedUiLocale } from '@tcrn/shared';
import type { ReactNode } from 'react';

import type { TenantDetail } from '@/domains/platform-tenant-management/api/tenant-management.api';
import { ApiRequestError } from '@/platform/http/api';
import type { RuntimeLocale } from '@/platform/runtime/locale/locale-provider';
import { formatLocaleDateTime } from '@/platform/runtime/locale/locale-text';

export type TierFilter = 'all' | 'ac' | 'standard';
export type ActivityFilter = 'all' | 'active' | 'inactive';

export interface TenantDraft {
  code: string;
  name: string;
  maxTalents: string;
  maxCustomersPerTalent: string;
  featuresText: string;
  adminUsername: string;
  adminEmail: string;
  adminPassword: string;
  adminDisplayName: string;
}

export const emptyTenantDraft: TenantDraft = {
  code: '',
  name: '',
  maxTalents: '',
  maxCustomersPerTalent: '',
  featuresText: '',
  adminUsername: '',
  adminEmail: '',
  adminPassword: '',
  adminDisplayName: '',
};

export const inputClassName =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40';

export function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiRequestError ? reason.message : fallback;
}

export function formatDateTime(
  value: string | null | undefined,
  locale: RuntimeLocale | SupportedUiLocale,
  fallback: string,
) {
  return formatLocaleDateTime(locale, value ?? null, fallback);
}

export function readPositiveInteger(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function splitFeatures(value: string) {
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : undefined;
}

export function buildDraftFromTenant(tenant: TenantDetail | null): TenantDraft {
  if (!tenant) {
    return emptyTenantDraft;
  }

  const settings = tenant.settings || {};
  const features = Array.isArray(settings.features) ? settings.features.filter((item) => typeof item === 'string') : [];

  return {
    code: tenant.code,
    name: tenant.name,
    maxTalents: typeof settings.maxTalents === 'number' ? String(settings.maxTalents) : '',
    maxCustomersPerTalent:
      typeof settings.maxCustomersPerTalent === 'number' ? String(settings.maxCustomersPerTalent) : '',
    featuresText: features.join(', '),
    adminUsername: '',
    adminEmail: '',
    adminPassword: '',
    adminDisplayName: '',
  };
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

export function ToneBadge({
  tone,
  label,
}: Readonly<{
  tone: 'neutral' | 'success' | 'warning' | 'info';
  label: string;
}>) {
  const toneClasses =
    tone === 'success'
      ? 'bg-emerald-100 text-emerald-800'
      : tone === 'warning'
        ? 'bg-amber-100 text-amber-800'
        : tone === 'info'
          ? 'bg-indigo-100 text-indigo-800'
          : 'bg-slate-100 text-slate-700';

  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${toneClasses}`}>
      {label}
    </span>
  );
}

export function InlineActionButton({
  children,
  tone = 'neutral',
  onClick,
}: Readonly<{
  children: ReactNode;
  tone?: 'neutral' | 'danger' | 'primary';
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
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${toneClasses}`}
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

  return <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${toneClasses}`}>{message}</div>;
}

export function Field({
  label,
  hint,
  children,
}: Readonly<{
  label: string;
  hint?: string;
  children: ReactNode;
}>) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-slate-900">{label}</span>
      {children}
      {hint ? <span className="block text-xs leading-5 text-slate-500">{hint}</span> : null}
    </label>
  );
}
