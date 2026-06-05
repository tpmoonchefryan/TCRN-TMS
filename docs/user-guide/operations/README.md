# Operations

Operations covers runtime flags, observability, system dictionary, and platform tool connection surfaces.

## Runtime Flags

Runtime flags expose operational switch state. Use them as a visible management surface, but avoid claiming that every flag mutation is fully validated unless there is current proof for the exact environment.

## Observability

Observability pages can show logs, metrics, status, and diagnostic views. Current audit findings require current-state wording where hidden 403 or unavailable states remain.

## System Dictionary

System Dictionary surfaces can be operationally sensitive. This guide does not promote destructive or maintenance procedures until bounded proof and owner disposition exist.

## Current Limitations

- Observability and Runtime Flags are not accepted as clean while hidden 403 or unavailable states remain.
- System Dictionary maintenance procedures are excluded pending bounded proof or owner disposition.
- Operational pages should not be documented as stable if route-specific hidden failures remain open.

Related gap IDs: `GAP-P2-AC-OPS-001`, `GAP-P2-AC-OPS-003`.

