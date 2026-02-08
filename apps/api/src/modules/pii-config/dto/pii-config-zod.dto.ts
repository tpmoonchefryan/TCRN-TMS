// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// PII Config Module Zod DTOs - Using createZodDto for Swagger integration

import {
    CreatePiiServiceConfigSchema,
    CreateProfileStoreSchema,
    PiiConfigQuerySchema,
    UpdatePiiServiceConfigSchema,
    UpdateProfileStoreSchema,
} from '@tcrn/shared';
import { createZodDto } from 'nestjs-zod';

// Service Config DTOs
export class CreatePiiServiceConfigZodDto extends createZodDto(CreatePiiServiceConfigSchema) {}
export class UpdatePiiServiceConfigZodDto extends createZodDto(UpdatePiiServiceConfigSchema) {}

// Profile Store DTOs
export class CreateProfileStoreZodDto extends createZodDto(CreateProfileStoreSchema) {}
export class UpdateProfileStoreZodDto extends createZodDto(UpdateProfileStoreSchema) {}

// Query DTOs
export class PiiConfigQueryZodDto extends createZodDto(PiiConfigQuerySchema) {}
