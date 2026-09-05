import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApplicationEnvironmentName } from '@prisma/client';

export class EnvironmentDto {
  @IsEnum(ApplicationEnvironmentName) name: ApplicationEnvironmentName;
  @IsOptional() @IsBoolean() noDatabase?: boolean;
}

export class ComponentDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) assetIds?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) vmIds?: string[];
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  logicalDatabaseIds?: string[];
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

export class AccessDto {
  @IsString() @IsNotEmpty() label: string;
  @IsString() @IsNotEmpty() address: string;
  @IsString() @IsNotEmpty() method: string;
  @IsOptional() @IsString() environmentId?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AccessCredentialDto)
  credentials?: AccessCredentialDto[];
}

/**
 * Access-point metadata can be edited without forcing a password rotation.
 * Credentials remain write-only on this endpoint: callers that need to set a
 * new password send a complete credential entry with `password` populated.
 */
export class UpdateAccessDto {
  @IsOptional() @IsString() @IsNotEmpty() label?: string;
  @IsOptional() @IsString() @IsNotEmpty() address?: string;
  @IsOptional() @IsString() @IsNotEmpty() method?: string;
  @IsOptional() @IsString() environmentId?: string | null;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateAccessCredentialDto)
  credentials?: UpdateAccessCredentialDto[];
}

export class UpdateAccessCredentialDto {
  @IsOptional() @IsString() id?: string;
  @IsString() @IsNotEmpty() username: string;
  @IsOptional() @IsString() password?: string;
  @IsOptional() @IsString() role?: string;
}

export class AccessCredentialDto {
  @IsString() @IsNotEmpty() username: string;
  @IsString() password: string;
  @IsOptional() @IsString() role?: string;
}
