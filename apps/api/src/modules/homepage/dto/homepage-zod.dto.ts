// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Homepage Module Zod DTOs - Using createZodDto for Swagger integration

import {
    PublishSchema,
    SaveDraftSchema,
    UpdateHomepageSettingsSchema,
    VersionListQuerySchema,
} from '@tcrn/shared';
import { createZodDto } from 'nestjs-zod';

// Request DTOs
export class SaveDraftZodDto extends createZodDto(SaveDraftSchema) {}
export class PublishZodDto extends createZodDto(PublishSchema) {}
export class UpdateHomepageSettingsZodDto extends createZodDto(UpdateHomepageSettingsSchema) {}
export class VersionListQueryZodDto extends createZodDto(VersionListQuerySchema) {}
