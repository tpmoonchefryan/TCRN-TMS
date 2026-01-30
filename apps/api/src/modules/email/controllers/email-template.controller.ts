// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';

import { RequirePermissions } from '../../../common/decorators';
import { JwtAuthGuard } from '../../../common/guards';
import {
    CreateEmailTemplateDto,
    EmailTemplateQueryDto,
    PreviewEmailTemplateDto,
    UpdateEmailTemplateDto,
} from '../dto/email-template.dto';
import { EmailTemplateService } from '../services/email-template.service';

import { ApiTags } from '@nestjs/swagger';
import type { SupportedLocale } from '../interfaces/email.interface';

@ApiTags('Ops - Email')
@Controller('email-templates')
@UseGuards(JwtAuthGuard)
export class EmailTemplateController {
  constructor(private readonly templateService: EmailTemplateService) {}

  @Get()
  @RequirePermissions({ resource: 'email.template', action: 'read' })
  async findAll(@Query() query: EmailTemplateQueryDto) {
    return this.templateService.findAll(query);
  }

  @Get(':code')
  @RequirePermissions({ resource: 'email.template', action: 'read' })
  async findOne(@Param('code') code: string) {
    return this.templateService.findByCode(code);
  }

  @Post()
  @RequirePermissions({ resource: 'email.template', action: 'create' })
  async create(@Body() dto: CreateEmailTemplateDto) {
    return this.templateService.create(dto);
  }

  @Patch(':code')
  @RequirePermissions({ resource: 'email.template', action: 'update' })
  async update(@Param('code') code: string, @Body() dto: UpdateEmailTemplateDto) {
    return this.templateService.update(code, dto);
  }

  @Delete(':code')
  @RequirePermissions({ resource: 'email.template', action: 'delete' })
  async deactivate(@Param('code') code: string) {
    return this.templateService.deactivate(code);
  }

  @Post(':code/reactivate')
  @RequirePermissions({ resource: 'email.template', action: 'update' })
  async reactivate(@Param('code') code: string) {
    return this.templateService.reactivate(code);
  }

  @Post(':code/preview')
  @RequirePermissions({ resource: 'email.template', action: 'read' })
  async preview(@Param('code') code: string, @Body() dto: PreviewEmailTemplateDto) {
    return this.templateService.preview(
      code,
      (dto.locale as SupportedLocale) || 'en',
      dto.variables || {},
    );
  }
}
