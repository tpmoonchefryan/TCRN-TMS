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
import { TechEventLogQueryDto } from '../dto/log.dto';
import { TechEventLogQueryService } from '../services';
import {
  LOG_FORBIDDEN_SCHEMA,
  LOG_UNAUTHORIZED_SCHEMA,
  TECH_EVENT_LOG_LIST_SCHEMA,
  TECH_EVENT_TRACE_SCHEMA,
} from './log-swagger.schemas';

@ApiTags('System - Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('logs/events')
export class TechEventLogController {
  constructor(private readonly techLogService: TechEventLogQueryService) {}

  @Get()
  @RequirePermissions({ resource: 'log.tech_log', action: 'read' })
  @ApiOperation({ summary: 'Query technical event logs' })
  @ApiResponse({ status: 200, description: 'Returns paginated event logs', schema: TECH_EVENT_LOG_LIST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to read technical event logs', schema: LOG_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to read technical event logs', schema: LOG_FORBIDDEN_SCHEMA })
  async list(
    @Query() query: TechEventLogQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.techLogService.findMany(query, user.tenantSchema);
  }

  @Get('trace/:traceId')
  @RequirePermissions({ resource: 'log.tech_log', action: 'read' })
  @ApiOperation({ summary: 'Get events by trace ID' })
  @ApiParam({ name: 'traceId', description: 'Trace identifier', schema: { type: 'string' } })
  @ApiResponse({ status: 200, description: 'Returns events for trace', schema: TECH_EVENT_TRACE_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to read events by trace', schema: LOG_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to read events by trace', schema: LOG_FORBIDDEN_SCHEMA })
  async getByTraceId(
    @Param('traceId') traceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.techLogService.findByTraceId(traceId, user.tenantSchema);
  }
}
