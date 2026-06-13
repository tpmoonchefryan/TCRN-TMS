#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

const UAT_FIXTURE = {
  tenantCode: 'UAT_CORP',
  tenantSchemaName: 'tenant_uat_corp',
};

function readArg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function loadEnv(productRoot) {
  for (const fileName of ['.env', '.env.local']) {
    const filePath = path.join(productRoot, fileName);
    if (!existsSync(filePath)) {
      continue;
    }
    for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
        continue;
      }
      const [key, ...valueParts] = trimmed.split('=');
      if (!process.env[key]) {
        process.env[key] = valueParts.join('=').replace(/^['"]|['"]$/g, '');
      }
    }
  }
}

async function withDb(productRoot, fn) {
  loadEnv(productRoot);
  if (!process.env.DATABASE_URL) {
    return { dbAvailable: false, error: 'DATABASE_URL not set', value: null };
  }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    return { dbAvailable: true, error: null, value: await fn(pool) };
  } catch (error) {
    return {
      dbAvailable: false,
      error: error instanceof Error ? error.message : String(error),
      value: null,
    };
  } finally {
    await pool.end();
  }
}

function normalizeStoredFlow(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { nodes: [], transitions: [], homepagePolicyByStage: [] };
  }

  return {
    nodes: Array.isArray(value.nodes) ? value.nodes : [],
    transitions: Array.isArray(value.transitions) ? value.transitions : [],
    homepagePolicyByStage: Array.isArray(value.homepagePolicyByStage)
      ? value.homepagePolicyByStage
      : [],
  };
}

function findStageByStatus(stages, status) {
  return stages.find((stage) => stage.isActive && stage.artistStatusCode === status) ?? null;
}

function buildChecks(readback) {
  const activeStatusCodes = new Set(
    readback.dictionaries
      .filter((item) => item.dictionaryCode === 'artist-status' && item.isActive)
      .map((item) => item.code),
  );
  const activeTemplateTypeCodes = new Set(
    readback.dictionaries
      .filter((item) => item.dictionaryCode === 'homepage-template-type' && item.isActive)
      .map((item) => item.code),
  );
  const stages = readback.artistStages.filter((stage) => stage.isActive);
  const stageIds = new Set(stages.map((stage) => stage.id));
  const transitionPairs = new Set(
    readback.flow.transitions.map(
      (transition) => `${transition.fromStageId}:${transition.toStageId}`,
    ),
  );
  const draftStage = findStageByStatus(stages, 'draft');
  const publishedStage = findStageByStatus(stages, 'published');
  const disabledStage = findStageByStatus(stages, 'disabled');
  const forbiddenPair = stages
    .flatMap((fromStage) =>
      stages
        .filter((toStage) => fromStage.id !== toStage.id)
        .map((toStage) => ({ fromStage, toStage })),
    )
    .find(({ fromStage, toStage }) => !transitionPairs.has(`${fromStage.id}:${toStage.id}`));
  const legacyBypassProbe =
    draftStage && disabledStage
      ? {
          action: 'disable',
          fromStageId: draftStage.id,
          toStageId: disabledStage.id,
          expectedResult: transitionPairs.has(`${draftStage.id}:${disabledStage.id}`)
            ? 'not_a_forbidden_probe'
            : 'rejected_by_absent_flow_edge',
        }
      : null;

  return {
    artistStatusDictionaryActive: activeStatusCodes.size >= 3,
    homepageTemplateTypeDictionaryActive: activeTemplateTypeCodes.size >= 3,
    activeStagesUseArtistStatusDictionary: stages.every((stage) =>
      activeStatusCodes.has(stage.artistStatusCode),
    ),
    activeStagesUseHomepageTemplateTypeDictionary: stages.every((stage) =>
      activeTemplateTypeCodes.has(stage.homepageTemplateTypeCode),
    ),
    talentLifecycleStatusDerivedFromStage: readback.talents.every(
      (talent) => talent.lifecycleStatus === talent.artistStatusCode,
    ),
    arbitraryTenantStagesPresent: ['draft', 'published', 'disabled'].every((status) =>
      stages.some((stage) => stage.artistStatusCode === status),
    ),
    flowNodesReferenceActiveStages: readback.flow.nodes.every((node) => stageIds.has(node.stageId)),
    flowTransitionsReferenceActiveStages: readback.flow.transitions.every(
      (transition) => stageIds.has(transition.fromStageId) && stageIds.has(transition.toStageId),
    ),
    homepagePolicyUsesTemplateTypeCodes: readback.flow.homepagePolicyByStage.every((policy) =>
      (policy.allowedTemplateTypeCodes ?? []).every((code) => activeTemplateTypeCodes.has(code)),
    ),
    allowedReturn:
      publishedStage && draftStage
        ? {
            fromStageCode: publishedStage.code,
            toStageCode: draftStage.code,
            present: transitionPairs.has(`${publishedStage.id}:${draftStage.id}`),
          }
        : { fromStageCode: null, toStageCode: null, present: false },
    forbiddenTransitionProbe: forbiddenPair
      ? {
          fromStageCode: forbiddenPair.fromStage.code,
          toStageCode: forbiddenPair.toStage.code,
          expectedResult: 'rejected_by_absent_flow_edge',
        }
      : null,
    legacyBypassProbe,
  };
}

function collectBlockedReasons(dbResult, checks) {
  const blocked = [];

  if (!dbResult.dbAvailable) {
    blocked.push('database_unavailable');
    return blocked;
  }
  if (!checks?.artistStatusDictionaryActive) {
    blocked.push('artist_status_dictionary_missing_or_inactive');
  }
  if (!checks?.homepageTemplateTypeDictionaryActive) {
    blocked.push('homepage_template_type_dictionary_missing_or_inactive');
  }
  if (!checks?.activeStagesUseArtistStatusDictionary) {
    blocked.push('artist_stage_artist_status_reference_invalid');
  }
  if (!checks?.activeStagesUseHomepageTemplateTypeDictionary) {
    blocked.push('artist_stage_template_type_reference_invalid');
  }
  if (!checks?.talentLifecycleStatusDerivedFromStage) {
    blocked.push('talent_lifecycle_status_not_derived_from_artist_stage');
  }
  if (!checks?.arbitraryTenantStagesPresent) {
    blocked.push('arbitrary_tenant_artist_stages_missing');
  }
  if (!checks?.flowNodesReferenceActiveStages) {
    blocked.push('flow_node_reference_invalid');
  }
  if (!checks?.flowTransitionsReferenceActiveStages) {
    blocked.push('flow_transition_reference_invalid');
  }
  if (!checks?.homepagePolicyUsesTemplateTypeCodes) {
    blocked.push('homepage_policy_template_type_reference_invalid');
  }
  if (!checks?.allowedReturn?.present) {
    blocked.push('flow_allowed_return_missing');
  }
  if (!checks?.forbiddenTransitionProbe) {
    blocked.push('flow_forbidden_transition_probe_missing');
  }
  if (checks?.legacyBypassProbe?.expectedResult !== 'rejected_by_absent_flow_edge') {
    blocked.push('legacy_lifecycle_bypass_probe_missing');
  }

  return blocked;
}

const outPath = readArg('--out');
const caseName = readArg('--case', 'artist-stage-flow');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const productRoot = path.resolve(__dirname, '../../..');
const dbResult = await withDb(productRoot, async (pool) => {
  const tenant = await pool.query(
    `
      SELECT id, code, schema_name AS "schemaName", settings, is_active AS "isActive"
      FROM public.tenant
      WHERE code = $1
      LIMIT 1
    `,
    [UAT_FIXTURE.tenantCode],
  );
  const tenantRow = tenant.rows[0] ?? null;
  if (!tenantRow?.schemaName) {
    return { tenant: tenantRow, dictionaries: [], artistStages: [], talents: [], flow: null };
  }
  const schema = tenantRow.schemaName;
  const [dictionaries, artistStages, talents] = await Promise.all([
    pool.query(
      `
        SELECT
          d.code AS "dictionaryCode",
          i.code,
          d.is_active AS "dictionaryActive",
          i.is_active AS "isActive"
        FROM public.system_dictionary d
        LEFT JOIN public.system_dictionary_item i ON i.dictionary_code = d.code
        WHERE d.code = ANY($1::text[])
        ORDER BY d.code ASC, i.sort_order ASC, i.code ASC
      `,
      [['artist-status', 'homepage-template-type']],
    ),
    pool.query(
      `
        SELECT
          id,
          code,
          artist_status_code AS "artistStatusCode",
          homepage_template_type_code AS "homepageTemplateTypeCode",
          is_active AS "isActive",
          sort_order AS "sortOrder"
        FROM "${schema}".artist_stage
        WHERE owner_type = 'tenant'
          AND owner_id IS NULL
        ORDER BY sort_order ASC, code ASC
      `,
    ),
    pool.query(
      `
        SELECT
          t.id,
          t.code,
          t.artist_stage_id AS "artistStageId",
          t.lifecycle_status AS "lifecycleStatus",
          s.artist_status_code AS "artistStatusCode",
          s.code AS "artistStageCode"
        FROM "${schema}".talent t
        INNER JOIN "${schema}".artist_stage s ON s.id = t.artist_stage_id
        WHERE t.code LIKE 'TALENT_%'
        ORDER BY t.code ASC
      `,
    ),
  ]);

  return {
    tenant: {
      id: tenantRow.id,
      code: tenantRow.code,
      schemaName: tenantRow.schemaName,
      isActive: tenantRow.isActive,
    },
    dictionaries: dictionaries.rows,
    artistStages: artistStages.rows,
    talents: talents.rows,
    flow: normalizeStoredFlow(tenantRow.settings?.artistLifecycleFlow),
  };
});
const readback = dbResult.value ?? {
  tenant: null,
  dictionaries: [],
  artistStages: [],
  talents: [],
  flow: normalizeStoredFlow(null),
};
const checks = dbResult.dbAvailable ? buildChecks(readback) : null;
const blockedReasons = collectBlockedReasons(dbResult, checks);
const payload = {
  passed: blockedReasons.length === 0,
  testLayer: 'database-lifecycle-flow-readback',
  targetScope: 'tenant:UAT_CORP',
  case: caseName,
  checkedAt: new Date().toISOString(),
  productRoot,
  dbAvailable: dbResult.dbAvailable,
  dbError: dbResult.error ? 'redacted-db-lifecycle-flow-error' : null,
  readback,
  checks,
  warningCount: 0,
  blockedCount: blockedReasons.length,
  blockedReasons,
  redaction: {
    containsSecrets: false,
    rawPayloadIncluded: false,
  },
};

if (outPath) {
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify(payload, null, 2));

if (!payload.passed) {
  process.exitCode = 1;
}
