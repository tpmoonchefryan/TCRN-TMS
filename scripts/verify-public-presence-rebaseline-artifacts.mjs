#!/usr/bin/env node
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const TEXT_EXTENSIONS = new Set(['.json', '.md', '.txt', '.html', '.log']);
const REDACTION_PATTERNS = [
  { id: 'credential-path', regex: /\.llm\/credentials/i },
  { id: 'private-key', regex: /BEGIN [A-Z ]*PRIVATE KEY/ },
  { id: 'cookie', regex: /\bcookie\b/i },
  { id: 'password', regex: /\bpassword\b/i },
  { id: 'secret', regex: /\bsecret\b/i },
  { id: 'token', regex: /\btoken\b/i },
  { id: 'database-url', regex: /DATABASE_URL/ },
  { id: 'raw-source-bundle-contents', regex: /sourceBundle\s*[:=]|source_bundle|rawSourceBundle/i },
  { id: 'raw-file-contents', regex: /"contents"\s*:\s*"/ },
  { id: 'unpublished-public-payload', regex: /unpublishedPublicPayload|hiddenRevealPayload/i },
];
const CANONICAL_MATRIX_IDS = [
  'PPS-IA-01',
  'PPS-DICT-01',
  'PPS-STAGE-01',
  'PPS-FLOW-01',
  'PPS-FLOW-02',
  'PPS-TALENT-01',
  'PPS-TALENT-02',
  'PPS-TALENT-03',
  'PPS-ASSET-01',
  'PPS-ASSET-02',
  'PPS-ASSET-03',
  'PPS-IDE-01',
  'PPS-IDE-02',
  'PPS-STUDIO-01',
  'PPS-STUDIO-02',
  'PPS-PUBLISH-01',
  'PPS-PUBLISH-02',
  'PPS-UX-01',
  'PPS-A11Y-01',
  'PPS-COPY-01',
  'PPS-I18N-01',
];

function readArg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function readManifest(filePath) {
  const manifest = JSON.parse(readFileSync(filePath, 'utf8'));
  if (Array.isArray(manifest.requiredFiles)) {
    return manifest.requiredFiles;
  }
  if (Array.isArray(manifest.cases)) {
    return [...new Set(manifest.cases.flatMap((entry) => entry.files ?? []))];
  }
  throw new Error('Manifest must contain requiredFiles or cases[].files');
}

function verifyPng(filePath) {
  const signature = readFileSync(filePath).subarray(0, 8);
  return signature.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}

function readEvidenceJson(relativeFile) {
  return JSON.parse(readFileSync(path.join(evidenceDir, relativeFile), 'utf8'));
}

function hasRect(rect) {
  return Boolean(rect && typeof rect === 'object' && rect.height > 0 && rect.width > 0);
}

function isValidWrongTenantEvidence(readback) {
  return (
    readback?.validWrongTenant === true &&
    readback?.blockedCount === 0 &&
    readback?.denial?.actor !== 'invalid_tenant_probe' &&
    (readback?.denial?.status === 403 || readback?.denial?.status === 404)
  );
}

function semanticChecks() {
  if (
    !requiredFiles.includes('p12-full-acceptance-matrix.json') &&
    !requiredFiles.includes('p12-source-scan-classification.json')
  ) {
    return [];
  }

  const findings = [];
  const add = (id, relativeFile, passed, detail = null) => {
    if (!passed) {
      findings.push({ id, file: relativeFile, detail });
    }
  };

  try {
    const matrix = readEvidenceJson('p12-full-acceptance-matrix.json');
    const matrixIds = (matrix.matrixCases ?? []).map((entry) => entry.id);
    add(
      'canonical-matrix-case-list',
      'p12-full-acceptance-matrix.json',
      JSON.stringify(matrixIds) === JSON.stringify(CANONICAL_MATRIX_IDS),
      { expected: CANONICAL_MATRIX_IDS, actual: matrixIds }
    );
    add('matrix-zero-warning', 'p12-full-acceptance-matrix.json', matrix.warningCount === 0);
    add('matrix-zero-blocked', 'p12-full-acceptance-matrix.json', matrix.blockedCount === 0);
  } catch (error) {
    add('matrix-json-readable', 'p12-full-acceptance-matrix.json', false, String(error));
  }

  try {
    const desktop = readEvidenceJson('p12-studio-covered-desktop-zh_Hans.bounds.json').selectors;
    for (const key of ['canvas', 'leftRail', 'rightDrawer', 'topbar']) {
      add(`studio-desktop-${key}-bounds`, 'p12-studio-covered-desktop-zh_Hans.bounds.json', hasRect(desktop?.[key]));
    }
    const mobile = readEvidenceJson('p12-studio-mobile-zh_Hans.bounds.json').selectors;
    for (const key of ['canvas', 'manageButton', 'topbar']) {
      add(`studio-mobile-${key}-bounds`, 'p12-studio-mobile-zh_Hans.bounds.json', hasRect(mobile?.[key]));
    }
  } catch (error) {
    add('studio-bounds-json-readable', 'p12-studio-covered-desktop-zh_Hans.bounds.json', false, String(error));
  }

  try {
    const publish = readEvidenceJson('p12-publish-pin-readback.json');
    const live = publish.pinSummary?.liveAfterPublish;
    add('publish-api-success', 'p12-publish-pin-readback.json', publish.pinSummary?.publishStatus < 400);
    add('publish-live-version-id', 'p12-publish-pin-readback.json', Boolean(live?.id));
    add('publish-live-content-hash', 'p12-publish-pin-readback.json', Boolean(live?.contentHash));
    add('publish-live-validation-snapshot', 'p12-publish-pin-readback.json', Boolean(live?.lastValidationSnapshotId));
    add('publish-live-projection-hash', 'p12-publish-pin-readback.json', Boolean(live?.projectionHash));
    add(
      'publish-template-asset-pin',
      'p12-publish-pin-readback.json',
      Boolean(live?.templateAssetPin?.assetId && live?.templateAssetPin?.assetRevisionId && live?.templateAssetPin?.sourceHash)
    );
  } catch (error) {
    add('publish-pin-json-readable', 'p12-publish-pin-readback.json', false, String(error));
  }

  try {
    const publish = readEvidenceJson('p12-publish-pin-readback.json');
    const immutability = readEvidenceJson('p12-post-publish-immutability-readback.json');
    const livePin = publish.pinSummary?.liveAfterPublish?.templateAssetPin;
    const edited = immutability.postPublishAssetEdit;
    const editedReload = edited?.reloaded;
    add(
      'post-publish-projection-unchanged',
      'p12-post-publish-immutability-readback.json',
      immutability.publicProjectionUnchanged === true
    );
    add(
      'post-publish-live-pin-unchanged',
      'p12-post-publish-immutability-readback.json',
      immutability.liveVersionUnchanged === true
    );
    add(
      'post-publish-asset-edit-success',
      'p12-post-publish-immutability-readback.json',
      immutability.postPublishAssetEdit?.editStatus < 400
    );
    add(
      'post-publish-edited-asset-is-live-pin',
      'p12-post-publish-immutability-readback.json',
      Boolean(livePin?.assetId) &&
        edited?.assetId === livePin?.assetId &&
        immutability.pinnedAssetEditProof?.editedAssetMatchesLivePin === true
    );
    add(
      'post-publish-edit-created-new-asset-revision',
      'p12-post-publish-immutability-readback.json',
      Boolean(livePin?.assetRevisionId) &&
        Boolean(editedReload?.currentRevisionId) &&
        editedReload.currentRevisionId !== livePin.assetRevisionId &&
        immutability.pinnedAssetEditProof?.editedRevisionDiffersFromLivePin === true
    );
  } catch (error) {
    add('post-publish-immutability-json-readable', 'p12-post-publish-immutability-readback.json', false, String(error));
  }

  for (const [id, relativeFile] of [
    ['template-ide-authorized-reload', 'p12-template-ide-save-reload-readback.json'],
    ['component-ide-authorized-reload', 'p12-component-ide-save-reload-readback.json'],
  ]) {
    try {
      const readback = readEvidenceJson(relativeFile);
      add(id, relativeFile, readback.authorizedReload?.ok === true);
      add(`${id}-zero-blocked`, relativeFile, readback.blockedCount === 0);
    } catch (error) {
      add(`${id}-json-readable`, relativeFile, false, String(error));
    }
  }

  try {
    const homepage = readEvidenceJson('p12-homepage-wrong-tenant-denial.json');
    add(
      'homepage-wrong-tenant-specific-route',
      'p12-homepage-wrong-tenant-denial.json',
      homepage.denial?.method === 'GET' &&
        typeof homepage.denial?.path === 'string' &&
        homepage.denial.path.includes('/public-presence') &&
        !homepage.denial.path.endsWith('/publish')
    );
    add('homepage-wrong-tenant-rejected', 'p12-homepage-wrong-tenant-denial.json', isValidWrongTenantEvidence(homepage));
  } catch (error) {
    add('homepage-wrong-tenant-json-readable', 'p12-homepage-wrong-tenant-denial.json', false, String(error));
  }

  for (const relativeFile of [
    'p12-tenant-isolation-negative-readback.json',
    'p12-asset-ide-wrong-tenant-denial.json',
    'p12-asset-duplicate-wrong-tenant-denial.json',
    'p12-publish-wrong-tenant-denial.json',
  ]) {
    try {
      const readback = readEvidenceJson(relativeFile);
      add(`${relativeFile}-valid-tenant-isolation`, relativeFile, isValidWrongTenantEvidence(readback));
    } catch (error) {
      add(`${relativeFile}-json-readable`, relativeFile, false, String(error));
    }
  }

  try {
    const systemAsset = readEvidenceJson('p12-system-asset-write-denial.json');
    add('system-asset-write-capable-actor', 'p12-system-asset-write-denial.json', systemAsset.writeCapableActor === true);
    add('system-asset-denied-403', 'p12-system-asset-write-denial.json', systemAsset.denial?.status === 403);
    add('system-asset-immutability-guard', 'p12-system-asset-write-denial.json', systemAsset.immutabilityGuardProved === true);
    add('system-asset-unchanged', 'p12-system-asset-write-denial.json', systemAsset.systemAssetUnchanged === true);
    add('system-asset-zero-blocked', 'p12-system-asset-write-denial.json', systemAsset.blockedCount === 0);
  } catch (error) {
    add('system-asset-write-denial-json-readable', 'p12-system-asset-write-denial.json', false, String(error));
  }

  try {
    const layout = readEvidenceJson('p12-layout-bounds.json');
    add('layout-zero-blocked', 'p12-layout-bounds.json', layout.blockedCount === 0);
  } catch (error) {
    add('layout-bounds-json-readable', 'p12-layout-bounds.json', false, String(error));
  }

  if (requiredFiles.includes('p12-source-scan-classification.json')) {
    try {
      const sourceScan = readEvidenceJson('p12-source-scan-classification.json');
      add('source-scan-passed', 'p12-source-scan-classification.json', sourceScan.passed === true);
      add('source-scan-zero-blocking', 'p12-source-scan-classification.json', sourceScan.counts?.blockingForbiddenHits === 0);
      add('source-scan-presence-complete', 'p12-source-scan-classification.json', sourceScan.counts?.missingRequiredPresence === 0);
    } catch (error) {
      add('source-scan-json-readable', 'p12-source-scan-classification.json', false, String(error));
    }

    for (const relativeFile of ['p12-uat-restore.json', 'p12-fixture-cleanup.json', 'p12-fixture-idempotence.json']) {
      try {
        const cleanup = readEvidenceJson(relativeFile);
        add(`${relativeFile}-passed`, relativeFile, cleanup.passed === true);
        add(`${relativeFile}-zero-warning`, relativeFile, cleanup.warningCount === 0);
        add(`${relativeFile}-zero-blocked`, relativeFile, cleanup.blockedCount === 0);
        if (relativeFile !== 'p12-uat-restore.json') {
          add(`${relativeFile}-idempotent`, relativeFile, cleanup.cleanupProof?.idempotent === true);
        }
      } catch (error) {
        add(`${relativeFile}-json-readable`, relativeFile, false, String(error));
      }
    }

    try {
      const envelope = readEvidenceJson('p12-s9-command-envelope.json');
      const commands = Array.isArray(envelope.commands) ? envelope.commands : [];
      add('command-envelope-passed', 'p12-s9-command-envelope.json', envelope.passed === true);
      add('command-envelope-all-zero', 'p12-s9-command-envelope.json', commands.length > 0 && commands.every((entry) => entry.exitCode === 0));
      add(
        'command-envelope-node24',
        'p12-s9-command-envelope.json',
        commands.length > 0 && commands.every((entry) => typeof entry.nodeVersion === 'string' && entry.nodeVersion.startsWith('v24.'))
      );
    } catch (error) {
      add('command-envelope-json-readable', 'p12-s9-command-envelope.json', false, String(error));
    }

    try {
      const resourceLedger = readEvidenceJson('p12-s9-resource-ledger-readback.json');
      const openCount = Array.isArray(resourceLedger.open) ? resourceLedger.open.length : resourceLedger.open;
      const retainedCount = Array.isArray(resourceLedger.retained) ? resourceLedger.retained.length : resourceLedger.retained;
      add('resource-ledger-zero-open-retained', 'p12-s9-resource-ledger-readback.json', openCount === 0 && retainedCount === 0);
    } catch (error) {
      add('resource-ledger-json-readable', 'p12-s9-resource-ledger-readback.json', false, String(error));
    }
  }

  return findings;
}

const evidenceDir = readArg('--evidence-dir');
const manifestPath = readArg('--required-manifest');
const outPath = readArg('--out', evidenceDir ? path.join(evidenceDir, 'p12-artifact-verification.json') : null);
const redaction = process.argv.includes('--redaction');
const outRelativePath =
  evidenceDir && outPath ? path.relative(evidenceDir, outPath).replace(/\\/g, '/') : null;

if (!evidenceDir || !manifestPath) {
  console.error('--evidence-dir and --required-manifest are required');
  process.exit(1);
}

const requiredFiles = readManifest(manifestPath);
const records = [];
const redactionFindings = [];

for (const relativeFile of requiredFiles) {
  const filePath = path.join(evidenceDir, relativeFile);
  const exists = existsSync(filePath);
  const size = exists ? statSync(filePath).size : 0;
  const record = {
    file: relativeFile,
    exists,
    nonEmpty: size > 0,
    size,
    jsonValid: null,
    pngValid: null,
  };

  if (exists && size > 0 && path.extname(relativeFile) === '.json') {
    try {
      JSON.parse(readFileSync(filePath, 'utf8'));
      record.jsonValid = true;
    } catch {
      record.jsonValid = false;
    }
  }

  if (exists && size > 0 && path.extname(relativeFile) === '.png') {
    record.pngValid = verifyPng(filePath);
  }

  const isCurrentVerifierOutput = outRelativePath === relativeFile.replace(/\\/g, '/');

  if (
    redaction &&
    exists &&
    size > 0 &&
    !isCurrentVerifierOutput &&
    TEXT_EXTENSIONS.has(path.extname(relativeFile))
  ) {
    const text = readFileSync(filePath, 'utf8');
    for (const pattern of REDACTION_PATTERNS) {
      if (pattern.regex.test(text)) {
        redactionFindings.push({ file: relativeFile, patternId: pattern.id });
      }
    }
  }

  records.push(record);
}

const missing = records.filter((record) => !record.exists || !record.nonEmpty).map((record) => record.file);
const invalidJson = records
  .filter((record) => record.jsonValid === false)
  .map((record) => record.file);
const invalidPng = records
  .filter((record) => record.pngValid === false)
  .map((record) => record.file);
const semanticFindings = semanticChecks();
const blocked = [
  ...missing,
  ...invalidJson,
  ...invalidPng,
  ...redactionFindings.map((entry) => entry.file),
  ...semanticFindings.map((entry) => entry.file),
];
const payload = {
  passed: blocked.length === 0,
  checkedAt: new Date().toISOString(),
  evidenceDir,
  manifestPath,
  requiredCount: requiredFiles.length,
  presentCount: records.filter((record) => record.exists && record.nonEmpty).length,
  missing,
  invalidJson,
  invalidPng,
  semanticFindings,
  redaction: {
    enabled: redaction,
    findings: redactionFindings,
    skippedCurrentOutput: redaction && outRelativePath ? outRelativePath : null,
  },
  warningCount: 0,
  blockedCount: blocked.length,
  records,
};

if (outPath) {
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify(payload, null, 2));

if (!payload.passed) {
  process.exitCode = 1;
}
