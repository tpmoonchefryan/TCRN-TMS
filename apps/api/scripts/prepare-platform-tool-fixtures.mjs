// SPDX-License-Identifier: Apache-2.0
import {
  findAcTenant,
  parseOutArg,
  withPool,
  writeEvidence,
} from '../../../packages/database/scripts/platform-tool-script-utils.mjs';

function parseMode(argv) {
  return argv[0] && !argv[0].startsWith('--') ? argv[0] : 'readback';
}

function parsePrefix(argv) {
  const index = argv.indexOf('--prefix');
  return index >= 0 && argv[index + 1] ? argv[index + 1] : 'TEST_P4_TOOL';
}

const argv = process.argv.slice(2);
const mode = parseMode(argv);
const prefix = parsePrefix(argv);
const out = parseOutArg(argv, `platform-tool-fixture-${mode}.json`);

function fixtureNamespace() {
  return prefix.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 40);
}

async function setup(pool, tenant) {
  const namespace = fixtureNamespace();
  const endpointUrl = `https://example.com/${namespace}/keycloak`;
  const serviceName = `${namespace}-keycloak`;
  const connection = await pool.query(`
    INSERT INTO public.platform_tool_connection
      (
        tenant_id, tool_code, environment, deployment_mode, local_dev_mode,
        endpoint_url, namespace, service_name, enabled, readiness_state,
        sso_readiness_state
      )
    VALUES ($1::uuid, 'keycloak', 'shared_dev', 'stubbed', 'stubbed',
            $2, $3, $4, false, 'disabled', 'blocked')
    ON CONFLICT (tenant_id, tool_code, environment) DO UPDATE SET
      deployment_mode = EXCLUDED.deployment_mode,
      local_dev_mode = EXCLUDED.local_dev_mode,
      endpoint_url = EXCLUDED.endpoint_url,
      namespace = EXCLUDED.namespace,
      service_name = EXCLUDED.service_name,
      enabled = false,
      readiness_state = 'disabled',
      sso_readiness_state = 'blocked',
      updated_at = now(),
      version = platform_tool_connection.version + 1
    RETURNING id, tenant_id, tool_code, environment, namespace, service_name
  `, [tenant.id, endpointUrl, namespace, serviceName]);
  const connectionId = connection.rows[0].id;

  await pool.query(`
    INSERT INTO public.platform_tool_config_value
      (connection_id, config_key, is_secret, secret_ref, secret_status)
    VALUES ($1::uuid, 'client_secret', true, $2, 'external_reference')
    ON CONFLICT (connection_id, config_key) DO UPDATE SET
      is_secret = true,
      secret_ref = EXCLUDED.secret_ref,
      secret_status = EXCLUDED.secret_status,
      config_value = NULL,
      updated_at = now()
  `, [connectionId, `env:${prefix}_CLIENT_SECRET`]);

  await pool.query(`
    INSERT INTO public.platform_tool_health_snapshot
      (connection_id, status, latency_ms, safe_details)
    VALUES ($1::uuid, 'disabled', 0, $2::jsonb)
  `, [connectionId, JSON.stringify({ fixture: prefix, probeMode: 'stubbed' })]);

  return {
    created_resources: [{ type: 'platform_tool_connection', id: connectionId }],
    setup_readback: connection.rows[0],
  };
}

async function readback(pool, tenant) {
  const namespace = fixtureNamespace();
  const result = await pool.query(`
    SELECT connection.id, connection.tool_code, connection.environment, connection.namespace,
           config.config_key, config.is_secret, config.config_value, config.secret_ref,
           config.secret_status, snapshot.status AS latest_health_status
    FROM public.platform_tool_connection connection
    LEFT JOIN public.platform_tool_config_value config ON config.connection_id = connection.id
    LEFT JOIN LATERAL (
      SELECT status
      FROM public.platform_tool_health_snapshot
      WHERE connection_id = connection.id
      ORDER BY checked_at DESC
      LIMIT 1
    ) snapshot ON true
    WHERE connection.tenant_id = $1::uuid
      AND connection.namespace = $2
  `, [tenant.id, namespace]);

  return {
    rows: result.rows.map((row) => ({
      ...row,
      config_value: row.is_secret ? '[redacted]' : row.config_value,
      secret_ref: row.is_secret ? '[redacted]' : row.secret_ref,
    })),
    rawSecretRows: result.rows.filter((row) => row.is_secret && row.config_value !== null),
  };
}

async function cleanup(pool, tenant) {
  const namespace = fixtureNamespace();
  const removed = await pool.query(`
    DELETE FROM public.platform_tool_connection
    WHERE tenant_id = $1::uuid
      AND namespace = $2
    RETURNING id
  `, [tenant.id, namespace]);

  return {
    removedCount: removed.rowCount,
    removedIds: removed.rows.map((row) => row.id),
  };
}

async function main() {
  const payload = await withPool(async (pool) => {
    const tenant = await findAcTenant(pool);

    if (!tenant) {
      return {
        checkedAt: new Date().toISOString(),
        test_layer: 'api_integration',
        data_mode: 'disposable_fixture',
        target_scope: 'ac_platform_tool_connection',
        prefix,
        mode,
        passed: false,
        error: 'No active AC tenant found',
      };
    }

    let result;

    if (mode === 'setup') {
      result = await setup(pool, tenant);
    } else if (mode === 'cleanup') {
      result = await cleanup(pool, tenant);
    } else if (mode === 'idempotence') {
      const first = await cleanup(pool, tenant);
      const second = await cleanup(pool, tenant);
      result = { first, second };
    } else {
      result = await readback(pool, tenant);
    }

    return {
      checkedAt: new Date().toISOString(),
      test_layer: 'api_integration',
      data_mode: 'disposable_fixture',
      target_scope: 'ac_platform_tool_connection',
      prefix,
      mode,
      tenant: { id: tenant.id, code: tenant.code, schemaName: tenant.schema_name },
      ...result,
      passed:
        mode === 'cleanup'
          ? true
          : mode === 'idempotence'
            ? result.second.removedCount === 0
            : mode === 'readback'
              ? result.rows.length > 0 && result.rawSecretRows.length === 0
              : Boolean(result.setup_readback?.id),
    };
  });

  await writeEvidence(out, payload);
}

void main().catch(async (error) => {
  await writeEvidence(out, {
    checkedAt: new Date().toISOString(),
    test_layer: 'api_integration',
    data_mode: 'disposable_fixture',
    target_scope: 'ac_platform_tool_connection',
    prefix,
    mode,
    passed: false,
    error: error instanceof Error ? error.message : String(error),
  });
});
