// SPDX-License-Identifier: Apache-2.0
// TCRN-TMS-INC-002 — the roster is checked against the routes, both directions.
//
// A table of routes kept beside a directory of routes is two rosters, and two
// rosters drift. This reads `src/app` and holds the table to it, so the failure
// mode the table exists to prevent — a page shipped without a classification —
// cannot be reached by forgetting.

import { readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getTenantGovernancePathCapability } from "./module-capability-routing";
import {
  matchRouteRule,
  publicRoutes,
  resolveRouteAccess,
  resolveRouteCapability,
  ROUTE_ACCESS_RULES,
  type RouteAccessRule,
} from "./route-authorization";

const APP_ROOT = path.resolve(__dirname, "../../app");

/** Every `page.tsx` under src/app, as the route string the roster uses. */
/**
 * Routes with no `layout.tsx` anywhere between them and the root.
 *
 * This is the check that would have caught the incident at the commit that caused
 * it. `/studio` and `/homepage-editor` were added as bare page trees, and because
 * nothing looked at layouts, eight pages shipped with no session check and no
 * capability check while every review read them as "inside the app".
 */
function routesWithNoShell(root: string = APP_ROOT): string[] {
  const found: string[] = [];
  const walk = (directory: string, prefix: string, shelteredAbove: boolean) => {
    const entries = readdirSync(directory, { withFileTypes: true });
    // The root layout mounts providers, not a gate, so it shelters nothing. Every
    // layout below it does.
    const sheltered =
      shelteredAbove ||
      (directory !== root && entries.some((entry) => entry.name === "layout.tsx"));
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const segment = entry.name.startsWith("(") ? "" : `/${entry.name}`;
        walk(path.join(directory, entry.name), `${prefix}${segment}`, sheltered);
        continue;
      }
      if (entry.name === "page.tsx" && !sheltered) found.push(prefix === "" ? "/" : prefix);
    }
  };
  // The root layout itself shelters nothing — it mounts providers, not a gate.
  walk(root, "", false);
  return found.sort();
}

function routesOnDisk(root: string = APP_ROOT): string[] {
  const found: string[] = [];
  const walk = (directory: string, prefix: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const next = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        // Route groups `(name)` do not appear in the URL.
        const segment = entry.name.startsWith("(") ? "" : `/${entry.name}`;
        walk(next, `${prefix}${segment}`);
        continue;
      }
      if (entry.name === "page.tsx") found.push(prefix === "" ? "/" : prefix);
    }
  };
  walk(root, "");
  return found.sort();
}

describe("route authorization roster", () => {
  const onDisk = routesOnDisk();

  it("covers every page route that exists", () => {
    const classified = new Set(ROUTE_ACCESS_RULES.map((rule) => rule.route));
    const unclassified = onDisk.filter((route) => !classified.has(route));

    // This is the check that fires when someone adds a page. Until they classify it,
    // resolveRouteAccess returns "deny" — the page is unreachable rather than public,
    // which is the inversion this whole file exists for.
    expect(unclassified).toEqual([]);
  });

  it("names no route that has stopped existing", () => {
    const present = new Set(onDisk);
    const stale = ROUTE_ACCESS_RULES.filter((rule) => !present.has(rule.route)).map((rule) => rule.route);

    // A roster claiming coverage of a deleted route inflates its own completeness.
    expect(stale).toEqual([]);
  });

  it("refuses a route it has never heard of", () => {
    expect(resolveRouteAccess("/tenant/[tenantId]/something-new")).toBe("deny");
    expect(resolveRouteAccess("")).toBe("deny");
    // The API-side guard returned true when a handler declared nothing, and that is
    // exactly how sixty-five routes became reachable. Absence means refusal here.
    expect(resolveRouteAccess("/an/unclassified/page")).toBe("deny");
  });

  it("makes every let-through argue for itself", () => {
    const permissive = ROUTE_ACCESS_RULES.filter(
      (rule) => rule.access === "public" || rule.access === "authenticated"
    );

    for (const rule of permissive) {
      // `permission-required` needs no note: it withholds. The two classes that let
      // someone through are the ones a reader must be able to challenge, so each
      // carries its reason rather than leaving it to be inferred from silence.
      expect(rule.note, `${rule.route} lets a reader through without saying why`).toBeTruthy();
      expect((rule.note ?? "").length).toBeGreaterThan(20);
    }
  });

  it("keeps the public surface small and deliberate", () => {
    const publicSurface = publicRoutes();

    // Not a cap for its own sake: this number is the count someone has to change on
    // purpose, and changing it is the moment to ask whether the new page really is
    // reachable without a session.
    expect(publicSurface).toHaveLength(7);
    expect(publicSurface).toContain("/login");
    expect(publicSurface).not.toContain("/tenant/[tenantId]");
  });


  it("the roster and the capability resolver agree, in both directions", () => {
    // Two structures that agree in prose and disagree in code is the incident itself.
    // Comparing them here is cheap; discovering the disagreement as an open page is
    // not. Both directions matter: a route the table gates that the resolver ignores
    // is a page that opens, and a route the resolver gates that the table does not is
    // someone locked out of a page the table says they may reach.
    const disagreements = ROUTE_ACCESS_RULES.filter(
      (rule) => (rule.capability ?? null) !== getTenantGovernancePathCapability(rule.route)
    ).map((rule) => ({
      route: rule.route,
      table: rule.capability ?? null,
      resolver: getTenantGovernancePathCapability(rule.route),
    }));

    expect(disagreements).toEqual([]);
  });

  it("claims no capability for the admin console, which does not consult the resolver", () => {
    // `AcShell` performs its own tenant-tier check and never calls the resolver, so a
    // capability recorded against an `/ac/...` route would be a gate stated in the
    // table that nothing applies — false coverage, which is worse than none because
    // it stops anyone looking.
    const acClaims = ROUTE_ACCESS_RULES.filter(
      (rule) => rule.route.startsWith("/ac/") && rule.capability
    ).map((rule) => rule.route);

    expect(acClaims).toEqual([]);
  });

  it("the eight routes that had no layout above them are gated", () => {
    // The finding under the reported one: `/studio` and `/homepage-editor` carried no
    // `layout.tsx` at all, so those pages had no session check and no capability check
    // — not a gate that failed to match, a shell that was never mounted.
    for (const route of [
      "/studio/public-presence/[tenantId]/[talentId]",
      "/homepage-editor/[tenantId]/[talentId]",
      "/tenant/[tenantId]/talent/[talentId]/homepage/editor",
    ]) {
      expect(resolveRouteAccess(route)).toBe("permission-required");
      expect(resolveRouteCapability(route)).toBe("public_presence.homepage");
    }
  });

  it("a route with no shell above it is public, or it is not reachable at all", () => {
    // The invariant that makes the repair structural rather than remembered. A page
    // tree with no layout has no gate mounted over it, whatever the roster says about
    // it — so the only classification that can honestly appear here is `public`.
    const unshielded = routesWithNoShell();
    const nonPublic = unshielded.filter((route) => resolveRouteAccess(route) !== "public");

    expect(nonPublic).toEqual([]);
    // And the converse, so this cannot pass by the tree being empty: the shell-less
    // set is exactly the public surface.
    expect(unshielded).toEqual([...publicRoutes()].sort());
  });

  it("gives each route exactly one class", () => {
    const seen = new Map<string, RouteAccessRule>();
    for (const rule of ROUTE_ACCESS_RULES) {
      expect(seen.has(rule.route), `${rule.route} is classified twice`).toBe(false);
      seen.set(rule.route, rule);
    }
  });
});

describe("matching a concrete URL against the roster", () => {
  // Until this existed the table could only be read by a test. The gate reads it at
  // request time, which is the whole difference between classifying a route and
  // refusing one.

  it("finds the rule behind a real path and hands back its params", () => {
    const match = matchRouteRule("/tenant/t-42/talent/tal-7/homepage/editor");

    expect(match?.rule.capability).toBe("public_presence.homepage");
    expect(match?.params).toEqual({ tenantId: "t-42", talentId: "tal-7" });
  });

  it("returns null for a path nobody classified", () => {
    // `null` is what the gate turns into a refusal. A matcher that guessed here would
    // reinstate the exact defect: absence read as permission.
    expect(matchRouteRule("/tenant/t-1/something-invented")).toBeNull();
    expect(matchRouteRule("/admin")).toBeNull();
  });

  it("resolves overlaps the way Next.js does, literal before dynamic", () => {
    // `/p/a/homepage` matches both `/p/[...path]` and `/[tenantCode]/[talentCode]/homepage`.
    // A matcher that picked differently from the router would classify one route while
    // the reader is served another — and the classification would be of the wrong page.
    expect(matchRouteRule("/p/a/homepage")?.rule.route).toBe("/p/[...path]");
    expect(matchRouteRule("/acme/hoshino/homepage")?.rule.route).toBe(
      "/[tenantCode]/[talentCode]/homepage"
    );
  });

  it("a catch-all requires something to catch", () => {
    // `/p` alone is not `/p/[...path]`; treating it as a match would classify a bare
    // prefix as a published public page.
    expect(matchRouteRule("/p")).toBeNull();
    expect(matchRouteRule("/p/anything")?.rule.route).toBe("/p/[...path]");
  });

  it("ignores query and fragment, which are not part of the route", () => {
    expect(matchRouteRule("/tenant/t-1/settings?tab=security")?.rule.route).toBe(
      "/tenant/[tenantId]/settings"
    );
    expect(matchRouteRule("/tenant/t-1/settings#top")?.rule.route).toBe(
      "/tenant/[tenantId]/settings"
    );
  });

  it("does not let a longer path fall back to a shorter rule", () => {
    // `/tenant/t-1/settings/deep` is not `/tenant/[tenantId]/settings`. Prefix-matching
    // here would hand an unclassified page the classification of its parent.
    expect(matchRouteRule("/tenant/t-1/settings/deep")).toBeNull();
  });
});
