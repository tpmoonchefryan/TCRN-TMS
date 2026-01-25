// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { AuthenticatedUser, CurrentUser, RequirePermissions } from '../../../common/decorators';
import { JwtAuthGuard } from '../../../common/guards';
import { ChangeLogQueryDto, PaginationDto } from '../dto/log.dto';
import { ChangeLogQueryService } from '../services';

@ApiTags('Logs - Change Log')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('logs/changes')
export class ChangeLogController {
  constructor(private readonly changeLogService: ChangeLogQueryService) {}

  @Get()
  @RequirePermissions({ resource: 'log.change_log', action: 'read' })
  @ApiOperation({ summary: 'Query change logs' })
  @ApiResponse({ status: 200, description: 'Returns paginated change logs' })
  async list(
    @Query() query: ChangeLogQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.changeLogService.findMany(query, user.tenantSchema);
  }

  @Get('object/:objectType/:objectId')
  @RequirePermissions({ resource: 'log.change_log', action: 'read' })
  @ApiOperation({ summary: 'Get change history for a specific object' })
  @ApiResponse({ status: 200, description: 'Returns change history' })
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
  @ApiResponse({ status: 200, description: 'Returns operator history' })
  async getOperatorHistory(
    @Param('operatorId', ParseUUIDPipe) operatorId: string,
    @Query() query: PaginationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.changeLogService.findByOperator(operatorId, query, user.tenantSchema);
  }
}
