# Troubleshooting

This chapter maps common current-state failures to operator-safe responses.

## Triage Pattern

Use this order before escalating:

1. Identify the active scope: AC, tenant, subsidiary, talent, or public visitor.
2. Identify the action type: read, configure, publish, export, credential/security, or destructive.
3. Check whether the guide marks the feature as clean, blocker-aware, or excluded.
4. Capture route, viewport, user, workspace, and sanitized error state.
5. Continue with other feature checks if this issue blocks only one workflow.

## Hidden 403 Or Denied State

Symptom: a page appears navigable but internal content or API-backed data is denied.

Response:

- Confirm the active workspace and scope.
- Confirm the assigned roles and inherited scope.
- Do not document the route as permission-clean until the hidden denied state is fixed or rechecked.

## Page Error Or Redirect Error

Symptom: direct route entry, root redirect, wrong-tier route, or mobile redirect produces a page error.

Response:

- Re-enter through visible navigation.
- Capture the exact route, workspace, viewport, and user.
- Treat the failed route as unavailable until a source fix and recheck succeed.

## Mixed Form Surface

Symptom: a page or tab combines unrelated task families, such as profile metadata, role assignment, inheritance, expiry, and safety operations.

Response:

- Describe it as a current grouped editor.
- Prefer future UX that splits different form families into tabs, submenus, or action dialogs.
- Do not present the current grouping as the ideal workflow.

## Sensitive Mutation Not Proven

Symptom: a sensitive action is visible but not tested with bounded proof.

Response:

- Do not promote it into the guide as a normal procedure.
- Require source evidence, UI proof, cleanup/rollback evidence, and owner disposition before acceptance.

## Accessibility Proof Missing

Symptom: language metadata, landmarks, skip links, focus order, table/action names, or live status announcements are not proven.

Response:

- Avoid accessibility-ready claims.
- Record the page as current-state only.
- Recheck with a focused accessibility proof packet.

## Example Scenario

An operator can open a tenant integration route, but the table content does not load. Treat it as a possible hidden 403 or unavailable state, not as a completed integration workflow. Capture the tenant, route, viewport, and role; then check whether the same issue appears in AC integration readiness. Continue reviewing unrelated guide sections while the integration blocker is tracked.
