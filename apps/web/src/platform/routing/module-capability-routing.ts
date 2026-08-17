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

/**
 * Paths whose capability requirement does not live under the tenant workspace.
 *
 * TCRN-TMS-INC-002. The public-presence editor moved to `/studio` and to
 * `/homepage-editor`, and the capability check kept matching on the tenant
 * workspace's own path shapes. The deeper finding is that those two trees carry
 * no `layout.tsx` at all, so they left every gate behind rather than just this
 * one — see `RouteAccessGate`, which is what now mounts over them.
 *
 * Listing the prefixes here rather than burying them in the conditional is what
 * lets `route-authorization.spec.ts` compare this against the route roster: a
 * route the roster marks capability-gated whose path this cannot resolve is a red
 * test rather than a page that opens.
 */
export const CAPABILITY_PATH_PREFIXES: ReadonlyArray<{
  readonly prefix: string;
  readonly capability: RoutedCapabilityCode;
}> = Object.freeze([
  { prefix: '/studio/public-presence', capability: 'public_presence.homepage' },
  { prefix: '/homepage-editor', capability: 'public_presence.homepage' },
]);

/** `/tenant/<id>/...` — the paths whose shell consults this resolver. */
const TENANT_WORKSPACE_PATH = /^\/tenant\/[^/]+(?:\/|$)/u;

/**
 * The capability a talent workspace section needs, read off the path.
 *
 * Derived from `TALENT_SECTION_CAPABILITY` rather than restating its three
 * entries as substring tests. A second copy of that mapping would be a roster
 * duplicating membership with nothing comparing the two — the platform's class F
 * — and it would drift the first time a section is added.
 */
function talentSectionCapability(pathname: string): RoutedCapabilityCode | null {
  const section = /\/talent\/[^/]+\/([^/]+)/u.exec(pathname)?.[1];
  if (!section) {
    return null;
  }

  return TALENT_SECTION_CAPABILITY[section as TalentWorkspaceSection] ?? null;
}

export function getTenantGovernancePathCapability(pathname: string): RoutedCapabilityCode | null {
  for (const entry of CAPABILITY_PATH_PREFIXES) {
    if (pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`)) {
      return entry.capability;
    }
  }

  // The admin console runs under `AcShell`, which performs its own tier check and
  // never calls this. Answering for `/ac/...` here would have this function assert
  // a gate that nothing applies — the same false-coverage shape as the substring
  // match that missed `/studio`, pointed the other way.
  if (!TENANT_WORKSPACE_PATH.test(pathname)) {
    return null;
  }

  const talent = talentSectionCapability(pathname);
  if (talent) {
    return talent;
  }

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
