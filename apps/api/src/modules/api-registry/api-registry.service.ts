// SPDX-License-Identifier: Apache-2.0
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { Injectable } from '@nestjs/common';

import {
  API_REGISTRY_VERSION,
  type ApiRegistryDocument,
  type ApiRegistryDriftReport,
  type BuilderApiReadonlyExport,
  type GatewayRouteManifest,
  validateApiRegistryDocument,
} from '@tcrn/shared';

import { resolveSwaggerExposurePolicy } from '../../config/swagger.config';

const SNAPSHOT_CANDIDATES = [
  path.resolve(process.cwd(), 'src/modules/api-registry/api-registry.snapshot.json'),
  path.resolve(process.cwd(), 'apps/api/src/modules/api-registry/api-registry.snapshot.json'),
  path.resolve(__dirname, 'api-registry.snapshot.json'),
];
const DRIFT_REPORT_CANDIDATES = [
  path.resolve(process.cwd(), 'src/modules/api-registry/api-registry.drift-report.json'),
  path.resolve(process.cwd(), 'apps/api/src/modules/api-registry/api-registry.drift-report.json'),
  path.resolve(__dirname, 'api-registry.drift-report.json'),
];
const READONLY_GATEWAY_METHODS = new Set(['GET', 'HEAD']);
const BUILDER_READONLY_METHODS = new Set(['GET', 'HEAD']);

function isSchemaBackedBuilderReadOperation(operation: ApiRegistryDocument['operations'][number]) {
  return (
    operation.builderExportEligible &&
    BUILDER_READONLY_METHODS.has(operation.method.toUpperCase()) &&
    Boolean(operation.requestSchemaRef || operation.responseSchemaRefs.length > 0)
  );
}

function isBuilderReadonlyExcluded(operation: ApiRegistryDocument['operations'][number]): string | null {
  const method = operation.method.toUpperCase();

  if (!operation.builderExportEligible) {
    return 'not_builder_export_eligible';
  }
  if (!BUILDER_READONLY_METHODS.has(method)) {
    return 'write_delete_admin_or_execute_operation';
  }
  if (!operation.requestSchemaRef && operation.responseSchemaRefs.length === 0) {
    return 'missing_schema_ref';
  }

  return null;
}

function hashContent(content: string) {
  return createHash('sha256').update(content).digest('hex');
}

function deriveGatewayPolicy(operation: ApiRegistryDocument['operations'][number]) {
  const method = operation.method.toUpperCase();

  if (operation.authMode === 'public' && operation.exposure === 'public') {
    if (READONLY_GATEWAY_METHODS.has(method)) {
      return {
        authPolicyRefs: ['public-readonly'],
        rateLimitHints: ['public-readonly-default'],
        oidcHints: [],
      };
    }

    return {
      authPolicyRefs: ['public-submit', 'abuse-protection'],
      rateLimitHints: ['public-submit-default'],
      oidcHints: [],
    };
  }

  if (operation.authMode === 'public') {
    return {
      authPolicyRefs: ['public-auth-flow', 'auth-rate-limit'],
      rateLimitHints: ['auth-flow-default'],
      oidcHints: [],
    };
  }

  return {
    authPolicyRefs:
      operation.requiredPermissions.length > 0 ? ['tcrn-jwt', 'tcrn-rbac'] : ['tcrn-jwt'],
    rateLimitHints: [operation.exposure === 'ac_only' ? 'ac-platform-default' : 'tenant-default'],
    oidcHints: [
      'future-edge-jwt-validation',
      operation.exposure === 'ac_only' ? 'future-ac-sso-hook' : 'future-tenant-oidc-hook',
      'rbac-and-tenant-authority-remain-in-tcrn',
    ],
  };
}

function emptyRegistryDocument(): ApiRegistryDocument {
  return {
    registryVersion: API_REGISTRY_VERSION,
    generatedAt: new Date(0).toISOString(),
    sourceCommit: 'snapshot_missing',
    operations: [],
    groups: {
      operations: { title: 'Operations API', operationCount: 0, pathCount: 0, schemaCount: 0 },
      config: { title: 'System & Config API', operationCount: 0, pathCount: 0, schemaCount: 0 },
      public: { title: 'Public API', operationCount: 0, pathCount: 0, schemaCount: 0 },
    },
    moduleLinks: {},
    capabilityLinks: {},
    rbacLinks: {},
    schemaLinks: {},
    warnings: ['api_registry_snapshot_missing'],
  };
}

@Injectable()
export class ApiRegistryService {
  private snapshot: ApiRegistryDocument | null = null;
  private driftReport: ApiRegistryDriftReport | null = null;

  getDocument(): ApiRegistryDocument {
    if (this.snapshot) {
      return this.snapshot;
    }

    const snapshotPath = SNAPSHOT_CANDIDATES.find((candidate) => existsSync(candidate));
    if (!snapshotPath) {
      this.snapshot = emptyRegistryDocument();
      return this.snapshot;
    }

    this.snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8')) as ApiRegistryDocument;
    return this.snapshot;
  }

  getDriftReport(): ApiRegistryDriftReport {
    if (this.driftReport) {
      return this.driftReport;
    }

    const reportPath = DRIFT_REPORT_CANDIDATES.find((candidate) => existsSync(candidate));
    if (reportPath) {
      this.driftReport = JSON.parse(readFileSync(reportPath, 'utf8')) as ApiRegistryDriftReport;
      return this.driftReport;
    }

    const document = this.getDocument();
    const validationErrors = validateApiRegistryDocument(document);
    const missingAuthority = document.operations
      .filter(
        (operation) =>
          !operation.metadataAuthority ||
          operation.metadataAuthority.kind === 'missing' ||
          !operation.metadataAuthority.source ||
          !operation.metadataAuthority.operationKey
      )
      .map((operation) => operation.operationCode);

    return {
      checkedAt: new Date().toISOString(),
      sourceCommit: document.sourceCommit,
      missingRegistry: [],
      missingController: [],
      missingSwagger: [],
      permissionMismatch: validationErrors,
      scopeMismatch: [],
      schemaMismatch: [],
      groupMismatch: [],
      exposureMismatch: [],
      authMismatch: [],
      metadataAuthorityMismatch: missingAuthority,
      unclassifiedDynamicPermission: [],
      manualOpenApiArtifacts: [],
      excludedControllers: [],
      result:
        validationErrors.length === 0 &&
        missingAuthority.length === 0 &&
        document.warnings.length === 0
          ? 'pass'
          : 'fail',
    };
  }

  getSwaggerExposurePolicy() {
    return resolveSwaggerExposurePolicy();
  }

  getGatewayRouteManifest(): GatewayRouteManifest {
    const document = this.getDocument();

    return {
      manifestVersion: API_REGISTRY_VERSION,
      generatedFromRegistryVersion: document.registryVersion,
      routes: document.operations
        .filter((operation) => operation.gatewayEligible)
        .map((operation) => {
          const policy = deriveGatewayPolicy(operation);

          return {
            operationCode: operation.operationCode,
            method: operation.method,
            pathTemplate: operation.pathTemplate,
            upstreamService: 'tcrn-api',
            authPolicyRefs: policy.authPolicyRefs,
            rateLimitHints: policy.rateLimitHints,
            oidcHints: policy.oidcHints,
            canaryEligible: operation.stability !== 'deprecated',
            rollbackNotes: 'Derived dry-run manifest only; Phase 9 never applies gateway config.',
            notAppliedReason: 'phase_9_readiness_only',
          };
        }),
    };
  }

  getBuilderReadonlyExport(): BuilderApiReadonlyExport {
    const document = this.getDocument();
    const operations = document.operations
      .filter((operation) => isSchemaBackedBuilderReadOperation(operation))
      .map((operation) => ({
        operationCode: operation.operationCode,
        method: operation.method,
        pathTemplate: operation.pathTemplate,
        documentGroup: operation.documentGroup,
        ownerModuleCode: operation.ownerModuleCode,
        ownerCapabilityCode: operation.ownerCapabilityCode,
        requiredPermissions: operation.requiredPermissions,
        scopeType: operation.scopeType,
        exposure: operation.exposure,
        stability: operation.stability,
        requestSchemaRef: operation.requestSchemaRef,
        responseSchemaRefs: operation.responseSchemaRefs,
      }));
    const excludedOperations = document.operations
      .map((operation) => {
        const reason = isBuilderReadonlyExcluded(operation);

        return reason
          ? {
              operationCode: operation.operationCode,
              method: operation.method,
              pathTemplate: operation.pathTemplate,
              reason,
            }
          : null;
      })
      .filter((operation): operation is NonNullable<typeof operation> => Boolean(operation));

    return {
      exportVersion: API_REGISTRY_VERSION,
      generatedFromRegistryVersion: document.registryVersion,
      mode: 'read_only',
      operationCount: operations.length,
      excludedOperationCount: excludedOperations.length,
      operations,
      excludedOperations,
      sourceReadbackHash: hashContent(
        JSON.stringify({
          sourceCommit: document.sourceCommit,
          generatedFromRegistryVersion: document.registryVersion,
          operationCount: operations.length,
          excludedOperationCount: excludedOperations.length,
        })
      ),
      warnings: [],
      passed: operations.length > 0,
    };
  }
}
