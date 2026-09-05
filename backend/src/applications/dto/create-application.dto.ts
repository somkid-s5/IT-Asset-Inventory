import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApplicationEnvironmentName } from '@prisma/client';

class ApplicationComponentDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsString() description?: string;
}

class ApplicationEnvironmentDto {
  @IsEnum(ApplicationEnvironmentName) name: ApplicationEnvironmentName;
  @IsOptional() noDatabase?: boolean;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplicationComponentDto)
  components?: ApplicationComponentDto[];
}

class ApplicationCredentialDto {
  @IsString() @IsNotEmpty() username: string;
  @IsString() password: string;
  @IsOptional() @IsString() role?: string;
}

class ApplicationAccessDto {
  @IsString() @IsNotEmpty() label: string;
  @IsString() @IsNotEmpty() address: string;
  @IsString() @IsNotEmpty() method: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplicationCredentialDto)
  credentials?: ApplicationCredentialDto[];
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
