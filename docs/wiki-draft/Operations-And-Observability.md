# Operations And Observability

Operations pages include runtime flags, observability, system dictionary, and platform tool connection surfaces.

## Current Caveat

Runtime Flags and Observability should be described as current visible surfaces where hidden 403 or unavailable states remain. System Dictionary maintenance procedures are excluded until bounded proof or owner disposition exists.

## Best Practice Summary

Use observability first, then controlled runtime changes. Runtime flags need a clear affected scope and rollback path. System Dictionary maintenance should be governed and proof-backed.

Example: if public pages fail after a release, use observability to classify whether the issue is route-specific, tenant-specific, or platform-wide before changing runtime flags.

Detailed guide: [Operations](../user-guide/operations/README.md).
