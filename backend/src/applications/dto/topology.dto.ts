import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
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

export class AccessCredentialDto {
  @IsString() @IsNotEmpty() username: string;
  @IsString() password: string;
  @IsOptional() @IsString() role?: string;
}
