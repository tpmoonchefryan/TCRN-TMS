// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

/**
 * PII Access JWT Payload
 */
export interface PiiAccessJwtPayload {
  sub: string;           // User ID
  tid: string;           // Tenant ID
  tsc: string;           // Tenant Schema
  pid: string;           // rm_profile_id
  psi: string;           // Profile Store ID
  type: 'pii_access';    // Token type
  act: string[];         // Allowed actions: ['read'] or ['read', 'write']
  iat: number;
  exp: number;
  jti: string;
}

/**
 * Service JWT Payload (for batch operations)
 */
export interface ServiceJwtPayload {
  sub: string;           // Service identifier
  tid: string;           // Tenant ID
  type: 'report_service';
  job_id: string;
  original_user_id: string;
  psi: string;           // Profile Store ID
  act: string[];
  iat: number;
  exp: number;
  jti: string;
}

export type JwtPayload = PiiAccessJwtPayload | ServiceJwtPayload;

/**
 * Validated JWT Context
 */
export interface JwtContext {
  type: 'user' | 'service';
  userId?: string;
  service?: string;
  tenantId: string;
  tenantSchema?: string;
  profileId?: string;
  profileStoreId: string;
  allowedActions: string[];
  jti: string;
  jobId?: string;
  originalUserId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('PII_JWT_SECRET'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtContext> {
    // Validate token type
    if (!['pii_access', 'report_service'].includes(payload.type)) {
      throw new UnauthorizedException('Invalid token type');
    }

    // Validate tenant context
    if (!payload.tid) {
      throw new UnauthorizedException('Missing tenant context');
    }

    // Validate profile store
    if (!payload.psi) {
      throw new UnauthorizedException('Missing profile store context');
    }

    // Return validated context based on token type
    if (payload.type === 'report_service') {
      const servicePayload = payload as ServiceJwtPayload;
      return {
        type: 'service',
        service: servicePayload.sub,
        tenantId: servicePayload.tid,
        profileStoreId: servicePayload.psi,
        jobId: servicePayload.job_id,
        originalUserId: servicePayload.original_user_id,
        allowedActions: servicePayload.act,
        jti: servicePayload.jti,
      };
    }

    // User access token
    const userPayload = payload as PiiAccessJwtPayload;
    return {
      type: 'user',
      userId: userPayload.sub,
      tenantId: userPayload.tid,
      tenantSchema: userPayload.tsc,
      profileId: userPayload.pid,
      profileStoreId: userPayload.psi,
      allowedActions: userPayload.act,
      jti: userPayload.jti,
    };
  }
}
