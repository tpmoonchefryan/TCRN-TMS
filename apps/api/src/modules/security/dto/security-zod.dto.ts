// SPDX-License-Identifier: Apache-2.0
// Security Module Zod DTOs - Using createZodDto for Swagger integration
import { createZodDto } from 'nestjs-zod';

import {
  BlocklistListQuerySchema,
  CheckIpSchema,
  CreateBlocklistSchema,
  CreateIpRuleSchema,
  DisableScopeSchema,
  IpRuleListQuerySchema,
  TestBlocklistSchema,
  UpdateBlocklistSchema,
} from '@tcrn/shared';

// Blocklist DTOs
export class BlocklistListQueryZodDto extends createZodDto(BlocklistListQuerySchema) {}
export class DisableScopeZodDto extends createZodDto(DisableScopeSchema) {}
export class CreateBlocklistZodDto extends createZodDto(CreateBlocklistSchema) {}
export class UpdateBlocklistZodDto extends createZodDto(UpdateBlocklistSchema) {}
export class TestBlocklistZodDto extends createZodDto(TestBlocklistSchema) {}

// IP Rule DTOs
export class IpRuleListQueryZodDto extends createZodDto(IpRuleListQuerySchema) {}
export class CreateIpRuleZodDto extends createZodDto(CreateIpRuleSchema) {}
export class CheckIpZodDto extends createZodDto(CheckIpSchema) {}
