// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../../common/decorators';
import { LokiQueryService } from '../services';

@ApiTags('System - Logs')
@Controller('logs/search')
export class LogSearchController {
  constructor(private readonly lokiQueryService: LokiQueryService) {}

  @Get()
  @RequirePermissions({ resource: 'log.search', action: 'read' })
  @ApiOperation({ summary: 'Search logs across all streams' })
  @ApiQuery({ name: 'keyword', required: false, description: 'Search keyword' })
  @ApiQuery({ name: 'stream', required: false, description: 'Log stream filter' })
  @ApiQuery({ name: 'severity', required: false, description: 'Severity filter' })
  @ApiQuery({ name: 'start', required: false, description: 'Start time (ISO string)' })
  @ApiQuery({ name: 'end', required: false, description: 'End time (ISO string)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results' })
  @ApiResponse({ status: 200, description: 'Returns matching log entries' })
  async search(
    @Query('keyword') keyword?: string,
    @Query('stream') stream?: string,
    @Query('severity') severity?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('limit') limit?: string,
  ) {
    return this.lokiQueryService.query({
      keyword,
      stream,
      severity,
      start,
      end,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('change-logs')
  @RequirePermissions({ resource: 'log.change_log', action: 'read' })
  @ApiOperation({ summary: 'Search change logs in Loki' })
  @ApiResponse({ status: 200, description: 'Returns matching change logs' })
  async searchChangeLogs(
    @Query('objectType') objectType?: string,
    @Query('action') action?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('limit') limit?: string,
  ) {
    return this.lokiQueryService.queryChangeLogs({
      objectType,
      action,
      start,
      end,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('events')
  @RequirePermissions({ resource: 'log.tech_log', action: 'read' })
  @ApiOperation({ summary: 'Search tech events in Loki' })
  @ApiResponse({ status: 200, description: 'Returns matching tech events' })
  async searchTechEvents(
    @Query('severity') severity?: string,
    @Query('eventType') eventType?: string,
    @Query('scope') scope?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('limit') limit?: string,
  ) {
    return this.lokiQueryService.queryTechEvents({
      severity,
      eventType,
      scope,
      start,
      end,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('integrations')
  @RequirePermissions({ resource: 'log.integration_log', action: 'read' })
  @ApiOperation({ summary: 'Search integration logs in Loki' })
  @ApiResponse({ status: 200, description: 'Returns matching integration logs' })
  async searchIntegrationLogs(
    @Query('direction') direction?: string,
    @Query('consumerCode') consumerCode?: string,
    @Query('status') status?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('limit') limit?: string,
  ) {
    return this.lokiQueryService.queryIntegrationLogs({
      direction,
      consumerCode,
      status,
      start,
      end,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
