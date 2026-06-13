// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function read(path) {
  return readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
}

describe('security runtime hardening contracts', () => {
  it('sets compatible restricted security contexts for API and worker pods', () => {
    for (const manifest of [
      read('infra/k8s/deployments/api.yaml'),
      read('infra/k8s/deployments/worker.yaml'),
      read('infra/k8s/dependencies/minio.yaml'),
      read('infra/k8s/dependencies/redis.yaml'),
      read('infra/k8s/jobs/db-bootstrap.yaml'),
      read('infra/k8s/jobs/db-verify-schema-rollout.yaml'),
    ]) {
      expect(manifest).toContain('runAsNonRoot: true');
      expect(manifest).toContain('runAsUser: 1001');
      expect(manifest).toContain('runAsGroup: 1001');
      expect(manifest).toContain('fsGroup: 1001');
      expect(manifest).toContain('type: RuntimeDefault');
      expect(manifest).toContain('allowPrivilegeEscalation: false');
      expect(manifest).toContain('readOnlyRootFilesystem: true');
      expect(manifest).toMatch(/capabilities:\s*\n\s*drop:\s*\n\s*-\s*ALL/);
      expect(manifest).toMatch(/mountPath:\s*\/tmp/);
      expect(manifest).toMatch(/emptyDir:\s*\{\}/);
    }

    expect(read('infra/k8s/jobs/db-bootstrap.yaml')).toContain('NPM_CONFIG_CACHE');
    expect(read('infra/k8s/jobs/db-verify-schema-rollout.yaml')).toContain('NPM_CONFIG_CACHE');
  });

  it('pins NATS, requires credentials, removes monitor service exposure, and limits ingress', () => {
    const manifest = read('infra/k8s/dependencies/nats.yaml');

    expect(manifest).toContain(
      'image: nats:2.11.6-alpine@sha256:7dec3f8f1ff181975dbdfc0d903d2a9724659648294dbc2ebb2fa3a294d573a6',
    );
    expect(manifest).toContain('name: NATS_USER');
    expect(manifest).toContain('key: NATS_USER');
    expect(manifest).toContain('name: NATS_PASSWORD');
    expect(manifest).toContain('key: NATS_PASSWORD');
    expect(manifest).toContain('kind: NetworkPolicy');
    expect(manifest).toContain('runAsNonRoot: true');
    expect(manifest).toContain('allowPrivilegeEscalation: false');
    expect(manifest).toContain('readOnlyRootFilesystem: true');
    expect(manifest).toContain("cat > /tmp/nats/nats.conf <<'NATS_CONFIG'");
    expect(manifest).toContain('app.kubernetes.io/name: tcrn-api');
    expect(manifest).toContain('app.kubernetes.io/name: tcrn-worker');
    expect(manifest).toContain('port: 4222');
    expect(manifest).not.toContain('containerPort: 8222');
    expect(manifest).not.toMatch(/name:\s*monitor/);
    expect(manifest).not.toContain('kind: ConfigMap');
    expect(manifest).not.toContain('--user=$(NATS_USER)');
    expect(manifest).not.toContain('--pass=$(NATS_PASSWORD)');
  });

  it('runs security tooling in required CI mode', () => {
    const workflow = read('.github/workflows/tooling-advisory.yml');
    const pkg = JSON.parse(read('package.json'));
    const gitleaks = read('scripts/tooling/run-gitleaks-advisory.mjs');

    expect(pkg.scripts['security:check']).toContain('tooling:actionlint');
    expect(pkg.scripts['security:check']).toContain('tooling:zizmor');
    expect(pkg.scripts['security:check']).toContain('tooling:gitleaks');
    expect(pkg.scripts['security:check']).toContain('tooling:openapi:diff');
    expect(pkg.scripts['security:check']).toContain('tooling:osv');
    expect(pkg.scripts['security:check']).toContain('tooling:trivy');
    expect(pkg.scripts['security:check']).toContain('tooling:syft');
    expect(workflow).toMatch(/security-required:\s*\n\s*name: Security tooling required/);
    expect(workflow).toContain("TCRN_TOOLING_REQUIRE: '1'");
    expect(workflow).toContain("TCRN_TOOLING_INSTALL_REQUIRE: '1'");
    expect(workflow).toContain("TCRN_GENERATE_SBOM: '1'");
    expect(workflow).toContain('run: pnpm security:check');
    expect(gitleaks).toContain("const scanHistory = process.env.TCRN_GITLEAKS_HISTORY === '1';");
    expect(gitleaks).toContain("'--log-opts=-1'");
    expect(read('scripts/tooling/run-trivy-advisory.mjs')).toContain(
      'REQUIRED_FINDINGS blocking_high_critical=',
    );
    expect(read('pnpm-workspace.yaml')).toContain('tmp@>=0.2.0 <0.2.6: 0.2.7');
  });

  it('keeps assign-platform-admin parameterized instead of sed-interpolated SQL', () => {
    const shell = read('scripts/assign-platform-admin.sh');
    const sql = read('scripts/assign-platform-admin.sql');

    expect(shell).toContain('set -euo pipefail');
    expect(shell).not.toMatch(/\bsed\b/);
    expect(shell).toContain('-v "tenant_code=$TENANT_CODE"');
    expect(shell).toContain('-v "username=$USERNAME"');
    expect(shell).toContain('grep -Fxq "$CONTAINER_NAME"');
    expect(sql).toContain("SELECT set_config('tcrn.assign_platform_admin.tenant_code', :'tenant_code', false);");
    expect(sql).toContain("SELECT set_config('tcrn.assign_platform_admin.username', :'username', false);");
    expect(sql).toContain("tenant_code_arg TEXT := current_setting('tcrn.assign_platform_admin.tenant_code', true);");
    expect(sql).toContain('USING username_arg');
    expect(sql).not.toContain("\\set tenant_code 'AC'");
    expect(sql).not.toContain("\\set username 'ac_admin'");
  });
});
