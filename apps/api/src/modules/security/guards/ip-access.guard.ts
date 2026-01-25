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

import { IpAccessService } from '../services/ip-access.service';

export const IP_ACCESS_SCOPE = 'ip_access_scope';
export const IpAccessScope = (scope: 'global' | 'admin' | 'public' | 'api') =>
  SetMetadata(IP_ACCESS_SCOPE, scope);

@Injectable()
export class IpAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly ipAccessService: IpAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const scope =
      this.reflector.get<string>(IP_ACCESS_SCOPE, context.getHandler()) ||
      this.reflector.get<string>(IP_ACCESS_SCOPE, context.getClass()) ||
      'global';

    const request = context.switchToHttp().getRequest<Request>();
    const ip = this.getClientIp(request);

    const result = await this.ipAccessService.checkAccess(ip, scope as any);

    if (!result.allowed) {
      throw new ForbiddenException({
        code: 'IP_ACCESS_DENIED',
        message: result.reason || 'IP address is blocked',
      });
    }

    return true;
  }

  private getClientIp(request: Request): string {
    return (
      (request.headers['cf-connecting-ip'] as string) ||
      (request.headers['x-real-ip'] as string) ||
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.ip ||
      'unknown'
    );
  }
}
