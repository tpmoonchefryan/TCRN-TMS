// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { success } from '../../common/response.util';
import { CreateSystemRoleDto } from './dto/create-system-role.dto';
import { UpdateSystemRoleDto } from './dto/update-system-role.dto';
import { SystemRoleService } from './system-role.service';

@Controller('system-roles')
export class SystemRoleController {
  constructor(private readonly systemRoleService: SystemRoleService) {}

  @Post()
  async create(@Body() createSystemRoleDto: CreateSystemRoleDto) {
    const role = await this.systemRoleService.create(createSystemRoleDto);
    return success(role);
  }

  @Get()
  async findAll(
    @Query('isActive') isActive?: string,
    @Query('isSystem') isSystem?: string,
    @Query('search') search?: string,
  ) {
    const filters = {
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      isSystem: isSystem === 'true' ? true : isSystem === 'false' ? false : undefined,
      search,
    };
    const roles = await this.systemRoleService.findAll(filters);
    return success(roles);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const role = await this.systemRoleService.findOne(id);
    return success(role);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateSystemRoleDto: UpdateSystemRoleDto) {
    const role = await this.systemRoleService.update(id, updateSystemRoleDto);
    return success(role);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.systemRoleService.remove(id);
    return success({ deleted: true });
  }
}
