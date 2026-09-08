import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApplicationEnvironmentName } from '@prisma/client';

class ApplicationCredentialDto {
  @IsString() @IsNotEmpty() username: string;
  @IsString() password: string;
  @IsOptional() @IsString() role?: string;
}

class ApplicationAccessDto {
  @IsString() @IsNotEmpty() label: string;
  @IsString() @IsNotEmpty() address: string;
  @IsString() @IsNotEmpty() method: string;
  @IsOptional() @IsString() environmentId?: string;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplicationCredentialDto)
  credentials?: ApplicationCredentialDto[];
}

class ApplicationComponentDto {
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

class ApplicationEnvironmentDto {
  @IsEnum(ApplicationEnvironmentName) name: ApplicationEnvironmentName;
  @IsOptional() noDatabase?: boolean;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplicationComponentDto)
  components?: ApplicationComponentDto[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplicationAccessDto)
  access?: ApplicationAccessDto[];
}

export class CreateApplicationDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsString() technicalOwner?: string;
  @IsOptional() @IsString() businessUnit?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplicationEnvironmentDto)
  environments?: ApplicationEnvironmentDto[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplicationAccessDto)
  access?: ApplicationAccessDto[];
}
