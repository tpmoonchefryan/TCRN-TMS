#!/usr/bin/env node
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const TEXT_EXTENSIONS = new Set([
  '.cjs',
  '.css',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mjs',
  '.prisma',
  '.sql',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml',
]);

const FORBIDDEN_PATTERNS = [
  { id: 'homepage-assets-label', regex: /Homepage Assets|主页资产/g },
  { id: 'template-center-label', regex: /Template Center/g },
  { id: 'component-store-label', regex: /Component Store/g },
  { id: 'raw-lifecycle-mapping', regex: /lifecycleStatusMapping/g },
  { id: 'raw-homepage-policy-key', regex: /homepagePolicyKey/g },
  { id: 'template-id-policy-category', regex: /allowedTemplateIds/g },
  { id: 'retired-authoring-draft', regex: /PublicPresenceAuthoringDraft/g },
  { id: 'retired-authoring-route', regex: /public-presence\/authoring/g },
  { id: 'retired-custom-homepage-key', regex: /allowCustomHomepage/g },
  { id: 'retired-homepage-enabled-key', regex: /homepageEnabled/g },
  {
    id: 'retired-advanced-route',
    regex: /studio\/public-presence\/[^"'`\s]+\/advanced/g,
    pathRegex: /studio\/public-presence\/.*\/advanced/,
  },
  {
    id: 'retired-template-new-route',
    regex: /studio\/public-presence\/[^"'`\s]+\/templates\/new/g,
    pathRegex: /studio\/public-presence\/.*\/templates\/new/,
  },
  {
    id: 'retired-component-new-route',
    regex: /studio\/public-presence\/[^"'`\s]+\/components\/new/g,
    pathRegex: /studio\/public-presence\/.*\/components\/new/,
  },
];

const REQUIRED_PRESENCE = [
  { id: 'artist-status-dictionary', regex: /artist-status|ARTIST_STATUS/g },
  { id: 'homepage-template-type-dictionary', regex: /homepage-template-type|HOMEPAGE_TEMPLATE_TYPE/g },
  { id: 'homepage-template-asset-family', regex: /homepage-template-asset/g },
  { id: 'homepage-component-asset-family', regex: /homepage-component-asset/g },
  { id: 'supported-ui-locales', regex: /SUPPORTED_UI_LOCALES/g },
  { id: 'localized-config-entity-copy', regex: /getLocalizedConfigEntityCatalog|CONFIG_ENTITY_COPY|settings-family\.copy/g },
];

function readArg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join('/');
}

function shouldSkipDirectory(dirPath) {
  const normalized = normalizePath(dirPath);
  return /(^|\/)(\.git|node_modules|dist|build|coverage|\.next|playwright-report|test-results)(\/|$)/.test(
    normalized,
  );
}

function shouldSkipFile(filePath) {
  const normalized = normalizePath(filePath);
  if (normalized.includes('/packages/database/src/generated/')) {
    return true;
  }
  return !TEXT_EXTENSIONS.has(path.extname(filePath));
}

function listFiles(root, entries = []) {
  if (!existsSync(root)) {
    return entries;
  }

  for (const child of readdirSync(root)) {
    const childPath = path.join(root, child);
    const stats = statSync(childPath);

    if (stats.isDirectory()) {
      if (!shouldSkipDirectory(childPath)) {
        listFiles(childPath, entries);
      }
      continue;
    }

    if (stats.isFile() && !shouldSkipFile(childPath)) {
      entries.push(childPath);
    }
  }

  return entries;
}

function classifyForbiddenHit(hit) {
  const file = hit.file;
  const retiredRouteSlice = [
    'retired-advanced-route',
    'retired-template-new-route',
    'retired-component-new-route',
  ].includes(hit.patternId)
    ? 'P12-S6'
    : null;

  if (/\.(test|spec)\.(ts|tsx|js|jsx|mjs)$/.test(file)) {
    return {
      classification: 'test_only_historical_or_negative_probe',
      allowed: true,
      assignedSlice: retiredRouteSlice,
      rationale: 'Test-only reference; must only prove retired route redirects or forbidden surface absence.',
    };
  }

  if (/\/(prisma\/migrations|prisma\/seeds)\//.test(file) || /\/scripts\/migrate-/.test(file)) {
    return {
      classification: 'migration_seed_or_admin_cleanup',
      allowed: true,
      assignedSlice: null,
      rationale: 'Migration/seed/admin cleanup path, not ordinary runtime UI/API authority.',
    };
  }

  if (/^scripts\/migrate-/.test(file)) {
    return {
      classification: 'migration_seed_or_admin_cleanup',
      allowed: true,
      assignedSlice: null,
      rationale: 'Top-level migration helper, not ordinary runtime UI/API authority.',
    };
  }

  if (file === 'scripts/scan-public-presence-rebaseline-authority.mjs') {
    return {
      classification: 'scanner_pattern_definition',
      allowed: true,
      assignedSlice: null,
      rationale: 'The Phase 12 classifier owns the forbidden pattern definitions it scans for.',
    };
  }

  if (
    file === 'apps/api/src/modules/settings/application/settings-application.service.ts' &&
    hit.patternId === 'retired-custom-homepage-key'
  ) {
    return {
      classification: 'retired_key_handling',
      allowed: true,
      assignedSlice: null,
      rationale: 'Explicit retired settings key handling; does not expose the key as ordinary business authority.',
    };
  }

  if (/\/scripts\/write-.*inventory.*\.mjs$/.test(`/${file}`)) {
    return {
      classification: 'historical_inventory_scan_pattern',
      allowed: true,
      assignedSlice: null,
      rationale: 'Previous-phase inventory pattern list, not a rendered Public Presence surface.',
    };
  }

  if (/\/PublicPresenceAuthoringIdeScreen\.tsx$/.test(`/${file}`)) {
    return {
      classification: 'ide_diagnostic_candidate',
      allowed: false,
      assignedSlice: 'P12-S6',
      rationale:
        'IDE diagnostics need route/reachability proof before they can be allowed; ordinary-source hit remains blocking.',
    };
  }

  return {
    classification: 'ordinary_source_forbidden',
    allowed: false,
    assignedSlice: retiredRouteSlice,
    rationale: 'Forbidden Public Presence authority/copy hit in ordinary source.',
  };
}

function ensureParent(filePath) {
  if (!filePath) {
    return;
  }
  mkdirSync(path.dirname(filePath), { recursive: true });
}

const root = path.resolve(readArg('--root', process.cwd()));
const outJson = readArg('--out-json');
const outMd = readArg('--out-md');
const currentSlice = readArg('--current-slice');
const scanRoots = ['apps', 'packages', 'scripts', 'retired-browser-tests']
  .map((entry) => path.join(root, entry))
  .filter((entry) => existsSync(entry));

const files = scanRoots.flatMap((entry) => listFiles(entry));
const forbiddenHits = [];
const requiredPresence = Object.fromEntries(
  REQUIRED_PRESENCE.map((definition) => [
    definition.id,
    { count: 0, files: new Set(), sampleFiles: [] },
  ]),
);

for (const absoluteFile of files) {
  const file = normalizePath(path.relative(root, absoluteFile));
  const text = readFileSync(absoluteFile, 'utf8');
  const lines = text.split(/\r?\n/);

  for (const definition of FORBIDDEN_PATTERNS) {
    if (definition.pathRegex?.test(file)) {
      const rawHit = { file, line: 1, patternId: definition.id, match: '[path]' };
      forbiddenHits.push({ ...rawHit, ...classifyForbiddenHit(rawHit) });
    }

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const line = lines[lineIndex];
      definition.regex.lastIndex = 0;
      let match = definition.regex.exec(line);
      while (match) {
        const rawHit = {
          file,
          line: lineIndex + 1,
          patternId: definition.id,
          match: match[0],
        };
        forbiddenHits.push({ ...rawHit, ...classifyForbiddenHit(rawHit) });
        match = definition.regex.exec(line);
      }
    }
  }

  for (const definition of REQUIRED_PRESENCE) {
    definition.regex.lastIndex = 0;
    const matches = text.match(definition.regex);
    if (!matches?.length) {
      continue;
    }

    const presence = requiredPresence[definition.id];
    presence.count += matches.length;
    presence.files.add(file);
    if (presence.sampleFiles.length < 8 && !presence.sampleFiles.includes(file)) {
      presence.sampleFiles.push(file);
    }
  }
}

const normalizedPresence = Object.fromEntries(
  Object.entries(requiredPresence).map(([id, value]) => [
    id,
    {
      count: value.count,
      fileCount: value.files.size,
      sampleFiles: value.sampleFiles,
      present: value.count > 0,
    },
  ]),
);

const missingRequiredPresence = Object.entries(normalizedPresence)
  .filter(([, value]) => !value.present)
  .map(([id]) => id);
const blockingForbiddenHits = forbiddenHits.filter((hit) => !hit.allowed);
const currentSliceBlockingForbiddenHits = currentSlice
  ? blockingForbiddenHits.filter((hit) => !hit.assignedSlice || hit.assignedSlice === currentSlice)
  : blockingForbiddenHits;
const globalPassed = blockingForbiddenHits.length === 0 && missingRequiredPresence.length === 0;
const slicePassed = currentSliceBlockingForbiddenHits.length === 0 && missingRequiredPresence.length === 0;
const gatePassed = currentSlice ? slicePassed : globalPassed;
const payload = {
  passed: globalPassed,
  slicePassed,
  gatePassed,
  checkedAt: new Date().toISOString(),
  root,
  currentSlice,
  scanRoots: scanRoots.map((entry) => normalizePath(path.relative(root, entry))),
  counts: {
    scannedFiles: files.length,
    forbiddenHits: forbiddenHits.length,
    blockingForbiddenHits: blockingForbiddenHits.length,
    currentSliceBlockingForbiddenHits: currentSliceBlockingForbiddenHits.length,
    requiredPresenceGroups: REQUIRED_PRESENCE.length,
    missingRequiredPresence: missingRequiredPresence.length,
  },
  missingRequiredPresence,
  requiredPresence: normalizedPresence,
  forbiddenHits: forbiddenHits.map(({ file, line, patternId, classification, allowed, assignedSlice, rationale }) => ({
    file,
    line,
    patternId,
    classification,
    allowed,
    assignedSlice,
    currentSliceBlocking:
      !allowed && (!currentSlice || !assignedSlice || assignedSlice === currentSlice),
    rationale,
  })),
  verdict:
    globalPassed
      ? 'passed'
      : 'failed_phase_12_authority_scan',
  currentSliceVerdict: currentSlice
    ? slicePassed
      ? 'passed_current_slice'
      : 'failed_current_slice_authority_scan'
    : null,
  executableVerdict: gatePassed ? 'passed' : 'failed',
};

if (outJson) {
  ensureParent(outJson);
  writeFileSync(outJson, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

if (outMd) {
  ensureParent(outMd);
  const md = [
    '# Phase 12 Public Presence Source Scan Classification',
    '',
    `- checkedAt: ${payload.checkedAt}`,
    `- verdict: ${payload.verdict}`,
    `- executableVerdict: ${payload.executableVerdict}`,
    `- gatePassed: ${payload.gatePassed}`,
    `- slicePassed: ${payload.slicePassed}`,
    `- currentSliceVerdict: ${payload.currentSliceVerdict || 'n/a'}`,
    `- scannedFiles: ${payload.counts.scannedFiles}`,
    `- forbiddenHits: ${payload.counts.forbiddenHits}`,
    `- blockingForbiddenHits: ${payload.counts.blockingForbiddenHits}`,
    `- currentSlice: ${payload.currentSlice || 'global'}`,
    `- currentSliceBlockingForbiddenHits: ${payload.counts.currentSliceBlockingForbiddenHits}`,
    `- missingRequiredPresence: ${payload.missingRequiredPresence.join(', ') || 'none'}`,
    '',
    '## Required Presence',
    '',
    '| Pattern Group | Present | Count | Sample Files |',
    '| --- | --- | ---: | --- |',
    ...Object.entries(payload.requiredPresence).map(
      ([id, value]) =>
        `| ${id} | ${value.present ? 'yes' : 'no'} | ${value.count} | ${value.sampleFiles.join('<br>') || '-'} |`,
    ),
    '',
    '## Forbidden Hit Classification',
    '',
    '| File | Line | Pattern | Classification | Allowed | Assigned Slice | Current Slice Blocking | Rationale |',
    '| --- | ---: | --- | --- | --- | --- | --- | --- |',
    ...payload.forbiddenHits.map(
      (hit) =>
        `| ${hit.file} | ${hit.line} | ${hit.patternId} | ${hit.classification} | ${
          hit.allowed ? 'yes' : 'no'
        } | ${hit.assignedSlice ?? '-'} | ${hit.currentSliceBlocking ? 'yes' : 'no'} | ${hit.rationale} |`,
    ),
    '',
  ].join('\n');
  writeFileSync(outMd, md, 'utf8');
}

console.log(JSON.stringify(payload, null, 2));

if (!payload.gatePassed) {
  process.exitCode = 1;
}
