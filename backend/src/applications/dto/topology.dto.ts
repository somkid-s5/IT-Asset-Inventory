import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
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
}
