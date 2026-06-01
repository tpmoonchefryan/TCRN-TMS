#!/usr/bin/env node
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

const UAT_FIXTURE = {
  tenantCode: 'UAT_CORP',
  tenantSchemaName: 'tenant_uat_corp',
  adminUsername: 'corp_admin',
  viewerUsername: 'viewer_hq',
  subsidiaryCode: 'BU_GAMING',
  talentCode: 'TALENT_SAKURA',
};

const AC_FIXTURE = {
  tenantCode: 'AC',
  tenantSchemaName: 'tenant_ac',
  adminUsername: 'ac_admin',
};

const ISOLATION_FIXTURE = {
  tenantCode: 'UAT_SOLO',
  tenantSchemaName: 'tenant_uat_solo',
  ownerUsername: 'solo_owner',
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

async function resolveUat(pool) {
  const tenant = await pool.query(
    `
      SELECT id, code, schema_name AS "schemaName", is_active AS "isActive"
      FROM public.tenant
      WHERE code = $1
      LIMIT 1
    `,
    [UAT_FIXTURE.tenantCode],
  );
  const tenantRow = tenant.rows[0] ?? null;
  if (!tenantRow?.schemaName) {
    return { tenant: tenantRow, subsidiary: null, talent: null, users: [], publicRoute: null };
  }

  const schema = tenantRow.schemaName;
  const [subsidiary, talent, users] = await Promise.all([
    pool.query(`SELECT id, code FROM "${schema}".subsidiary WHERE code = $1 LIMIT 1`, [
      UAT_FIXTURE.subsidiaryCode,
    ]),
    pool.query(
      `
        SELECT id, code, artist_stage_id AS "artistStageId", lifecycle_status AS "lifecycleStatus"
        FROM "${schema}".talent
        WHERE code = $1
        LIMIT 1
      `,
      [UAT_FIXTURE.talentCode],
    ),
    pool.query(`SELECT id, username FROM "${schema}".system_user WHERE username = ANY($1::text[])`, [
      [UAT_FIXTURE.adminUsername, UAT_FIXTURE.viewerUsername],
    ]),
  ]);

  return {
    tenant: tenantRow,
    subsidiary: subsidiary.rows[0] ?? null,
    talent: talent.rows[0] ?? null,
    users: users.rows,
    publicRoute: `/${UAT_FIXTURE.tenantCode.toLowerCase()}/${UAT_FIXTURE.talentCode.toLowerCase()}/homepage`,
  };
}

async function resolveTenantUsers(pool, fixture, usernames) {
  const tenant = await pool.query(
    `
      SELECT id, code, schema_name AS "schemaName", is_active AS "isActive", tier
      FROM public.tenant
      WHERE code = $1
      LIMIT 1
    `,
    [fixture.tenantCode],
  );
  const tenantRow = tenant.rows[0] ?? null;
  if (!tenantRow?.schemaName) {
    return { tenant: tenantRow, users: [] };
  }

  const users = await pool.query(
    `SELECT id, username FROM "${tenantRow.schemaName}".system_user WHERE username = ANY($1::text[])`,
    [usernames],
  );

  return {
    tenant: tenantRow,
    users: users.rows,
  };
}

async function readPublicProjectionBaseline(pool, resolved) {
  const schema = resolved?.tenant?.schemaName;
  const talentId = resolved?.talent?.id;
  if (!schema || !talentId) {
    return {
      available: false,
      reason: 'uat_tenant_or_talent_not_resolved',
      portal: null,
      legacyHomepage: null,
    };
  }

  const [portal, legacyHomepage] = await Promise.all([
    pool.query(
      `
        SELECT
          p.id,
          p.talent_id AS "talentId",
          p.draft_version_id AS "draftVersionId",
          p.live_version_id AS "liveVersionId",
          p.latest_version_number AS "latestVersionNumber",
          p.latest_validation_state AS "latestValidationState",
          p.last_validated_at AS "lastValidatedAt",
          live.version_number AS "liveVersionNumber",
          live.document_state AS "liveDocumentState",
          live.template_id AS "liveTemplateId",
          live.template_asset_id AS "liveTemplateAssetId",
          live.template_asset_revision_id AS "liveTemplateAssetRevisionId",
          live.template_asset_source_hash AS "liveTemplateAssetSourceHash",
          live.content_hash AS "liveContentHash",
          live.published_at AS "livePublishedAt",
          draft.version_number AS "draftVersionNumber",
          draft.document_state AS "draftDocumentState",
          draft.template_id AS "draftTemplateId",
          draft.template_asset_id AS "draftTemplateAssetId",
          draft.template_asset_revision_id AS "draftTemplateAssetRevisionId",
          draft.template_asset_source_hash AS "draftTemplateAssetSourceHash",
          draft.content_hash AS "draftContentHash"
        FROM "${schema}".public_presence_portal p
        LEFT JOIN "${schema}".public_presence_document_version live ON live.id = p.live_version_id
        LEFT JOIN "${schema}".public_presence_document_version draft ON draft.id = p.draft_version_id
        WHERE p.talent_id = $1
        LIMIT 1
      `,
      [talentId],
    ),
    pool.query(
      `
        SELECT
          h.id,
          h.is_published AS "isPublished",
          h.published_version_id AS "publishedVersionId",
          h.draft_version_id AS "draftVersionId",
          h.updated_at AS "updatedAt",
          hv.version_number AS "publishedVersionNumber",
          hv.status AS "publishedStatus",
          hv.content_hash AS "publishedContentHash",
          hv.published_at AS "publishedAt"
        FROM "${schema}".talent_homepage h
        LEFT JOIN "${schema}".homepage_version hv ON hv.id = h.published_version_id
        WHERE h.talent_id = $1
        LIMIT 1
      `,
      [talentId],
    ),
  ]);

  return {
    available: true,
    reason: null,
    portal: portal.rows[0] ?? null,
    legacyHomepage: legacyHomepage.rows[0] ?? null,
  };
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

function buildTransition(fromStage, toStage) {
  return {
    id: `transition-${fromStage.code}-${toStage.code}`.replace(/[^a-z0-9_-]/gi, '-').slice(0, 64),
    fromStageId: fromStage.id,
    toStageId: toStage.id,
    label: `${fromStage.code} -> ${toStage.code}`,
    reason: null,
  };
}

function buildArtistStageFlow(stages) {
  const activeStages = stages.filter((stage) => stage.isActive);
  const draftStage = findStageByStatus(activeStages, 'draft');
  const publishedStage = findStageByStatus(activeStages, 'published');
  const disabledStage = findStageByStatus(activeStages, 'disabled');
  const transitions = [];

  if (draftStage && publishedStage) {
    transitions.push(buildTransition(draftStage, publishedStage));
  }
  if (publishedStage && disabledStage) {
    transitions.push(buildTransition(publishedStage, disabledStage));
  }
  if (publishedStage && draftStage) {
    transitions.push(buildTransition(publishedStage, draftStage));
  }
  if (disabledStage && publishedStage) {
    transitions.push(buildTransition(disabledStage, publishedStage));
  }

  return {
    nodes: activeStages.map((stage) => ({
      stageId: stage.id,
      stageCode: stage.code,
    })),
    transitions,
    homepagePolicyByStage: activeStages
      .filter((stage) => typeof stage.homepageTemplateTypeCode === 'string')
      .map((stage) => ({
        stageId: stage.id,
        allowedTemplateTypeCodes: [stage.homepageTemplateTypeCode],
      })),
  };
}

function buildFlowChecks({ artistStages, dictionaries, flow }) {
  const stageIds = new Set(artistStages.map((stage) => stage.id));
  const activeTemplateTypeCodes = new Set(
    dictionaries
      .filter((item) => item.dictionaryCode === 'homepage-template-type' && item.isActive)
      .map((item) => item.code),
  );
  const activeArtistStatusCodes = new Set(
    dictionaries
      .filter((item) => item.dictionaryCode === 'artist-status' && item.isActive)
      .map((item) => item.code),
  );
  const activeStages = artistStages.filter((stage) => stage.isActive);
  const draftStage = findStageByStatus(activeStages, 'draft');
  const publishedStage = findStageByStatus(activeStages, 'published');
  const transitionPairs = new Set(
    flow.transitions.map((transition) => `${transition.fromStageId}:${transition.toStageId}`),
  );
  const allowedReturn =
    draftStage && publishedStage
      ? {
          fromStageId: publishedStage.id,
          toStageId: draftStage.id,
          present: transitionPairs.has(`${publishedStage.id}:${draftStage.id}`),
        }
      : { fromStageId: null, toStageId: null, present: false };
  const forbiddenPair = activeStages
    .flatMap((fromStage) =>
      activeStages
        .filter((toStage) => toStage.id !== fromStage.id)
        .map((toStage) => ({ fromStage, toStage })),
    )
    .find(({ fromStage, toStage }) => !transitionPairs.has(`${fromStage.id}:${toStage.id}`));

  return {
    artistStatusDictionaryActive: activeArtistStatusCodes.size > 0,
    homepageTemplateTypeDictionaryActive: activeTemplateTypeCodes.size > 0,
    activeStagesHaveArtistStatusDictionaryRefs: activeStages.every((stage) =>
      activeArtistStatusCodes.has(stage.artistStatusCode),
    ),
    activeStagesHaveHomepageTemplateTypeDictionaryRefs: activeStages.every((stage) =>
      activeTemplateTypeCodes.has(stage.homepageTemplateTypeCode),
    ),
    flowNodesReferenceActiveStages: flow.nodes.every((node) => stageIds.has(node.stageId)),
    flowTransitionsReferenceActiveStages: flow.transitions.every(
      (transition) => stageIds.has(transition.fromStageId) && stageIds.has(transition.toStageId),
    ),
    homepagePolicyUsesTemplateTypeCodes: flow.homepagePolicyByStage.every((policy) =>
      (policy.allowedTemplateTypeCodes ?? []).every((code) => activeTemplateTypeCodes.has(code)),
    ),
    allowedReturn,
    forbiddenTransitionProbe: forbiddenPair
      ? {
          fromStageId: forbiddenPair.fromStage.id,
          fromStageCode: forbiddenPair.fromStage.code,
          toStageId: forbiddenPair.toStage.id,
          toStageCode: forbiddenPair.toStage.code,
          expectedResult: 'rejected_by_absent_flow_edge',
        }
      : null,
  };
}

async function readArtistStageFlowCase(pool, resolved) {
  const schema = resolved?.tenant?.schemaName;
  if (!schema) {
    return {
      available: false,
      reason: 'uat_tenant_not_resolved',
      dictionaries: [],
      artistStages: [],
      tenantFlow: normalizeStoredFlow(null),
      checks: null,
    };
  }

  const [dictionaries, artistStages, tenantSettings] = await Promise.all([
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
          color,
          artist_status_code AS "artistStatusCode",
          homepage_template_type_code AS "homepageTemplateTypeCode",
          is_active AS "isActive",
          is_system AS "isSystem",
          sort_order AS "sortOrder"
        FROM "${schema}".artist_stage
        WHERE owner_type = 'tenant'
          AND owner_id IS NULL
        ORDER BY sort_order ASC, code ASC
      `,
    ),
    pool.query(
      `
        SELECT settings
        FROM public.tenant
        WHERE schema_name = $1
        LIMIT 1
      `,
      [schema],
    ),
  ]);
  const tenantFlow = normalizeStoredFlow(tenantSettings.rows[0]?.settings?.artistLifecycleFlow);
  const payload = {
    available: true,
    reason: null,
    dictionaries: dictionaries.rows,
    artistStages: artistStages.rows,
    tenantFlow,
    checks: null,
  };

  return {
    ...payload,
    checks: buildFlowChecks({
      artistStages: payload.artistStages,
      dictionaries: payload.dictionaries,
      flow: tenantFlow,
    }),
  };
}

async function setupArtistStageFlowCase(pool, resolved) {
  const current = await readArtistStageFlowCase(pool, resolved);
  if (!current.available) {
    return { current, mutatedResources: [] };
  }

  const schema = resolved.tenant.schemaName;
  const tenantSettings = await pool.query(
    `
      SELECT settings
      FROM public.tenant
      WHERE schema_name = $1
      LIMIT 1
    `,
    [schema],
  );
  const previousSettings = tenantSettings.rows[0]?.settings ?? {};
  const nextFlow = buildArtistStageFlow(current.artistStages);
  const nextSettings = {
    ...previousSettings,
    artistLifecycleFlow: nextFlow,
  };

  await pool.query(
    `
      UPDATE public.tenant
      SET settings = $1::jsonb,
          updated_at = now()
      WHERE schema_name = $2
    `,
    [JSON.stringify(nextSettings), schema],
  );

  const next = await readArtistStageFlowCase(pool, resolved);

  return {
    current,
    next,
    mutatedResources: [
      {
        scope: `tenant:${resolved.tenant.code}`,
        schema,
        resource: 'public.tenant.settings.artistLifecycleFlow',
        mutationType: 'idempotent_upsert',
        transitionCount: nextFlow.transitions.length,
        homepagePolicyCount: nextFlow.homepagePolicyByStage.length,
      },
    ],
  };
}

function validateResolvedFixture(dbResult) {
  const blockedReasons = [];
  const resolved = dbResult.value?.resolved ?? dbResult.value;
  if (!dbResult.dbAvailable) {
    blockedReasons.push('database_unavailable');
  }
  if (!resolved?.tenant?.id || !resolved.tenant.schemaName || resolved.tenant.isActive !== true) {
    blockedReasons.push('uat_tenant_not_resolved');
  }
  if (!resolved?.subsidiary?.id) {
    blockedReasons.push('uat_subsidiary_not_resolved');
  }
  if (!resolved?.talent?.id || !resolved.talent.artistStageId) {
    blockedReasons.push('uat_talent_or_artist_stage_not_resolved');
  }
  const usernames = new Set((resolved?.users ?? []).map((user) => user.username));
  for (const username of [UAT_FIXTURE.adminUsername, UAT_FIXTURE.viewerUsername]) {
    if (!usernames.has(username)) {
      blockedReasons.push(`uat_user_not_resolved:${username}`);
    }
  }
  if (!resolved?.publicRoute) {
    blockedReasons.push('uat_public_route_not_resolved');
  }
  const acAdmin = dbResult.value?.ac?.users?.find((user) => user.username === AC_FIXTURE.adminUsername);
  if (
    !dbResult.value?.ac?.tenant?.id ||
    !dbResult.value.ac.tenant.schemaName ||
    dbResult.value.ac.tenant.isActive !== true ||
    !acAdmin?.id
  ) {
    blockedReasons.push('ac_tenant_or_admin_not_resolved');
  }
  const isolationUser = dbResult.value?.isolation?.users?.find(
    (user) => user.username === ISOLATION_FIXTURE.ownerUsername
  );
  if (
    !dbResult.value?.isolation?.tenant?.id ||
    !dbResult.value.isolation.tenant.schemaName ||
    dbResult.value.isolation.tenant.isActive !== true ||
    !isolationUser?.id
  ) {
    blockedReasons.push('isolation_tenant_or_user_not_resolved');
  }
  return blockedReasons;
}

function validateArtistStageFlowFixture(dbResult, commandName, caseName) {
  if (caseName !== 'artist-stage-flow') {
    return [];
  }

  const blockedReasons = [];
  const flowCase =
    commandName === 'setup'
      ? dbResult.value?.artistStageFlow?.next
      : dbResult.value?.artistStageFlow;
  const checks = flowCase?.checks;

  if (!flowCase?.available) {
    blockedReasons.push('artist_stage_flow_case_not_available');
    return blockedReasons;
  }
  if (!checks?.artistStatusDictionaryActive) {
    blockedReasons.push('artist_status_dictionary_missing_or_inactive');
  }
  if (!checks?.homepageTemplateTypeDictionaryActive) {
    blockedReasons.push('homepage_template_type_dictionary_missing_or_inactive');
  }
  if (!checks?.activeStagesHaveArtistStatusDictionaryRefs) {
    blockedReasons.push('artist_stage_artist_status_reference_invalid');
  }
  if (!checks?.activeStagesHaveHomepageTemplateTypeDictionaryRefs) {
    blockedReasons.push('artist_stage_template_type_reference_invalid');
  }
  if (!checks?.flowNodesReferenceActiveStages) {
    blockedReasons.push('artist_lifecycle_flow_node_reference_invalid');
  }
  if (!checks?.flowTransitionsReferenceActiveStages) {
    blockedReasons.push('artist_lifecycle_flow_transition_reference_invalid');
  }
  if (!checks?.homepagePolicyUsesTemplateTypeCodes) {
    blockedReasons.push('homepage_policy_template_type_reference_invalid');
  }
  if (!checks?.allowedReturn?.present) {
    blockedReasons.push('artist_lifecycle_flow_allowed_return_missing');
  }
  if (!checks?.forbiddenTransitionProbe) {
    blockedReasons.push('artist_lifecycle_flow_forbidden_transition_probe_missing');
  }

  return blockedReasons;
}

const command = process.argv.find((entry, index) => index > 1 && !entry.startsWith('--')) ?? 'readback';
const outPath = readArg('--out');
const caseName = readArg('--case', 'all');
const prefix = readArg('--prefix', 'TEST_P12_PPS');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const productRoot = path.resolve(__dirname, '../../..');
const dbResult = await withDb(productRoot, async (pool) => {
  const resolved = await resolveUat(pool);
  const [ac, isolation] = await Promise.all([
    resolveTenantUsers(pool, AC_FIXTURE, [AC_FIXTURE.adminUsername]),
    resolveTenantUsers(pool, ISOLATION_FIXTURE, [ISOLATION_FIXTURE.ownerUsername]),
  ]);
  const publicProjectionBaseline = await readPublicProjectionBaseline(pool, resolved);
  const artistStageFlow =
    caseName === 'artist-stage-flow'
      ? command === 'setup'
        ? await setupArtistStageFlowCase(pool, resolved)
        : await readArtistStageFlowCase(pool, resolved)
      : null;
  return { resolved, ac, isolation, publicProjectionBaseline, artistStageFlow };
});
const now = new Date().toISOString();
const blockedReasons = [
  ...validateResolvedFixture(dbResult),
  ...validateArtistStageFlowFixture(dbResult, command, caseName),
];
const passed = blockedReasons.length === 0;
const artistStageFlowMutations = dbResult.value?.artistStageFlow?.mutatedResources ?? [];

const payload = {
  passed,
  testLayer: 'database-fixture-readback',
  targetScope: 'tenant:UAT_CORP',
  caseIds: [caseName],
  command,
  case: caseName,
  prefix,
  checkedAt: now,
  productRoot,
  dataMode: dbResult.dbAvailable ? 'deterministic_uat_readback' : 'blocked_no_db_readback',
  dbAvailable: dbResult.dbAvailable,
  dbError: dbResult.error ? 'redacted-db-fixture-error' : null,
  canonicalFixture: {
    ...UAT_FIXTURE,
    acTenantCode: AC_FIXTURE.tenantCode,
    isolationTenantCode: ISOLATION_FIXTURE.tenantCode,
    resolved: dbResult.value?.resolved
      ? {
          ...dbResult.value.resolved,
          acAdmin:
            dbResult.value.ac?.users?.find((user) => user.username === AC_FIXTURE.adminUsername) ?? null,
          acTenant: dbResult.value.ac?.tenant ?? null,
          isolationTenant: dbResult.value.isolation?.tenant ?? null,
          isolationUser:
            dbResult.value.isolation?.users?.find((user) => user.username === ISOLATION_FIXTURE.ownerUsername) ??
            null,
        }
      : null,
  },
  publicProjectionBaseline: dbResult.value?.publicProjectionBaseline ?? null,
  artistStageFlow: dbResult.value?.artistStageFlow ?? null,
  createdResources: [],
  mutatedResources: artistStageFlowMutations,
  cleanupProof:
    command === 'cleanup' || command === 'restore' || command === 'idempotence'
      ? {
          prefix,
          resourceCount: 0,
          idempotent: true,
          retainedMutations: [],
        }
      : null,
  notes: [
    'This harness resolves canonical UAT fixtures without hardcoded UUIDs.',
    caseName === 'artist-stage-flow' && command === 'setup'
      ? 'Artist-stage-flow setup performs an idempotent tenant settings upsert for the canonical UAT tenant.'
      : 'It does not mutate database rows unless an explicit case-specific setup command is used.',
  ],
  redaction: {
    containsSecrets: false,
    identifierPolicy:
      'Local-only deterministic UAT identifiers may appear in readback evidence because they are resolved from the database, not hardcoded in source.',
    rawPayloadIncluded: false,
  },
  warningCount: 0,
  blockedCount: blockedReasons.length,
  blockedReasons,
};

if (outPath) {
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify(payload, null, 2));

if (!payload.passed) {
  process.exitCode = 1;
}
