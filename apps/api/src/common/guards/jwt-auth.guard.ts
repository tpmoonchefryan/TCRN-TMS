// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErrorCodes } from '@tcrn/shared';
import { Request } from 'express';

import { AuthService } from '../../modules/auth/auth.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * JWT Authentication Guard
 * Validates Bearer tokens and extracts user info
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_TOKEN_INVALID,
        message: 'No authentication token provided',
      });
    }

    try {
      const payload = await this.authService.verifyAccessToken(token);
      
      // Attach user to request
      (request as unknown as { user: unknown }).user = {
        id: payload.sub,
        tenantId: payload.tid,
        tenantSchema: payload.tsc,
        email: payload.email,
        username: payload.username,
      };

      return true;
    } catch {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_TOKEN_EXPIRED,
        message: 'Authentication token is invalid or expired',
      });
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
