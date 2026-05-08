// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';

import { TENANT_SENDING_DOMAIN_STATUSES, type TenantSendingDomainStatus } from '../domain/tenant-sending-domain.policy';

export class ManagedTenantSendingDomainDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  domain!: string;

  @IsOptional()
  @IsIn(TENANT_SENDING_DOMAIN_STATUSES)
  status?: TenantSendingDomainStatus;
}

export class SaveManagedTenantSendingDomainsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManagedTenantSendingDomainDto)
  domains!: ManagedTenantSendingDomainDto[];

  @IsOptional()
  @IsString()
  defaultDomainId?: string | null;
}

export class SaveTenantSenderDomainsDto {
  @IsOptional()
  @IsString()
  defaultDomainId?: string | null;

  @IsOptional()
  @IsString()
  fromName?: string | null;

  @IsOptional()
  @IsString()
  replyTo?: string | null;
}
