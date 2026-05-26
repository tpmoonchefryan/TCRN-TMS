# Dependency Maintenance Policy

This project treats dependency maintenance as a staged safety workflow, not a bulk upgrade habit. The goal is to remove known vulnerable components quickly while keeping runtime behavior, CI/CD, data shape, and deployment surfaces controlled.

## Cadence

- Run production and full audits at least monthly, and immediately after any security advisory that affects the workspace.
- Review direct outdated dependencies at least monthly.
- Review CI action and container image pinning at least quarterly, or earlier when a security advisory affects a workflow action or base/service image.
- Revisit major framework/toolchain holds when the Node baseline is intentionally reviewed.

## Registry And Commands

- Use the configured package registry for normal installs.
- The runtime baseline is Node.js 24 LTS and pnpm 11.3.x. Keep root `package.json`, GitHub Actions `setup-node`, pnpm action versions, and runtime Dockerfiles aligned when this baseline changes.
- Runtime Dockerfiles should pin the selected Node tag with a verified manifest digest. Current baseline: `node:24-alpine@sha256:2bdb65ed1dab192432bc31c95f94155ca5ad7fc1392fb7eb7526ab682fa5bf14`.
- MinIO should use an explicit release tag with a verified manifest digest, not `latest`. Current local dependency baseline: `minio/minio:RELEASE.2025-09-07T16-13-09Z@sha256:14cea493d9a34af32f524e538b8346cf79f3321eff8e708c1e2960462bd8936e`.
- Redis should use a Redis 8 Alpine tag with a verified manifest digest. Current local dependency baseline: `redis:8.6.3-alpine@sha256:d146f83b1e0f02fc27c26a50cee39338c736674c5959db84363e6ae3cd9e02d2`.
- pnpm build-script approvals live in `pnpm-workspace.yaml` under `allowBuilds`. Add new approvals only after reviewing the package and keep telemetry-only scripts denied.
- If pnpm supply-chain policy rejects a very recent release during install, prefer a cooled latest-compatible version or record a hold instead of disabling the policy for normal verification.
- For audit evidence, use npmjs explicitly:
  - `pnpm audit --registry=https://registry.npmjs.org --prod --json`
  - `pnpm audit --registry=https://registry.npmjs.org --json`
- For outdated evidence, prefer:
  - `npm_config_registry=https://registry.npmjs.org pnpm outdated -r --format json`

## Change Classes

- Security patch changes: narrow dependency updates or pnpm overrides that remove critical/high findings.
- Compatible freshness changes: non-breaking direct dependency updates that do not raise the accepted Node/runtime baseline.
- Major migration changes: framework, runtime, TypeScript, Prisma, Vite, Tailwind, ESLint, testing, auth/security middleware, or rate-limit behavior changes that need their own plan.
- CI/container pinning changes: exact GitHub Action tags and explicit image tags or digests, only after live tag or digest verification.
- Policy/documentation changes: docs-only updates that do not change runtime behavior.

Do not mix major migrations, deployment changes, Prisma schema/migration edits, or tenant rollout work into a security patch batch without a separate approved plan.

## Acceptance Thresholds

- Production audit critical and high counts should be zero after each security batch unless an explicit hold is recorded.
- Full audit critical and high counts should be zero after dev/tooling security remediation unless an explicit hold is recorded.
- Direct deprecated packages should be removed or documented with a hold.
- Remaining outdated dependencies must be grouped by reason, such as Node baseline, major migration, runtime behavior risk, or unavailable live proof.

## Required Verification

For dependency changes, run:

- `pnpm install --frozen-lockfile`
- `pnpm audit --registry=https://registry.npmjs.org --prod --json`
- `pnpm audit --registry=https://registry.npmjs.org --json`
- `npm_config_registry=https://registry.npmjs.org pnpm outdated -r --format json`
- `pnpm lint`
- `pnpm typecheck`
- package tests for touched packages
- `pnpm build`
- `git diff --check`

For workflow changes, also run workflow syntax validation before commit. For container image changes, verify live tags or digests without pulling, starting, building, pushing, or deploying images. Prefer Docker Hub tag metadata plus Buildx `imagetools inspect` no-pull proof; record any proxy or CDN path used for the evidence.

## Holds And Escalation

Record a hold instead of forcing an upgrade when:

- the upgrade requires a Node baseline change;
- the upgrade is a major migration with meaningful API/runtime behavior risk;
- live tag or digest proof is unavailable;
- Prisma schema, migrations, seeds, or tenant rollout changes would be required;
- auth, RBAC, PII, public route, custom domain, DNS, SSL, Caddy, deployment, SSH, image push, or secret mutation would be required.

Each hold should include the package or image, observed latest version, reason, and the next safe review path.

## Automation

Renovate or Dependabot may be introduced later, but should start in a non-automerge mode with grouped rules that preserve the change classes above. Do not enable automatic major upgrades, automatic Prisma major upgrades, or automatic CI/container deployment behavior without a separate review.
