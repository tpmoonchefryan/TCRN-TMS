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
// What this file does NOT do: decide who may see what. The per-route RBAC semantics
// are the product's to state, and the incident reserves them. What it does is make
// the classification mandatory, exhaustive and checkable, so that when those
// semantics arrive there is one place to put them and nothing can quietly skip it.

/** How a route is protected. Every route gets exactly one. */
export type RouteAccessClass =
  /** Reachable without a session, by design. Sign-in, public talent pages. */
  | "public"
  /** Any authenticated identity. No further check. */
  | "authenticated"
  /** Requires a permission the product must still name (INIT-002). */
  | "permission-required"
  /** Requires a tenant capability to be enabled. */
  | "capability-required";

export interface RouteAccessRule {
  /** Route path as Next.js declares it, without the `src/app` prefix or `/page.tsx`. */
  readonly route: string;
  readonly access: RouteAccessClass;
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

  { route: "/homepage-editor/[tenantId]/[talentId]", access: "capability-required" },
  { route: "/homepage-editor/[tenantId]/[talentId]/preview", access: "capability-required" },

  // The incident names these: the capability gate was pinned to paths starting
  // `^/tenant/`, so redirecting the editor here stopped it applying.
  { route: "/studio/public-presence/[tenantId]/[talentId]", access: "capability-required" },
  { route: "/studio/public-presence/[tenantId]/[talentId]/preview", access: "capability-required" },
  { route: "/studio/public-presence/[tenantId]/assets/component/[assetId]", access: "capability-required" },
  { route: "/studio/public-presence/[tenantId]/assets/template/[assetId]", access: "capability-required" },

  { route: "/tenant/[tenantId]", access: "permission-required" },
  { route: "/tenant/[tenantId]/business", access: "permission-required" },
  { route: "/tenant/[tenantId]/integration-management", access: "permission-required" },
  { route: "/tenant/[tenantId]/interface-management", access: "permission-required" },
  { route: "/tenant/[tenantId]/interface-management/adapters/new", access: "permission-required" },
  { route: "/tenant/[tenantId]/observability", access: "permission-required" },
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
  { route: "/tenant/[tenantId]/talent/[talentId]/homepage", access: "capability-required" },
  { route: "/tenant/[tenantId]/talent/[talentId]/homepage/editor", access: "capability-required" },
  { route: "/tenant/[tenantId]/talent/[talentId]/homepage/editor/preview", access: "capability-required" },
  { route: "/tenant/[tenantId]/talent/[talentId]/marshmallow", access: "permission-required" },
  { route: "/tenant/[tenantId]/talent/[talentId]/reports", access: "permission-required" },
  { route: "/tenant/[tenantId]/talent/[talentId]/settings", access: "permission-required" },
  { route: "/tenant/[tenantId]/user-management", access: "permission-required" },
  { route: "/tenant/[tenantId]/user-management/[systemUserId]", access: "permission-required" },
  { route: "/tenant/[tenantId]/user-management/new", access: "permission-required" },
  { route: "/tenant/[tenantId]/user-management/roles", access: "permission-required" },
  { route: "/tenant/[tenantId]/user-management/roles/[roleId]", access: "permission-required" },
  { route: "/tenant/[tenantId]/user-management/roles/new", access: "permission-required" },
  { route: "/tenant/[tenantId]/webhook-management", access: "permission-required" },
]);

const BY_ROUTE = new Map(ROUTE_ACCESS_RULES.map((rule) => [rule.route, rule]));

/**
 * The decision for one route.
 *
 * An unknown route is refused. That is the whole inversion: the API guard let a
 * handler through when it declared nothing, and this returns `deny` when the roster
 * says nothing. A new page is therefore unreachable until someone classifies it,
 * which is a build-time conversation rather than a production exposure.
 */
export function resolveRouteAccess(route: string): RouteAccessClass | "deny" {
  return BY_ROUTE.get(route)?.access ?? "deny";
}

/** Routes reachable without a session. Kept derived so the two cannot disagree. */
export function publicRoutes(): readonly string[] {
  return ROUTE_ACCESS_RULES.filter((rule) => rule.access === "public").map((rule) => rule.route);
}
