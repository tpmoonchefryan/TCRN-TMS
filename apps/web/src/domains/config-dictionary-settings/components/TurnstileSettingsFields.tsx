'use client';

import type {
  TenantTurnstileSecretMutation,
  TenantTurnstileSettingsResponse,
} from '@/domains/config-dictionary-settings/api/settings.api';
import type { SettingsFamilyLocalizedText } from '@/domains/config-dictionary-settings/screens/settings-family.copy';

type SettingsText = (
  valueOrEn: string | SettingsFamilyLocalizedText,
  zh?: string,
  ja?: string
) => string;

export interface TenantTurnstileDraft {
  siteKey: string;
  secretKey: string;
  secretKeyMutation: TenantTurnstileSecretMutation;
  confirmClear: boolean;
}

export interface TurnstileSettingsFieldsProps {
  draft: TenantTurnstileDraft;
  response: TenantTurnstileSettingsResponse;
  isSaving: boolean;
  error: string | null;
  success: string | null;
  text: SettingsText;
  onDraftChange: (draft: TenantTurnstileDraft) => void;
  onSave: () => void;
}

export function buildTenantTurnstileDraft(
  response: TenantTurnstileSettingsResponse | null
): TenantTurnstileDraft {
  return {
    siteKey: response?.siteKey ?? '',
    secretKey: '',
    secretKeyMutation: 'keep',
    confirmClear: false,
  };
}

function statusLabel(response: TenantTurnstileSettingsResponse, text: SettingsText) {
  if (response.runtimeBypass) {
    return text('Development/test bypass', '开发/测试环境旁路', '開発/テスト環境バイパス');
  }

  return response.ready
    ? text('Ready', '已就绪', '準備完了')
    : text('Unavailable', '不可用', '利用不可');
}

function sourceLabel(response: TenantTurnstileSettingsResponse, text: SettingsText) {
  if (response.source === 'tenant') {
    return text('Tenant keys', '租户密钥', 'テナントキー');
  }

  if (response.source === 'environment') {
    return text('Platform fallback', '平台环境兜底', 'プラットフォーム既定値');
  }

  return text('Not configured', '未配置', '未設定');
}

function boolStatus(value: boolean, text: SettingsText) {
  return value ? text('Configured', '已配置', '設定済み') : text('Missing', '缺失', '未設定');
}

export function TurnstileSettingsFields({
  draft,
  error,
  isSaving,
  response,
  success,
  text,
  onDraftChange,
  onSave,
}: Readonly<TurnstileSettingsFieldsProps>) {
  const clearRequiresConfirmation = draft.secretKeyMutation === 'clear' && !draft.confirmClear;
  const replaceRequiresSecret = draft.secretKeyMutation === 'replace' && !draft.secretKey.trim();
  const canSave = !isSaving && !clearRequiresConfirmation && !replaceRequiresSecret;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3">
          <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
            {text('Readiness', '就绪状态', '準備状況')}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-950">{statusLabel(response, text)}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {response.runtimeBypass
              ? text(
                  'Server-side bypass is active in development/test.',
                  '开发/测试环境正在使用服务端旁路。',
                  '開発/テスト環境ではサーバー側バイパスが有効です。'
                )
              : text(
                  'Staging and production require both keys when CAPTCHA is required.',
                  '预发和生产环境要求 Site Key 与 Secret Key 同时完整。',
                  'ステージングと本番では両方のキーが必要です。'
                )}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3">
          <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
            {text('Source', '来源', 'ソース')}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-950">{sourceLabel(response, text)}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {text(
              'Tenant keys take priority over platform fallback.',
              '租户密钥优先于平台环境兜底。',
              'テナントキーが優先されます。'
            )}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3">
          <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
            {text('Key status', '密钥状态', 'キー状態')}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-950">
            {text('Site Key', 'Site Key', 'Site Key')}:{' '}
            {boolStatus(response.siteKeyConfigured, text)}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-950">
            {text('Secret Key', 'Secret Key', 'Secret Key')}:{' '}
            {boolStatus(response.secretKeyConfigured, text)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-900">
            Cloudflare Turnstile Site Key
          </span>
          <input
            aria-label="Cloudflare Turnstile Site Key"
            value={draft.siteKey}
            onChange={(event) => onDraftChange({ ...draft, siteKey: event.target.value })}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
            placeholder="0x4AAAAAA..."
          />
          <p className="text-xs leading-5 text-slate-500">
            {text(
              'Public browser key. Leave empty to clear the tenant-owned Site Key.',
              '公开浏览器密钥；留空会清除租户自有 Site Key。',
              '公開ブラウザーキー。空にするとテナントの Site Key を消去します。'
            )}
          </p>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-900">
            Cloudflare Turnstile Secret Key
          </span>
          <input
            aria-label="Cloudflare Turnstile Secret Key"
            value={draft.secretKey}
            onChange={(event) =>
              onDraftChange({
                ...draft,
                secretKey: event.target.value,
                secretKeyMutation: event.target.value.trim() ? 'replace' : draft.secretKeyMutation,
                confirmClear: false,
              })
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
            placeholder={
              response.secretKeyMasked ??
              text('Paste a new secret key', '粘贴新的 Secret Key', '新しい Secret Key を貼り付け')
            }
            type="password"
          />
          <p className="text-xs leading-5 text-slate-500">
            {text(
              'Existing secrets are never revealed. Enter a value only when replacing it.',
              '已有 Secret Key 不会回显；只有需要替换时才输入新值。',
              '既存の Secret Key は表示しません。置換時のみ入力します。'
            )}
          </p>
        </label>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() =>
              onDraftChange({
                ...draft,
                secretKey: '',
                secretKeyMutation: 'keep',
                confirmClear: false,
              })
            }
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              draft.secretKeyMutation === 'keep'
                ? 'bg-slate-950 text-white'
                : 'border border-slate-300 bg-white text-slate-700'
            }`}
          >
            {text('Keep secret', '保留 Secret Key', 'Secret Key を保持')}
          </button>
          <button
            type="button"
            onClick={() =>
              onDraftChange({ ...draft, secretKeyMutation: 'replace', confirmClear: false })
            }
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              draft.secretKeyMutation === 'replace'
                ? 'bg-slate-950 text-white'
                : 'border border-slate-300 bg-white text-slate-700'
            }`}
          >
            {text('Replace secret', '替换 Secret Key', 'Secret Key を置換')}
          </button>
          <button
            type="button"
            onClick={() =>
              onDraftChange({
                ...draft,
                secretKey: '',
                secretKeyMutation: 'clear',
                confirmClear: false,
              })
            }
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              draft.secretKeyMutation === 'clear'
                ? 'bg-red-700 text-white'
                : 'border border-red-200 bg-white text-red-700'
            }`}
          >
            {text('Clear secret', '清除 Secret Key', 'Secret Key を削除')}
          </button>
        </div>
        {draft.secretKeyMutation === 'clear' ? (
          <label className="mt-3 flex items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={draft.confirmClear}
              onChange={(event) => onDraftChange({ ...draft, confirmClear: event.target.checked })}
              className="mt-1 h-4 w-4 rounded border-slate-300"
            />
            <span>
              {text(
                'I understand that staging and production will be unavailable for required CAPTCHA until a Secret Key is configured.',
                '我确认：清除后，在重新配置 Secret Key 前，预发和生产环境中需要验证码的公开提交会不可用。',
                'Secret Key を再設定するまで、ステージングと本番で CAPTCHA 必須の公開送信が利用不可になることを理解しました。'
              )}
            </span>
          </label>
        ) : null}
      </div>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
      {success ? <p className="text-sm font-medium text-emerald-700">{success}</p> : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving
            ? text('Saving Turnstile settings', '正在保存 Turnstile 设置', 'Turnstile 設定を保存中')
            : text('Save Turnstile settings', '保存 Turnstile 设置', 'Turnstile 設定を保存')}
        </button>
      </div>
    </div>
  );
}
