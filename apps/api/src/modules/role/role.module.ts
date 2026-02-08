// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Module } from '@nestjs/common';

import { DelegatedAdminModule } from '../delegated-admin';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';
import { UserRoleController } from './user-role.controller';
import { UserRoleService } from './user-role.service';

@Module({
  imports: [DelegatedAdminModule],
  controllers: [RoleController, UserRoleController],
  providers: [RoleService, UserRoleService],
  exports: [RoleService, UserRoleService],
})
export class RoleModule {}
