'use client';

import type {
  TenantSenderDomainOption,
  TenantSenderDomainsResponse,
} from '@/domains/config-dictionary-settings/api/settings.api';
import type { SettingsFamilyLocalizedText } from '@/domains/config-dictionary-settings/screens/settings-family.copy';

type SettingsText = (
  valueOrEn: string | SettingsFamilyLocalizedText,
  zh?: string,
  ja?: string
) => string;

export interface TenantEmailSenderDraft {
  defaultDomainId: string | null;
  fromName: string;
  replyTo: string;
}

export interface TenantEmailSettingsFieldsProps {
  domains: TenantSenderDomainOption[];
  draft: TenantEmailSenderDraft;
  isSaving: boolean;
  error: string | null;
  success: string | null;
  text: SettingsText;
  onDraftChange: (draft: TenantEmailSenderDraft) => void;
  onSave: () => void;
}

export function buildTenantEmailSenderDraft(
  response: TenantSenderDomainsResponse | null
): TenantEmailSenderDraft {
  return {
    defaultDomainId: response?.defaultDomainId ?? '',
    fromName: response?.fromName ?? '',
    replyTo: response?.replyTo ?? '',
  };
}

function formatStatus(status: TenantSenderDomainOption['status'], text: SettingsText) {
  if (status === 'verified') {
    return text('Verified', '已验证', '確認済み');
  }

  if (status === 'disabled') {
    return text('Disabled', '已停用', '無効');
  }

  return text('Pending DNS', '等待 DNS 配置', 'DNS 設定待ち');
}

export function TenantEmailSettingsFields({
  domains,
  draft,
  error,
  isSaving,
  success,
  text,
  onDraftChange,
  onSave,
}: Readonly<TenantEmailSettingsFieldsProps>) {
  const selectableDomains = domains.filter((domain) => domain.selectable);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-900">
            {text('Default sending domain', '默认发信域名', '既定送信ドメイン')}
          </span>
          <select
            aria-label={text('Default sending domain', '默认发信域名', '既定送信ドメイン')}
            value={draft.defaultDomainId ?? ''}
            onChange={(event) =>
              onDraftChange({ ...draft, defaultDomainId: event.target.value || null })
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
          >
            <option value="">
              {text('No default sender domain', '不设置默认发信域名', '既定送信ドメインなし')}
            </option>
            {selectableDomains.map((domain) => (
              <option key={domain.id} value={domain.id}>
                {`${domain.domain} (${formatStatus(domain.status, text)})`}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-900">
            {text('Sender display name', '发件人显示名称', '送信者表示名')}
          </span>
          <input
            aria-label={text('Sender display name', '发件人显示名称', '送信者表示名')}
            value={draft.fromName}
            onChange={(event) => onDraftChange({ ...draft, fromName: event.target.value })}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
            placeholder={text('Support team', '客服团队', 'サポートチーム')}
          />
        </label>

        <label className="space-y-2 lg:col-span-2">
          <span className="text-sm font-semibold text-slate-900">
            {text('Reply-to address', '回复地址', '返信先アドレス')}
          </span>
          <input
            aria-label={text('Reply-to address', '回复地址', '返信先アドレス')}
            value={draft.replyTo}
            onChange={(event) => onDraftChange({ ...draft, replyTo: event.target.value })}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
            placeholder="support@example.com"
          />
        </label>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-900">
          {text('Assigned sender domains', '已分配发信域名', '割り当て済み送信ドメイン')}
        </p>
        {domains.length > 0 ? (
          <div className="grid gap-3">
            {domains.map((domain) => (
              <div
                key={domain.id}
                className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="break-all text-sm font-semibold text-slate-950">{domain.domain}</p>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {formatStatus(domain.status, text)}
                  </span>
                </div>
                {!domain.selectable ? (
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {text(
                      'This domain is visible for readiness tracking but cannot be selected until AC verifies it.',
                      '该域名可用于查看就绪状态，但需要 AC 验证后才能选择。',
                      'このドメインは準備状況の確認用に表示されますが、AC が確認するまで選択できません。'
                    )}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {text(
              'No sender domain has been assigned by AC yet.',
              'AC 尚未分配发信域名。',
              'AC によって割り当てられた送信ドメインはまだありません。'
            )}
          </p>
        )}
      </div>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
      {success ? <p className="text-sm font-medium text-emerald-700">{success}</p> : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving
            ? text('Saving email sender preferences', '正在保存发信偏好', 'メール送信設定を保存中')
            : text('Save email sender preferences', '保存发信偏好', 'メール送信設定を保存')}
        </button>
      </div>
    </div>
  );
}
