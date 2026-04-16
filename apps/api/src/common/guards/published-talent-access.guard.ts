// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErrorCodes } from '@tcrn/shared';
import { Request } from 'express';

import { DatabaseService } from '../../modules/database';
import {
  REQUIRE_PUBLISHED_TALENT_ACCESS_KEY,
  type RequirePublishedTalentAccessOptions,
} from '../decorators/require-published-talent-access.decorator';

type TalentLifecycleStatus = 'draft' | 'published' | 'disabled';

type PublishedTalentRequest = Request & {
  user?: {
    tenantSchema?: string;
  };
};

type TalentCarrierSource =
  | 'params.talentId'
  | 'headers.x-talent-id'
  | 'body.talentId'
  | 'query.talentId'
  | 'query.talent_id'
  | 'jobOwner';

interface ResolvedTalentCarrier {
  source: TalentCarrierSource;
  talentId: string;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const JOB_OWNER_TABLES = {
  export: 'export_job',
  import: 'import_job',
  report: 'report_job',
} as const;

@Injectable()
export class PublishedTalentAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly databaseService: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RequirePublishedTalentAccessOptions | undefined>(
      REQUIRE_PUBLISHED_TALENT_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<PublishedTalentRequest>();
    const tenantSchema = request.user?.tenantSchema;

    // Authentication guards remain authoritative for auth failures.
    if (!tenantSchema) {
      return true;
    }

    const carriers = await this.resolveTalentCarriers(request, tenantSchema, options);
    const uniqueTalentIds = [...new Set(carriers.map((carrier) => carrier.talentId))];

    if (uniqueTalentIds.length === 0) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Unable to resolve talent scope for this request.',
      });
    }

    if (uniqueTalentIds.length > 1) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Talent scope carriers must resolve to the same talent.',
        details: {
          carriers: carriers.map((carrier) => ({
            source: carrier.source,
            talentId: carrier.talentId,
          })),
        },
      });
    }

    const lifecycleStatus = await this.getTalentLifecycleStatus(
      tenantSchema,
      uniqueTalentIds[0],
    );

    if (lifecycleStatus !== 'published') {
      throw new ForbiddenException({
        code: ErrorCodes.TALENT_NOT_PUBLISHED,
        message:
          'Talent business workspace is not available until this talent is published or re-enabled.',
      });
    }

    return true;
  }

  private async resolveTalentCarriers(
    request: PublishedTalentRequest,
    tenantSchema: string,
    options: RequirePublishedTalentAccessOptions,
  ): Promise<ResolvedTalentCarrier[]> {
    const carriers: ResolvedTalentCarrier[] = [];

    this.appendCarrier(carriers, 'params.talentId', request.params?.talentId);
    this.appendCarrier(carriers, 'headers.x-talent-id', request.headers['x-talent-id']);
    this.appendCarrier(carriers, 'body.talentId', this.getBodyValue(request.body, 'talentId'));
    this.appendCarrier(carriers, 'query.talentId', request.query?.talentId);
    this.appendCarrier(carriers, 'query.talent_id', request.query?.talent_id);

    if (options.jobOwnerSource) {
      const jobIdRaw = request.params?.jobId ?? request.query?.jobId;
      const jobId = this.normalizeUuid(jobIdRaw, 'jobId');

      if (!jobId) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'jobId is required to resolve talent scope for this request.',
        });
      }

      const talentId = await this.lookupJobOwnerTalentId(
        tenantSchema,
        options.jobOwnerSource,
        jobId,
      );

      if (!talentId) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'Unable to resolve talent scope from the requested job.',
        });
      }

      carriers.push({
        source: 'jobOwner',
        talentId,
      });
    }

    return carriers;
  }

  private appendCarrier(
    carriers: ResolvedTalentCarrier[],
    source: TalentCarrierSource,
    rawValue: unknown,
  ): void {
    const talentId = this.normalizeUuid(rawValue, source);

    if (!talentId) {
      return;
    }

    carriers.push({ source, talentId });
  }

  private getBodyValue(body: unknown, key: 'talentId'): unknown {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return undefined;
    }

    return (body as Record<string, unknown>)[key];
  }

  private normalizeUuid(rawValue: unknown, carrierName: string): string | undefined {
    const raw = this.readFirstString(rawValue);

    if (!raw) {
      return undefined;
    }

    const normalized = raw.trim().toLowerCase();

    if (!UUID_PATTERN.test(normalized)) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: `${carrierName} must be a valid UUID.`,
      });
    }

    return normalized;
  }

  private readFirstString(value: unknown): string | undefined {
    if (typeof value === 'string') {
      return value;
    }

    if (Array.isArray(value)) {
      const [first] = value;
      return typeof first === 'string' ? first : undefined;
    }

    return undefined;
  }

  private async lookupJobOwnerTalentId(
    tenantSchema: string,
    jobOwnerSource: NonNullable<RequirePublishedTalentAccessOptions['jobOwnerSource']>,
    jobId: string,
  ): Promise<string | null> {
    const prisma = this.databaseService.getPrisma();
    const tableName = JOB_OWNER_TABLES[jobOwnerSource];
    const results = await prisma.$queryRawUnsafe<Array<{ talentId: string }>>(`
      SELECT talent_id as "talentId"
      FROM "${tenantSchema}"."${tableName}"
      WHERE id = $1::uuid
      LIMIT 1
    `, jobId);

    return results[0]?.talentId?.toLowerCase() ?? null;
  }

  private async getTalentLifecycleStatus(
    tenantSchema: string,
    talentId: string,
  ): Promise<TalentLifecycleStatus | null> {
    const prisma = this.databaseService.getPrisma();
    const results = await prisma.$queryRawUnsafe<Array<{ lifecycleStatus: TalentLifecycleStatus }>>(`
      SELECT lifecycle_status as "lifecycleStatus"
      FROM "${tenantSchema}".talent
      WHERE id = $1::uuid
      LIMIT 1
    `, talentId);

    return results[0]?.lifecycleStatus ?? null;
  }
}
