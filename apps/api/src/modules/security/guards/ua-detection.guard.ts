// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { UaDetectionService } from '../services/ua-detection.service';

export const UA_CHECK_MODE = 'ua_check_mode';
export const UaCheckMode = (mode: 'normal' | 'strict' | 'skip') =>
  SetMetadata(UA_CHECK_MODE, mode);

@Injectable()
export class UaDetectionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly uaDetectionService: UaDetectionService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const mode =
      this.reflector.get<string>(UA_CHECK_MODE, context.getHandler()) ||
      this.reflector.get<string>(UA_CHECK_MODE, context.getClass()) ||
      'normal';

    if (mode === 'skip') {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const userAgent = request.headers['user-agent'];

    const result =
      mode === 'strict'
        ? this.uaDetectionService.checkStrict(userAgent)
        : this.uaDetectionService.check(userAgent);

    if (!result.allowed) {
      throw new ForbiddenException({
        code: 'UA_BLOCKED',
        message: 'Request blocked due to suspicious User-Agent',
      });
    }

    // Mark suspicious requests for logging
    if (result.isSuspicious) {
      (request as any).isSuspiciousUa = true;
      (request as any).uaCheckReason = result.reason;
    }

    return true;
  }
}
