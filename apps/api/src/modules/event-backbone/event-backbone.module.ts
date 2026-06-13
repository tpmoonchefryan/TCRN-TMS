// SPDX-License-Identifier: Apache-2.0
import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { EventBackboneController } from './event-backbone.controller';
import { EventBackboneRepository } from './event-backbone.repository';
import { EventBackboneService } from './event-backbone.service';

@Module({
  imports: [DatabaseModule],
  controllers: [EventBackboneController],
  providers: [EventBackboneRepository, EventBackboneService],
  exports: [EventBackboneService],
})
export class EventBackboneModule {}
