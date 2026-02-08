// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Marshmallow Module Zod DTOs - Using createZodDto for Swagger integration

import {
    BlocklistBatchToggleSchema,
    CreateExternalBlocklistSchema,
    DisableExternalBlocklistSchema,
    ExportMessagesSchema,
    ExternalBlocklistQuerySchema,
    MarkReadSchema,
    MarshmallowBatchSchema,
    MessageListQuerySchema,
    PublicMessagesQuerySchema,
    ReactSchema,
    RejectMessageSchema,
    ReplyMessageSchema,
    SsoMarkReadSchema,
    SsoReplySchema,
    SubmitMessageSchema,
    UpdateExternalBlocklistSchema,
    UpdateMarshmallowConfigSchema,
    UpdateMessageSchema,
} from '@tcrn/shared';
import { createZodDto } from 'nestjs-zod';

// Config DTOs
export class UpdateMarshmallowConfigZodDto extends createZodDto(UpdateMarshmallowConfigSchema) {}

// Message Query DTOs
export class MessageListQueryZodDto extends createZodDto(MessageListQuerySchema) {}

// Message Action DTOs
export class RejectMessageZodDto extends createZodDto(RejectMessageSchema) {}
export class ReplyMessageZodDto extends createZodDto(ReplyMessageSchema) {}
export class MarshmallowBatchZodDto extends createZodDto(MarshmallowBatchSchema) {}
export class UpdateMessageZodDto extends createZodDto(UpdateMessageSchema) {}

// Public Submit DTOs
export class SubmitMessageZodDto extends createZodDto(SubmitMessageSchema) {}
export class PublicMessagesQueryZodDto extends createZodDto(PublicMessagesQuerySchema) {}
export class ReactZodDto extends createZodDto(ReactSchema) {}
export class MarkReadZodDto extends createZodDto(MarkReadSchema) {}

// SSO DTOs
export class SsoMarkReadZodDto extends createZodDto(SsoMarkReadSchema) {}
export class SsoReplyZodDto extends createZodDto(SsoReplySchema) {}

// Export DTOs
export class ExportMessagesZodDto extends createZodDto(ExportMessagesSchema) {}

// External Blocklist DTOs
export class ExternalBlocklistQueryZodDto extends createZodDto(ExternalBlocklistQuerySchema) {}
export class DisableExternalBlocklistZodDto extends createZodDto(DisableExternalBlocklistSchema) {}
export class CreateExternalBlocklistZodDto extends createZodDto(CreateExternalBlocklistSchema) {}
export class UpdateExternalBlocklistZodDto extends createZodDto(UpdateExternalBlocklistSchema) {}
export class BlocklistBatchToggleZodDto extends createZodDto(BlocklistBatchToggleSchema) {}
