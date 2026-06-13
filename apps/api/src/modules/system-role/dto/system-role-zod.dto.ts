// SPDX-License-Identifier: Apache-2.0
// System Role Module Zod DTOs - Using createZodDto for Swagger integration
import { createZodDto } from 'nestjs-zod';

import { CreateSystemRoleSchema, UpdateSystemRoleSchema } from '@tcrn/shared';

export class CreateSystemRoleZodDto extends createZodDto(CreateSystemRoleSchema) {}
export class UpdateSystemRoleZodDto extends createZodDto(UpdateSystemRoleSchema) {}
