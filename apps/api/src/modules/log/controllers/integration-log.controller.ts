// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    Controller,
    Get,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuthenticatedUser, CurrentUser, RequirePermissions } from '../../../common/decorators';
import { JwtAuthGuard } from '../../../common/guards';
import { IntegrationLogQueryDto, PaginationDto } from '../dto/log.dto';
import { IntegrationLogQueryService } from '../services';
import {
  INTEGRATION_LOG_LIST_SCHEMA,
  INTEGRATION_LOG_TRACE_SCHEMA,
  LOG_FORBIDDEN_SCHEMA,
  LOG_UNAUTHORIZED_SCHEMA,
} from './log-swagger.schemas';

@ApiTags('System - Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('logs/integrations')
export class IntegrationLogController {
  constructor(
    private readonly integrationLogService: IntegrationLogQueryService,
  ) {}

  @Get()
  @RequirePermissions({ resource: 'log.integration_log', action: 'read' })
  @ApiOperation({ summary: 'Query integration logs' })
  @ApiResponse({ status: 200, description: 'Returns paginated integration logs', schema: INTEGRATION_LOG_LIST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to read integration logs', schema: LOG_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to read integration logs', schema: LOG_FORBIDDEN_SCHEMA })
  async list(
    @Query() query: IntegrationLogQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.integrationLogService.findMany(query, user.tenantSchema);
  }

  @Get('trace/:traceId')
  @RequirePermissions({ resource: 'log.integration_log', action: 'read' })
  @ApiOperation({ summary: 'Get integration logs by trace ID' })
  @ApiParam({ name: 'traceId', description: 'Trace identifier', schema: { type: 'string' } })
  @ApiResponse({ status: 200, description: 'Returns logs for trace', schema: INTEGRATION_LOG_TRACE_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to read integration logs by trace', schema: LOG_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to read integration logs by trace', schema: LOG_FORBIDDEN_SCHEMA })
  async getByTraceId(
    @Param('traceId') traceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.integrationLogService.findByTraceId(traceId, user.tenantSchema);
  }

  @Get('failed')
  @RequirePermissions({ resource: 'log.integration_log', action: 'read' })
  @ApiOperation({ summary: 'Get failed integration requests' })
  @ApiResponse({ status: 200, description: 'Returns failed requests', schema: INTEGRATION_LOG_LIST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to read failed integration requests', schema: LOG_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to read failed integration requests', schema: LOG_FORBIDDEN_SCHEMA })
  async getFailed(
    @Query() query: PaginationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.integrationLogService.findFailed(query, user.tenantSchema);
  }
}
