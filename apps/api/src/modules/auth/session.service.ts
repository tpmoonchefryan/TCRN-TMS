// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { prisma } from '@tcrn/database';

import { RedisService } from '../redis';

/**
 * Session Info
 */
export interface SessionInfo {
  id: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  createdAt: Date;
  lastActiveAt: Date;
  isCurrent: boolean;
}

/**
 * Session Service
 * Manages user sessions and refresh tokens
 */
@Injectable()
export class SessionService {
  constructor(private readonly redisService: RedisService) {}

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(
    userId: string,
    tenantSchema: string,
    currentTokenId?: string,
  ): Promise<SessionInfo[]> {
    const sessions = await prisma.$queryRawUnsafe<Array<{
      id: string;
      device_info: string | null;
      ip_address: string | null;
      created_at: Date;
    }>>(`
      SELECT id, device_info, ip_address, created_at
      FROM "${tenantSchema}".refresh_token
      WHERE user_id = $1::uuid AND revoked_at IS NULL AND expires_at > now()
      ORDER BY created_at DESC
    `, userId);

    return sessions.map((session) => ({
      id: session.id,
      deviceInfo: session.device_info,
      ipAddress: session.ip_address,
      createdAt: session.created_at,
      lastActiveAt: session.created_at, // Would need separate tracking
      isCurrent: session.id === currentTokenId,
    }));
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(
    sessionId: string,
    userId: string,
    tenantSchema: string,
  ): Promise<boolean> {
    const result = await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".refresh_token
      SET revoked_at = now()
      WHERE id = $1::uuid AND user_id = $2::uuid AND revoked_at IS NULL
    `, sessionId, userId) as number;

    return result > 0;
  }

  /**
   * Update login attempts tracking
   */
  async trackLoginAttempt(
    userId: string,
    tenantSchema: string,
    success: boolean,
    ipAddress: string,
  ): Promise<{
    failedCount: number;
    isLocked: boolean;
    lockedUntil: Date | null;
  }> {
    if (success) {
      // Reset failed count on successful login
      await prisma.$executeRawUnsafe(`
        UPDATE "${tenantSchema}".system_user
        SET 
          failed_login_count = 0,
          locked_until = NULL,
          last_login_at = now(),
          last_login_ip = $2::inet
        WHERE id = $1::uuid
      `, userId, ipAddress);

      return { failedCount: 0, isLocked: false, lockedUntil: null };
    }

    // Increment failed count
    const result = await prisma.$queryRawUnsafe<Array<{
      failed_login_count: number;
      locked_until: Date | null;
    }>>(`
      UPDATE "${tenantSchema}".system_user
      SET 
        failed_login_count = failed_login_count + 1,
        locked_until = CASE 
          WHEN failed_login_count >= 4 
          THEN now() + interval '30 minutes'
          ELSE locked_until
        END
      WHERE id = $1::uuid
      RETURNING failed_login_count, locked_until
    `, userId);

    if (result.length === 0) {
      return { failedCount: 0, isLocked: false, lockedUntil: null };
    }

    const { failed_login_count, locked_until } = result[0];
    const isLocked = locked_until !== null && new Date(locked_until) > new Date();

    return {
      failedCount: failed_login_count,
      isLocked,
      lockedUntil: locked_until,
    };
  }

  /**
   * Check if user is locked
   */
  async isUserLocked(
    userId: string,
    tenantSchema: string,
  ): Promise<{
    isLocked: boolean;
    lockedUntil: Date | null;
  }> {
    const result = await prisma.$queryRawUnsafe<Array<{
      locked_until: Date | null;
    }>>(`
      SELECT locked_until
      FROM "${tenantSchema}".system_user
      WHERE id = $1::uuid
    `, userId);

    if (result.length === 0) {
      return { isLocked: false, lockedUntil: null };
    }

    const { locked_until } = result[0];
    
    if (!locked_until) {
      return { isLocked: false, lockedUntil: null };
    }

    const isLocked = new Date(locked_until) > new Date();
    
    return {
      isLocked,
      lockedUntil: isLocked ? locked_until : null,
    };
  }

  /**
   * Log security event
   */
  async logSecurityEvent(
    tenantSchema: string,
    eventType: string,
    userId: string | null,
    details: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string,
    requestId?: string,
  ): Promise<void> {
    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "${tenantSchema}".technical_event_log 
          (id, event_type, severity, scope, message, payload_json, trace_id)
        VALUES 
          (gen_random_uuid(), $1, 'info', 'security', $2, $3::jsonb, $4)
      `, 
        eventType,
        `Security event: ${eventType}`,
        JSON.stringify({
          ...details,
          userId,
          ipAddress,
          userAgent: userAgent?.substring(0, 255),
        }),
        requestId || null,
      );
    } catch {
      // Silently fail - security logging should not block main operation
      // This can happen if tenant schema is missing columns (e.g., trace_id)
    }
  }
}
