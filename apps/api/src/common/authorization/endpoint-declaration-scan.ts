// SPDX-License-Identifier: Apache-2.0
// TCRN-TMS-INC-001 — the declaration gap, measured and frozen.
//
// INC-001 repaired seven subsidiary endpoints that required a valid JWT and
// nothing else. The shape was `PermissionGuard` passing through when a handler
// declares no permission — absence read as permission. Repairing the seven left
// the shape intact everywhere else, and this is what everywhere else measures:
// 398 HTTP endpoints, 309 declaring a permission, 34 explicitly `@Public`, and
// FIFTY-FIVE declaring neither. Those fifty-five are reachable by any authenticated
// identity from any tenant, exactly as the seven were.
//
// This does not name their permissions. Which permission each endpoint needs is
// the product's to state (INIT-002 reserves it), and guessing would produce a
// matrix nobody has agreed to. What it does is make the omission impossible to
// repeat: the current fifty-five are a REGISTERED DEBT, named and counted, and a
// fifty-sixth reds the gate.
//
// Limit, stated rather than left to be discovered: this reads source text, so it
// proves which endpoints DECLARE something, not that the declaration reaches the
// guard at runtime. `subsidiary.authorization.spec.ts` proves the metadata path
// through `Reflect.getMetadata` for one controller; this proves coverage across
// all of them. Neither substitutes for the other.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const HTTP_METHOD = /@(Get|Post|Put|Patch|Delete)\(/u;

export type EndpointDeclaration = "permission" | "public" | "undeclared";

export interface EndpointRecord {
  /** `modules/auth/auth.controller.ts#logout` — path relative to `src`, then handler. */
  readonly id: string;
  readonly declaration: EndpointDeclaration;
}

/**
 * Endpoints that declared neither a permission nor `@Public` when the gate was
 * built, frozen on 2026-08-18.
 *
 * Removing a name from this list is how the repair reports progress: declare the
 * endpoint, delete its line, and the gate then refuses it coming back undeclared.
 * The list is version-controlled and the count is stated, which is the platform's
 * class A reference — change it and the gate goes red until someone states the new
 * number on purpose.
 *
 * Some of these will end up `@Public` rather than permission-bearing. `logout` and
 * `getMyPermissions` are scoped to the caller's own identity, and the app info
 * endpoint carries nothing. That is a real answer and marking it explicitly is the
 * point: what the gate refuses is silence, not permissiveness.
 */
export const REGISTERED_DECLARATION_DEBT: readonly string[] = Object.freeze([
  "app.controller.ts#getInfo",
  "modules/auth/auth.controller.ts#changePassword",
  "modules/auth/auth.controller.ts#completeSsoAccountLink",
  "modules/auth/auth.controller.ts#confirmEmailChange",
  "modules/auth/auth.controller.ts#deleteAvatar",
  "modules/auth/auth.controller.ts#disableTotp",
  "modules/auth/auth.controller.ts#enableTotp",
  "modules/auth/auth.controller.ts#getCurrentUser",
  "modules/auth/auth.controller.ts#getSessions",
  "modules/auth/auth.controller.ts#listSsoAccountLinkProviders",
  "modules/auth/auth.controller.ts#listSsoAccountLinks",
  "modules/auth/auth.controller.ts#logout",
  "modules/auth/auth.controller.ts#logoutAll",
  "modules/auth/auth.controller.ts#regenerateRecoveryCodes",
  "modules/auth/auth.controller.ts#requestEmailChange",
  "modules/auth/auth.controller.ts#revokeSession",
  "modules/auth/auth.controller.ts#revokeSsoAccountLink",
  "modules/auth/auth.controller.ts#setupTotp",
  "modules/auth/auth.controller.ts#startSsoAccountLink",
  "modules/auth/auth.controller.ts#updateCurrentUser",
  "modules/auth/auth.controller.ts#uploadAvatar",
  "modules/config/config.controller.ts#create",
  "modules/config/config.controller.ts#deactivate",
  "modules/config/config.controller.ts#disable",
  "modules/config/config.controller.ts#enable",
  "modules/config/config.controller.ts#getById",
  "modules/config/config.controller.ts#list",
  "modules/config/config.controller.ts#reactivate",
  "modules/config/config.controller.ts#update",
  "modules/config/global-config.controller.ts#get",
  "modules/config/global-config.controller.ts#list",
  "modules/config/global-config.controller.ts#set",
  "modules/dictionary/dictionary.controller.ts#createItem",
  "modules/dictionary/dictionary.controller.ts#createType",
  "modules/dictionary/dictionary.controller.ts#deactivateItem",
  "modules/dictionary/dictionary.controller.ts#getByType",
  "modules/dictionary/dictionary.controller.ts#getItem",
  "modules/dictionary/dictionary.controller.ts#listTypes",
  "modules/dictionary/dictionary.controller.ts#reactivateItem",
  "modules/dictionary/dictionary.controller.ts#updateItem",
  "modules/dictionary/dictionary.controller.ts#updateType",
  "modules/email/controllers/email-config.controller.ts#getConfig",
  "modules/email/controllers/email-config.controller.ts#saveConfig",
  "modules/email/controllers/email-config.controller.ts#sendTestEmail",
  "modules/email/controllers/email-config.controller.ts#testConnection",
  "modules/organization/organization.controller.ts#getByPath",
  "modules/organization/organization.controller.ts#getChildren",
  "modules/organization/organization.controller.ts#getRootNodes",
  "modules/organization/organization.controller.ts#getTree",
  "modules/permission/my-permissions.controller.ts#getMyPermissions",
  "modules/permission/permission.controller.ts#checkPermissions",
  "modules/permission/permission.controller.ts#getResources",
  "modules/permission/permission.controller.ts#list",
  "modules/security/controllers/security.controller.ts#getFingerprint",
  "modules/tenant/module-capability.controller.ts#getCurrentTenantEffectiveCapabilities",
]);

function controllerFiles(root: string): string[] {
  const found: string[] = [];
  const walk = (directory: string, prefix: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const next = join(directory, entry.name);
      const id = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
      if (entry.isDirectory()) {
        if (entry.name !== "__tests__") walk(next, id);
        continue;
      }
      if (entry.name.endsWith(".controller.ts") && !entry.name.includes(".spec.")) found.push(id);
    }
  };
  walk(root, "");
  return found.sort();
}

function classLevelDeclaration(lines: readonly string[]): { permission: boolean; public: boolean } {
  const classAt = lines.findIndex((line) => line.startsWith("export class"));
  if (classAt < 0) return { permission: false, public: false };
  const block: string[] = [];
  for (let index = classAt - 1; index >= 0 && block.length < 40; index -= 1) {
    const text = lines[index].trim();
    if (text === "" && block.length > 0) break;
    if (text === "") continue;
    block.push(lines[index]);
  }
  const text = block.join("\n");
  return { permission: text.includes("@RequirePermissions("), public: text.includes("@Public(") };
}

/**
 * Every HTTP endpoint in the API, with what it declares.
 *
 * The decorator block is read by balancing brackets rather than by looking back a
 * fixed number of lines. A fixed window is what the first draft of this used, and
 * it reported 364 undeclared endpoints against a tree that contains 309 literal
 * `@RequirePermissions` — `@ApiOperation` blocks spanning several lines pushed the
 * declaration out of the window. A measurement that disagrees with grep by an order
 * of magnitude is the measurement's fault.
 */
export function scanEndpoints(root: string, read = readFileSync): EndpointRecord[] {
  const records: EndpointRecord[] = [];

  for (const file of controllerFiles(root)) {
    const lines = String(read(join(root, file), "utf8")).split("\n");
    const atClass = classLevelDeclaration(lines);
    let block: string[] = [];
    let depth = 0;

    for (const line of lines) {
      const text = line.trim();
      if (depth > 0 || text.startsWith("@")) {
        block.push(line);
        depth += (line.match(/[([{]/gu)?.length ?? 0) - (line.match(/[)\]}]/gu)?.length ?? 0);
        if (depth < 0) depth = 0;
        continue;
      }
      if (block.length === 0) continue;
      // A comment between the decorators and the signature is not the signature. The
      // first draft named one endpoint after a stray `// Actually, keeping it generic
      // is fine.` — a roster entry that names nothing real cannot be burned down.
      if (text === "" || text.startsWith("//") || text.startsWith("/*") || text.startsWith("*")) continue;

      const joined = block.join("\n");
      block = [];
      if (!HTTP_METHOD.test(joined)) continue;

      const handler = text.replace(/^(?:public |private |protected |async )+/u, "").split("(")[0].trim();
      const declaresPermission = joined.includes("@RequirePermissions(") || atClass.permission;
      const declaresPublic = joined.includes("@Public(") || atClass.public;

      records.push({
        id: `${file}#${handler}`,
        declaration: declaresPermission ? "permission" : declaresPublic ? "public" : "undeclared",
      });
    }
  }

  return records;
}

export interface DeclarationJudgement {
  readonly schemaVersion: "tcrn.tms.endpoint-declaration-scan.v1";
  readonly ok: boolean;
  readonly reasonCode: "ENDPOINT_DECLARATION_HELD" | "ENDPOINT_DECLARATION_MISSING";
  readonly total: number;
  readonly declaringPermission: number;
  readonly declaringPublic: number;
  readonly registeredDebt: number;
  /** Undeclared endpoints that are not on the frozen list. These red the gate. */
  readonly admitted: readonly string[];
  /** Registered names that now declare something, or no longer exist. Reported, not red. */
  readonly settled: readonly string[];
}

export function judgeEndpointDeclarations(records: readonly EndpointRecord[]): DeclarationJudgement {
  const registered = new Set(REGISTERED_DECLARATION_DEBT);
  const undeclared = records.filter((record) => record.declaration === "undeclared").map((record) => record.id);
  const admitted = undeclared.filter((id) => !registered.has(id)).sort();
  // A name that stopped being undeclared but stayed on the list is progress that
  // went unrecorded. Not a failure, but it must be visible, or the debt count stops
  // meaning anything and the gate starts reporting a burn-down that never happened.
  const stillUndeclared = new Set(undeclared);
  const settled = [...registered].filter((id) => !stillUndeclared.has(id)).sort();

  return {
    schemaVersion: "tcrn.tms.endpoint-declaration-scan.v1",
    ok: admitted.length === 0,
    reasonCode: admitted.length === 0 ? "ENDPOINT_DECLARATION_HELD" : "ENDPOINT_DECLARATION_MISSING",
    total: records.length,
    declaringPermission: records.filter((record) => record.declaration === "permission").length,
    declaringPublic: records.filter((record) => record.declaration === "public").length,
    registeredDebt: REGISTERED_DECLARATION_DEBT.length,
    admitted,
    settled,
  };
}
