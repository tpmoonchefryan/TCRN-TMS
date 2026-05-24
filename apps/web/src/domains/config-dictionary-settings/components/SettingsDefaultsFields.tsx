'use client';

import { SUPPORTED_UI_LOCALES, type SupportedUiLocale } from '@tcrn/shared';

import type { TenantSettingsDraft } from '@/domains/config-dictionary-settings/api/settings.api';

type TextFn = (valueOrEn: string, zh?: string, ja?: string) => string;

interface SettingsDefaultsProps {
  draft: TenantSettingsDraft;
  getSourceHint: (key: string) => string;
  text: TextFn;
}

interface SettingsDefaultsFormProps extends SettingsDefaultsProps {
  onDraftChange: (updater: (current: TenantSettingsDraft) => TenantSettingsDraft) => void;
}

const LANGUAGE_LABELS = {
  en: 'English',
  zh_HANS: '简体中文',
  zh_HANT: '繁體中文',
  ja: '日本語',
  ko: '한국어',
  fr: 'Français',
} as const;

const LANGUAGE_OPTIONS = SUPPORTED_UI_LOCALES.map((value) => ({
  value,
  label: LANGUAGE_LABELS[value],
}));

const TIMEZONE_OPTIONS = [
  'Asia/Shanghai',
  'Asia/Tokyo',
  'UTC',
  'America/Los_Angeles',
];

const DATE_FORMAT_OPTIONS = [
  'YYYY-MM-DD',
  'DD/MM/YYYY',
  'MM/DD/YYYY',
  'YYYY/MM/DD',
];

const CURRENCY_OPTIONS = ['USD', 'CNY', 'JPY', 'KRW', 'EUR'];

function boolLabel(value: boolean, text: TextFn) {
  return value
    ? text('Enabled', '已启用', '有効')
    : text('Disabled', '已停用', '無効');
}

function SettingsFieldRow({
  label,
  value,
  hint,
}: Readonly<{
  label: string;
  value: string;
  hint?: string;
}>) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 min-w-0 whitespace-normal break-all text-base font-semibold text-slate-950">{value}</p>
      {hint ? <p className="mt-2 min-w-0 whitespace-normal break-all text-sm leading-6 text-slate-600">{hint}</p> : null}
    </div>
  );
}

function ToggleField({
  checked,
  description,
  label,
  onChange,
}: Readonly<{
  checked: boolean;
  description: string;
  label: string;
  onChange: (checked: boolean) => void;
}>) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <input
        aria-label={label}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
      />
      <span className="space-y-1">
        <span className="block text-sm font-semibold text-slate-950">{label}</span>
        <span className="block text-sm leading-6 text-slate-600">{description}</span>
      </span>
    </label>
  );
}

export function SettingsDefaultsSummaryGrid({
  draft,
  getSourceHint,
  text,
}: Readonly<SettingsDefaultsProps>) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <SettingsFieldRow
        label={text('Default language', '默认语言', '既定言語')}
        value={draft.defaultLanguage}
        hint={getSourceHint('defaultLanguage')}
      />
      <SettingsFieldRow
        label={text('Default timezone', '默认时区', '既定タイムゾーン')}
        value={draft.timezone}
        hint={getSourceHint('timezone')}
      />
      <SettingsFieldRow
        label={text('Date format', '日期格式', '日付形式')}
        value={draft.dateFormat}
        hint={getSourceHint('dateFormat')}
      />
      <SettingsFieldRow
        label={text('Currency', '币种', '通貨')}
        value={draft.currency}
        hint={getSourceHint('currency')}
      />
      <SettingsFieldRow
        label={text('Public marshmallow', '公开棉花糖', '公開マシュマロ')}
        value={boolLabel(draft.allowMarshmallow, text)}
        hint={getSourceHint('allowMarshmallow')}
      />
      <SettingsFieldRow
        label={text('Customer import', '客户导入', '顧客インポート')}
        value={boolLabel(draft.customerImportEnabled, text)}
        hint={getSourceHint('customerImportEnabled')}
      />
      <SettingsFieldRow
        label={text('Max import rows', '最大导入行数', '最大インポート行数')}
        value={String(draft.maxImportRows)}
        hint={getSourceHint('maxImportRows')}
      />
      <SettingsFieldRow
        label={text('Tenant-wide TOTP', '全范围 TOTP', '全体 TOTP')}
        value={boolLabel(draft.totpRequiredForAll, text)}
        hint={getSourceHint('totpRequiredForAll')}
      />
      <SettingsFieldRow
        label={text('Password policy', '密码策略', 'パスワードポリシー')}
        value={text(
          `${draft.passwordPolicy.minLength} chars / ${draft.passwordPolicy.maxAgeDays} days`,
          `${draft.passwordPolicy.minLength} 位 / ${draft.passwordPolicy.maxAgeDays} 天`,
          `${draft.passwordPolicy.minLength} 文字 / ${draft.passwordPolicy.maxAgeDays} 日`,
        )}
        hint={getSourceHint('passwordPolicy')}
      />
    </div>
  );
}

export function SettingsDefaultsFormFields({
  draft,
  getSourceHint,
  onDraftChange,
  text,
}: Readonly<SettingsDefaultsFormProps>) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-950">{text('Localization', '本地化', 'ローカライズ')}</p>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-900">{text('Default language', '默认语言', '既定言語')}</span>
            <select
              aria-label={text('Default language', '默认语言', '既定言語')}
              value={draft.defaultLanguage}
              onChange={(event) =>
                onDraftChange((current) => ({
                  ...current,
                  defaultLanguage: event.target.value as SupportedUiLocale,
                }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400"
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">{getSourceHint('defaultLanguage')}</p>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-900">{text('Default timezone', '默认时区', '既定タイムゾーン')}</span>
            <select
              aria-label={text('Default timezone', '默认时区', '既定タイムゾーン')}
              value={draft.timezone}
              onChange={(event) =>
                onDraftChange((current) => ({
                  ...current,
                  timezone: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400"
            >
              {TIMEZONE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">{getSourceHint('timezone')}</p>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-900">{text('Date format', '日期格式', '日付形式')}</span>
            <select
              aria-label={text('Date format', '日期格式', '日付形式')}
              value={draft.dateFormat}
              onChange={(event) =>
                onDraftChange((current) => ({
                  ...current,
                  dateFormat: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400"
            >
              {DATE_FORMAT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">{getSourceHint('dateFormat')}</p>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-900">{text('Currency', '币种', '通貨')}</span>
            <select
              aria-label={text('Currency', '币种', '通貨')}
              value={draft.currency}
              onChange={(event) =>
                onDraftChange((current) => ({
                  ...current,
                  currency: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400"
            >
              {CURRENCY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">{getSourceHint('currency')}</p>
          </label>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-950">{text('Public surfaces', '公开入口', '公開サーフェス')}</p>
        <div className="grid gap-4 md:grid-cols-2">
          <ToggleField
            checked={draft.allowMarshmallow}
            label={text('Allow public marshmallow', '允许公开棉花糖', '公開マシュマロを許可')}
            description={getSourceHint('allowMarshmallow')}
            onChange={(checked) =>
              onDraftChange((current) => ({
                ...current,
                allowMarshmallow: checked,
              }))
            }
          />
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-950">{text('Customer import', '客户导入', '顧客インポート')}</p>
        <div className="grid gap-4 md:grid-cols-2">
          <ToggleField
            checked={draft.customerImportEnabled}
            label={text('Enable customer import', '启用客户导入', '顧客インポートを有効化')}
            description={getSourceHint('customerImportEnabled')}
            onChange={(checked) =>
              onDraftChange((current) => ({
                ...current,
                customerImportEnabled: checked,
              }))
            }
          />
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-900">{text('Max import rows', '最大导入行数', '最大インポート行数')}</span>
            <input
              aria-label={text('Max import rows', '最大导入行数', '最大インポート行数')}
              type="number"
              min={1}
              value={draft.maxImportRows}
              onChange={(event) =>
                onDraftChange((current) => ({
                  ...current,
                  maxImportRows: Number(event.target.value),
                }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400"
            />
            <p className="text-xs text-slate-500">{getSourceHint('maxImportRows')}</p>
          </label>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-950">{text('Security', '安全', 'セキュリティ')}</p>
        <div className="grid gap-4 md:grid-cols-2">
          <ToggleField
            checked={draft.totpRequiredForAll}
            label={text('Require TOTP for all users', '要求所有用户启用 TOTP', '全ユーザーに TOTP を要求')}
            description={getSourceHint('totpRequiredForAll')}
            onChange={(checked) =>
              onDraftChange((current) => ({
                ...current,
                totpRequiredForAll: checked,
              }))
            }
          />
          <ToggleField
            checked={draft.passwordPolicy.requireSpecial}
            label={text('Require special character', '要求特殊字符', '特殊文字を必須にする')}
            description={getSourceHint('passwordPolicy')}
            onChange={(checked) =>
              onDraftChange((current) => ({
                ...current,
                passwordPolicy: {
                  ...current.passwordPolicy,
                  requireSpecial: checked,
                },
              }))
            }
          />
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-900">{text('Minimum password length', '密码最小长度', '最小パスワード長')}</span>
            <input
              aria-label={text('Minimum password length', '密码最小长度', '最小パスワード長')}
              type="number"
              min={8}
              value={draft.passwordPolicy.minLength}
              onChange={(event) =>
                onDraftChange((current) => ({
                  ...current,
                  passwordPolicy: {
                    ...current.passwordPolicy,
                    minLength: Number(event.target.value),
                  },
                }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400"
            />
            <p className="text-xs text-slate-500">{getSourceHint('passwordPolicy')}</p>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-900">{text('Password max age days', '密码最长有效天数', 'パスワード最大有効日数')}</span>
            <input
              aria-label={text('Password max age days', '密码最长有效天数', 'パスワード最大有効日数')}
              type="number"
              min={1}
              value={draft.passwordPolicy.maxAgeDays}
              onChange={(event) =>
                onDraftChange((current) => ({
                  ...current,
                  passwordPolicy: {
                    ...current.passwordPolicy,
                    maxAgeDays: Number(event.target.value),
                  },
                }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400"
            />
            <p className="text-xs text-slate-500">{getSourceHint('passwordPolicy')}</p>
          </label>
        </div>
      </div>
    </div>
  );
}
