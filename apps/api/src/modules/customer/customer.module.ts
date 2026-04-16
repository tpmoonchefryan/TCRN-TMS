// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { IntegrationModule } from '../integration';
import { QUEUE_NAMES } from '../queue';
import { BatchOperationApplicationService } from './application/batch-operation.service';
import { CompanyCustomerApplicationService } from './application/company-customer.service';
import { CustomerArchiveAccessService } from './application/customer-archive-access.service';
import { CustomerExternalIdApplicationService } from './application/customer-external-id.service';
import { CustomerPiiPlatformApplicationService } from './application/customer-pii-platform.service';
import { CustomerProfileReadService } from './application/customer-profile-read.service';
import { CustomerProfileWriteService } from './application/customer-profile-write.service';
import { IndividualCustomerPiiApplicationService } from './application/individual-customer-pii.service';
import { IndividualCustomerWriteApplicationService } from './application/individual-customer-write.service';
import { MembershipRecordApplicationService } from './application/membership-record.service';
import { MembershipSchedulerApplicationService } from './application/membership-scheduler.service';
import { PlatformIdentityApplicationService } from './application/platform-identity.service';
import {
  CustomerController,
  ExternalIdController,
  MembershipController,
  PlatformIdentityController,
} from './controllers';
import { BatchOperationQueueGateway } from './infrastructure/batch-operation.queue';
import { BatchOperationRepository } from './infrastructure/batch-operation.repository';
import { CompanyCustomerRepository } from './infrastructure/company-customer.repository';
import { CustomerArchiveRepository } from './infrastructure/customer-archive.repository';
import { CustomerExternalIdRepository } from './infrastructure/customer-external-id.repository';
import { CustomerProfileReadRepository } from './infrastructure/customer-profile-read.repository';
import { CustomerProfileWriteRepository } from './infrastructure/customer-profile-write.repository';
import { IndividualCustomerPiiRepository } from './infrastructure/individual-customer-pii.repository';
import { IndividualCustomerWriteRepository } from './infrastructure/individual-customer-write.repository';
import { MembershipRecordRepository } from './infrastructure/membership-record.repository';
import { MembershipSchedulerRepository } from './infrastructure/membership-scheduler.repository';
import { PlatformIdentityRepository } from './infrastructure/platform-identity.repository';
import {
  BatchOperationService,
  CompanyCustomerService,
  CustomerExternalIdService,
  CustomerProfileService,
  IndividualCustomerService,
  MembershipRecordService,
  MembershipSchedulerService,
  PlatformIdentityService,
} from './services';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_NAMES.IMPORT }),
    IntegrationModule,
  ],
  controllers: [
    CustomerController,
    PlatformIdentityController,
    MembershipController,
    ExternalIdController,
  ],
  providers: [
    BatchOperationQueueGateway,
    BatchOperationRepository,
    BatchOperationApplicationService,
    BatchOperationService,
    CustomerArchiveRepository,
    CustomerArchiveAccessService,
    CompanyCustomerRepository,
    CompanyCustomerApplicationService,
    CustomerPiiPlatformApplicationService,
    CustomerExternalIdRepository,
    CustomerExternalIdApplicationService,
    IndividualCustomerPiiRepository,
    IndividualCustomerPiiApplicationService,
    IndividualCustomerWriteRepository,
    IndividualCustomerWriteApplicationService,
    CustomerProfileReadRepository,
    CustomerProfileReadService,
    CustomerProfileWriteRepository,
    CustomerProfileWriteService,
    MembershipRecordRepository,
    MembershipRecordApplicationService,
    MembershipSchedulerRepository,
    MembershipSchedulerApplicationService,
    PlatformIdentityRepository,
    PlatformIdentityApplicationService,
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
    CustomerArchiveAccessService,
  ],
})
export class CustomerModule {}
