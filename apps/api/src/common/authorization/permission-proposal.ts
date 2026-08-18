// SPDX-License-Identifier: Apache-2.0
// TCRN-TMS-INC-001 / TCRN-TMS-INIT-002 — a per-endpoint permission proposal, for
// the product to annotate line by line.
//
// The incident's last open leg is that the fifty-five undeclared endpoints each
// need a permission named, and naming them is the product's call. What an agent
// CAN do is stop the product from starting at a blank page: below is a proposal
// per endpoint, each carrying the reason it was chosen and how confident that
// choice is, with the genuinely contested ones marked so the review can spend its
// attention where the attention is needed.
//
// This is a PROPOSAL. Nothing here is enforced, and nothing here should be read as
// a decision. `endpoint-declaration-scan.ts` still holds the fifty-five as debt,
// and it will keep holding them until real decorators land.
//
// Held against the debt list by `permission-proposal.spec.ts` in both directions:
// a proposal for an endpoint that is not in debt, or a debt endpoint with no
// proposal, reds the gate. That is what stops this file from quietly describing a
// tree it no longer matches — the failure that made a three-way roster necessary
// to fix in the Design System this same week.

export type ProposalKind =
  /** Requires a catalog permission. `resource`/`action` name it. */
  | "permission"
  /** Reachable without a session by design. */
  | "public"
  /**
   * Authenticated, and scoped to the caller's own identity — the subject IS the
   * reader. No catalog permission fits, because the check is "is this your own
   * record", not "may you act on this resource".
   *
   * There is no decorator for this today, and that is the proposal's one
   * structural recommendation: introduce `@SelfScoped()` so these endpoints carry
   * an EXPLICIT declaration. Leaving them bare is what the incident is about —
   * PermissionGuard passing through on silence. An endpoint that says "self-scoped"
   * has been decided; an endpoint that says nothing has been forgotten, and no gate
   * can tell those two apart.
   */
  | "self-scoped";

export interface PermissionProposal {
  /** Matches an entry in REGISTERED_DECLARATION_DEBT exactly. */
  readonly endpoint: string;
  readonly kind: ProposalKind;
  readonly resource?: string;
  readonly action?: string;
  /** Why this, in one line. */
  readonly reason: string;
  /**
   * `high` — the catalog has an obvious single home and the verb is unambiguous.
   * `review` — a reasonable reading exists, but a different one is defensible.
   * `contested` — the product must decide; the proposal is a starting point only.
   */
  readonly confidence: "high" | "review" | "contested";
}

const selfScoped = (endpoint: string, reason: string): PermissionProposal =>
  ({ endpoint, kind: "self-scoped", reason, confidence: "high" });

const perm = (
  endpoint: string,
  resource: string,
  action: string,
  reason: string,
  confidence: PermissionProposal["confidence"] = "high"
): PermissionProposal => ({ endpoint, kind: "permission", resource, action, reason, confidence });

export const PERMISSION_PROPOSALS: readonly PermissionProposal[] = Object.freeze([
  { endpoint: "app.controller.ts#getInfo", kind: "public",
    reason: "Application info carries no tenant data; refusing it would refuse health checks.",
    confidence: "high" },

  // ---- auth: the caller acting on their own identity ----------------------------
  // Twenty endpoints, and none of them is a catalog resource. Every one reads or
  // writes the signed-in identity's own credentials, sessions, avatar or SSO links.
  // A permission would be the wrong shape: there is no "may you edit users" question
  // here, only "is this you".
  selfScoped("modules/auth/auth.controller.ts#changePassword", "Changes the password on the caller's own account."),
  selfScoped("modules/auth/auth.controller.ts#completeSsoAccountLink", "Completes a link for the caller's own identity."),
  selfScoped("modules/auth/auth.controller.ts#confirmEmailChange", "Confirms a change to the caller's own email."),
  selfScoped("modules/auth/auth.controller.ts#deleteAvatar", "Reads or removes the avatar attached to the caller's own account."),
  selfScoped("modules/auth/auth.controller.ts#disableTotp", "Manages the second factor on the caller's own account."),
  selfScoped("modules/auth/auth.controller.ts#enableTotp", "Manages the second factor on the caller's own account."),
  selfScoped("modules/auth/auth.controller.ts#getCurrentUser", "Reads or writes the caller's own profile record."),
  selfScoped("modules/auth/auth.controller.ts#getSessions", "Lists the sessions belonging to the caller's own account."),
  selfScoped("modules/auth/auth.controller.ts#listSsoAccountLinkProviders", "Lists the SSO providers linkable to the caller's own account."),
  selfScoped("modules/auth/auth.controller.ts#listSsoAccountLinks", "Lists the SSO links on the caller's own account."),
  selfScoped("modules/auth/auth.controller.ts#logout", "Ends the session the caller is currently holding."),
  selfScoped("modules/auth/auth.controller.ts#logoutAll", "Ends every session belonging to the caller's own account."),
  selfScoped("modules/auth/auth.controller.ts#regenerateRecoveryCodes", "Regenerates recovery codes for the caller's own account."),
  selfScoped("modules/auth/auth.controller.ts#requestEmailChange", "Requests a change to the caller's own account email."),
  selfScoped("modules/auth/auth.controller.ts#revokeSession", "Revokes one named session on the caller's own account."),
  selfScoped("modules/auth/auth.controller.ts#revokeSsoAccountLink", "Revokes an SSO link on the caller's own account."),
  selfScoped("modules/auth/auth.controller.ts#setupTotp", "Manages the second factor on the caller's own account."),
  selfScoped("modules/auth/auth.controller.ts#startSsoAccountLink", "Starts a link for the caller's own identity."),
  selfScoped("modules/auth/auth.controller.ts#updateCurrentUser", "Reads or writes the caller's own profile record."),
  selfScoped("modules/auth/auth.controller.ts#uploadAvatar", "Reads or removes the avatar attached to the caller's own account."),
  selfScoped("modules/permission/my-permissions.controller.ts#getMyPermissions",
    "Reports what the caller holds. Gating it behind a permission would need the answer to give the answer."),

  // ---- config: the catalog already separates dictionary from platform settings ---
  perm("modules/config/config.controller.ts#list", "config.dictionary", "read", "Lists tenant configuration entries; read of the dictionary surface."),
  perm("modules/config/config.controller.ts#getById", "config.dictionary", "read", "Reads one config entry by id; same surface as list, narrowed."),
  perm("modules/config/config.controller.ts#create", "config.dictionary", "write", "Creates a tenant configuration entry."),
  perm("modules/config/config.controller.ts#update", "config.dictionary", "write", "Edits a tenant configuration entry."),
  perm("modules/config/config.controller.ts#enable", "config.dictionary", "write", "State change is a write."),
  perm("modules/config/config.controller.ts#disable", "config.dictionary", "write", "State change is a write."),
  perm("modules/config/config.controller.ts#deactivate", "config.dictionary", "write", "State change is a write."),
  perm("modules/config/config.controller.ts#reactivate", "config.dictionary", "write", "State change is a write."),
  perm("modules/config/global-config.controller.ts#list", "config.platform_settings", "read",
    "Global scope, so platform settings rather than the tenant dictionary.", "review"),
  perm("modules/config/global-config.controller.ts#get", "config.platform_settings", "read",
    "Global scope, so platform settings rather than the tenant dictionary.", "review"),
  perm("modules/config/global-config.controller.ts#set", "config.platform_settings", "write",
    "Writes a global setting; contested only in whether this should require admin rather than write.", "review"),

  // ---- dictionary ---------------------------------------------------------------
  perm("modules/dictionary/dictionary.controller.ts#listTypes", "config.dictionary", "read", "Reads the dictionary type list, which is tenant configuration."),
  perm("modules/dictionary/dictionary.controller.ts#getByType", "config.dictionary", "read", "Reads the items belonging to one dictionary type."),
  perm("modules/dictionary/dictionary.controller.ts#getItem", "config.dictionary", "read", "Reads one dictionary item by id; same surface as getByType, narrowed."),
  perm("modules/dictionary/dictionary.controller.ts#createType", "config.dictionary", "write", "Creates a dictionary type; structural change to tenant configuration."),
  perm("modules/dictionary/dictionary.controller.ts#updateType", "config.dictionary", "write", "Edits a dictionary type; structural change to tenant configuration."),
  perm("modules/dictionary/dictionary.controller.ts#createItem", "config.dictionary", "write", "Creates a dictionary item under an existing type."),
  perm("modules/dictionary/dictionary.controller.ts#updateItem", "config.dictionary", "write", "Edits a dictionary item under an existing type."),
  perm("modules/dictionary/dictionary.controller.ts#deactivateItem", "config.dictionary", "write", "State change is a write."),
  perm("modules/dictionary/dictionary.controller.ts#reactivateItem", "config.dictionary", "write", "State change is a write."),

  // ---- email: the one catalog entry that does not fit its own shape -------------
  // `email.template` is declared with ['tenant','subsidiary','talent'] where every
  // other resource declares actions. Those look like SCOPES, not actions, so no
  // action name can be proposed honestly until the catalog entry is settled.
  perm("modules/email/controllers/email-config.controller.ts#getConfig", "email.template", "read",
    "Catalog entry declares scopes where others declare actions; the action name is a guess until that is fixed.", "contested"),
  perm("modules/email/controllers/email-config.controller.ts#saveConfig", "email.template", "write",
    "Same catalog defect; and saving SMTP credentials may warrant admin rather than write.", "contested"),
  perm("modules/email/controllers/email-config.controller.ts#testConnection", "email.template", "write",
    "Causes an outbound connection attempt — arguably execute, which this resource does not declare.", "contested"),
  perm("modules/email/controllers/email-config.controller.ts#sendTestEmail", "email.template", "write",
    "Sends real mail from tenant configuration. The most contested of the four: outward-facing side effect.", "contested"),

  // ---- organization: reads the subsidiary tree ---------------------------------
  perm("modules/organization/organization.controller.ts#getTree", "subsidiary", "read", "The organization tree is subsidiary data."),
  perm("modules/organization/organization.controller.ts#getRootNodes", "subsidiary", "read", "Reads the root nodes of the subsidiary tree."),
  perm("modules/organization/organization.controller.ts#getChildren", "subsidiary", "read", "Reads the child nodes under one subsidiary node."),
  perm("modules/organization/organization.controller.ts#getByPath", "subsidiary", "read", "Resolves one subsidiary node from its path segments."),

  // ---- permission / role -------------------------------------------------------
  perm("modules/permission/permission.controller.ts#list", "role", "read",
    "Lists the permission catalog. Contested: arguably harmless to any authenticated user, but it maps the attack surface.", "review"),
  perm("modules/permission/permission.controller.ts#getResources", "role", "read", "Lists permission resources; the same catalog surface as list."),
  perm("modules/permission/permission.controller.ts#checkPermissions", "role", "read",
    "Asks whether an identity holds permissions. Contested: for the CALLER's own identity this is self-scoped; for another identity it is a role read.", "contested"),

  // ---- security ----------------------------------------------------------------
  perm("modules/security/controllers/security.controller.ts#getFingerprint", "security.ip_rules", "read",
    "Device/IP fingerprint. Contested: it may be the caller's own, in which case self-scoped is the honest kind.", "contested"),

  // ---- tenant capability -------------------------------------------------------
  perm("modules/tenant/module-capability.controller.ts#getCurrentTenantEffectiveCapabilities", "settings", "read",
    "Which modules the caller's tenant has enabled. Contested: the web shell needs this on every page load, so gating it may lock the shell out of rendering.", "contested"),
]);

/** Endpoints the product must decide; the proposal is a starting point only. */
export function contestedProposals(): readonly PermissionProposal[] {
  return PERMISSION_PROPOSALS.filter((entry) => entry.confidence === "contested");
}
