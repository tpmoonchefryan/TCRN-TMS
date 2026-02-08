// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Global, Module } from '@nestjs/common';

import { MyPermissionsController } from './my-permissions.controller';
import { PermissionController } from './permission.controller';
import { PermissionService } from './permission.service';
import { PermissionSchedulerService } from './permission-scheduler.service';
import { PermissionSnapshotService } from './permission-snapshot.service';

@Global()
@Module({
  controllers: [PermissionController, MyPermissionsController],
  providers: [PermissionService, PermissionSnapshotService, PermissionSchedulerService],
  exports: [PermissionService, PermissionSnapshotService, PermissionSchedulerService],
})
export class PermissionModule {}
