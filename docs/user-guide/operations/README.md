# Operations

Operations covers runtime flags, observability, system dictionary, and platform tool connection surfaces.

## Runtime Flags

Runtime flags expose operational switch state. Use them as a visible management surface, but avoid claiming that every flag mutation is fully validated unless there is current proof for the exact environment.

## Observability

Observability pages can show logs, metrics, status, and diagnostic views for the accepted G09/G17 proof slices.

## System Dictionary

System Dictionary surfaces can be operationally sensitive. This guide does not promote destructive or maintenance procedures until bounded proof and owner disposition exist.

## Best Practice

Use operations pages for diagnosis and controlled change:

1. Start with observability to understand whether an issue is isolated or platform-wide.
2. Use runtime flags only when the intended behavior, rollback path, and affected scope are clear.
3. Treat System Dictionary changes as governed configuration, not casual content editing.
4. Capture sanitized evidence for incidents; do not store secrets, raw tokens, or customer-sensitive payloads in documentation.
5. After a change, recheck the affected tenant, talent, or public route rather than assuming global success.

## Example Scenario

If public pages become unavailable after a release, first use observability to determine whether failures are route-specific, tenant-specific, or platform-wide. Runtime flags may be relevant only when the incident owner confirms the affected feature and rollback path. Do not edit System Dictionary entries as a workaround unless the dictionary row is clearly the source of the issue and bounded proof exists.

## Current Limitations

- Runtime flag mutation requires a known affected scope and rollback proof.
- System Dictionary maintenance procedures are excluded pending bounded proof or owner disposition.
- Operational evidence must remain sanitized; do not retain secrets, tokens, raw payloads, or customer-sensitive diagnostics.

Related limitation ID: `OKL-G19-DICTIONARY-RUNTIME-001`.
