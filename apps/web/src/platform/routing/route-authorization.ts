// SPDX-License-Identifier: Apache-2.0
// TCRN-TMS-INC-002 / TCRN-TMS-INIT-002 — the route roster, deny-by-default.
//
// Sixty-six page routes and one of them carried a real authorization gate. The
// other sixty-five were reachable by typing the URL, and the navigation that hides
// them is not a gate: hiding a link removes the invitation, not the door.
//
// The shape that failed is worth naming because it is the same one the API side
// had (TCRN-TMS-INC-001): a guard that passes through when nothing is declared.
// Absence of a rule read as permission. So this roster inverts it — a route absent
// from the table is REFUSED, and adding a page without classifying it makes the
// gate red rather than making the page public.
//
// Two axes, not one. `access` is the identity question (may this person be here);
// `capability` is the tenant question (is this module switched on at all). The
// first draft of this file collapsed them into one class and the comparison test
// immediately showed why that was wrong: routes carrying a live capability gate
// were also permission-owed, and a single field forced one of the two facts to be
// dropped. A feature toggle standing in for an authorization check is precisely
// the substitution this incident is about.
//
// What this file does NOT do: decide who may see what. The per-route RBAC
// semantics are the product's to state, and the incident reserves them. What it
// does is make the classification mandatory, exhaustive, checkable, and — through
// `matchRouteRule` and `RouteAccessGate` — actually applied.

import {
  getTenantGovernancePathCapability,
  type RoutedCapabilityCode,
} from "./module-capability-routing";

/** How a route is protected on the identity axis. Every route gets exactly one. */
export type RouteAccessClass =
  /** Reachable without a session, by design. Sign-in, public talent pages. */
  | "public"
  /** Any authenticated identity. No further check. */
  | "authenticated"
  /** Requires a permission the product must still name (INIT-002). */
  | "permission-required";

export interface RouteAccessRule {
  /** Route path as Next.js declares it, without the `src/app` prefix or `/page.tsx`. */
  readonly route: string;
  readonly access: RouteAccessClass;
  /**
   * The tenant capability this route needs switched on, if any. Orthogonal to
   * `access`: a capability being enabled says the module exists for this tenant,
   * never that this reader may use it.
   *
   * Held equal to `getTenantGovernancePathCapability` in both directions by
   * `route-authorization.spec.ts`, so the table and the resolver cannot drift.
   */
  readonly capability?: RoutedCapabilityCode;
  /**
   * Why this class. Required for `public` and `authenticated`, because those are the
   * two that let someone through and a reader must be able to see the argument
   * rather than infer it from a missing entry.
   */
  readonly note?: string;
}

/**
 * Every page route in this application.
 *
 * Frozen against `src/app` by `route-authorization.spec.ts`: a page added without
 * an entry reds the gate, and an entry naming a route that no longer exists reds it
 * too. Both directions matter — a stale roster claiming to cover a deleted route is
 * how a table stops describing the thing it governs.
 *
 * Everything not demonstrably public is `permission-required` pending the product's
 * per-route semantics. That is deliberately the conservative default: an over-strict
 * classification shows up as someone unable to reach a page and gets fixed the same
 * day, while an over-permissive one shows up as nothing at all.
 */
export const ROUTE_ACCESS_RULES: readonly RouteAccessRule[] = Object.freeze([
  { route: "/", access: "public", note: "Root redirect; renders no tenant data." },
  { route: "/login", access: "public", note: "Sign-in. Refusing it would refuse everyone." },
  { route: "/login/sso/callback", access: "public", note: "Identity provider return leg; the session does not exist yet." },
  { route: "/m/[path]", access: "public", note: "Short-link resolver for talent-facing URLs." },
  { route: "/p/[...path]", access: "public", note: "Public presence pages, published for readers with no account." },
  { route: "/[tenantCode]/[talentCode]/homepage", access: "public", note: "Published talent homepage on the tenant's own domain." },
  { route: "/[tenantCode]/[talentCode]/marshmallow", access: "public", note: "Published talent inbox on the tenant's own domain." },

  // The admin console runs under `AcShell` with its own tenant-tier check and does
  // not consult the capability resolver, so no `capability` is claimed here. Saying
  // otherwise would put a gate in the table that nothing applies.
  { route: "/ac/[tenantId]", access: "permission-required" },
  { route: "/ac/[tenantId]/api-clients", access: "permission-required" },
  { route: "/ac/[tenantId]/api-gateway-readiness", access: "permission-required" },
  { route: "/ac/[tenantId]/api-registry", access: "permission-required" },
  { route: "/ac/[tenantId]/builder-registry", access: "permission-required" },
  { route: "/ac/[tenantId]/integration-management", access: "permission-required" },
  { route: "/ac/[tenantId]/interface-management", access: "permission-required" },
  { route: "/ac/[tenantId]/interface-management/adapters/new", access: "permission-required" },
  { route: "/ac/[tenantId]/observability", access: "permission-required" },
  { route: "/ac/[tenantId]/platform-tools", access: "permission-required" },
  { route: "/ac/[tenantId]/profile", access: "authenticated", note: "The signed-in identity's own profile; the subject is the reader." },
  { route: "/ac/[tenantId]/profile/security", access: "authenticated", note: "The signed-in identity's own credentials." },
  { route: "/ac/[tenantId]/runtime-flags", access: "permission-required" },
  { route: "/ac/[tenantId]/system-dictionary", access: "permission-required" },
  { route: "/ac/[tenantId]/tenants", access: "permission-required" },
  { route: "/ac/[tenantId]/tenants/[managedTenantId]", access: "permission-required" },
  { route: "/ac/[tenantId]/tenants/new", access: "permission-required" },
  { route: "/ac/[tenantId]/user-management", access: "permission-required" },
  { route: "/ac/[tenantId]/user-management/[systemUserId]", access: "permission-required" },
  { route: "/ac/[tenantId]/user-management/new", access: "permission-required" },
  { route: "/ac/[tenantId]/user-management/roles", access: "permission-required" },
  { route: "/ac/[tenantId]/user-management/roles/[roleId]", access: "permission-required" },
  { route: "/ac/[tenantId]/user-management/roles/new", access: "permission-required" },
  { route: "/ac/[tenantId]/webhook-management", access: "permission-required" },

  // These eight had no `layout.tsx` above them at all — not a gate that failed to
  // match, an entire shell that was never mounted. `RouteAccessGate` is what now
  // stands over them.
  { route: "/homepage-editor/[tenantId]/[talentId]", access: "permission-required", capability: "public_presence.homepage" },
  { route: "/homepage-editor/[tenantId]/[talentId]/preview", access: "permission-required", capability: "public_presence.homepage" },
  { route: "/studio/public-presence/[tenantId]/[talentId]", access: "permission-required", capability: "public_presence.homepage" },
  { route: "/studio/public-presence/[tenantId]/[talentId]/preview", access: "permission-required", capability: "public_presence.homepage" },
  { route: "/studio/public-presence/[tenantId]/assets/component/[assetId]", access: "permission-required", capability: "public_presence.homepage" },
  { route: "/studio/public-presence/[tenantId]/assets/template/[assetId]", access: "permission-required", capability: "public_presence.homepage" },

  { route: "/tenant/[tenantId]", access: "permission-required" },
  { route: "/tenant/[tenantId]/business", access: "permission-required" },
  { route: "/tenant/[tenantId]/integration-management", access: "permission-required" },
  { route: "/tenant/[tenantId]/interface-management", access: "permission-required", capability: "integration.webhooks" },
  { route: "/tenant/[tenantId]/interface-management/adapters/new", access: "permission-required", capability: "integration.webhooks" },
  { route: "/tenant/[tenantId]/observability", access: "permission-required", capability: "observability.product_audit" },
  { route: "/tenant/[tenantId]/organization-structure", access: "permission-required" },
  { route: "/tenant/[tenantId]/profile", access: "authenticated", note: "The signed-in identity's own profile." },
  { route: "/tenant/[tenantId]/profile/security", access: "authenticated", note: "The signed-in identity's own credentials." },
  { route: "/tenant/[tenantId]/security", access: "permission-required" },
  { route: "/tenant/[tenantId]/settings", access: "permission-required" },
  { route: "/tenant/[tenantId]/subsidiary/[subsidiaryId]/business", access: "permission-required" },
  { route: "/tenant/[tenantId]/subsidiary/[subsidiaryId]/settings", access: "permission-required" },
  { route: "/tenant/[tenantId]/talent/[talentId]", access: "permission-required" },
  { route: "/tenant/[tenantId]/talent/[talentId]/customers", access: "permission-required" },
  { route: "/tenant/[tenantId]/talent/[talentId]/customers/new", access: "permission-required" },
  { route: "/tenant/[tenantId]/talent/[talentId]/homepage", access: "permission-required", capability: "public_presence.homepage" },
  { route: "/tenant/[tenantId]/talent/[talentId]/homepage/editor", access: "permission-required", capability: "public_presence.homepage" },
  { route: "/tenant/[tenantId]/talent/[talentId]/homepage/editor/preview", access: "permission-required", capability: "public_presence.homepage" },
  { route: "/tenant/[tenantId]/talent/[talentId]/marshmallow", access: "permission-required", capability: "marshmallow.mailbox" },
  { route: "/tenant/[tenantId]/talent/[talentId]/reports", access: "permission-required", capability: "reports.mfr" },
  { route: "/tenant/[tenantId]/talent/[talentId]/settings", access: "permission-required" },
  { route: "/tenant/[tenantId]/user-management", access: "permission-required" },
  { route: "/tenant/[tenantId]/user-management/[systemUserId]", access: "permission-required" },
  { route: "/tenant/[tenantId]/user-management/new", access: "permission-required" },
  { route: "/tenant/[tenantId]/user-management/roles", access: "permission-required" },
  { route: "/tenant/[tenantId]/user-management/roles/[roleId]", access: "permission-required" },
  { route: "/tenant/[tenantId]/user-management/roles/new", access: "permission-required" },
  { route: "/tenant/[tenantId]/webhook-management", access: "permission-required", capability: "integration.webhooks" },
]);

const BY_ROUTE = new Map(ROUTE_ACCESS_RULES.map((rule) => [rule.route, rule]));

/**
 * The decision for one route, by its Next.js template string.
 *
 * An unknown route is refused. That is the whole inversion: the API guard let a
 * handler through when it declared nothing, and this returns `deny` when the roster
 * says nothing. A new page is therefore unreachable until someone classifies it,
 * which is a build-time conversation rather than a production exposure.
 */
export function resolveRouteAccess(route: string): RouteAccessClass | "deny" {
  return BY_ROUTE.get(route)?.access ?? "deny";
}

/** The capability a route needs, by its template string. */
export function resolveRouteCapability(route: string): RoutedCapabilityCode | null {
  return BY_ROUTE.get(route)?.capability ?? null;
}

/** Routes reachable without a session. Kept derived so the two cannot disagree. */
export function publicRoutes(): readonly string[] {
  return ROUTE_ACCESS_RULES.filter((rule) => rule.access === "public").map((rule) => rule.route);
}

function segmentsOf(route: string): string[] {
  return route.split("/").filter(Boolean);
}

/**
 * Segment specificity, compared position by position: literal beats single-dynamic
 * beats catch-all.
 *
 * This mirrors how Next.js itself picks between overlapping routes, and it has to,
 * because a matcher that disagreed with the router would classify one route while
 * the reader is served another. `/p/a/homepage` matches both `/p/[...path]` and
 * `/[tenantCode]/[talentCode]/homepage`; the literal `p` at position 0 settles it
 * the same way the router does.
 */
function specificityOf(pattern: readonly string[]): number[] {
  return pattern.map((segment) => (segment.startsWith("[...") ? 0 : segment.startsWith("[") ? 1 : 2));
}

function isMoreSpecific(a: readonly string[], b: readonly string[]): boolean {
  const left = specificityOf(a);
  const right = specificityOf(b);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const l = left[index] ?? -1;
    const r = right[index] ?? -1;
    if (l !== r) return l > r;
  }
  return false;
}

function patternMatches(pattern: readonly string[], actual: readonly string[]): boolean {
  for (let index = 0; index < pattern.length; index += 1) {
    const segment = pattern[index];
    // A catch-all consumes the rest, and requires at least one segment to consume.
    if (segment.startsWith("[...")) return actual.length > index;
    if (index >= actual.length) return false;
    if (segment.startsWith("[")) continue;
    if (segment !== actual[index]) return false;
  }
  return actual.length === pattern.length;
}

export interface RouteMatch {
  readonly rule: RouteAccessRule;
  /** Dynamic segment values, e.g. `{ tenantId: "t-1" }`. Catch-alls join with `/`. */
  readonly params: Readonly<Record<string, string>>;
}

/**
 * The rule governing a CONCRETE pathname, or `null` for a route nobody classified.
 *
 * This is what turns the roster from a description into a gate. Until it existed the
 * table could only be read by a test; `RouteAccessGate` reads it at request time, so
 * an unclassified page is now refused in the browser rather than merely reported as
 * unclassified by CI.
 */
export function matchRouteRule(pathname: string): RouteMatch | null {
  const actual = segmentsOf(pathname.split("?")[0].split("#")[0]);
  let best: RouteAccessRule | null = null;
  let bestPattern: string[] = [];

  for (const rule of ROUTE_ACCESS_RULES) {
    const pattern = segmentsOf(rule.route);
    if (!patternMatches(pattern, actual)) continue;
    if (!best || isMoreSpecific(pattern, bestPattern)) {
      best = rule;
      bestPattern = pattern;
    }
  }

  if (!best) return null;

  const params: Record<string, string> = {};
  bestPattern.forEach((segment, index) => {
    if (segment.startsWith("[...")) {
      params[segment.slice(4, -1)] = actual.slice(index).join("/");
      return;
    }
    if (segment.startsWith("[")) {
      params[segment.slice(1, -1)] = actual[index];
    }
  });

  return { rule: best, params };
}

/**
 * The capability the resolver would apply to a concrete path, for the gate to check.
 *
 * Deliberately delegated rather than read off the rule: the roster and the resolver
 * are held equal by test, and the running gate consults the same function the
 * existing shells do, so there is one behaviour rather than two that agree today.
 */
export function capabilityForPath(pathname: string): RoutedCapabilityCode | null {
  return getTenantGovernancePathCapability(pathname);
}
