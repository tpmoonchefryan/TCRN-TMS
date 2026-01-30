// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Type } from 'class-transformer';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
  IsBoolean,
  IsDateString,
  MaxLength,
  IsEmail,
  ArrayMaxSize,
} from 'class-validator';

export class PhoneNumberDto {
  @IsString()
  typeCode!: string;

  @IsString()
  @MaxLength(32)
  number!: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class EmailDto {
  @IsString()
  typeCode!: string;

  @IsEmail()
  @MaxLength(255)
  address!: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class AddressDto {
  @IsString()
  typeCode!: string;

  @IsString()
  @MaxLength(2)
  countryCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  province?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  street?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  postalCode?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CreatePiiProfileDto {
  @IsUUID()
  id!: string;

  @IsUUID()
  profileStoreId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  givenName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  familyName?: string;

  @IsOptional()
  @IsEnum(['male', 'female', 'other', 'undisclosed'])
  gender?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhoneNumberDto)
  @ArrayMaxSize(10)
  phoneNumbers?: PhoneNumberDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailDto)
  @ArrayMaxSize(10)
  emails?: EmailDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  @ArrayMaxSize(5)
  addresses?: AddressDto[];
}

export class UpdatePiiProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  givenName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  familyName?: string;

  @IsOptional()
  @IsEnum(['male', 'female', 'other', 'undisclosed'])
  gender?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhoneNumberDto)
  @ArrayMaxSize(10)
  phoneNumbers?: PhoneNumberDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailDto)
  @ArrayMaxSize(10)
  emails?: EmailDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  @ArrayMaxSize(5)
  addresses?: AddressDto[];
}

export class BatchGetProfilesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(100)
  ids!: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];
}

export interface PiiProfileResponse {
  id: string;
  givenName?: string | null;
  familyName?: string | null;
  gender?: string | null;
  birthDate?: string | null;
  phoneNumbers?: PhoneNumberDto[] | null;
  emails?: EmailDto[] | null;
  addresses?: AddressDto[] | null;
  updatedAt: Date;
}
