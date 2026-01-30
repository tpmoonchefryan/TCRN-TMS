// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { createHash, randomUUID } from 'crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { prisma } from '@tcrn/database';
import { ErrorCodes } from '@tcrn/shared';

/**
 * JWT Access Token Payload
 */
export interface AccessTokenPayload {
  sub: string;       // User ID
  tid: string;       // Tenant ID
  tsc: string;       // Tenant Schema
  email: string;
  username: string;
  type: 'access';
  jti: string;       // Token ID
}

/**
 * TOTP Session Token Payload
 */
export interface TotpSessionPayload {
  sub: string;
  tid: string;
  tsc: string;
  type: 'totp_session';
}

/**
 * Password Reset Session Payload
 */
export interface PasswordResetSessionPayload {
  sub: string;
  tid: string;
  tsc: string;
  type: 'password_reset';
  reason: string;
}

/**
 * Marshmallow SSO Token Payload
 * Used for authenticated access to public marshmallow pages
 */
export interface MarshmallowSsoPayload {
  sub: string;            // User ID
  tid: string;            // Tenant ID
  tsc: string;            // Tenant Schema
  talentId: string;       // Talent ID for this marshmallow page
  displayName: string;    // User's display name
  email: string;          // User's email (for Gravatar)
  type: 'marshmallow_sso';
}

/**
 * Token Service
 * PRD §19 P-10: Token lifecycle management
 */
@Injectable()
export class TokenService {
  private readonly accessTokenTtl: number;
  private readonly refreshTokenTtl: number;
  private readonly totpSessionTtl: number;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    // Parse TTL values (default: 15m access, 12h refresh, 5m totp)
    this.accessTokenTtl = this.parseTtl(this.configService.get('JWT_ACCESS_TTL', '15m'));
    this.refreshTokenTtl = this.parseTtl(this.configService.get('JWT_REFRESH_TTL', '12h'));
    this.totpSessionTtl = 300; // 5 minutes
  }

  /**
   * Parse TTL string to seconds
   */
  private parseTtl(ttl: string | number): number {
    // If already a number (seconds), return it
    if (typeof ttl === 'number') {
      return ttl;
    }

    // If string is just digits, treat as seconds
    if (/^\d+$/.test(ttl)) {
      return parseInt(ttl, 10);
    }

    const match = ttl.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default 15 minutes

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 900;
    }
  }

  /**
   * Generate Access Token (JWT)
   */
  generateAccessToken(payload: Omit<AccessTokenPayload, 'type' | 'jti'>): {
    token: string;
    expiresIn: number;
  } {
    const jti = randomUUID();
    const token = this.jwtService.sign(
      { ...payload, type: 'access', jti },
      { expiresIn: this.accessTokenTtl },
    );

    return {
      token,
      expiresIn: this.accessTokenTtl,
    };
  }

  /**
   * Verify Access Token
   */
  verifyAccessToken(token: string): AccessTokenPayload {
    const payload = this.jwtService.verify<AccessTokenPayload>(token);
    if (payload.type !== 'access') {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_TOKEN_INVALID,
        message: 'Invalid token type',
      });
    }
    return payload;
  }

  /**
   * Generate Refresh Token (opaque, stored in DB)
   */
  /**
   * Generate Refresh Token (opaque, stored in DB)
   * Format: rt_<base64(schema)>.<random>
   */
  async generateRefreshToken(
    userId: string,
    tenantSchema: string,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<{
    token: string;
    expiresAt: Date;
  }> {
    // Generate random token part
    const randomPart = `${randomUUID().replace(/-/g, '')}${randomUUID().replace(/-/g, '')}`;
    
    // Encode schema in token
    const schemaPart = Buffer.from(tenantSchema).toString('base64').replace(/=/g, ''); // Simple base64, usually safe for token chars if handled
    // Actually base64url is better but base64 with stripped = is fine for our usage
    
    const token = `rt_${schemaPart}.${randomPart}`;
    const tokenHash = createHash('sha256').update(token).digest('hex');
    
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + this.refreshTokenTtl);

    // Store in database
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${tenantSchema}".refresh_token 
        (id, user_id, token_hash, device_info, ip_address, expires_at, created_at)
      VALUES 
        (gen_random_uuid(), $1::uuid, $2, $3, $4::inet, $5, now())
    `, userId, tokenHash, deviceInfo || null, ipAddress || null, expiresAt);

    return { token, expiresAt };
  }

  /**
   * Verify Refresh Token
   */
  async verifyRefreshToken(
    token: string,
    tenantSchema: string, // Fallback or override
  ): Promise<{
    userId: string;
    tokenId: string;
    schema: string;
  } | null> {
    // Try to extract schema from token
    let targetSchema = tenantSchema;
    
    if (token.startsWith('rt_') && token.includes('.')) {
      try {
        const parts = token.split('.');
        if (parts.length === 2) {
           const schemaPart = parts[0].substring(3); // remove rt_
           const decoded = Buffer.from(schemaPart, 'base64').toString('utf-8');
           if (decoded) {
             targetSchema = decoded;
           }
        }
      } catch (e) {
        // Ignore parsing errors, fall back to provided schema
      }
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');

    const result = await prisma.$queryRawUnsafe<Array<{
      id: string;
      user_id: string;
      expires_at: Date;
      revoked_at: Date | null;
    }>>(`
      SELECT id, user_id, expires_at, revoked_at
      FROM "${targetSchema}".refresh_token
      WHERE token_hash = $1
    `, tokenHash);

    if (result.length === 0) {
      return null;
    }

    const refreshToken = result[0];

    // Check if revoked
    if (refreshToken.revoked_at) {
      return null;
    }

    // Check if expired
    if (new Date() > new Date(refreshToken.expires_at)) {
      return null;
    }

    return {
      userId: refreshToken.user_id,
      tokenId: refreshToken.id,
      schema: targetSchema,
    };
  }

  /**
   * Revoke Refresh Token
   */
  async revokeRefreshToken(tokenId: string, tenantSchema: string): Promise<void> {
    await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".refresh_token
      SET revoked_at = now()
      WHERE id = $1::uuid
    `, tokenId);
  }

  /**
   * Revoke All Refresh Tokens for User
   */
  async revokeAllUserTokens(userId: string, tenantSchema: string): Promise<number> {
    const result = await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".refresh_token
      SET revoked_at = now()
      WHERE user_id = $1::uuid AND revoked_at IS NULL
    `, userId) as number;
    
    return result;
  }

  /**
   * Generate TOTP Session Token
   */
  generateTotpSessionToken(payload: Omit<TotpSessionPayload, 'type'>): {
    token: string;
    expiresIn: number;
  } {
    const token = this.jwtService.sign(
      { ...payload, type: 'totp_session' },
      { expiresIn: this.totpSessionTtl },
    );

    return {
      token,
      expiresIn: this.totpSessionTtl,
    };
  }

  /**
   * Verify TOTP Session Token
   */
  verifyTotpSessionToken(token: string): TotpSessionPayload {
    const payload = this.jwtService.verify<TotpSessionPayload>(token);
    if (payload.type !== 'totp_session') {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_TOKEN_INVALID,
        message: 'Invalid token type',
      });
    }
    return payload;
  }

  /**
   * Generate Password Reset Session Token
   */
  generatePasswordResetSessionToken(
    payload: Omit<PasswordResetSessionPayload, 'type'>,
  ): {
    token: string;
    expiresIn: number;
  } {
    const token = this.jwtService.sign(
      { ...payload, type: 'password_reset' },
      { expiresIn: this.totpSessionTtl },
    );

    return {
      token,
      expiresIn: this.totpSessionTtl,
    };
  }

  /**
   * Verify Password Reset Session Token
   */
  verifyPasswordResetSessionToken(token: string): PasswordResetSessionPayload {
    const payload = this.jwtService.verify<PasswordResetSessionPayload>(token);
    if (payload.type !== 'password_reset') {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_TOKEN_INVALID,
        message: 'Invalid token type',
      });
    }
    return payload;
  }

  /**
   * Get Access Token TTL in seconds
   */
  getAccessTokenTtl(): number {
    return this.accessTokenTtl;
  }

  /**
   * Get Refresh Token TTL in seconds
   */
  getRefreshTokenTtl(): number {
    return this.refreshTokenTtl;
  }

  /**
   * Generate Marshmallow SSO Token
   * Short-lived token (15 minutes) for authenticated access to public marshmallow pages
   */
  generateMarshmallowSsoToken(payload: Omit<MarshmallowSsoPayload, 'type'>): {
    token: string;
    expiresIn: number;
  } {
    const expiresIn = 900; // 15 minutes
    const token = this.jwtService.sign(
      { ...payload, type: 'marshmallow_sso' },
      { expiresIn },
    );

    return {
      token,
      expiresIn,
    };
  }

  /**
   * Verify Marshmallow SSO Token
   */
  verifyMarshmallowSsoToken(token: string): MarshmallowSsoPayload | null {
    try {
      const payload = this.jwtService.verify<MarshmallowSsoPayload>(token);
      if (payload.type !== 'marshmallow_sso') {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  }
}
