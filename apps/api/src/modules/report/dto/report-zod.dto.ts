// SPDX-License-Identifier: Apache-2.0
// Report Module Zod DTOs - Using createZodDto for Swagger integration
import { createZodDto } from 'nestjs-zod';

import { CreateMfrJobSchema, MfrSearchRequestSchema, ReportJobListQuerySchema } from '@tcrn/shared';

export class MfrSearchRequestZodDto extends createZodDto(MfrSearchRequestSchema) {}
export class CreateMfrJobZodDto extends createZodDto(CreateMfrJobSchema) {}
export class ReportJobListQueryZodDto extends createZodDto(ReportJobListQuerySchema) {}
