// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { BadRequestException } from '@nestjs/common';

import { ErrorCodes, type RequestContext } from '@tcrn/shared';

export function getWebhookTenantSchema(context?: RequestContext): string | null {
  const tenantSchema = context?.tenantSchema;

  if (!tenantSchema) {
    return null;
  }

  if (!/^[a-zA-Z0-9_]+$/.test(tenantSchema)) {
    throw new BadRequestException({
      code: ErrorCodes.VALIDATION_FAILED,
      message: 'Invalid tenant schema context',
    });
  }

  return tenantSchema;
}

export function requireWebhookTenantSchema(context?: RequestContext): string {
  const tenantSchema = getWebhookTenantSchema(context);

  if (!tenantSchema) {
    throw new BadRequestException({
      code: ErrorCodes.VALIDATION_FAILED,
      message: 'Webhook tenant schema context is required',
    });
  }

  return tenantSchema;
}
