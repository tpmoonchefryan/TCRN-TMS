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
import { loadRepoEnvFiles } from '../src/repo-env';

interface CliOptions {
  out: string;
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

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    out: 'swagger-sso-docs.json',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--out' && next) {
      options.out = next;
      index += 1;
    }
  }

  return options;
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
    'TCRN TMS - Phase 3 SSO Evidence',
    'Generated SSO OpenAPI evidence for Phase 3 acceptance',
    '1.0.0',
    CONFIG_TAGS
  );
  const document = cloneSerializableSwaggerValue(
    SwaggerModule.createDocument(app, config, { include: [AuthModule] })
  ) as OpenAPIObject;
  applyGlobalSwaggerParameters(document);

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
