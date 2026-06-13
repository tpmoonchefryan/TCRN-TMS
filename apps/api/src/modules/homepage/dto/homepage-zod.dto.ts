// SPDX-License-Identifier: Apache-2.0
// Homepage Module Zod DTOs - Using createZodDto for Swagger integration
import { createZodDto } from 'nestjs-zod';

import {
  PublishSchema,
  SaveDraftSchema,
  UpdateHomepageSettingsSchema,
  VersionListQuerySchema,
} from '@tcrn/shared';

// Request DTOs
export class SaveDraftZodDto extends createZodDto(SaveDraftSchema) {}
export class PublishZodDto extends createZodDto(PublishSchema) {}
export class UpdateHomepageSettingsZodDto extends createZodDto(UpdateHomepageSettingsSchema) {}
export class VersionListQueryZodDto extends createZodDto(VersionListQuerySchema) {}
