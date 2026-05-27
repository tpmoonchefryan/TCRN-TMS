import type { BrowserSession } from '@/platform/runtime/session/session-provider';

import type { TalentWorkspaceSection } from './workspace-paths';

export type RoutedCapabilityCode =
  | 'public_presence.homepage'
  | 'marshmallow.mailbox'
  | 'reports.mfr'
  | 'integration.webhooks'
  | 'observability.product_audit';

export const TALENT_SECTION_CAPABILITY: Partial<
  Record<TalentWorkspaceSection, RoutedCapabilityCode>
> = {
  homepage: 'public_presence.homepage',
  marshmallow: 'marshmallow.mailbox',
  reports: 'reports.mfr',
};

export function getTenantGovernancePathCapability(pathname: string): RoutedCapabilityCode | null {
  if (pathname.includes('/interface-management') || pathname.includes('/webhook-management')) {
    return 'integration.webhooks';
  }

  if (pathname.includes('/observability')) {
    return 'observability.product_audit';
  }

  return null;
}

export function isSessionCapabilityEnabled(
  session: BrowserSession,
  capabilityCode: RoutedCapabilityCode | null | undefined
) {
  if (!capabilityCode) {
    return true;
  }

  return session.capabilities?.enabledCapabilityCodes.includes(capabilityCode) === true;
}

export function isCapabilityCodeEnabled(
  enabledCapabilityCodes: readonly string[] | null | undefined,
  capabilityCode: RoutedCapabilityCode | null | undefined
) {
  if (!capabilityCode) {
    return true;
  }

  return enabledCapabilityCodes?.includes(capabilityCode) === true;
}
