# TCRN TMS K3s First-Cut Notes

This directory is the first-cut production-only Kubernetes baseline for moving TCRN-TMS from the current Compose runtime to a single-node K3s deployment.

It is not a general local-development workflow. Local development remains:

- Docker Compose for local dependencies
- `pnpm dev` for app processes

## Current Status

This directory is still being built out.

What is true now:

- the old production path is still Compose-first
- K3s assets are being created for a fresh production redeploy
- no destructive production action should happen until the fresh bootstrap path is proven repeatable

## Verified Production Snapshot

Read-only `ssh prod` inventory on `2026-04-11` confirmed:

- host: `VM-0-12-ubuntu`
- repo path: `/root/tcrn-tms`
- current runtime is still Docker Compose, with:
  - `tcrn-web`
  - `tcrn-api`
  - `tcrn-worker`
  - `tcrn-caddy`
  - `tcrn-postgres`
  - `tcrn-redis`
  - `tcrn-minio`
  - `tcrn-nats`
  - optional observability containers still present
- K3s is not installed yet:
  - `command -v k3s` returned nothing
  - `systemctl is-active k3s` returned `inactive`
  - `systemctl is-enabled k3s` returned `not-found`
- current node capacity is small but workable for the first cut:
  - `2` vCPU
  - `3.6 GiB` RAM
  - `99 GiB` root disk
- production runtime env currently lives in `/root/tcrn-tms/.env`
- current public build-time web URLs are:
  - `NEXT_PUBLIC_APP_URL=https://web.prod.tcrn-tms.com`
  - `NEXT_PUBLIC_API_URL=https://web.prod.tcrn-tms.com`
- current Caddy TLS state lives in Docker volumes:
  - `tcrn-caddy-data`
  - `tcrn-caddy-config`
- no repo-local cert files were found under `/root/tcrn-tms/certs`
- root Docker auth currently has no `ghcr.io` entry

Implications of that snapshot:

- a machine reset will discard the current Caddy ACME state unless the new TLS path is prepared first
- private GHCR pulls will need a fresh registry secret, or the first-cut images must be made public
- the first-cut web image should be built against the current single-host public URL contract unless the public routing model is intentionally changed first
- because the node is `Ubuntu 24.04.3 LTS` with `apt-get` available and no system PostgreSQL currently installed, host-native PostgreSQL 16 via OS packages remains the most conservative same-host database path
- read-only host-postgres preflight on `2026-04-11` also showed that port `5432` is currently occupied by the legacy `tcrn-postgres` Docker publish, so an in-place host-native PostgreSQL install on the current machine cannot take over the default port until the old runtime is removed

## First-Cut Topology

The first production K3s cut is intentionally conservative:

- single-node K3s
- same-host PostgreSQL outside K3s
- single replica for `web`
- single replica for `api`
- single replica for `worker`
- in-cluster `redis`, `minio`, and `nats` unless a later task explicitly narrows scope further
- preserve the external `TCRN_PII_PLATFORM` operator boundary unless a later task explicitly broadens scope

Why this is the first cut:

- current public-domain caching is only documented as safe for single-instance `web`
- same-host external PostgreSQL keeps stateful database operations out of the first K3s storage slice
- pull-based images avoid wasting limited node CPU and memory on clean rebuilds during cutover

## Namespace

All first-cut manifests should target:

- namespace: `tcrn`

Create it first:

```bash
kubectl apply -f infra/k8s/namespace.yaml
```

## Image Delivery Contract

The K3s path should consume immutable images from GHCR instead of rebuilding images on the target node.

Current repository facts:

- `.github/workflows/cd.yml` already has a GHCR build-and-push path for release tags
- image naming pattern is:
  - `ghcr.io/<owner>/<repo>/<service>:<tag-or-sha>`

First-cut rule:

- prefer release-tag or SHA-pinned images
- do not rely on node-local image builds for the clean redeploy path

If GHCR remains private, add a pull secret before applying workloads.
This is an operator prerequisite, not something the current manifests should silently assume away.

Current operator helpers support this explicitly:

- create the secret with `scripts/k8s-create-registry-secret.sh`
- inspect cluster readiness with `scripts/k8s-preflight-cluster.sh`
- pass `REGISTRY_SECRET_NAME=ghcr-pull-secret` to:
  - `scripts/k8s-deploy-production.sh`
  - `scripts/k8s-run-db-bootstrap.sh`
  - `scripts/k8s-run-db-verify-schema-rollout.sh`

If images are public, leave `REGISTRY_SECRET_NAME` empty and the pull-secret block will not be injected.

## External PostgreSQL Operator Path

The current first-cut recommendation remains:

- host-native PostgreSQL 16 on Ubuntu
- managed by systemd
- reachable from K3s pods via host IP or DNS

Current helper scripts:

- `scripts/host-postgres-preflight.sh`
  - read-only host checks for package/service/config state
- `scripts/host-postgres-setup-ubuntu.sh`
  - Ubuntu-focused setup helper
  - defaults to `APPLY=0` so the first run prints intended actions without changing the host

Important rule:

- do not use `localhost`, `127.0.0.1`, or old Compose alias `postgres` inside the K3s `DATABASE_URL`
- pods must use a host IP or DNS name that resolves to the PostgreSQL listener on the node

### Web Build-Time Caveat

`apps/web` is not a pure runtime-env application.

Current repository facts:

- `infra/docker/web.Dockerfile` injects `NEXT_PUBLIC_API_URL`
- `infra/docker/web.Dockerfile` injects `NEXT_PUBLIC_APP_URL`
- those values are part of the image build contract for client-visible behavior

Implication for K3s:

- runtime secrets can still provide server-side values like `API_URL`
- but the tagged web image must already be built with the correct public URLs

Do not assume that changing only the runtime secret can safely rewrite all public web URLs after the image is built.

## Runtime Secret Contract

First-cut workloads should read a single runtime secret that mirrors the existing Compose env contract.

Recommended secret name:

- `tcrn-runtime-env`

The secret should carry the runtime variable names already used by the app and by `docker-compose.prod.yml`, including at minimum:

- `DATABASE_URL`
- `REDIS_URL`
- `MINIO_ENDPOINT`
- `MINIO_ROOT_USER`
- `MINIO_ROOT_PASSWORD`
- `MINIO_USE_SSL`
- `NATS_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `FINGERPRINT_SECRET_KEY`
- `FRONTEND_URL`
- `APP_URL`
- `CORS_ORIGIN`
- `TENCENT_SES_SECRET_ID`
- `TENCENT_SES_SECRET_KEY`
- `TENCENT_SES_FROM_ADDRESS`
- `EMAIL_CONFIG_ENCRYPTION_KEY`
  - required if the fresh environment will use stored email provider config such as SMTP in `globalConfig`

Non-secret but still runtime-scoped values can remain inside the same secret for the first cut to reduce wiring drift.
If later slices want a stricter ConfigMap/Secret split, do that after the fresh bootstrap path is stable.

Email fallback note for the current runtime contract:

- `TENCENT_SES_SECRET_ID` / `TENCENT_SES_SECRET_KEY` / `TENCENT_SES_FROM_ADDRESS` are not hard boot requirements
- if they are blank, the app can still rely on stored email configuration instead of env fallback
- current operator fact for production:
  - email is configured through SMTP, not Tencent SES credentials in `.env`
- code-path fact that affects fresh bootstrap:
  - stored email provider config is loaded from `globalConfig(key=email.config)` before env fallback
  - that config is not part of the base global-config seed
  - SMTP secrets in stored config depend on `EMAIL_CONFIG_ENCRYPTION_KEY`
- first-cut K3s env audit should warn on missing or partial Tencent SES env fallback, not fail the whole cutover by itself
- after bootstrap, verify that the stored email provider/config still resolves correctly in the fresh environment
- current operator decision for this cut:
  - do not migrate DB-stored system config
  - re-enter SMTP/email provider config manually after fresh bootstrap
- recommended way to generate a fresh `EMAIL_CONFIG_ENCRYPTION_KEY`:
  - `openssl rand -hex 32`

Recommended operator source file for the first cut:

- `infra/k8s/runtime.env.example`

Do not assume the old root `.env.production.example` is a safe first-cut K3s runtime template by itself.
It remains useful as a production env sample, but the K3s runtime path now has a stricter dedicated example and audit step.

Current operator helpers:

- audit the env file with `scripts/k8s-audit-runtime-env.sh`
- transform an old Compose-style env with `scripts/k8s-transform-compose-env.sh`
- run the local dry-run chain with `scripts/k8s-readiness-check.sh`
- render manifests for review with `scripts/k8s-render-production.sh`
- create the secret with `scripts/k8s-create-runtime-secret.sh`
- export the current Caddy-managed cert/key with `scripts/host-export-caddy-tls.sh`
- import existing TLS material with `scripts/k8s-create-tls-secret.sh`

Important public URL rule for the current single-host production shape:

- `NEXT_PUBLIC_API_URL` should stay on the public origin, for example `https://web.prod.tcrn-tms.com`
- do not append `/api` there, because the current web client already appends endpoint paths like `/api/v1/...`

Expected first-cut in-cluster endpoints:

- `REDIS_URL=redis://:<password>@tcrn-redis.tcrn.svc.cluster.local:6379`
- `MINIO_ENDPOINT=tcrn-minio.tcrn.svc.cluster.local:9000`
- `NATS_URL=nats://tcrn-nats.tcrn.svc.cluster.local:4222`
- web server-side fallback `API_URL=http://tcrn-api.tcrn.svc.cluster.local:4000`

## Ingress And TLS Assumption

The first-cut target should minimize moving parts.

Default assumption for this directory:

- use the K3s ingress controller already present on the node
- do not introduce a second reverse-proxy stack unless the node is intentionally provisioned without the default ingress controller

Before any destructive cutover, the operator must still freeze:

- public hostnames
- TLS issuance strategy
- whether API and web share one hostname or split across hostnames
- how custom-domain traffic is handled in front of the single `web` replica

Current read-only production facts already freeze part of that decision space:

- public app host is currently `web.prod.tcrn-tms.com`
- app and API are currently served behind the same public host
- current cert state is bound to the old Caddy runtime and should not be assumed to survive a reset
- if K3s is installed with defaults, the most conservative ingress-class assumption remains `traefik`

### Current Caddy TLS Export Fallback

Read-only production inspection on `2026-04-11` confirmed that the current Caddy data volume contains an exportable PEM pair for the live public host:

- certificate:
  - `/var/lib/docker/volumes/tcrn-caddy-data/_data/caddy/certificates/acme-v02.api.letsencrypt.org-directory/web.prod.tcrn-tms.com/web.prod.tcrn-tms.com.crt`
- key:
  - `/var/lib/docker/volumes/tcrn-caddy-data/_data/caddy/certificates/acme-v02.api.letsencrypt.org-directory/web.prod.tcrn-tms.com/web.prod.tcrn-tms.com.key`
- certificate metadata currently shows:
  - subject and SAN: `web.prod.tcrn-tms.com`
  - issuer: `Let's Encrypt`
  - validity window:
    - `notBefore=Mar 25 12:32:46 2026 GMT`
    - `notAfter=Jun 23 12:32:45 2026 GMT`

If the first cut wants to reuse the current public certificate instead of re-issuing immediately:

1. run `DOMAIN=web.prod.tcrn-tms.com OUTPUT_DIR=/secure/path bash scripts/host-export-caddy-tls.sh` on the legacy Compose host before any reset or runtime removal
2. move the exported `fullchain.pem` and `privkey.pem` to the node or operator environment that will create the K3s secret
3. run `CERT_FILE=... KEY_FILE=... bash scripts/k8s-create-tls-secret.sh`

This does not preserve old Caddy ACME state as part of the new production contract.
It only snapshots the current cert/key pair so the first cut can import them into K3s before a later renewal strategy is chosen.

### First-Cut Public Routing Model

The first K3s ingress should preserve the current production shape from `infra/caddy/Caddyfile.prod`:

- one public app hostname
- `/api/v1` and `/api/docs` routed to `api`
- `/api/live-status` kept on `web`
- `/api-proxy` kept on `web`
- `/` and the rest of frontend traffic routed to `web`

This keeps the cutover closer to the current runtime contract and avoids inventing a new split-host model during the first redeploy.

## Fresh Bootstrap Contract

A clean production redeploy is not just "apply manifests and hope."

The first-install database/bootstrap order must stay explicit:

1. `npx prisma migrate deploy`
2. `npx tsx scripts/apply-migrations.ts`
3. first-install seed path
4. `npx tsx scripts/verify-schema-rollout.ts ...` when schema verification is required

This order should become:

- a repeatable operator script
- or Kubernetes Jobs plus a thin operator wrapper

Do not rely on one-off shell sessions inside pods.

## Single-Node Safety Rules

For the first cut:

- do not add HPA
- do not default `web` or `api` to multiple replicas
- do not use surge-heavy rollout settings that assume spare node capacity
- prefer conservative resources and explicit readiness checks

## Public-Domain Constraint

Keep `web` single replica in the first cut.

Reason:

- `.context/modules/06-homepage-public-pages/*` documents custom-domain behavior as safe only for single-instance short-cache deployment
- multi-replica `web` becomes a separate design problem because the current cache is process-local

## PII Boundary

Do not redesign the external PII topology in the first cut unless it becomes a hard blocker.

Default first-cut assumption:

- main runtime on K3s
- any PII-enabled customer flow still depends on an external `TCRN_PII_PLATFORM` integration operated outside this repo

Before cutover, verify:

- the intended adapter scope and activation state for `TCRN_PII_PLATFORM`
- SSO / portal reachability and any adapter-side credentials or shared secrets
- post-bootstrap customer create/edit portal/report smoke for PII-backed flows

## Destructive Gate

This directory does not authorize wiping production by itself.

Before any destructive production action:

- manifests must exist for the first-cut runtime
- image references must be available in registry
- bootstrap steps must be scripted or job-driven
- ingress/TLS choices must be explicit
- the destructive checklist must exist
- the user must give fresh confirmation in the current session

## Next Files Expected In This Directory

Near-term expected additions:

- `namespace.yaml`
- `deployments/web.yaml`
- `deployments/worker.yaml`
- `dependencies/redis.yaml`
- `dependencies/minio.yaml`
- `dependencies/nats.yaml`
- `ingress/public.yaml`
- `jobs/db-bootstrap.yaml`
- `jobs/db-verify-schema-rollout.yaml`

Current gaps after the first baseline pass:

- the bootstrap and verification jobs are templates and still need the final image tag plus runtime secret
- image pull secret creation now has an operator helper, but the current manifests still do not hard-require `imagePullSecrets`
- ingress exists, but the real hostnames and TLS secret still need to be frozen before apply
- the target node still has no live K3s proof, no live GHCR pull proof, and no live TLS issuance proof
- the real production runtime env currently comes from `/root/tcrn-tms/.env`, so the destructive checklist must preserve that file before any reset

This directory should still be treated as an in-progress baseline rather than a deploy-ready stack.

## Operator Entry Points

Current non-destructive helper scripts:

- `scripts/k8s-deploy-production.sh`
  - applies the current namespace, dependency, and runtime manifests
  - renders image tags before apply
  - skips ingress if the manifest does not exist yet
- `scripts/k8s-run-db-bootstrap.sh`
  - renders and runs the first-install bootstrap job
  - requires the runtime secret and a concrete API image tag
- `scripts/k8s-run-db-verify-schema-rollout.sh`
  - renders and runs the optional schema rollout verification job
  - requires a concrete API image tag plus explicit `ROLLOUT_MIGRATIONS`
- `scripts/k8s-create-runtime-secret.sh`
  - creates or updates `tcrn-runtime-env` from an env file
  - defaults to `infra/k8s/runtime.env.example`
  - runs the runtime-env audit first when `scripts/k8s-audit-runtime-env.sh` is present
- `scripts/k8s-audit-runtime-env.sh`
  - validates the first-cut K3s runtime env contract before secret creation
  - blocks common cutover mistakes such as:
    - `DATABASE_URL` pointing at loopback or old Compose aliases
    - `REDIS_URL` / `MINIO_ENDPOINT` / `NATS_URL` still pointing at Compose aliases
    - `NEXT_PUBLIC_API_URL` incorrectly including `/api`
- `scripts/k8s-transform-compose-env.sh`
  - transforms a Compose-oriented production env into the first-cut K3s runtime env contract
  - builds:
    - `DATABASE_URL`
    - `REDIS_URL`
    - `FRONTEND_URL`
    - `APP_URL`
    - `CORS_ORIGIN`
  - then runs the runtime-env audit on the output
- `scripts/k8s-readiness-check.sh`
  - runs the local non-destructive chain:
    - transform env
    - audit env
    - render manifests
    - verify no placeholders remain
  - can optionally append the read-only cluster preflight
- `scripts/k8s-render-production.sh`
  - renders the current first-cut manifests to a local output directory without applying them
  - useful for operator review before the first live apply
- `scripts/host-export-caddy-tls.sh`
  - runs on the legacy Compose host
  - exports the current Caddy-managed `fullchain.pem` and `privkey.pem` from the Docker volume
  - intended to preserve the live cert/key pair before a machine reset or runtime removal
- `scripts/k8s-create-tls-secret.sh`
  - creates or updates a `kubernetes.io/tls` secret for ingress
  - recommended first-cut default secret name: `tcrn-web-tls`
- `scripts/k8s-create-registry-secret.sh`
  - creates or updates `ghcr-pull-secret` when private GHCR pulls are needed
- `scripts/host-postgres-preflight.sh`
  - runs read-only checks for the same-host PostgreSQL path on Ubuntu
- `scripts/host-postgres-setup-ubuntu.sh`
  - prints or applies the host-native PostgreSQL 16 setup path on Ubuntu
  - defaults to `APPLY=0`
- `scripts/k8s-preflight-cluster.sh`
  - runs read-only checks for:
    - K3s service presence
    - Kubernetes API reachability
    - ingress classes
    - namespace
    - runtime secret
    - registry secret
- `scripts/k8s-smoke-production.sh`
  - runs the minimum post-cutover checks:
    - in-cluster objects
    - `/`
    - `/api/v1/health/ready`
    - `/api/live-status`
    - `/api/docs`

These helpers are not destructive cutover scripts.
They do not wipe the host, remove the old Compose runtime, or bypass the explicit destructive-action confirmation gate.
