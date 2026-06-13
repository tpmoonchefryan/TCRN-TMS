// SPDX-License-Identifier: Apache-2.0
// PII Config Module Zod DTOs - Using createZodDto for Swagger integration
import { createZodDto } from 'nestjs-zod';

import {
  CreatePiiServiceConfigSchema,
  CreateProfileStoreSchema,
  PiiConfigQuerySchema,
  UpdatePiiServiceConfigSchema,
  UpdateProfileStoreSchema,
} from '@tcrn/shared';

// Service Config DTOs
export class CreatePiiServiceConfigZodDto extends createZodDto(CreatePiiServiceConfigSchema) {}
export class UpdatePiiServiceConfigZodDto extends createZodDto(UpdatePiiServiceConfigSchema) {}

// Profile Store DTOs
export class CreateProfileStoreZodDto extends createZodDto(CreateProfileStoreSchema) {}
export class UpdateProfileStoreZodDto extends createZodDto(UpdateProfileStoreSchema) {}

// Query DTOs
export class PiiConfigQueryZodDto extends createZodDto(PiiConfigQuerySchema) {}
