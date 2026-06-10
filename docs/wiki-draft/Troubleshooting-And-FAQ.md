# Troubleshooting And FAQ

## What should I check first?

Confirm scope, action type, limitation status, route, viewport, user, and sanitized error state. If the issue blocks only one workflow, record it and continue reviewing unrelated feature areas.

## Best Practice Summary

Troubleshoot from the smallest responsible scope outward. Confirm the current user, tenant, subsidiary, talent, route, viewport, and action type before changing roles, runtime flags, integrations, or public content.

Example: if a talent manager cannot open a report, first verify the selected tenant and talent scope, then check whether the role is report-specific or tenant-wide. Escalate to tenant administration only after the scope and role assignment are confirmed.

## Why can I see a route but not its content?

This can be a hidden 403 or denied state. Confirm workspace, scope, and assigned roles. Do not treat the route as permission-clean until a source fix and recheck succeeds.

## Why does direct URL entry show an error?

Some root, wrong-tier, redirect, and mobile states can produce page errors. Re-enter through visible navigation and capture the exact route, viewport, user, and workspace.

## Can I document a visible sensitive action as supported?

Only after bounded proof exists. Sensitive account, tenant security, dictionary maintenance, adapter creation, and public visitor workflows are restricted when the guide marks them as current-state only or excluded.

Detailed guide: [Troubleshooting](../user-guide/troubleshooting/README.md).
