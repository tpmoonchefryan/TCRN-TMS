# Third-Party License Audit Notes

This note records dependency-license evidence for the Apache-2.0 migration
candidate. It is not legal advice, release approval, or a claim that the
dependency posture is clean.

## Apache-2.0 Migration Follow-Up

| Package | Product path | Evidence | Candidate disposition |
| --- | --- | --- | --- |
| `buffers@0.1.1` | Previously reached through `apps/api` and `apps/worker` via `exceljs@4.4.0 -> unzipper@0.10.14 -> binary@0.3.0 -> buffers@0.1.1`. Current candidate resolves `exceljs@4.4.0 -> unzipper@0.12.3` for `apps/worker` only. | Installed `buffers@0.1.1`, npm registry metadata, and published tarball contain no `license` or `licenses` field and no `LICENSE`, `COPYING`, or `NOTICE` file. The migration candidate removes that artifact from the resolved dependency graph using the root pnpm override `unzipper: 0.12.3` and removes the unused direct `apps/api` `exceljs` dependency after import/use proof. | Remediated in this candidate pending Sable/Verity acceptance. `pnpm why buffers` and `pnpm why binary` must remain absent before packaging; do not use an unknown-license residual exception. |
| `json-query@2.2.2` | Dev/tooling chain through `@usebruno/cli` | Registry metadata is missing a machine-readable license field, but the installed package includes MIT license text and README/license evidence. | Packaging may proceed with retained evidence if Sable accepts local MIT evidence for the tooling-only chain. |
| `jszip@3.10.1` | Transitive dependency in product dependency graph | Local package metadata and license files expose dual licensing as `(MIT OR GPL-3.0-or-later)`. | Packaging may proceed by selecting the MIT branch, with evidence retained in the audit packet. |
| `sharp` and `@img/sharp-libvips-*` | Image processing dependency posture | `sharp` package metadata is Apache-2.0. Prebuilt `@img/sharp-libvips-*` packages carry LGPL-family libvips dependency posture. | Packaging may proceed only under Sable conditions: retain third-party notice posture and audit the production target platform package set before release packaging. |

## `buffers@0.1.1` Remediation Record

The original product chain reached `buffers@0.1.1` through `exceljs@4.4.0`.
Observed product runtime usage is in worker Excel export paths only; no API
runtime import/use of `exceljs` was found. The candidate applies the approved
dependency graph remediation slice without rewriting worker export
implementation:

1. Root `pnpm-workspace.yaml` overrides `unzipper` to `0.12.3`, the MIT
   package path that no longer depends on `binary` or `buffers`.
2. `apps/api/package.json` no longer declares direct `exceljs`, because API
   import/use proof found no API runtime usage.
3. `apps/worker` keeps `exceljs@4.4.0`; worker export behavior must remain
   covered by focused XLSX export/readback tests.

This record is still an implementation-candidate note. It is not Selene
packaging approval, dependency-audit-clean approval, legal advice, or a release
claim.
