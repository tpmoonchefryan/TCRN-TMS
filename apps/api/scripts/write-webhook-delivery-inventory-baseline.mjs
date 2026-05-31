// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import {
  EXPECTED_WEBHOOK_EVENT_CODES,
  parseArgs,
  readJson,
  readProductText,
  runGit,
  runRg,
  sourceSignals,
  writeJson,
} from './webhook-delivery-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'webhook-delivery-inventory-baseline.json';
const packageJson = readJson('package.json');
const apiPackageJson = readJson('apps/api/package.json');
const lockfileText = readProductText('pnpm-lock.yaml');
const signals = sourceSignals();
const deps = {
  ...(packageJson.dependencies ?? {}),
  ...(packageJson.devDependencies ?? {}),
  ...(apiPackageJson.dependencies ?? {}),
  ...(apiPackageJson.devDependencies ?? {}),
};
const providerDeps = Object.keys(deps).filter((name) => /svix|nats|jetstream/i.test(name));
const authorityHits = runRg([
  '-n',
  'Svix|svix|NATS|JetStream|provider console|allowedTemplateIds|webhook_events',
  'apps',
  'packages',
  'infra',
  '-g',
  '!**/node_modules/**',
  '-g',
  '!**/dist/**',
]);

function classifyAuthorityHit(line) {
  const match = /^(.*?):(\d+):/.exec(line);
  const file = match?.[1] ?? 'unknown';
  const lineNumber = match?.[2] ? Number(match[2]) : null;
  let classification = 'reviewed_readiness_reference';

  if (file.includes('apps/api/scripts/') || file.includes('apps/web/scripts/')) {
    classification = 'phase7_evidence_script';
  } else if (file.includes('packages/shared/src/platform-tools/')) {
    classification = 'platform_tool_readiness_catalog';
  } else if (file.includes('packages/shared/src/types/integration/')) {
    classification = 'webhook_delivery_adapter_catalog';
  } else if (file.includes('infra/k8s/') || file.includes('docker-compose')) {
    classification = 'deployment_readiness_config';
  } else if (file.includes('packages/database/prisma/migrations/')) {
    classification = 'historical_migration_or_readiness_seed';
  } else if (file.includes('packages/database/prisma/seeds/')) {
    classification = 'system_dictionary_seed';
  } else if (file.includes('apps/api/src/config/')) {
    classification = 'runtime_config_schema';
  } else if (file.includes('IntegrationManagementScreen.tsx')) {
    classification = 'ordinary_ui_negative_provider_console_copy';
  }

  return { file, line: lineNumber, classification };
}

const authorityHitClassifications = authorityHits.map(classifyAuthorityHit);

const payload = {
  checkedAt: new Date().toISOString(),
  test_layer: 'source_scan',
  data_mode: 'source_scan',
  target_scope: 'event_catalog',
  git: {
    branch: runGit(['status', '--short', '--branch']).split('\n')[0],
    head: runGit(['rev-parse', 'HEAD']),
    dirtyEntries: runGit(['status', '--short']).split('\n').filter(Boolean),
  },
  currentSignals: {
    webhookCrudPresent:
      signals.controller.includes("@Get('webhooks')") &&
      signals.controller.includes("@Post('webhooks')") &&
      signals.controller.includes("@Patch('webhooks/:webhookId')"),
    deliveryRoutesPresent:
      signals.controller.includes("delivery-attempts'") &&
      signals.controller.includes("test-delivery'") &&
      signals.controller.includes("delivery-attempts/:attemptId/replay'"),
    eventCatalogCodes: EXPECTED_WEBHOOK_EVENT_CODES.filter((code) =>
      signals.sharedCatalog.includes(code)
    ),
    outboxModelPresent:
      signals.schema.includes('model WebhookDeliveryOutbox') &&
      signals.migration.includes('webhook_delivery_outbox'),
    attemptModelPresent:
      signals.schema.includes('model WebhookDeliveryAttempt') &&
      signals.migration.includes('webhook_delivery_attempt'),
    svixDependencyPresent: /"svix"/i.test(JSON.stringify(deps)) || /svix@/i.test(lockfileText),
    natsClientDependencyPresent: /"nats"/i.test(JSON.stringify(deps)) || /\bnats@/i.test(lockfileText),
    providerDeps,
    authorityHitCount: authorityHits.length,
    authorityHitClassifications,
  },
};

payload.passed =
  payload.currentSignals.webhookCrudPresent &&
  payload.currentSignals.deliveryRoutesPresent &&
  payload.currentSignals.eventCatalogCodes.length === EXPECTED_WEBHOOK_EVENT_CODES.length &&
  payload.currentSignals.outboxModelPresent &&
  payload.currentSignals.attemptModelPresent &&
  !payload.currentSignals.svixDependencyPresent &&
  !payload.currentSignals.natsClientDependencyPresent;

writeJson(out, payload);
