// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { describe, expect, it } from 'vitest';

import {
  API_REGISTRY_VERSION,
  type ApiOperationDefinition,
  type ApiRegistryDocument,
  validateApiRegistryDocument,
} from '@tcrn/shared';

function operation(patch: Partial<ApiOperationDefinition> = {}): ApiOperationDefinition {
  return {
    operationCode: 'config.api_registry_controller_get_document',
    method: 'GET',
    pathTemplate: '/api-registry/document',
    documentGroup: 'config',
    tag: 'System - API Registry',
    summary: 'Read generated TCRN API operation registry document',
    description: null,
    ownerModuleCode: 'platform',
    ownerCapabilityCode: 'platform.ac_management',
    controllerName: 'ApiRegistryController',
    handlerName: 'getDocument',
    requestSchemaRef: null,
    responseSchemaRefs: ['#/components/schemas/ApiRegistryDocument'],
    authMode: 'bearer_jwt',
    requiredPermissions: [{ resource: 'platform.api_registry', action: 'read' }],
    dynamicPermissionResolver: {
      enabled: false,
      resolverName: null,
      source: null,
      runtimeProofRequired: false,
    },
    scopeType: 'ac_platform',
    scopeSource: 'AC/platform route family',
    exposure: 'ac_only',
    stability: 'stable',
    deprecation: {
      isDeprecated: false,
      reason: null,
      replacementOperationCode: null,
      sunsetAt: null,
    },
    piiClass: 'none',
    examplePolicy: 'no_raw_secret_or_pii',
    gatewayEligible: false,
    builderExportEligible: false,
    auditEventTypes: [],
    metadataAuthority: {
      kind: 'tcrn_api_registry_authority_snapshot',
      source: 'apps/api/src/modules/api-registry/api-registry.authority.json',
      operationKey: 'config GET /api-registry/document',
    },
    source: {
      openapiFile: 'openapi-before/openapi-config.json',
      operationId: 'ApiRegistryController_getDocument',
      controllerFile: 'apps/api/src/modules/api-registry/api-registry.controller.ts',
      controllerLine: 13,
    },
    ...patch,
  };
}

function document(operations: ApiOperationDefinition[]): ApiRegistryDocument {
  return {
    registryVersion: API_REGISTRY_VERSION,
    generatedAt: '2026-05-31T00:00:00.000Z',
    sourceCommit: 'test',
    operations,
    groups: {
      operations: { title: 'Operations API', operationCount: 0, pathCount: 0, schemaCount: 0 },
      config: {
        title: 'System & Config API',
        operationCount: operations.length,
        pathCount: 1,
        schemaCount: 1,
      },
      public: { title: 'Public API', operationCount: 0, pathCount: 0, schemaCount: 0 },
    },
    moduleLinks: {},
    capabilityLinks: {},
    rbacLinks: {},
    schemaLinks: {},
    warnings: [],
  };
}

describe('API registry contract', () => {
  it('accepts known module, capability, RBAC, scope, exposure, and stability metadata', () => {
    expect(validateApiRegistryDocument(document([operation()]))).toEqual([]);
  });

  it('rejects duplicate operation codes', () => {
    expect(validateApiRegistryDocument(document([operation(), operation()]))).toContain(
      'duplicate operationCode: config.api_registry_controller_get_document'
    );
  });

  it('rejects unknown authority references instead of falling back to Swagger tags', () => {
    const errors = validateApiRegistryDocument(
      document([
        operation({
          ownerModuleCode: 'swagger-tag-only',
          ownerCapabilityCode: 'swagger-tag-only.read',
          requiredPermissions: [{ resource: 'unknown.resource', action: 'read' }],
        } as unknown as Partial<ApiOperationDefinition>),
      ])
    );

    expect(errors).toEqual(
      expect.arrayContaining([
        'unknown ownerModuleCode: swagger-tag-only',
        'unknown ownerCapabilityCode: swagger-tag-only.read',
        'unknown RBAC resource: unknown.resource',
      ])
    );
  });

  it('requires explicit runtime proof metadata for dynamic permission routes', () => {
    const errors = validateApiRegistryDocument(
      document([
        operation({
          dynamicPermissionResolver: {
            enabled: true,
            resolverName: null,
            source: null,
            runtimeProofRequired: false,
          },
        }),
      ])
    );

    expect(errors).toContain(
      'dynamic permission operation config.api_registry_controller_get_document lacks resolver proof metadata'
    );
  });

  it('requires explicit metadata authority for every registered operation', () => {
    const errors = validateApiRegistryDocument(
      document([
        operation({
          metadataAuthority: {
            kind: 'missing',
            source: 'missing',
            operationKey: '',
          },
        }),
      ])
    );

    expect(errors).toContain(
      'operation config.api_registry_controller_get_document lacks explicit metadata authority'
    );
  });
});
