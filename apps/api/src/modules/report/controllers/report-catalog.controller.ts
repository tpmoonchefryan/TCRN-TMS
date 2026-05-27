// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ErrorCodes, SUPPORTED_UI_LOCALES } from '@tcrn/shared';

import { RequireCapabilities, RequirePermissions } from '../../../common/decorators';
import { ReportCatalogApplicationService } from '../application/report-catalog.service';

const createErrorEnvelopeSchema = (code: string, message: string) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: code },
        message: { type: 'string', example: message },
      },
      required: ['code', 'message'],
    },
  },
  required: ['success', 'error'],
  example: {
    success: false,
    error: { code, message },
  },
});

const LOCALIZED_TEXT_SCHEMA = {
  type: 'object',
  properties: {
    en: { type: 'string', example: 'Member Feedback Report' },
    zh_HANS: { type: 'string', example: '会员反馈报表' },
    zh_HANT: { type: 'string', example: '會員回饋報表' },
    ja: { type: 'string', example: 'メンバーフィードバックレポート' },
    ko: { type: 'string', example: '멤버 피드백 리포트' },
    fr: { type: 'string', example: 'Rapport de feedback des membres' },
  },
  required: [...SUPPORTED_UI_LOCALES],
};

const REPORT_FILTER_FIELD_SCHEMA = {
  oneOf: [
    {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'platformCodes' },
        type: { type: 'string', example: 'config-multi-select' },
        targetField: { type: 'string', example: 'platformCodes' },
        label: LOCALIZED_TEXT_SCHEMA,
        source: {
          type: 'object',
          properties: {
            kind: { type: 'string', example: 'config-entity' },
            entityType: { type: 'string', example: 'social-platform' },
          },
          required: ['kind', 'entityType'],
        },
        advanced: { type: 'boolean', example: false },
      },
      required: ['id', 'type', 'targetField', 'label', 'source'],
    },
    {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'validFrom' },
        type: { type: 'string', example: 'date-range' },
        fromField: { type: 'string', example: 'validFromStart' },
        toField: { type: 'string', example: 'validFromEnd' },
        label: LOCALIZED_TEXT_SCHEMA,
      },
      required: ['id', 'type', 'fromField', 'toField', 'label'],
    },
    {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'includeExpired' },
        type: { type: 'string', example: 'boolean' },
        targetField: { type: 'string', example: 'includeExpired' },
        label: LOCALIZED_TEXT_SCHEMA,
        defaultValue: { type: 'boolean', example: false },
      },
      required: ['id', 'type', 'targetField', 'label'],
    },
    {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'platformCodesRaw' },
        type: { type: 'string', example: 'raw-code-list' },
        targetField: { type: 'string', example: 'platformCodes' },
        fallbackForFieldId: { type: 'string', example: 'platformCodes' },
        label: LOCALIZED_TEXT_SCHEMA,
        advanced: { type: 'boolean', example: true },
      },
      required: ['id', 'type', 'targetField', 'label', 'advanced'],
    },
  ],
};

const REPORT_CATALOG_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'mfr' },
    name: LOCALIZED_TEXT_SCHEMA,
    description: LOCALIZED_TEXT_SCHEMA,
    icon: { type: 'string', example: 'Gift' },
    availability: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'available' },
        requiredPermissions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              resource: { type: 'string', example: 'report.mfr' },
              actions: { type: 'array', items: { type: 'string' }, example: ['read', 'export'] },
            },
            required: ['resource', 'actions'],
          },
        },
      },
      required: ['status'],
    },
    artifactKinds: {
      type: 'array',
      items: { type: 'string' },
      example: ['xlsx', 'csv', 'pii_platform_portal'],
    },
    filterSchema: {
      type: 'object',
      properties: {
        version: { type: 'integer', example: 1 },
        fields: {
          type: 'array',
          items: REPORT_FILTER_FIELD_SCHEMA,
        },
      },
      required: ['version', 'fields'],
    },
  },
  required: ['id', 'name', 'description', 'icon', 'availability', 'artifactKinds', 'filterSchema'],
};

const REPORT_CATALOG_LIST_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: REPORT_CATALOG_ITEM_SCHEMA,
    },
  },
  required: ['items'],
};

const REPORT_UNAUTHORIZED_SCHEMA = createErrorEnvelopeSchema(
  'AUTH_UNAUTHORIZED',
  'Authentication required'
);

const REPORT_FORBIDDEN_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.PERM_ACCESS_DENIED,
  'Access denied'
);

const REPORT_NOT_FOUND_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.RES_NOT_FOUND,
  'Report catalog item not found'
);

@ApiTags('Ops - Reports')
@ApiBearerAuth()
@RequireCapabilities('reports.mfr')
@Controller('reports')
export class ReportCatalogController {
  constructor(private readonly reportCatalogApplicationService: ReportCatalogApplicationService) {}

  @Get('catalog')
  @RequirePermissions({ resource: 'report.mfr', action: 'read' })
  @ApiOperation({ summary: 'List available report catalog items' })
  @ApiResponse({
    status: 200,
    description: 'Returns available report catalog items',
    schema: REPORT_CATALOG_LIST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to list report catalog items',
    schema: REPORT_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions to list report catalog items',
    schema: REPORT_FORBIDDEN_SCHEMA,
  })
  listCatalog() {
    return this.reportCatalogApplicationService.list();
  }

  @Get('catalog/:reportId')
  @RequirePermissions({ resource: 'report.mfr', action: 'read' })
  @ApiOperation({ summary: 'Get report catalog metadata' })
  @ApiParam({
    name: 'reportId',
    description: 'Report catalog identifier',
    schema: { type: 'string', example: 'mfr' },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns report catalog metadata',
    schema: REPORT_CATALOG_ITEM_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to read report catalog metadata',
    schema: REPORT_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions to read report catalog metadata',
    schema: REPORT_FORBIDDEN_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Report catalog item was not found',
    schema: REPORT_NOT_FOUND_SCHEMA,
  })
  getCatalogItem(@Param('reportId') reportId: string) {
    return this.reportCatalogApplicationService.get(reportId);
  }
}
