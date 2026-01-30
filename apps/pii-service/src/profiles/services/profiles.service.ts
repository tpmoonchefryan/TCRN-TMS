// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { PrismaClient } from '.prisma/pii-client';
import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import { AuditService } from '../../audit/services/audit.service';
import { JwtContext } from '../../auth/strategies/jwt.strategy';
import { CryptoService } from '../../crypto/services/crypto.service';
import {
  CreatePiiProfileDto,
  UpdatePiiProfileDto,
  BatchGetProfilesDto,
  PiiProfileResponse,
} from '../dto/profile.dto';

@Injectable()
export class ProfilesService {
  constructor(
    @Inject('PII_PRISMA') private readonly prisma: PrismaClient,
    private readonly cryptoService: CryptoService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Create a new PII profile
   */
  async create(
    dto: CreatePiiProfileDto,
    context: JwtContext,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ id: string; createdAt: Date }> {
    // Verify write permission
    this.verifyWritePermission(context);

    // Encrypt PII fields
    const [
      givenName,
      familyName,
      birthDate,
      phoneNumbers,
      emails,
      addresses,
    ] = await Promise.all([
      this.cryptoService.encryptString(context.tenantId, dto.givenName ?? null),
      this.cryptoService.encryptString(context.tenantId, dto.familyName ?? null),
      this.cryptoService.encryptString(context.tenantId, dto.birthDate ?? null),
      this.cryptoService.encryptJson(context.tenantId, dto.phoneNumbers),
      this.cryptoService.encryptJson(context.tenantId, dto.emails),
      this.cryptoService.encryptJson(context.tenantId, dto.addresses),
    ]);

    // Compute data hash for integrity
    const dataHash = this.cryptoService.computeHash({
      givenName: dto.givenName,
      familyName: dto.familyName,
      gender: dto.gender,
      birthDate: dto.birthDate,
      phoneNumbers: dto.phoneNumbers,
      emails: dto.emails,
      addresses: dto.addresses,
    });

    // Create profile
    const profile = await this.prisma.piiProfile.create({
      data: {
        id: dto.id,
        tenantId: context.tenantId,
        profileStoreId: dto.profileStoreId,
        givenName,
        familyName,
        gender: dto.gender,
        birthDate,
        phoneNumbers,
        emails,
        addresses,
        dataHash,
      },
    });

    // Audit log
    await this.auditService.log({
      profileId: profile.id,
      tenantId: context.tenantId,
      operatorId: this.getOperatorId(context),
      action: 'create',
      fieldsAccessed: this.getFieldsFromDto(dto),
      ipAddress,
      userAgent,
      jwtJti: context.jti,
    });

    return {
      id: profile.id,
      createdAt: profile.createdAt,
    };
  }

  /**
   * Get a PII profile by ID
   */
  async findById(
    id: string,
    context: JwtContext,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<PiiProfileResponse> {
    // For user tokens, verify they're accessing the correct profile
    if (context.type === 'user' && context.profileId !== id) {
      throw new ForbiddenException('Access to this profile is not allowed');
    }

    const profile = await this.prisma.piiProfile.findFirst({
      where: {
        id,
        tenantId: context.tenantId,
        profileStoreId: context.profileStoreId,
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    // Decrypt PII fields
    const [
      givenName,
      familyName,
      birthDate,
      phoneNumbers,
      emails,
      addresses,
    ] = await Promise.all([
      this.cryptoService.decryptString(context.tenantId, profile.givenName),
      this.cryptoService.decryptString(context.tenantId, profile.familyName),
      this.cryptoService.decryptString(context.tenantId, profile.birthDate),
      this.cryptoService.decryptJson(context.tenantId, profile.phoneNumbers),
      this.cryptoService.decryptJson(context.tenantId, profile.emails),
      this.cryptoService.decryptJson(context.tenantId, profile.addresses),
    ]);

    // Audit log
    await this.auditService.log({
      profileId: id,
      tenantId: context.tenantId,
      operatorId: this.getOperatorId(context),
      action: 'read',
      fieldsAccessed: ['givenName', 'familyName', 'gender', 'birthDate', 'phoneNumbers', 'emails', 'addresses'],
      ipAddress,
      userAgent,
      jwtJti: context.jti,
    });

    return {
      id: profile.id,
      givenName,
      familyName,
      gender: profile.gender,
      birthDate,
      phoneNumbers: phoneNumbers as PiiProfileResponse['phoneNumbers'],
      emails: emails as PiiProfileResponse['emails'],
      addresses: addresses as PiiProfileResponse['addresses'],
      updatedAt: profile.updatedAt,
    };
  }

  /**
   * Update a PII profile
   */
  async update(
    id: string,
    dto: UpdatePiiProfileDto,
    context: JwtContext,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ id: string; updatedAt: Date }> {
    // Verify write permission
    this.verifyWritePermission(context);

    // For user tokens, verify they're accessing the correct profile
    if (context.type === 'user' && context.profileId !== id) {
      throw new ForbiddenException('Access to this profile is not allowed');
    }

    // Verify profile exists
    const existing = await this.prisma.piiProfile.findFirst({
      where: {
        id,
        tenantId: context.tenantId,
        profileStoreId: context.profileStoreId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Profile not found');
    }

    // Encrypt updated fields
    const updateData: Record<string, Buffer | string | null> = {};

    if (dto.givenName !== undefined) {
      updateData.givenName = await this.cryptoService.encryptString(context.tenantId, dto.givenName);
    }
    if (dto.familyName !== undefined) {
      updateData.familyName = await this.cryptoService.encryptString(context.tenantId, dto.familyName);
    }
    if (dto.gender !== undefined) {
      updateData.gender = dto.gender;
    }
    if (dto.birthDate !== undefined) {
      updateData.birthDate = await this.cryptoService.encryptString(context.tenantId, dto.birthDate);
    }
    if (dto.phoneNumbers !== undefined) {
      updateData.phoneNumbers = await this.cryptoService.encryptJson(context.tenantId, dto.phoneNumbers);
    }
    if (dto.emails !== undefined) {
      updateData.emails = await this.cryptoService.encryptJson(context.tenantId, dto.emails);
    }
    if (dto.addresses !== undefined) {
      updateData.addresses = await this.cryptoService.encryptJson(context.tenantId, dto.addresses);
    }

    // Update profile
    const updated = await this.prisma.piiProfile.update({
      where: { id },
      data: updateData,
    });

    // Audit log
    await this.auditService.log({
      profileId: id,
      tenantId: context.tenantId,
      operatorId: this.getOperatorId(context),
      action: 'update',
      fieldsAccessed: Object.keys(dto).filter((k) => dto[k as keyof UpdatePiiProfileDto] !== undefined),
      ipAddress,
      userAgent,
      jwtJti: context.jti,
    });

    return {
      id: updated.id,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Batch get profiles (for service JWT only)
   */
  async batchGet(
    dto: BatchGetProfilesDto,
    context: JwtContext,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    data: Record<string, PiiProfileResponse>;
    errors: Record<string, { code: string; message: string }>;
  }> {
    // Only service tokens can batch read
    if (context.type !== 'service' || !context.allowedActions.includes('batch_read')) {
      throw new ForbiddenException('Batch read not allowed');
    }

    const profiles = await this.prisma.piiProfile.findMany({
      where: {
        id: { in: dto.ids },
        tenantId: context.tenantId,
        profileStoreId: context.profileStoreId,
      },
    });

    const profileMap = new Map(profiles.map((p) => [p.id, p]));
    const data: Record<string, PiiProfileResponse> = {};
    const errors: Record<string, { code: string; message: string }> = {};

    // Determine which fields to return
    const requestedFields = dto.fields || [
      'givenName',
      'familyName',
      'gender',
      'birthDate',
      'phoneNumbers',
      'emails',
      'addresses',
    ];

    // Process each requested ID
    for (const id of dto.ids) {
      const profile = profileMap.get(id);

      if (!profile) {
        errors[id] = { code: 'NOT_FOUND', message: 'Profile not found' };
        continue;
      }

      // Decrypt only requested fields
      const result: Partial<PiiProfileResponse> = { id: profile.id, updatedAt: profile.updatedAt };

      if (requestedFields.includes('givenName') && profile.givenName) {
        result.givenName = await this.cryptoService.decryptString(context.tenantId, profile.givenName);
      }
      if (requestedFields.includes('familyName') && profile.familyName) {
        result.familyName = await this.cryptoService.decryptString(context.tenantId, profile.familyName);
      }
      if (requestedFields.includes('gender')) {
        result.gender = profile.gender;
      }
      if (requestedFields.includes('birthDate') && profile.birthDate) {
        result.birthDate = await this.cryptoService.decryptString(context.tenantId, profile.birthDate);
      }
      if (requestedFields.includes('phoneNumbers') && profile.phoneNumbers) {
        result.phoneNumbers = await this.cryptoService.decryptJson(context.tenantId, profile.phoneNumbers);
      }
      if (requestedFields.includes('emails') && profile.emails) {
        result.emails = await this.cryptoService.decryptJson(context.tenantId, profile.emails);
      }
      if (requestedFields.includes('addresses') && profile.addresses) {
        result.addresses = await this.cryptoService.decryptJson(context.tenantId, profile.addresses);
      }

      data[id] = result as PiiProfileResponse;
    }

    // Audit log for batch access
    await this.auditService.log({
      profileId: 'batch',
      tenantId: context.tenantId,
      operatorId: context.originalUserId || context.service || 'service',
      action: 'batch_read',
      fieldsAccessed: requestedFields,
      ipAddress,
      userAgent,
      jwtJti: context.jti,
      metadata: {
        service: context.service,
        jobId: context.jobId,
        batchSize: dto.ids.length,
        foundCount: Object.keys(data).length,
      },
    });

    return { data, errors };
  }

  /**
   * Delete a PII profile
   */
  async delete(
    id: string,
    context: JwtContext,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    // Verify write permission
    this.verifyWritePermission(context);

    const profile = await this.prisma.piiProfile.findFirst({
      where: {
        id,
        tenantId: context.tenantId,
        profileStoreId: context.profileStoreId,
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    // Delete profile
    await this.prisma.piiProfile.delete({ where: { id } });

    // Audit log
    await this.auditService.log({
      profileId: id,
      tenantId: context.tenantId,
      operatorId: this.getOperatorId(context),
      action: 'delete',
      fieldsAccessed: [],
      ipAddress,
      userAgent,
      jwtJti: context.jti,
    });
  }

  /**
   * Verify write permission
   */
  private verifyWritePermission(context: JwtContext): void {
    if (!context.allowedActions.includes('write') && context.type === 'user') {
      throw new ForbiddenException('Write permission required');
    }
  }

  /**
   * Get operator ID from context
   */
  private getOperatorId(context: JwtContext): string {
    if (context.type === 'service') {
      return context.originalUserId || context.service || 'service';
    }
    return context.userId || 'unknown';
  }

  /**
   * Get fields from DTO
   */
  private getFieldsFromDto(dto: CreatePiiProfileDto | UpdatePiiProfileDto): string[] {
    const fields: string[] = [];
    if ('givenName' in dto && dto.givenName) fields.push('givenName');
    if ('familyName' in dto && dto.familyName) fields.push('familyName');
    if ('gender' in dto && dto.gender) fields.push('gender');
    if ('birthDate' in dto && dto.birthDate) fields.push('birthDate');
    if ('phoneNumbers' in dto && dto.phoneNumbers) fields.push('phoneNumbers');
    if ('emails' in dto && dto.emails) fields.push('emails');
    if ('addresses' in dto && dto.addresses) fields.push('addresses');
    return fields;
  }
}
