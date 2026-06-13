// SPDX-License-Identifier: Apache-2.0
import {
  REQUIRED_TOOL_CODES,
  parseOutArg,
  withPool,
  writeEvidence,
} from './platform-tool-script-utils.mjs';

const out = parseOutArg(process.argv.slice(2), 'platform-tool-seed-idempotence.json');

async function main() {
  const payload = await withPool(async (pool) => {
    const result = await pool.query(`
      SELECT code, COUNT(*)::int AS count
      FROM public.platform_tool_definition
      GROUP BY code
      ORDER BY code
    `);
    const duplicateCodes = result.rows.filter((row) => row.count !== 1);
    const existingCodes = result.rows.map((row) => row.code);
    const readinessResult = await pool.query(`
      SELECT tool_code, COUNT(*)::int AS count
      FROM public.platform_external_tool_sso_readiness
      WHERE tool_code = ANY($1::varchar[])
      GROUP BY tool_code
      ORDER BY tool_code
    `, [REQUIRED_TOOL_CODES]);
    const duplicateReadiness = readinessResult.rows.filter((row) => row.count !== 1);

    return {
      checkedAt: new Date().toISOString(),
      test_layer: 'manual_readback',
      data_mode: 'read_only_uat',
      target_scope: 'ac_platform_tool_connection',
      expectedCodes: REQUIRED_TOOL_CODES,
      existingCodes,
      duplicateCodes,
      duplicateReadiness,
      passed:
        REQUIRED_TOOL_CODES.every((code) => existingCodes.includes(code)) &&
        existingCodes.every((code) => REQUIRED_TOOL_CODES.includes(code)) &&
        duplicateCodes.length === 0 &&
        duplicateReadiness.length === 0,
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
