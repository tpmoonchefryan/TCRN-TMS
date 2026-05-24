// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// System Role Module Zod DTOs - Using createZodDto for Swagger integration
import { createZodDto } from 'nestjs-zod';

import { CreateSystemRoleSchema, UpdateSystemRoleSchema } from '@tcrn/shared';

export class CreateSystemRoleZodDto extends createZodDto(CreateSystemRoleSchema) {}
export class UpdateSystemRoleZodDto extends createZodDto(UpdateSystemRoleSchema) {}
