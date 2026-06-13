// SPDX-License-Identifier: Apache-2.0
import { Global, Module } from '@nestjs/common';

import { MyPermissionsController } from './my-permissions.controller';
import { PermissionSchedulerService } from './permission-scheduler.service';
import { PermissionSnapshotService } from './permission-snapshot.service';
import { PermissionController } from './permission.controller';
import { PermissionService } from './permission.service';

@Global()
@Module({
  controllers: [PermissionController, MyPermissionsController],
  providers: [PermissionService, PermissionSnapshotService, PermissionSchedulerService],
  exports: [PermissionService, PermissionSnapshotService, PermissionSchedulerService],
})
export class PermissionModule {}
