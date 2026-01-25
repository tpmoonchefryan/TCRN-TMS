// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LogSeverity } from '@tcrn/shared';
import { TechEventType } from '@tcrn/shared';
import { v4 as uuidv4 } from 'uuid';

import { TechEventLogService } from '../../log';

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
  act: string[];         // Allowed actions
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

@Injectable()
export class PiiJwtService {
  private readonly jwtSecret: string;
  private readonly accessTokenTtl: number; // seconds
  private readonly serviceTokenTtl: number; // seconds

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly techEventLogService: TechEventLogService,
  ) {
    this.jwtSecret = this.configService.get<string>('PII_JWT_SECRET') || 'dev-secret';
    this.accessTokenTtl = this.configService.get<number>('PII_ACCESS_TOKEN_TTL') || 300; // 5 minutes
    this.serviceTokenTtl = this.configService.get<number>('PII_SERVICE_TOKEN_TTL') || 1800; // 30 minutes
  }

  /**
   * Issue PII access token for a user
   */
  async issueAccessToken(params: {
    userId: string;
    tenantId: string;
    tenantSchema: string;
    rmProfileId: string;
    profileStoreId: string;
    actions: ('read' | 'write')[];
  }): Promise<{ token: string; expiresIn: number; jti: string }> {
    const { userId, tenantId, tenantSchema, rmProfileId, profileStoreId, actions } = params;

    const jti = uuidv4();
    const now = Math.floor(Date.now() / 1000);

    const payload: PiiAccessJwtPayload = {
      sub: userId,
      tid: tenantId,
      tsc: tenantSchema,
      pid: rmProfileId,
      psi: profileStoreId,
      type: 'pii_access',
      act: actions,
      iat: now,
      exp: now + this.accessTokenTtl,
      jti,
    };

    const token = this.jwtService.sign(payload, {
      secret: this.jwtSecret,
      algorithm: 'HS256',
    });

    // Log token issuance
    await this.techEventLogService.log({
      eventType: TechEventType.PII_ACCESS_REQUESTED,
      scope: 'pii',
      severity: LogSeverity.INFO,
      traceId: jti,
      payload: {
        user_id: userId,
        tenant_id: tenantId,
        rm_profile_id: rmProfileId,
        profile_store_id: profileStoreId,
        jti,
        actions,
        ttl_seconds: this.accessTokenTtl,
      },
    });

    return {
      token,
      expiresIn: this.accessTokenTtl,
      jti,
    };
  }

  /**
   * Issue service JWT for batch operations (e.g., report generation)
   */
  async issueServiceToken(params: {
    service: string;
    tenantId: string;
    profileStoreId: string;
    jobId: string;
    originalUserId: string;
    actions: string[];
  }): Promise<{ token: string; expiresIn: number; jti: string }> {
    const { service, tenantId, profileStoreId, jobId, originalUserId, actions } = params;

    const jti = uuidv4();
    const now = Math.floor(Date.now() / 1000);

    const payload: ServiceJwtPayload = {
      sub: service,
      tid: tenantId,
      type: 'report_service',
      job_id: jobId,
      original_user_id: originalUserId,
      psi: profileStoreId,
      act: actions,
      iat: now,
      exp: now + this.serviceTokenTtl,
      jti,
    };

    const token = this.jwtService.sign(payload, {
      secret: this.jwtSecret,
      algorithm: 'HS256',
    });

    // Log service token issuance
    await this.techEventLogService.log({
      eventType: TechEventType.IMPORT_JOB_STARTED, // Using similar event type
      scope: 'pii',
      severity: LogSeverity.INFO,
      traceId: jti,
      payload: {
        service,
        tenant_id: tenantId,
        profile_store_id: profileStoreId,
        job_id: jobId,
        original_user_id: originalUserId,
        jti,
        actions,
        ttl_seconds: this.serviceTokenTtl,
      },
    });

    return {
      token,
      expiresIn: this.serviceTokenTtl,
      jti,
    };
  }
}
