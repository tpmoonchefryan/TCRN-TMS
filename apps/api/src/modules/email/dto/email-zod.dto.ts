// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Email Module Zod DTOs - Using createZodDto for Swagger integration

import {
    CreateEmailTemplateSchema,
    EmailTemplateQuerySchema,
    PreviewEmailTemplateSchema,
    SaveEmailConfigSchema,
    SendEmailSchema,
    TestEmailSchema,
    UpdateEmailTemplateSchema,
} from '@tcrn/shared';
import { createZodDto } from 'nestjs-zod';

// Config DTOs
export class SaveEmailConfigZodDto extends createZodDto(SaveEmailConfigSchema) {}
export class TestEmailZodDto extends createZodDto(TestEmailSchema) {}

// Template DTOs
export class CreateEmailTemplateZodDto extends createZodDto(CreateEmailTemplateSchema) {}
export class UpdateEmailTemplateZodDto extends createZodDto(UpdateEmailTemplateSchema) {}
export class PreviewEmailTemplateZodDto extends createZodDto(PreviewEmailTemplateSchema) {}
export class EmailTemplateQueryZodDto extends createZodDto(EmailTemplateQuerySchema) {}

// Send Email DTO
export class SendEmailZodDto extends createZodDto(SendEmailSchema) {}
