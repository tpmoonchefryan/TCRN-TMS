'use client';

import {
  RBAC_CANONICAL_ACTIONS,
  RBAC_MODULE_LABELS,
  RBAC_RESOURCES,
  type RbacRolePolicyEffect,
  type SupportedUiLocale,
} from '@tcrn/shared';

import {
  getLocalizedExplicitPermissionCountLabel,
  getLocalizedRbacActionLabel,
  getLocalizedRolePermissionOptionLabel,
  getLocalizedRoleResourceColumnLabel,
  pickLocalizedName,
} from './user-management.copy';
import { ToneBadge } from './user-management.shared';

export type RolePermissionSelection = RbacRolePolicyEffect | 'unset';

const ROLE_RESOURCE_GROUPS = Object.entries(RBAC_MODULE_LABELS)
  .map(([moduleCode, labels]) => ({
    moduleCode,
    labels,
    resources: RBAC_RESOURCES.filter((resource) => resource.module === moduleCode),
  }))
  .filter((group) => group.resources.length > 0);

export function RoleAdvancedPermissionMatrix({
  permissionStates,
  explicitPermissionCount,
  locale,
  readOnly,
  permissionStateHelpId,
  onPermissionStateChange,
}: Readonly<{
  permissionStates: Record<string, RolePermissionSelection>;
  explicitPermissionCount: number;
  locale: SupportedUiLocale;
  readOnly: boolean;
  permissionStateHelpId?: string;
  onPermissionStateChange: (permissionKey: string, value: RolePermissionSelection) => void;
}>) {
  return (
    <details className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <summary className="cursor-pointer text-sm font-semibold text-slate-900">
        Advanced resource/action matrix
      </summary>
      <div className="mt-4 space-y-4">
        <ToneBadge
          tone="info"
          label={getLocalizedExplicitPermissionCountLabel(explicitPermissionCount, locale)}
        />
        {ROLE_RESOURCE_GROUPS.map((group) => (
          <div
            key={group.moduleCode}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">{group.labels[locale]}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
                      {getLocalizedRoleResourceColumnLabel(locale)}
                    </th>
                    {RBAC_CANONICAL_ACTIONS.map((action) => (
                      <th
                        key={`${group.moduleCode}-${action}`}
                        className="px-4 py-3 text-left text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase"
                      >
                        {getLocalizedRbacActionLabel(action, locale)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {group.resources.map((resource) => (
                    <tr key={resource.code} className="border-t border-slate-200 align-top">
                      <th className="px-4 py-4 text-left">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-900">
                            {pickLocalizedName(resource, locale)}
                          </p>
                          <p className="text-xs tracking-[0.18em] text-slate-400 uppercase">
                            {resource.code}
                          </p>
                        </div>
                      </th>
                      {RBAC_CANONICAL_ACTIONS.map((action) => {
                        const permissionKey = `${resource.code}:${action}`;
                        const isSupported = resource.supportedActions.includes(action);

                        return (
                          <td key={permissionKey} className="px-4 py-4">
                            {isSupported ? (
                              <select
                                aria-label={`${pickLocalizedName(resource, locale)} ${getLocalizedRbacActionLabel(action, locale)}`}
                                aria-describedby={permissionStateHelpId}
                                value={permissionStates[permissionKey]}
                                disabled={readOnly}
                                onChange={(event) => {
                                  onPermissionStateChange(
                                    permissionKey,
                                    event.target.value as RolePermissionSelection
                                  );
                                }}
                                className="w-full min-w-[120px] rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
                              >
                                {(['unset', 'grant', 'deny'] as const).map((option) => (
                                  <option key={option} value={option}>
                                    {getLocalizedRolePermissionOptionLabel(option, locale)}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-xs text-slate-300">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}
