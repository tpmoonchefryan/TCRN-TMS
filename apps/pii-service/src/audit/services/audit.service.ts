// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Inject,Injectable } from '@nestjs/common';

import { Prisma,PrismaClient } from '.prisma/pii-client';

export interface AuditLogData {
  profileId: string;
  tenantId: string;
  operatorId: string;
  action: string;
  fieldsAccessed: string[];
  ipAddress?: string;
  userAgent?: string;
  jwtJti?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(
    @Inject('PII_PRISMA') private readonly prisma: PrismaClient,
  ) {}

  /**
   * Log a PII access event
   */
  async log(data: AuditLogData): Promise<void> {
    await this.prisma.piiAccessAudit.create({
      data: {
        profileId: data.profileId,
        tenantId: data.tenantId,
        operatorId: data.operatorId,
        action: data.action,
        fieldsAccessed: data.fieldsAccessed,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        jwtJti: data.jwtJti,
        metadata: data.metadata as Prisma.InputJsonValue ?? undefined,
      },
    });
  }

  /**
   * Get audit logs for a profile
   */
  async getByProfile(
    profileId: string,
    tenantId: string,
    limit: number = 100,
  ) {
    return this.prisma.piiAccessAudit.findMany({
      where: {
        profileId,
        tenantId,
      },
      orderBy: { occurredAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get audit logs for a tenant
   */
  async getByTenant(
    tenantId: string,
    options: {
      action?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {},
  ) {
    const { action, startDate, endDate, limit = 100, offset = 0 } = options;

    const where: {
      tenantId: string;
      action?: string;
      occurredAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = { tenantId };

    if (action) {
      where.action = action;
    }

    if (startDate || endDate) {
      where.occurredAt = {};
      if (startDate) where.occurredAt.gte = startDate;
      if (endDate) where.occurredAt.lte = endDate;
    }

    const [items, total] = await Promise.all([
      this.prisma.piiAccessAudit.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.piiAccessAudit.count({ where }),
    ]);

    return { items, total };
  }
}
