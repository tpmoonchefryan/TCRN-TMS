// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuthenticatedUser, CurrentUser, RequirePermissions } from '../../../common/decorators';
import { JwtAuthGuard } from '../../../common/guards';
import { ChangeLogQueryDto, PaginationDto } from '../dto/log.dto';
import { ChangeLogQueryService } from '../services';
import {
  CHANGE_LOG_LIST_SCHEMA,
  LOG_FORBIDDEN_SCHEMA,
  LOG_UNAUTHORIZED_SCHEMA,
} from './log-swagger.schemas';

@ApiTags('System - Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('logs/changes')
export class ChangeLogController {
  constructor(private readonly changeLogService: ChangeLogQueryService) {}

  @Get()
  @RequirePermissions({ resource: 'log.change_log', action: 'read' })
  @ApiOperation({ summary: 'Query change logs' })
  @ApiResponse({ status: 200, description: 'Returns paginated change logs', schema: CHANGE_LOG_LIST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to read change logs', schema: LOG_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to read change logs', schema: LOG_FORBIDDEN_SCHEMA })
  async list(
    @Query() query: ChangeLogQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.changeLogService.findMany(query, user.tenantSchema);
  }

  @Get('object/:objectType/:objectId')
  @RequirePermissions({ resource: 'log.change_log', action: 'read' })
  @ApiOperation({ summary: 'Get change history for a specific object' })
  @ApiParam({ name: 'objectType', description: 'Domain object type', schema: { type: 'string' } })
  @ApiParam({ name: 'objectId', description: 'Domain object identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Returns change history', schema: CHANGE_LOG_LIST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to read change history', schema: LOG_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to read change history', schema: LOG_FORBIDDEN_SCHEMA })
  async getObjectHistory(
    @Param('objectType') objectType: string,
    @Param('objectId', ParseUUIDPipe) objectId: string,
    @Query() query: PaginationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.changeLogService.findByObject(objectType, objectId, query, user.tenantSchema);
  }

  @Get('operator/:operatorId')
  @RequirePermissions({ resource: 'log.change_log', action: 'read' })
  @ApiOperation({ summary: 'Get changes made by a specific operator' })
  @ApiParam({ name: 'operatorId', description: 'Operator identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Returns operator history', schema: CHANGE_LOG_LIST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to read operator history', schema: LOG_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to read operator history', schema: LOG_FORBIDDEN_SCHEMA })
  async getOperatorHistory(
    @Param('operatorId', ParseUUIDPipe) operatorId: string,
    @Query() query: PaginationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.changeLogService.findByOperator(operatorId, query, user.tenantSchema);
  }
}
