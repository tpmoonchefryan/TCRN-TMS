// SPDX-License-Identifier: Apache-2.0
import {
  REQUIRED_TOOL_CODES,
  parseOutArg,
  withPool,
  writeEvidence,
} from './platform-tool-script-utils.mjs';

const out = parseOutArg(process.argv.slice(2), 'platform-tool-db-rollout-readback.json');

async function main() {
  const payload = await withPool(async (pool) => {
    const tableResult = await pool.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'platform_tool_definition',
          'platform_tool_connection',
          'platform_tool_config_value',
          'platform_tool_health_snapshot',
          'platform_tool_audit_event',
          'platform_external_tool_sso_readiness'
        )
      ORDER BY table_name
    `);
    const tableNames = tableResult.rows.map((row) => row.table_name);
    const missingTables = [
      'platform_tool_definition',
      'platform_tool_connection',
      'platform_tool_config_value',
      'platform_tool_health_snapshot',
      'platform_tool_audit_event',
      'platform_external_tool_sso_readiness',
    ].filter((tableName) => !tableNames.includes(tableName));
    const definitions = await pool.query(`
      SELECT code, family, default_state, owner_phase, human_ui, deep_link,
             allowed_local_dev_modes, sso_requirement, default_connection
      FROM public.platform_tool_definition
      ORDER BY sort_order ASC
    `);
    const definitionCodes = definitions.rows.map((row) => row.code);
    const missingDefinitions = REQUIRED_TOOL_CODES.filter((code) => !definitionCodes.includes(code));
    const unexpectedDefinitions = definitionCodes.filter((code) => !REQUIRED_TOOL_CODES.includes(code));
    const enabledConnectionResult = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM public.platform_tool_connection
      WHERE enabled = true
    `);
    const nonAcConnectionResult = await pool.query(`
      SELECT connection.id, connection.tool_code, tenant.code AS tenant_code, tenant.tier
      FROM public.platform_tool_connection connection
      JOIN public.tenant tenant ON tenant.id = connection.tenant_id
      WHERE tenant.tier <> 'ac'
    `);
    const nonAcAuditResult = await pool.query(`
      SELECT audit.id, audit.tool_code, tenant.code AS tenant_code, tenant.tier
      FROM public.platform_tool_audit_event audit
      JOIN public.tenant tenant ON tenant.id = audit.tenant_id
      WHERE tenant.tier <> 'ac'
    `);
    const triggerResult = await pool.query(`
      SELECT tgname
      FROM pg_trigger
      WHERE tgrelid = 'public.platform_tool_audit_event'::regclass
        AND tgname = 'platform_tool_audit_event_ac_guard'
        AND NOT tgisinternal
    `);
    const nonAcTenantResult = await pool.query(`
      SELECT id, code, tier
      FROM public.tenant
      WHERE tier <> 'ac'
        AND is_active = true
      ORDER BY created_at ASC
      LIMIT 1
    `);
    let nonAcAuditInsertDenied = nonAcTenantResult.rows.length === 0;
    let nonAcAuditInsertErrorCode = null;

    if (nonAcTenantResult.rows[0]) {
      try {
        await pool.query(
          `
            INSERT INTO public.platform_tool_audit_event
              (tenant_id, tool_code, action, request_id, after_state)
            VALUES
              ($1::uuid, 'grafana', 'guard.probe', 'p4-rollout-non-ac-audit-probe', '{}'::jsonb)
          `,
          [nonAcTenantResult.rows[0].id]
        );
        await pool.query(`
          DELETE FROM public.platform_tool_audit_event
          WHERE request_id = 'p4-rollout-non-ac-audit-probe'
        `);
        nonAcAuditInsertDenied = false;
      } catch (error) {
        nonAcAuditInsertErrorCode = error?.code ?? null;
        nonAcAuditInsertDenied = error?.code === '23514';
      }
    }
    const ssoReadiness = await pool.query(`
      SELECT tool_code, status, fail_closed
      FROM public.platform_external_tool_sso_readiness
      WHERE tool_code = ANY($1::varchar[])
      ORDER BY tool_code
    `, [REQUIRED_TOOL_CODES]);
    const ssoCodes = ssoReadiness.rows.map((row) => row.tool_code);

    return {
      checkedAt: new Date().toISOString(),
      test_layer: 'manual_readback',
      data_mode: 'read_only_uat',
      target_scope: 'ac_platform_tool_connection',
      tables: tableNames,
      missingTables,
      definitionCodes,
      missingDefinitions,
      unexpectedDefinitions,
      enabledConnectionCount: enabledConnectionResult.rows[0]?.count ?? null,
      nonAcConnections: nonAcConnectionResult.rows,
      nonAcAuditEvents: nonAcAuditResult.rows,
      auditAcGuardTriggerPresent: triggerResult.rows.length === 1,
      nonAcAuditInsertProbe: {
        attempted: nonAcTenantResult.rows.length > 0,
        tenant: nonAcTenantResult.rows[0] ?? null,
        denied: nonAcAuditInsertDenied,
        errorCode: nonAcAuditInsertErrorCode,
      },
      ssoReadiness: ssoReadiness.rows,
      missingSsoReadiness: REQUIRED_TOOL_CODES.filter((code) => !ssoCodes.includes(code)),
      passed:
        missingTables.length === 0 &&
        missingDefinitions.length === 0 &&
        unexpectedDefinitions.length === 0 &&
        enabledConnectionResult.rows[0]?.count === 0 &&
        nonAcConnectionResult.rows.length === 0 &&
        nonAcAuditResult.rows.length === 0 &&
        triggerResult.rows.length === 1 &&
        nonAcAuditInsertDenied &&
        REQUIRED_TOOL_CODES.every((code) => ssoCodes.includes(code)),
    };
  });

  await writeEvidence(out, payload);
}

void main().catch(async (error) => {
  await writeEvidence(out, {
    checkedAt: new Date().toISOString(),
    test_layer: 'manual_readback',
    data_mode: 'read_only_uat',
    target_scope: 'ac_platform_tool_connection',
    passed: false,
    error: error instanceof Error ? error.message : String(error),
  });
});
