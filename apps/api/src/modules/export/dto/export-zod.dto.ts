// SPDX-License-Identifier: Apache-2.0
// Export Module Zod DTOs - Using createZodDto for Swagger integration
import { createZodDto } from 'nestjs-zod';

import { CreateExportJobSchema, ExportJobQuerySchema } from '@tcrn/shared';

export class CreateExportJobZodDto extends createZodDto(CreateExportJobSchema) {}
export class ExportJobQueryZodDto extends createZodDto(ExportJobQuerySchema) {}
