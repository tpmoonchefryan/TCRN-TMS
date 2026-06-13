// SPDX-License-Identifier: Apache-2.0
// Integration Module Zod DTOs - Using createZodDto for Swagger integration
import { createZodDto } from 'nestjs-zod';

import {
  AdapterListQuerySchema,
  CreateAdapterSchema,
  CreateWebhookSchema,
  IntegrationLogQuerySchema,
  UpdateAdapterConfigsSchema,
  UpdateAdapterSchema,
  UpdateWebhookSchema,
} from '@tcrn/shared';

// Adapter DTOs
export class AdapterListQueryZodDto extends createZodDto(AdapterListQuerySchema) {}
export class CreateAdapterZodDto extends createZodDto(CreateAdapterSchema) {}
export class UpdateAdapterZodDto extends createZodDto(UpdateAdapterSchema) {}
export class UpdateAdapterConfigsZodDto extends createZodDto(UpdateAdapterConfigsSchema) {}

// Webhook DTOs
export class CreateWebhookZodDto extends createZodDto(CreateWebhookSchema) {}
export class UpdateWebhookZodDto extends createZodDto(UpdateWebhookSchema) {}

// Log DTOs
export class IntegrationLogQueryZodDto extends createZodDto(IntegrationLogQuerySchema) {}
