// SPDX-License-Identifier: Apache-2.0
// TCRN-TMS-INC-001 — the proposal is held to the debt, both directions.
//
// A proposal document kept beside a debt list is two rosters, and this same week
// the Design System had to be repaired because three copies of one roster drifted
// with nothing comparing them. So this compares them: a proposal for an endpoint
// that is not in debt, or a debt endpoint with no proposal, reds the gate.

import { describe, expect, it } from "vitest";

import { REGISTERED_DECLARATION_DEBT } from "./endpoint-declaration-scan";
import { contestedProposals,PERMISSION_PROPOSALS } from "./permission-proposal";

describe("per-endpoint permission proposal", () => {
  it("covers every endpoint in the registered debt, and only those", () => {
    const proposed = PERMISSION_PROPOSALS.map((entry) => entry.endpoint).sort();
    const owed = [...REGISTERED_DECLARATION_DEBT].sort();

    expect(proposed).toEqual(owed);
  });

  it("proposes each endpoint exactly once", () => {
    const seen = new Set<string>();
    for (const entry of PERMISSION_PROPOSALS) {
      expect(seen.has(entry.endpoint), `${entry.endpoint} proposed twice`).toBe(false);
      seen.add(entry.endpoint);
    }
  });

  it("gives every permission proposal a resource and an action", () => {
    // A `permission` kind with no resource is not a proposal, it is a placeholder —
    // and a placeholder in a review document reads as a decision nobody made.
    const incomplete = PERMISSION_PROPOSALS.filter(
      (entry) => entry.kind === "permission" && (!entry.resource || !entry.action)
    ).map((entry) => entry.endpoint);

    expect(incomplete).toEqual([]);
  });

  it("makes every proposal state its reason", () => {
    for (const entry of PERMISSION_PROPOSALS) {
      expect(entry.reason.length, `${entry.endpoint} proposes without a reason`).toBeGreaterThan(15);
    }
  });

  it("names the contested set rather than burying it", () => {
    // The review's whole value is spending attention where it is needed. These are
    // the endpoints where a defensible reading disagrees with the proposal, and they
    // are asserted by name so that quietly reclassifying one to make the list shorter
    // shows up as a test change rather than as a smaller number.
    expect(contestedProposals().map((entry) => entry.endpoint).sort()).toEqual([
      "modules/email/controllers/email-config.controller.ts#getConfig",
      "modules/email/controllers/email-config.controller.ts#saveConfig",
      "modules/email/controllers/email-config.controller.ts#sendTestEmail",
      "modules/email/controllers/email-config.controller.ts#testConnection",
      "modules/permission/permission.controller.ts#checkPermissions",
      "modules/security/controllers/security.controller.ts#getFingerprint",
      "modules/tenant/module-capability.controller.ts#getCurrentTenantEffectiveCapabilities",
    ]);
  });

  it("proposes no permission for an endpoint scoped to the caller's own identity", () => {
    // The auth surface is twenty-one endpoints acting on the caller's own record.
    // Binding them to a catalog resource would ask "may you edit users" where the
    // real question is "is this you" — and answering the wrong question with a
    // permission is how an authorization model starts lying.
    const selfScoped = PERMISSION_PROPOSALS.filter((entry) => entry.kind === "self-scoped");

    expect(selfScoped).toHaveLength(21);
    for (const entry of selfScoped) {
      expect(entry.resource).toBeUndefined();
      expect(entry.action).toBeUndefined();
    }
  });
});
