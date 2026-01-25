// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class RolePermissionDto {
  @IsString()
  @IsNotEmpty()
  resource: string;

  @IsString()
  @IsNotEmpty()
  action: string;
}

export class CreateSystemRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  nameEn: string;

  @IsString()
  @IsOptional()
  @MaxLength(128)
  nameZh?: string;

  @IsString()
  @IsOptional()
  @MaxLength(128)
  nameJa?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RolePermissionDto)
  permissions?: RolePermissionDto[];
}
