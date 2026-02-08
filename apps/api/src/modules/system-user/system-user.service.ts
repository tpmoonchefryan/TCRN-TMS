// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, forwardRef,Inject, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@tcrn/database';
import { ErrorCodes } from '@tcrn/shared';
import * as crypto from 'crypto';

import { PasswordService } from '../auth/password.service';
import { PermissionSnapshotService } from '../permission/permission-snapshot.service';

export interface SystemUserData {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  preferredLanguage: string;
  isActive: boolean;
  isTotpEnabled: boolean;
  forceReset: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * System User Service
 * Manages system users within a tenant
 */
@Injectable()
export class SystemUserService {
  constructor(
    @Inject(forwardRef(() => PasswordService))
    private readonly passwordService: PasswordService,
    private readonly snapshotService: PermissionSnapshotService,
  ) {}

  /**
   * List system users
   */
  async list(
    tenantSchema: string,
    options: {
      search?: string;
      roleId?: string;
      isActive?: boolean;
      isTotpEnabled?: boolean;
      page?: number;
      pageSize?: number;
      sort?: string;
    } = {}
  ): Promise<{ data: SystemUserData[]; total: number }> {
    const { page = 1, pageSize = 20, search, roleId, isActive, isTotpEnabled, sort } = options;
    const offset = (page - 1) * pageSize;

    let whereClause = '1=1';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (username ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR display_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (isActive !== undefined) {
      whereClause += ` AND is_active = $${paramIndex++}`;
      params.push(isActive);
    }
    if (isTotpEnabled !== undefined) {
      whereClause += ` AND is_totp_enabled = $${paramIndex++}`;
      params.push(isTotpEnabled);
    }
    if (roleId) {
      whereClause += ` AND id IN (SELECT user_id FROM "${tenantSchema}".user_role WHERE role_id = $${paramIndex++})`;
      params.push(roleId);
    }

    let orderBy = 'created_at DESC';
    if (sort) {
      const isDesc = sort.startsWith('-');
      const field = isDesc ? sort.substring(1) : sort;
      const fieldMap: Record<string, string> = {
        username: 'username',
        email: 'email',
        displayName: 'display_name',
        createdAt: 'created_at',
        lastLoginAt: 'last_login_at',
      };
      const dbField = fieldMap[field] || 'created_at';
      orderBy = `${dbField} ${isDesc ? 'DESC' : 'ASC'}`;
    }

    // Get total count
    const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
      SELECT COUNT(*) as count FROM "${tenantSchema}".system_user WHERE ${whereClause}
    `, ...params);
    const total = Number(countResult[0]?.count || 0);

    // Get data
    const data = await prisma.$queryRawUnsafe<SystemUserData[]>(`
      SELECT 
        id, username, email, display_name as "displayName",
        phone, avatar_url as "avatarUrl", preferred_language as "preferredLanguage",
        is_active as "isActive", is_totp_enabled as "isTotpEnabled",
        force_reset as "forceReset", last_login_at as "lastLoginAt",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM "${tenantSchema}".system_user
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ${pageSize} OFFSET ${offset}
    `, ...params);

    return { data, total };
  }

  /**
   * Find user by ID
   */
  async findById(id: string, tenantSchema: string): Promise<SystemUserData | null> {
    const results = await prisma.$queryRawUnsafe<SystemUserData[]>(`
      SELECT 
        id, username, email, display_name as "displayName",
        phone, avatar_url as "avatarUrl", preferred_language as "preferredLanguage",
        is_active as "isActive", is_totp_enabled as "isTotpEnabled",
        force_reset as "forceReset", last_login_at as "lastLoginAt",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM "${tenantSchema}".system_user
      WHERE id = $1::uuid
    `, id);
    return results[0] || null;
  }

  /**
   * Create user
   */
  async create(
    tenantSchema: string,
    data: {
      username: string;
      email: string;
      password: string;
      displayName?: string;
      phone?: string;
      preferredLanguage?: string;
      forceReset?: boolean;
    }
  ): Promise<SystemUserData> {
    // Check username uniqueness
    const existingUsername = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT id FROM "${tenantSchema}".system_user WHERE username = $1
    `, data.username);
    if (existingUsername.length > 0) {
      throw new BadRequestException({
        code: ErrorCodes.USER_USERNAME_TAKEN,
        message: 'Username already taken',
      });
    }

    // Check email uniqueness
    const existingEmail = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT id FROM "${tenantSchema}".system_user WHERE email = $1
    `, data.email);
    if (existingEmail.length > 0) {
      throw new BadRequestException({
        code: ErrorCodes.USER_EMAIL_TAKEN,
        message: 'Email already taken',
      });
    }

    // Validate password
    const validation = this.passwordService.validate(data.password);
    if (!validation.isValid) {
      throw new BadRequestException({
        code: ErrorCodes.AUTH_PASSWORD_WEAK,
        message: validation.errors.join(', '),
      });
    }

    // Hash password
    const passwordHash = await this.passwordService.hash(data.password);

    // Create user
    const results = await prisma.$queryRawUnsafe<SystemUserData[]>(`
      INSERT INTO "${tenantSchema}".system_user 
        (id, username, email, password_hash, display_name, phone,
         preferred_language, is_active, force_reset, created_at, updated_at)
      VALUES 
        (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, $7, now(), now())
      RETURNING 
        id, username, email, display_name as "displayName",
        phone, avatar_url as "avatarUrl", preferred_language as "preferredLanguage",
        is_active as "isActive", is_totp_enabled as "isTotpEnabled",
        force_reset as "forceReset", last_login_at as "lastLoginAt",
        created_at as "createdAt", updated_at as "updatedAt"
    `, 
      data.username, data.email, passwordHash, 
      data.displayName || null, data.phone || null,
      data.preferredLanguage || 'en', data.forceReset ?? true
    );

    return results[0];
  }

  /**
   * Update user
   */
  async update(
    id: string,
    tenantSchema: string,
    data: {
      displayName?: string;
      phone?: string;
      preferredLanguage?: string;
      avatarUrl?: string;
    }
  ): Promise<SystemUserData> {
    const current = await this.findById(id, tenantSchema);
    if (!current) {
      throw new NotFoundException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    const updates: string[] = [];
    const params: unknown[] = [id];
    let paramIndex = 2;

    if (data.displayName !== undefined) {
      updates.push(`display_name = $${paramIndex++}`);
      params.push(data.displayName);
    }
    if (data.phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      params.push(data.phone);
    }
    if (data.preferredLanguage !== undefined) {
      updates.push(`preferred_language = $${paramIndex++}`);
      params.push(data.preferredLanguage);
    }
    if (data.avatarUrl !== undefined) {
      updates.push(`avatar_url = $${paramIndex++}`);
      params.push(data.avatarUrl);
    }

    if (updates.length === 0) {
      return current;
    }

    updates.push('updated_at = now()');

    const results = await prisma.$queryRawUnsafe<SystemUserData[]>(`
      UPDATE "${tenantSchema}".system_user
      SET ${updates.join(', ')}
      WHERE id = $1::uuid
      RETURNING 
        id, username, email, display_name as "displayName",
        phone, avatar_url as "avatarUrl", preferred_language as "preferredLanguage",
        is_active as "isActive", is_totp_enabled as "isTotpEnabled",
        force_reset as "forceReset", last_login_at as "lastLoginAt",
        created_at as "createdAt", updated_at as "updatedAt"
    `, ...params);

    return results[0];
  }

  /**
   * Reset password (admin operation)
   */
  async resetPassword(
    id: string,
    tenantSchema: string,
    options: {
      newPassword?: string;
      forceReset?: boolean;
    } = {}
  ): Promise<{ tempPassword?: string }> {
    const current = await this.findById(id, tenantSchema);
    if (!current) {
      throw new NotFoundException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    // Generate temp password if not provided
    const password = options.newPassword || this.generateTempPassword();
    const passwordHash = await this.passwordService.hash(password);

    await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".system_user
      SET password_hash = $2, force_reset = $3, password_changed_at = now(), updated_at = now()
      WHERE id = $1::uuid
    `, id, passwordHash, options.forceReset ?? true);

    return options.newPassword ? {} : { tempPassword: password };
  }

  /**
   * Deactivate user
   */
  async deactivate(id: string, tenantSchema: string): Promise<SystemUserData> {
    const current = await this.findById(id, tenantSchema);
    if (!current) {
      throw new NotFoundException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".system_user
      SET is_active = false, updated_at = now()
      WHERE id = $1::uuid
    `, id);

    // Delete permission snapshots
    await this.snapshotService.deleteUserSnapshots(tenantSchema, id);

    const deactivated = await this.findById(id, tenantSchema);
    if (!deactivated) {
      throw new NotFoundException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'User not found after deactivation',
      });
    }
    return deactivated;
  }

  /**
   * Reactivate user
   */
  async reactivate(id: string, tenantSchema: string): Promise<SystemUserData> {
    const current = await this.findById(id, tenantSchema);
    if (!current) {
      throw new NotFoundException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".system_user
      SET is_active = true, updated_at = now()
      WHERE id = $1::uuid
    `, id);

    // Refresh permission snapshots
    await this.snapshotService.refreshUserSnapshots(tenantSchema, id);

    const reactivated = await this.findById(id, tenantSchema);
    if (!reactivated) {
      throw new NotFoundException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'User not found after reactivation',
      });
    }
    return reactivated;
  }

  /**
   * Force enable TOTP for user
   */
  async forceTotp(id: string, tenantSchema: string): Promise<SystemUserData> {
    const current = await this.findById(id, tenantSchema);
    if (!current) {
      throw new NotFoundException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    // Set force_totp flag (user will be required to enable TOTP on next login)
    await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".system_user
      SET force_totp = true, updated_at = now()
      WHERE id = $1::uuid
    `, id);

    const updated = await this.findById(id, tenantSchema);
    if (!updated) {
      throw new NotFoundException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'User not found after force TOTP',
      });
    }
    return updated;
  }

  /**
   * Generate temporary password
   */
  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(crypto.randomInt(chars.length));
    }
    return password;
  }

  /**
   * Get user's scope access settings
   */
  async getScopeAccess(
    userId: string,
    tenantSchema: string
  ): Promise<Array<{
    id: string;
    scopeType: string;
    scopeId: string | null;
    includeSubunits: boolean;
  }>> {
    const accesses = await prisma.$queryRawUnsafe<Array<{
      id: string;
      scope_type: string;
      scope_id: string | null;
      include_subunits: boolean;
    }>>(`
      SELECT id, scope_type, scope_id, include_subunits
      FROM "${tenantSchema}".user_scope_access
      WHERE user_id = $1::uuid
    `, userId);

    return accesses.map(a => ({
      id: a.id,
      scopeType: a.scope_type,
      scopeId: a.scope_id,
      includeSubunits: a.include_subunits,
    }));
  }

  /**
   * Set user's scope access settings (replaces all existing)
   * Uses UPSERT to handle concurrent requests safely
   */
  async setScopeAccess(
    userId: string,
    tenantSchema: string,
    accesses: Array<{ scopeType: string; scopeId?: string; includeSubunits?: boolean }>,
    grantedBy: string
  ): Promise<void> {
    // Use a transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Delete existing accesses
      await tx.$executeRawUnsafe(`
        DELETE FROM "${tenantSchema}".user_scope_access
        WHERE user_id = $1::uuid
      `, userId);

      // Insert new accesses with ON CONFLICT to handle race conditions
      for (const access of accesses) {
        await tx.$executeRawUnsafe(`
          INSERT INTO "${tenantSchema}".user_scope_access 
          (id, user_id, scope_type, scope_id, include_subunits, granted_at, granted_by)
          VALUES (gen_random_uuid(), $1::uuid, $2, $3::uuid, $4, now(), $5::uuid)
          ON CONFLICT (user_id, scope_type, scope_id) 
          DO UPDATE SET include_subunits = EXCLUDED.include_subunits, granted_at = now(), granted_by = EXCLUDED.granted_by
        `, userId, access.scopeType, access.scopeId || null, access.includeSubunits ?? false, grantedBy);
      }
    });
  }
}
