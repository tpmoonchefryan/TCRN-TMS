// SPDX-License-Identifier: Apache-2.0
// TCRN-TMS-INC-002 — the gate refuses, proved against the component.
//
// The incident's closure condition names a browser-level negative proof in three
// forms: a direct URL, a hidden nav link, and an unauthorized identity. The first
// was taken in the browser and recorded. The third needs per-route permission
// semantics that do not exist yet — INIT-002 reserves them for the product, and a
// test written against a guess would prove only that the guess matched itself.
//
// What CAN be proved now, and is, is the leg that depends on nothing undecided:
// an authenticated identity whose tenant does not have the module enabled is
// refused, and an unclassified route is refused before the session is even
// consulted. Both are the gate's own judgement rather than the product's.

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pathname = vi.hoisted(() => ({ current: '/' }));
const sessionState = vi.hoisted(() => ({
  current: { status: 'authenticated' as string, session: null as unknown },
}));
const recoverSession = vi.hoisted(() => vi.fn().mockResolvedValue(false));
const replace = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
  useRouter: () => ({ replace }),
}));

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({ ...sessionState.current, recoverSession }),
}));

vi.mock('@/platform/runtime/locale/locale-provider', () => ({
  useUiLocale: () => ({ locale: 'en' }),
}));

import { RouteAccessGate } from '../RouteAccessGate';

function sessionWith(capabilities: string[]) {
  return {
    tenantId: 't-1',
    tenantTier: 'standard',
    capabilities: { enabledCapabilityCodes: capabilities },
  };
}

const child = <p>editor body</p>;

describe('RouteAccessGate', () => {
  beforeEach(() => {
    replace.mockClear();
    recoverSession.mockClear();
    sessionState.current = { status: 'authenticated', session: sessionWith([]) };
  });

  it('refuses a route no roster classifies, without consulting the session', () => {
    // Order matters and is asserted by the session being signed in: if the session
    // check ran first, a page nobody classified would render for anyone who happens
    // to be authenticated — which is the defect this incident is about.
    pathname.current = '/studio/public-presence/t-1/tal-1/invented';
    sessionState.current = {
      status: 'authenticated',
      session: sessionWith(['public_presence.homepage']),
    };

    render(<RouteAccessGate>{child}</RouteAccessGate>);

    expect(screen.queryByText('editor body')).toBeNull();
    expect(screen.getByText('Page unavailable')).toBeTruthy();
  });

  it('refuses an authenticated identity whose tenant lacks the capability', () => {
    // The route the incident names. Signed in, on a classified route, and still
    // refused — the module is not switched on for this tenant.
    pathname.current = '/studio/public-presence/t-1/tal-1';

    render(<RouteAccessGate>{child}</RouteAccessGate>);

    expect(screen.queryByText('editor body')).toBeNull();
    expect(screen.getByText('Module not enabled')).toBeTruthy();
  });

  it('admits the same identity once the capability is enabled', () => {
    // The other half, so the refusal above is shown to depend on the capability
    // rather than on the gate refusing everything it is handed.
    pathname.current = '/studio/public-presence/t-1/tal-1';
    sessionState.current = {
      status: 'authenticated',
      session: sessionWith(['public_presence.homepage']),
    };

    render(<RouteAccessGate>{child}</RouteAccessGate>);

    expect(screen.getByText('editor body')).toBeTruthy();
  });

  it('sends an anonymous visitor to sign-in carrying the route it refused', () => {
    // `next` matters: without it the reader lands on the workspace root and has to
    // find their way back, which is how a redirect turns into a lost page.
    pathname.current = '/studio/public-presence/t-1/tal-1';
    sessionState.current = { status: 'anonymous', session: null };

    render(<RouteAccessGate>{child}</RouteAccessGate>);

    expect(screen.queryByText('editor body')).toBeNull();
    expect(recoverSession).toHaveBeenCalledWith({ tenantId: 't-1', tenantTier: 'standard' });
  });

  it('lets a public route through with no session at all', () => {
    // The converse of every refusal above: a gate that refused the published talent
    // pages would be refusing the readers those pages exist for.
    pathname.current = '/acme/hoshino/homepage';
    sessionState.current = { status: 'anonymous', session: null };

    render(<RouteAccessGate>{child}</RouteAccessGate>);

    expect(screen.getByText('editor body')).toBeTruthy();
    expect(recoverSession).not.toHaveBeenCalled();
  });
});
