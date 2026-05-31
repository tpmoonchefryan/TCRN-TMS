// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiOperation, type ApiOperationOptions } from '@nestjs/swagger';

import type {
  ApiOperationDefinition,
  ApiOperationExposure,
  ApiOperationPiiClass,
  ApiRegistryDocumentGroup,
  ApiOperationScopeType,
  ApiOperationStability,
} from '@tcrn/shared';

type RegistryMetadataInput = Pick<
  ApiOperationDefinition,
  | 'operationCode'
  | 'ownerModuleCode'
  | 'ownerCapabilityCode'
  | 'scopeType'
  | 'exposure'
  | 'stability'
  | 'piiClass'
  | 'examplePolicy'
  | 'gatewayEligible'
  | 'builderExportEligible'
> & {
  documentGroup: ApiRegistryDocumentGroup;
  scopeSource?: string;
  auditEventTypes?: readonly string[];
};

export const TCRN_API_OPERATION_METADATA_KEY = 'tcrn_api_operation';

export interface TcrnApiOperationOptions extends RegistryMetadataInput {
  summary: string;
  description?: string;
  swagger?: Omit<ApiOperationOptions, 'summary' | 'description'>;
}

export type TcrnApiOperationMetadata = RegistryMetadataInput & {
  summary: string;
  description: string | null;
};

export function TcrnApiOperation(options: TcrnApiOperationOptions) {
  const metadata: TcrnApiOperationMetadata = {
    operationCode: options.operationCode,
    documentGroup: options.documentGroup,
    ownerModuleCode: options.ownerModuleCode,
    ownerCapabilityCode: options.ownerCapabilityCode,
    scopeType: options.scopeType,
    scopeSource: options.scopeSource ?? 'decorator',
    exposure: options.exposure,
    stability: options.stability,
    piiClass: options.piiClass,
    examplePolicy: options.examplePolicy,
    gatewayEligible: options.gatewayEligible,
    builderExportEligible: options.builderExportEligible,
    auditEventTypes: options.auditEventTypes ?? [],
    summary: options.summary,
    description: options.description ?? null,
  };

  return applyDecorators(
    SetMetadata(TCRN_API_OPERATION_METADATA_KEY, metadata),
    ApiOperation({
      ...options.swagger,
      summary: options.summary,
      description: options.description,
    })
  );
}
