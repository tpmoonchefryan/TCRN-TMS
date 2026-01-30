// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { QUEUE_NAMES } from '../queue';

import {
  CustomerController,
  PlatformIdentityController,
  MembershipController,
  ExternalIdController,
} from './controllers';
import {
  BatchOperationService,
  CustomerProfileService,
  IndividualCustomerService,
  CompanyCustomerService,
  PlatformIdentityService,
  MembershipRecordService,
  CustomerExternalIdService,
  MembershipSchedulerService,
} from './services';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_NAMES.IMPORT }),
  ],
  controllers: [
    CustomerController,
    PlatformIdentityController,
    MembershipController,
    ExternalIdController,
  ],
  providers: [
    BatchOperationService,
    CustomerProfileService,
    IndividualCustomerService,
    CompanyCustomerService,
    PlatformIdentityService,
    MembershipRecordService,
    CustomerExternalIdService,
    MembershipSchedulerService,
  ],
  exports: [
    BatchOperationService,
    CustomerProfileService,
    IndividualCustomerService,
    CompanyCustomerService,
    PlatformIdentityService,
    MembershipRecordService,
    CustomerExternalIdService,
    MembershipSchedulerService,
  ],
})
export class CustomerModule {}
