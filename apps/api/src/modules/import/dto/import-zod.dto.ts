// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Import Module Zod DTOs - Using createZodDto for Swagger integration

import {
    CreateImportJobSchema,
    ImportJobQuerySchema,
} from '@tcrn/shared';
import { createZodDto } from 'nestjs-zod';

export class CreateImportJobZodDto extends createZodDto(CreateImportJobSchema) {}
export class ImportJobQueryZodDto extends createZodDto(ImportJobQuerySchema) {}
