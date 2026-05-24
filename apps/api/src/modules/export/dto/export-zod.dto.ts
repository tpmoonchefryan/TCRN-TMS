// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Export Module Zod DTOs - Using createZodDto for Swagger integration
import { createZodDto } from 'nestjs-zod';

import { CreateExportJobSchema, ExportJobQuerySchema } from '@tcrn/shared';

export class CreateExportJobZodDto extends createZodDto(CreateExportJobSchema) {}
export class ExportJobQueryZodDto extends createZodDto(ExportJobQuerySchema) {}
