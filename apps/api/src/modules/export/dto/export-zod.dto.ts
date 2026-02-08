// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Export Module Zod DTOs - Using createZodDto for Swagger integration

import {
    CreateExportJobSchema,
    ExportJobQuerySchema,
} from '@tcrn/shared';
import { createZodDto } from 'nestjs-zod';

export class CreateExportJobZodDto extends createZodDto(CreateExportJobSchema) {}
export class ExportJobQueryZodDto extends createZodDto(ExportJobQuerySchema) {}
