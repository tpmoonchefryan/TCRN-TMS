// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Log Module Zod DTOs - Using createZodDto for Swagger integration

import {
    ChangeLogQuerySchema,
    LogIntegrationQuerySchema,
    LogSearchSchema,
    TechEventLogQuerySchema,
} from '@tcrn/shared';
import { createZodDto } from 'nestjs-zod';

export class ChangeLogQueryZodDto extends createZodDto(ChangeLogQuerySchema) {}
export class TechEventLogQueryZodDto extends createZodDto(TechEventLogQuerySchema) {}
export class LogIntegrationQueryZodDto extends createZodDto(LogIntegrationQuerySchema) {}
export class LogSearchZodDto extends createZodDto(LogSearchSchema) {}
