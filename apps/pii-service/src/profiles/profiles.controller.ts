// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { Request } from 'express';

import { CurrentContext } from '../auth/decorators/current-context.decorator';
import { JwtContext } from '../auth/strategies/jwt.strategy';

import {
  CreatePiiProfileDto,
  UpdatePiiProfileDto,
  BatchGetProfilesDto,
} from './dto/profile.dto';
import { ProfilesService } from './services/profiles.service';

@ApiTags('PII Profiles')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-ID', required: true, description: 'Tenant ID' })
@Controller('api/v1/profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  /**
   * Create a new PII profile
   */
  @Post()
  @ApiOperation({ summary: 'Create PII profile' })
  async create(
    @Body() dto: CreatePiiProfileDto,
    @CurrentContext() context: JwtContext,
    @Req() req: Request,
  ) {
    const result = await this.profilesService.create(
      dto,
      context,
      req.ip,
      req.headers['user-agent'],
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get a PII profile by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get PII profile' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentContext() context: JwtContext,
    @Req() req: Request,
  ) {
    const result = await this.profilesService.findById(
      id,
      context,
      req.ip,
      req.headers['user-agent'],
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Update a PII profile
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update PII profile' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePiiProfileDto,
    @CurrentContext() context: JwtContext,
    @Req() req: Request,
  ) {
    const result = await this.profilesService.update(
      id,
      dto,
      context,
      req.ip,
      req.headers['user-agent'],
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Batch get profiles (for service JWT only)
   */
  @Post('batch')
  @ApiOperation({ summary: 'Batch get PII profiles' })
  async batchGet(
    @Body() dto: BatchGetProfilesDto,
    @CurrentContext() context: JwtContext,
    @Req() req: Request,
  ) {
    const result = await this.profilesService.batchGet(
      dto,
      context,
      req.ip,
      req.headers['user-agent'],
    );

    return {
      success: true,
      data: result.data,
      errors: Object.keys(result.errors).length > 0 ? result.errors : undefined,
    };
  }

  /**
   * Delete a PII profile
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete PII profile' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentContext() context: JwtContext,
    @Req() req: Request,
  ) {
    await this.profilesService.delete(
      id,
      context,
      req.ip,
      req.headers['user-agent'],
    );

    return {
      success: true,
      message: 'Profile deleted',
    };
  }
}
