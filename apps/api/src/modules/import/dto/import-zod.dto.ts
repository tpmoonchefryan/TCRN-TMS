// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Import Module Zod DTOs - Using createZodDto for Swagger integration
import { createZodDto } from 'nestjs-zod';

import { CreateImportJobSchema, ImportJobQuerySchema } from '@tcrn/shared';

export class CreateImportJobZodDto extends createZodDto(CreateImportJobSchema) {}
export class ImportJobQueryZodDto extends createZodDto(ImportJobQuerySchema) {}
