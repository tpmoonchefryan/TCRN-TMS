// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    Controller,
    Get,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuthenticatedUser, CurrentUser, RequirePermissions } from '../../../common/decorators';
import { JwtAuthGuard } from '../../../common/guards';
import { IntegrationLogQueryDto, PaginationDto } from '../dto/log.dto';
import { IntegrationLogQueryService } from '../services';

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
  @ApiResponse({ status: 200, description: 'Returns paginated integration logs' })
  async list(
    @Query() query: IntegrationLogQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.integrationLogService.findMany(query, user.tenantSchema);
  }

  @Get('trace/:traceId')
  @RequirePermissions({ resource: 'log.integration_log', action: 'read' })
  @ApiOperation({ summary: 'Get integration logs by trace ID' })
  @ApiResponse({ status: 200, description: 'Returns logs for trace' })
  async getByTraceId(
    @Param('traceId') traceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.integrationLogService.findByTraceId(traceId, user.tenantSchema);
  }

  @Get('failed')
  @RequirePermissions({ resource: 'log.integration_log', action: 'read' })
  @ApiOperation({ summary: 'Get failed integration requests' })
  @ApiResponse({ status: 200, description: 'Returns failed requests' })
  async getFailed(
    @Query() query: PaginationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.integrationLogService.findFailed(query, user.tenantSchema);
  }
}
