// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../common/decorators';
import { ApiRegistryService } from './api-registry.service';

type ApiOkResponseOptions = NonNullable<Parameters<typeof ApiOkResponse>[0]>;
type OpenApiResponseSchema = Extract<ApiOkResponseOptions, { schema: unknown }>['schema'];

const API_REGISTRY_DOCUMENT_RESPONSE_SCHEMA: OpenApiResponseSchema = {
  type: 'object',
  required: ['registryVersion', 'generatedAt', 'sourceCommit', 'operations', 'warnings'],
  properties: {
    registryVersion: { type: 'string', example: '2026-05-31.phase-9' },
    generatedAt: { type: 'string', format: 'date-time' },
    sourceCommit: { type: 'string', example: '1fabd4c' },
    operations: { type: 'array', items: { type: 'object', additionalProperties: true } },
    groups: { type: 'object', additionalProperties: true },
    moduleLinks: { type: 'object', additionalProperties: true },
    capabilityLinks: { type: 'object', additionalProperties: true },
    rbacLinks: { type: 'object', additionalProperties: true },
    schemaLinks: { type: 'object', additionalProperties: true },
    warnings: { type: 'array', items: { type: 'string' } },
  },
};

const API_REGISTRY_DRIFT_RESPONSE_SCHEMA: OpenApiResponseSchema = {
  type: 'object',
  required: [
    'checkedAt',
    'sourceCommit',
    'missingRegistry',
    'missingController',
    'missingSwagger',
    'result',
  ],
  properties: {
    checkedAt: { type: 'string', format: 'date-time' },
    sourceCommit: { type: 'string' },
    missingRegistry: { type: 'array', items: { type: 'string' } },
    missingController: { type: 'array', items: { type: 'string' } },
    missingSwagger: { type: 'array', items: { type: 'string' } },
    permissionMismatch: { type: 'array', items: { type: 'string' } },
    scopeMismatch: { type: 'array', items: { type: 'string' } },
    schemaMismatch: { type: 'array', items: { type: 'string' } },
    groupMismatch: { type: 'array', items: { type: 'string' } },
    exposureMismatch: { type: 'array', items: { type: 'string' } },
    authMismatch: { type: 'array', items: { type: 'string' } },
    metadataAuthorityMismatch: { type: 'array', items: { type: 'string' } },
    unclassifiedDynamicPermission: { type: 'array', items: { type: 'string' } },
    manualOpenApiArtifacts: { type: 'array', items: { type: 'string' } },
    excludedControllers: { type: 'array', items: { type: 'object', additionalProperties: true } },
    result: { type: 'string', enum: ['pass', 'fail'] },
  },
};

const API_REGISTRY_OBJECT_RESPONSE_SCHEMA: OpenApiResponseSchema = {
  type: 'object',
  additionalProperties: true,
};

@ApiTags('System - API Registry')
@ApiBearerAuth()
@Controller('api-registry')
export class ApiRegistryController {
  constructor(private readonly apiRegistryService: ApiRegistryService) {}

  @Get('document')
  @RequirePermissions({ resource: 'platform.api_registry', action: 'read' })
  @ApiOperation({ summary: 'Read generated TCRN API operation registry document' })
  @ApiOkResponse({
    description: 'Generated API registry document',
    schema: API_REGISTRY_DOCUMENT_RESPONSE_SCHEMA,
  })
  getDocument() {
    return this.apiRegistryService.getDocument();
  }

  @Get('drift-report')
  @RequirePermissions({ resource: 'platform.api_registry', action: 'read' })
  @ApiOperation({ summary: 'Read API registry drift verification state' })
  @ApiOkResponse({ description: 'Read-only drift report', schema: API_REGISTRY_DRIFT_RESPONSE_SCHEMA })
  getDriftReport() {
    return this.apiRegistryService.getDriftReport();
  }

  @Get('swagger-exposure-policy')
  @RequirePermissions({ resource: 'platform.api_registry', action: 'read' })
  @ApiOperation({ summary: 'Read Swagger exposure and redaction policy' })
  @ApiOkResponse({ description: 'Swagger exposure policy', schema: API_REGISTRY_OBJECT_RESPONSE_SCHEMA })
  getSwaggerExposurePolicy() {
    return this.apiRegistryService.getSwaggerExposurePolicy();
  }

  @Get('gateway-route-manifest')
  @RequirePermissions({ resource: 'platform.api_registry', action: 'read' })
  @ApiOperation({ summary: 'Read dry-run API gateway route manifest' })
  @ApiOkResponse({ description: 'Derived dry-run gateway manifest', schema: API_REGISTRY_OBJECT_RESPONSE_SCHEMA })
  getGatewayRouteManifest() {
    return this.apiRegistryService.getGatewayRouteManifest();
  }

  @Get('builder-readonly-export')
  @RequirePermissions({ resource: 'platform.api_registry', action: 'read' })
  @ApiOperation({ summary: 'Read future Builder API metadata export' })
  @ApiOkResponse({ description: 'Read-only Builder metadata export', schema: API_REGISTRY_OBJECT_RESPONSE_SCHEMA })
  getBuilderReadonlyExport() {
    return this.apiRegistryService.getBuilderReadonlyExport();
  }
}
