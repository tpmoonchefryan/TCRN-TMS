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
import { TechEventLogQueryDto } from '../dto/log.dto';
import { TechEventLogQueryService } from '../services';

@ApiTags('System - Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('logs/events')
export class TechEventLogController {
  constructor(private readonly techLogService: TechEventLogQueryService) {}

  @Get()
  @RequirePermissions({ resource: 'log.tech_log', action: 'read' })
  @ApiOperation({ summary: 'Query technical event logs' })
  @ApiResponse({ status: 200, description: 'Returns paginated event logs' })
  async list(
    @Query() query: TechEventLogQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.techLogService.findMany(query, user.tenantSchema);
  }

  @Get('trace/:traceId')
  @RequirePermissions({ resource: 'log.tech_log', action: 'read' })
  @ApiOperation({ summary: 'Get events by trace ID' })
  @ApiResponse({ status: 200, description: 'Returns events for trace' })
  async getByTraceId(
    @Param('traceId') traceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.techLogService.findByTraceId(traceId, user.tenantSchema);
  }
}
