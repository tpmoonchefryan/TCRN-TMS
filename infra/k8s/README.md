# TCRN TMS K3s Baseline

This directory now documents the API/worker-only K3s baseline for this repository.

As of 2026-04-16:

- the repo-owned browser runtime has been removed
- `historical browser runtime` no longer exists in this monorepo
- K3s manifests in this directory target:
  - `api`
  - `worker`
  - in-cluster `redis`
  - in-cluster `minio`
  - in-cluster `nats`
- any public browser UI must be supplied by an external runtime outside this repository

## Scope

This directory is production/operator-facing only.

It is not a replacement for local development.

Local development remains:

- Docker Compose for dependencies
- `pnpm dev` for repo-owned processes

## Current Runtime Shape

The current repo-owned runtime boundary is:

- `apps/api`
- `apps/worker`
- `packages/shared`
- `packages/database`

The removed runtime surface includes:

- `historical browser runtime`
- `historical historical browser test suite config`
- `retired-browser-tests/*`
- `historical browser Dockerfile`
- `historical browser deployment manifest`

## First-Cut K3s Baseline

The current first-cut production baseline is:

- single-node K3s
- same-host PostgreSQL outside K3s
- single replica `api`
- single replica `worker`
- in-cluster `redis`
- in-cluster `minio`
- in-cluster `nats`
- API-only public ingress from this repository

This baseline intentionally does not ship a browser runtime.

## Image Delivery

The K3s path consumes immutable GHCR images.

Current image set:

- `ghcr.io/<owner>/<repo>/api:<tag>`
- `ghcr.io/<owner>/<repo>/worker:<tag>`

If GHCR is private, create a registry secret and pass `REGISTRY_SECRET_NAME`.

## Runtime Secret Contract

Recommended secret name:

- `tcrn-runtime-env`

Recommended operator source file:

- `infra/k8s/runtime.env.example`

Current public/browser-facing keys are:

- `FRONTEND_URL`
- `APP_URL`
- `CORS_ORIGIN`

These must point at the external browser runtime or public origin that talks to this API.

Current runtime-critical keys also include:

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
- `EMAIL_CONFIG_ENCRYPTION_KEY`

Audit the env file before creating the secret:

```bash
scripts/k8s-audit-runtime-env.sh infra/k8s/runtime.env.example
```

## Public Ingress And TLS

`infra/k8s/ingress/public.yaml` now exposes only `/api`.

It does not route `/`, public pages, or custom-domain browser traffic.

Recommended first-cut TLS secret name:

- `tcrn-public-tls`

Create or update it with:

```bash
scripts/k8s-create-tls-secret.sh /path/to/fullchain.pem /path/to/privkey.pem
```

## Operator Helpers

Current operator entrypoints include:

- `scripts/k8s-audit-runtime-env.sh`
- `scripts/k8s-transform-compose-env.sh`
- `scripts/k8s-render-production.sh`
- `scripts/k8s-deploy-production.sh`
- `scripts/k8s-run-db-bootstrap.sh`
- `scripts/k8s-run-db-verify-schema-rollout.sh`
- `scripts/k8s-create-runtime-secret.sh`
- `scripts/k8s-create-tls-secret.sh`
- `scripts/k8s-create-registry-secret.sh`
- `scripts/k8s-preflight-cluster.sh`
- `scripts/host-postgres-preflight.sh`
- `scripts/host-postgres-setup-ubuntu.sh`

## Historical Note

Older plans, ADRs, or progress logs may still mention:

- `historical browser runtime`
- `historical browser public env *`
- historical browser test suite browser suites
- `historical browser workload`

Those references are historical only and must not be treated as current runtime truth.
