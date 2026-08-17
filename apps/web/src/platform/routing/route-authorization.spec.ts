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

import {
  ROUTE_ACCESS_RULES,
  publicRoutes,
  resolveRouteAccess,
  type RouteAccessRule,
} from "./route-authorization";

const APP_ROOT = path.resolve(__dirname, "../../app");

/** Every `page.tsx` under src/app, as the route string the roster uses. */
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

  it("classifies the routes the incident named as capability-gated", () => {
    // The capability gate was pinned to paths starting `^/tenant/`, so redirecting the
    // editor to /studio stopped it applying. Both spellings are now in one table, which
    // is what makes that class of drift visible rather than silent.
    for (const route of [
      "/tenant/[tenantId]/talent/[talentId]/homepage/editor",
      "/studio/public-presence/[tenantId]/[talentId]",
    ]) {
      expect(resolveRouteAccess(route)).toBe("capability-required");
    }
  });

  it("gives each route exactly one class", () => {
    const seen = new Map<string, RouteAccessRule>();
    for (const rule of ROUTE_ACCESS_RULES) {
      expect(seen.has(rule.route), `${rule.route} is classified twice`).toBe(false);
      seen.set(rule.route, rule);
    }
  });
});
