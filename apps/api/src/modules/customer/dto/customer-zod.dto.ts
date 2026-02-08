// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Customer Module Zod DTOs - Using createZodDto for Swagger integration

import {
    BatchOperationSchema,
    CreateCompanyCustomerSchema,
    CreateExternalIdSchema,
    CreateIndividualCustomerSchema,
    CreateMembershipSchema,
    CreatePlatformIdentitySchema,
    CustomerListQuerySchema,
    DeactivateCustomerSchema,
    MembershipListQuerySchema,
    PlatformIdentityHistoryQuerySchema,
    UpdateCompanyCustomerSchema,
    UpdateIndividualCustomerSchema,
    UpdateIndividualPiiSchema,
    UpdateMembershipSchema,
    UpdatePlatformIdentitySchema,
} from '@tcrn/shared';
import { createZodDto } from 'nestjs-zod';

// Query DTOs
export class CustomerListQueryZodDto extends createZodDto(CustomerListQuerySchema) {}
export class MembershipListQueryZodDto extends createZodDto(MembershipListQuerySchema) {}
export class PlatformIdentityHistoryQueryZodDto extends createZodDto(PlatformIdentityHistoryQuerySchema) {}

// Individual Customer DTOs
export class CreateIndividualCustomerZodDto extends createZodDto(CreateIndividualCustomerSchema) {}
export class UpdateIndividualCustomerZodDto extends createZodDto(UpdateIndividualCustomerSchema) {}
export class UpdateIndividualPiiZodDto extends createZodDto(UpdateIndividualPiiSchema) {}

// Company Customer DTOs
export class CreateCompanyCustomerZodDto extends createZodDto(CreateCompanyCustomerSchema) {}
export class UpdateCompanyCustomerZodDto extends createZodDto(UpdateCompanyCustomerSchema) {}

// Platform Identity DTOs
export class CreatePlatformIdentityZodDto extends createZodDto(CreatePlatformIdentitySchema) {}
export class UpdatePlatformIdentityZodDto extends createZodDto(UpdatePlatformIdentitySchema) {}

// Membership DTOs
export class CreateMembershipZodDto extends createZodDto(CreateMembershipSchema) {}
export class UpdateMembershipZodDto extends createZodDto(UpdateMembershipSchema) {}

// Other DTOs
export class DeactivateCustomerZodDto extends createZodDto(DeactivateCustomerSchema) {}
export class CreateExternalIdZodDto extends createZodDto(CreateExternalIdSchema) {}
export class BatchOperationZodDto extends createZodDto(BatchOperationSchema) {}
