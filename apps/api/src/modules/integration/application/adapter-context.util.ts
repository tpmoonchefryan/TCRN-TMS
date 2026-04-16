// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException } from '@nestjs/common';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

export function getAdapterTenantSchema(context: RequestContext): string {
  const tenantSchema = context.tenantSchema;

  if (!tenantSchema) {
    throw new BadRequestException({
      code: ErrorCodes.VALIDATION_FAILED,
      message: 'Tenant schema context is required',
    });
  }

  if (!/^[a-zA-Z0-9_]+$/.test(tenantSchema)) {
    throw new BadRequestException({
      code: ErrorCodes.VALIDATION_FAILED,
      message: 'Invalid tenant schema context',
    });
  }

  return tenantSchema;
}
