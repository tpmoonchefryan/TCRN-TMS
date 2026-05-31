// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Generates Phase 3 SSO Swagger evidence from the Nest OpenAPI document.

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { NestFactory } from '@nestjs/core';
import { SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';

import { AppModule } from '../src/app.module';
import { applyGlobalSwaggerParameters } from '../src/config/swagger-global-parameters';
import { buildSwaggerConfig, CONFIG_TAGS } from '../src/config/swagger.config';
import { AuthModule } from '../src/modules/auth';
import { EventBackboneModule } from '../src/modules/event-backbone';
import { IntegrationModule } from '../src/modules/integration/integration.module';
import { ObservabilityAdaptersModule } from '../src/modules/observability-adapters';
import { PlatformToolsModule } from '../src/modules/platform-tools';
import { loadRepoEnvFiles } from '../src/repo-env';

interface CliOptions {
  out: string;
  filter: 'sso' | 'platform-tools' | 'observability' | 'webhook-delivery' | 'event-backbone';
}

const REQUIRED_SSO_PATH_SUFFIXES = [
  '/auth/sso/providers',
  '/auth/sso/start',
  '/auth/sso/callback/{providerCode}',
  '/auth/sso/exchange',
  '/auth/sso/account-links',
  '/auth/sso/account-link-providers',
  '/auth/sso/account-links/start',
  '/auth/sso/account-links/complete',
  '/auth/sso/admin/providers',
  '/auth/sso/admin/providers/{providerCode}',
  '/auth/sso/external-tools/readiness',
  '/auth/sso/external-tools/readiness/{toolCode}',
] as const;

const REQUIRED_PLATFORM_TOOL_PATH_SUFFIXES = [
  '/platform-tools/definitions',
  '/platform-tools/connections',
  '/platform-tools/connections/{toolCode}',
  '/platform-tools/connections/{toolCode}/health-check',
  '/platform-tools/connections/{toolCode}/deep-link',
  '/platform-tools/deployment-boundary',
] as const;

const REQUIRED_OBSERVABILITY_PATH_SUFFIXES = [
  '/observability/adapters/definitions',
  '/observability/adapters/policy',
  '/observability/adapters/summary',
  '/observability/adapters/{adapterCode}/deep-link',
] as const;

const REQUIRED_WEBHOOK_DELIVERY_PATH_SUFFIXES = [
  '/integration/webhooks/events',
  '/integration/webhooks/{webhookId}/delivery-attempts',
  '/integration/webhooks/{webhookId}/delivery-attempts/{attemptId}',
  '/integration/webhooks/{webhookId}/test-delivery',
  '/integration/webhooks/{webhookId}/delivery-attempts/{attemptId}/replay',
] as const;

const REQUIRED_EVENT_BACKBONE_PATH_SUFFIXES = [
  '/event-backbone/registry',
  '/event-backbone/subject-mapping',
  '/event-backbone/bullmq-classification',
  '/event-backbone/policy',
  '/event-backbone/summary',
  '/event-backbone/replay-preview',
] as const;

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    out: 'swagger-sso-docs.json',
    filter: 'sso',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--out' && next) {
      options.out = next;
      index += 1;
    } else if (arg === '--filter' && next) {
      options.filter =
        next === 'platform-tools' ||
        next === 'observability' ||
        next === 'webhook-delivery' ||
        next === 'event-backbone'
          ? next
          : 'sso';
      index += 1;
    }
  }

  return options;
}

function buildPlatformToolEvidence(document: OpenAPIObject) {
  const platformToolPaths = Object.keys(document.paths)
    .filter((pathName) => normalizePathSuffix(pathName).startsWith('/platform-tools/'))
    .sort();
  const normalizedPathSuffixes = new Set(platformToolPaths.map(normalizePathSuffix));
  const missingRequiredPaths = REQUIRED_PLATFORM_TOOL_PATH_SUFFIXES.filter(
    (requiredPath) => !normalizedPathSuffixes.has(requiredPath)
  );
  const documentText = JSON.stringify(document);
  const rawMaterialHits = [
    'client_secret',
    'clientSecret',
    'api_key',
    'private_key',
    'access_token',
    'id_token',
    'authorization_code',
    'password',
  ]
    .filter((needle) => documentText.includes(needle))
    .map((needle) => ({
      needle,
      classification:
        needle === 'client_secret'
          ? 'allowed_redacted_config_key'
          : needle === 'password'
            ? 'forbidden'
            : 'forbidden',
    }));
  const forbiddenRawMaterial = rawMaterialHits
    .filter((hit) => hit.classification === 'forbidden')
    .map((hit) => hit.needle);

  return {
    checkedAt: new Date().toISOString(),
    test_layer: 'source_scan',
    data_mode: 'source_scan',
    target_scope: 'ac_platform_tool_connection',
    platformToolPaths,
    missingRequiredPaths,
    rawMaterialHits,
    forbiddenRawMaterial,
    secretReferenceInputOnly: documentText.includes('secretRef') && !documentText.includes('secretValue'),
    bearerAuthPresent: documentText.includes('bearer') || documentText.includes('JWT-auth'),
    passed:
      missingRequiredPaths.length === 0 &&
      forbiddenRawMaterial.length === 0 &&
      documentText.includes('secretRef') &&
      !documentText.includes('secretValue'),
  };
}

function buildObservabilityEvidence(document: OpenAPIObject) {
  const observabilityPaths = Object.keys(document.paths)
    .filter((pathName) => normalizePathSuffix(pathName).startsWith('/observability/adapters/'))
    .sort();
  const normalizedPathSuffixes = new Set(observabilityPaths.map(normalizePathSuffix));
  const missingRequiredPaths = REQUIRED_OBSERVABILITY_PATH_SUFFIXES.filter(
    (requiredPath) => !normalizedPathSuffixes.has(requiredPath)
  );
  const documentText = JSON.stringify(document);
  const rawMaterialHits = [
    'secretValue',
    'clientSecret',
    'client_secret',
    'api_key',
    'private_key',
    'access_token',
    'id_token',
    'authorization_code',
    'password',
    'Raw LogQL query',
  ]
    .filter((needle) => documentText.includes(needle))
    .map((needle) => ({ needle, classification: 'forbidden' }));

  return {
    checkedAt: new Date().toISOString(),
    test_layer: 'generated_openapi',
    data_mode: 'read_only_generated_doc',
    target_scope: 'observability_adapter_foundation',
    observabilityPaths,
    missingRequiredPaths,
    rawMaterialHits,
    forbiddenRawMaterial: rawMaterialHits.map((hit) => hit.needle),
    bearerAuthPresent: documentText.includes('bearer') || documentText.includes('JWT-auth'),
    executePermissionForDeepLink: documentText.includes('Read AC observability adapter deep-link readiness'),
    rawLogQlDeniedInDocs: !documentText.includes('Raw LogQL query'),
    passed:
      missingRequiredPaths.length === 0 &&
      rawMaterialHits.length === 0 &&
      (documentText.includes('bearer') || documentText.includes('JWT-auth')) &&
      documentText.includes('Read AC observability adapter deep-link readiness'),
  };
}

function buildWebhookDeliveryEvidence(document: OpenAPIObject) {
  const webhookDeliveryPaths = Object.keys(document.paths)
    .filter((pathName) => normalizePathSuffix(pathName).startsWith('/integration/webhooks'))
    .sort();
  const normalizedPathSuffixes = new Set(webhookDeliveryPaths.map(normalizePathSuffix));
  const missingRequiredPaths = REQUIRED_WEBHOOK_DELIVERY_PATH_SUFFIXES.filter(
    (requiredPath) => !normalizedPathSuffixes.has(requiredPath)
  );
  const operationProof = REQUIRED_WEBHOOK_DELIVERY_PATH_SUFFIXES.map((requiredPath) => {
    const pathItem = pathBySuffix(document, requiredPath);
    const operation =
      requiredPath.includes('test-delivery') || requiredPath.includes('replay')
        ? pathItem?.post
        : pathItem?.get;

    return {
      path: requiredPath,
      operationId: operation?.operationId ?? null,
      tags: operation?.tags ?? [],
      statuses: Object.keys(operation?.responses ?? {}).sort(),
      hasBearerSecurity: Boolean(operation?.security) || JSON.stringify(document).includes('bearer'),
    };
  });
  const documentText = JSON.stringify(document);
  const rawMaterialHits = [
    'secretValue',
    'clientSecret',
    'private_key',
    'access_token',
    'id_token',
    'authorization_code',
    'password',
    'providerToken',
    'providerSecret',
    'x-tcrn-signature=',
    'report binary',
    'request_body',
    'response_body',
  ]
    .filter((needle) => documentText.includes(needle))
    .map((needle) => ({ needle, classification: 'forbidden' }));
  const forbiddenRawMaterial = rawMaterialHits.map((hit) => hit.needle);
  const deliveryMutationOperations = operationProof.filter(
    (operation) => operation.path.includes('test-delivery') || operation.path.includes('replay')
  );
  const readOperations = operationProof.filter(
    (operation) => !operation.path.includes('test-delivery') && !operation.path.includes('replay')
  );
  const deliveryMutationStatusesPresent = deliveryMutationOperations.every(
    (operation) => operation.statuses.includes('202') && operation.statuses.includes('409')
  );
  const readStatusesPresent = readOperations.every((operation) => operation.statuses.includes('200'));

  return {
    checkedAt: new Date().toISOString(),
    test_layer: 'generated_openapi',
    data_mode: 'read_only_generated_doc',
    target_scope: 'delivery_attempt',
    webhookDeliveryPaths,
    missingRequiredPaths,
    operationProof,
    rawMaterialHits,
    forbiddenRawMaterial,
    bearerAuthPresent: documentText.includes('bearer') || documentText.includes('JWT-auth'),
    operationIdsPresent: operationProof.every((operation) => operation.operationId),
    responseStatusesPresent: deliveryMutationStatusesPresent && readStatusesPresent,
    idempotencyConflictStatusPresent: deliveryMutationOperations.every((operation) =>
      operation.statuses.includes('409')
    ),
    dryRunReasonDtoPresent:
      documentText.includes('WebhookDeliveryOperationDto') &&
      documentText.includes('reason') &&
      documentText.includes('dryRun') &&
      documentText.includes('different operation'),
    noSwaggerEditorAuthority: !documentText.includes('swagger-editor'),
    passed:
      missingRequiredPaths.length === 0 &&
      rawMaterialHits.length === 0 &&
      (documentText.includes('bearer') || documentText.includes('JWT-auth')) &&
      operationProof.every((operation) => operation.operationId) &&
      deliveryMutationStatusesPresent &&
      readStatusesPresent &&
      documentText.includes('WebhookDeliveryOperationDto') &&
      documentText.includes('reason') &&
      documentText.includes('dryRun') &&
      documentText.includes('different operation') &&
      !documentText.includes('swagger-editor'),
  };
}

function buildEventBackboneEvidence(document: OpenAPIObject) {
  const eventBackbonePaths = Object.keys(document.paths)
    .filter((pathName) => normalizePathSuffix(pathName).startsWith('/event-backbone/'))
    .sort();
  const normalizedPathSuffixes = new Set(eventBackbonePaths.map(normalizePathSuffix));
  const missingRequiredPaths = REQUIRED_EVENT_BACKBONE_PATH_SUFFIXES.filter(
    (requiredPath) => !normalizedPathSuffixes.has(requiredPath)
  );
  const operationProof = REQUIRED_EVENT_BACKBONE_PATH_SUFFIXES.map((requiredPath) => {
    const pathItem = pathBySuffix(document, requiredPath);
    const operation = requiredPath.includes('replay-preview') ? pathItem?.post : pathItem?.get;

    return {
      path: requiredPath,
      operationId: operation?.operationId ?? null,
      tags: operation?.tags ?? [],
      statuses: Object.keys(operation?.responses ?? {}).sort(),
      hasBearerSecurity: Boolean(operation?.security) || JSON.stringify(document).includes('bearer'),
    };
  });
  const documentText = JSON.stringify(document);
  const rawMaterialHits = [
    'secretValue',
    'clientSecret',
    'private_key',
    'access_token',
    'id_token',
    'authorization_code',
    'providerToken',
    'providerSecret',
  ]
    .filter((needle) => documentText.includes(needle))
    .map((needle) => ({ needle, classification: 'forbidden' }));

  return {
    checkedAt: new Date().toISOString(),
    test_layer: 'generated_openapi',
    data_mode: 'read_only_generated_doc',
    target_scope: 'event_backbone_adapter',
    eventBackbonePaths,
    missingRequiredPaths,
    operationProof,
    rawMaterialHits,
    forbiddenRawMaterial: rawMaterialHits.map((hit) => hit.needle),
    bearerAuthPresent: documentText.includes('bearer') || documentText.includes('JWT-auth'),
    operationIdsPresent: operationProof.every((operation) => operation.operationId),
    dryRunReasonDtoPresent:
      documentText.includes('EventBackboneReplayPreviewDto') &&
      documentText.includes('reason') &&
      documentText.includes('dryRun'),
    noSwaggerEditorAuthority: !documentText.includes('swagger-editor'),
    passed:
      missingRequiredPaths.length === 0 &&
      rawMaterialHits.length === 0 &&
      (documentText.includes('bearer') || documentText.includes('JWT-auth')) &&
      operationProof.every((operation) => operation.operationId) &&
      documentText.includes('EventBackboneReplayPreviewDto') &&
      documentText.includes('reason') &&
      documentText.includes('dryRun') &&
      !documentText.includes('swagger-editor'),
  };
}

function cloneSerializableSwaggerValue<T>(value: T, stack = new WeakSet<object>()): T {
  if (!value || typeof value !== 'object') {
    return value;
  }

  if (stack.has(value)) {
    return undefined as T;
  }

  stack.add(value);

  if (Array.isArray(value)) {
    const clonedArray = value
      .map((item) => cloneSerializableSwaggerValue(item, stack))
      .filter((item) => item !== undefined);

    stack.delete(value);
    return clonedArray as T;
  }

  const clonedObject: Record<string, unknown> = {};

  for (const [key, item] of Object.entries(value)) {
    const clonedItem = cloneSerializableSwaggerValue(item, stack);

    if (clonedItem !== undefined) {
      clonedObject[key] = clonedItem;
    }
  }

  stack.delete(value);
  return clonedObject as T;
}

function normalizePathSuffix(pathName: string) {
  return pathName.replace(/^\/api\/v1/, '');
}

function classifyRawMaterial(documentText: string) {
  return [
    'access_token',
    'id_token',
    'refresh_token',
    'authorization_code',
    'saml_assertion',
    'SAMLResponse',
    'private_key',
  ]
    .filter((needle) => documentText.includes(needle))
    .map((needle) => ({
      needle,
      classification: needle === 'refresh_token' ? 'allowed_http_only_cookie_name' : 'forbidden',
    }));
}

function pathBySuffix(document: OpenAPIObject, suffix: string) {
  return Object.entries(document.paths).find(
    ([pathName]) => normalizePathSuffix(pathName) === suffix
  )?.[1];
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  loadRepoEnvFiles();
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';

  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api/v1');

  const config = buildSwaggerConfig(
    options.filter === 'platform-tools'
      ? 'TCRN TMS - Phase 4 Platform Tool Evidence'
      : options.filter === 'observability'
        ? 'TCRN TMS - Phase 5 Observability Adapter Evidence'
        : options.filter === 'webhook-delivery'
          ? 'TCRN TMS - Phase 7 Webhook Delivery Evidence'
          : options.filter === 'event-backbone'
            ? 'TCRN TMS - Phase 8 Event Backbone Evidence'
          : 'TCRN TMS - Phase 3 SSO Evidence',
    options.filter === 'platform-tools'
      ? 'Generated Platform Tool Connections OpenAPI evidence for Phase 4 acceptance'
      : options.filter === 'observability'
        ? 'Generated Observability Adapter OpenAPI evidence for Phase 5 acceptance'
        : options.filter === 'webhook-delivery'
          ? 'Generated Webhook Delivery OpenAPI evidence for Phase 7 acceptance'
          : options.filter === 'event-backbone'
            ? 'Generated Event Backbone OpenAPI evidence for Phase 8 acceptance'
          : 'Generated SSO OpenAPI evidence for Phase 3 acceptance',
    '1.0.0',
    CONFIG_TAGS
  );
  const document = cloneSerializableSwaggerValue(
    SwaggerModule.createDocument(app, config, {
      include:
        options.filter === 'platform-tools'
          ? [PlatformToolsModule]
          : options.filter === 'observability'
            ? [ObservabilityAdaptersModule]
            : options.filter === 'webhook-delivery'
              ? [IntegrationModule]
              : options.filter === 'event-backbone'
                ? [EventBackboneModule]
              : [AuthModule],
    })
  ) as OpenAPIObject;
  applyGlobalSwaggerParameters(document);

  if (options.filter === 'event-backbone') {
    const payload = buildEventBackboneEvidence(document);

    mkdirSync(path.dirname(options.out), { recursive: true });
    writeFileSync(options.out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify(payload, null, 2));

    await app.close();

    if (!payload.passed) {
      process.exitCode = 1;
    }

    return;
  }

  if (options.filter === 'webhook-delivery') {
    const payload = buildWebhookDeliveryEvidence(document);

    mkdirSync(path.dirname(options.out), { recursive: true });
    writeFileSync(options.out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify(payload, null, 2));

    await app.close();

    if (!payload.passed) {
      process.exitCode = 1;
    }

    return;
  }

  if (options.filter === 'observability') {
    const payload = buildObservabilityEvidence(document);

    mkdirSync(path.dirname(options.out), { recursive: true });
    writeFileSync(options.out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify(payload, null, 2));

    await app.close();

    if (!payload.passed) {
      process.exitCode = 1;
    }

    return;
  }

  if (options.filter === 'platform-tools') {
    const payload = buildPlatformToolEvidence(document);

    mkdirSync(path.dirname(options.out), { recursive: true });
    writeFileSync(options.out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify(payload, null, 2));

    await app.close();

    if (!payload.passed) {
      process.exitCode = 1;
    }

    return;
  }

  const ssoPaths = Object.keys(document.paths)
    .filter((pathName) => normalizePathSuffix(pathName).startsWith('/auth/sso/'))
    .sort();
  const normalizedPathSuffixes = new Set(ssoPaths.map(normalizePathSuffix));
  const missingRequiredPaths = REQUIRED_SSO_PATH_SUFFIXES.filter(
    (requiredPath) => !normalizedPathSuffixes.has(requiredPath)
  );
  const documentText = JSON.stringify(document);
  const rawMaterialHits = classifyRawMaterial(documentText);
  const forbiddenRawMaterial = rawMaterialHits
    .filter((hit) => hit.classification === 'forbidden')
    .map((hit) => hit.needle);
  const swaggerEditorHits = ['Swagger Editor', 'swagger-editor', 'openapi.yaml', 'openapi.yml']
    .filter((needle) => documentText.includes(needle))
    .map((needle) => ({
      needle,
      classification:
        needle === 'swagger-editor' ? 'allowed_external_tool_readiness_code' : 'forbidden',
    }));
  const forbiddenSwaggerEditorHits = swaggerEditorHits
    .filter((hit) => hit.classification === 'forbidden')
    .map((hit) => hit.needle);
  const managedProviderPath = pathBySuffix(document, '/auth/sso/admin/providers');
  const managedProviderPatchPath = pathBySuffix(document, '/auth/sso/admin/providers/{providerCode}');
  const managedProviderResponseText = JSON.stringify({
    listResponses: managedProviderPath?.get?.responses,
    upsertResponses: managedProviderPatchPath?.patch?.responses,
  });
  const clientSecretReferenceIsRedacted =
    managedProviderResponseText.includes('clientSecretConfigured') &&
    !managedProviderResponseText.includes('clientSecretRef');
  const rawSecretReferenceFieldsDocumented =
    documentText.includes('clientSecretRef') &&
    !managedProviderResponseText.includes('clientSecretRef');
  const payload = {
    checkedAt: new Date().toISOString(),
    test_layer: 'manual_readback',
    data_mode: 'read_only_uat',
    target_scope: 'tenant_product_sso',
    ssoPaths,
    missingRequiredPaths,
    rawMaterialHits,
    forbiddenRawMaterial,
    swaggerEditorHits,
    forbiddenSwaggerEditorHits,
    clientSecretReferenceIsRedacted,
    rawSecretReferenceFieldsDocumented,
    rawSecretReferenceClassification: rawSecretReferenceFieldsDocumented
      ? 'allowed_env_reference_input_only'
      : 'missing_request_reference_documentation',
    passed:
      missingRequiredPaths.length === 0 &&
      forbiddenRawMaterial.length === 0 &&
      forbiddenSwaggerEditorHits.length === 0 &&
      clientSecretReferenceIsRedacted &&
      rawSecretReferenceFieldsDocumented,
  };

  mkdirSync(path.dirname(options.out), { recursive: true });
  writeFileSync(options.out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(payload, null, 2));

  await app.close();

  if (!payload.passed) {
    process.exitCode = 1;
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
