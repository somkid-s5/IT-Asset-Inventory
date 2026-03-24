import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { VmCriticality, VmEnvironment, VmLifecycleState } from '@prisma/client';

class VmDiskDto {
  @IsString()
  label: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  sizeGb: number;

  @IsOptional()
  @IsString()
  datastore?: string;
}

class VmGuestAccountDto {
  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsString()
  accessMethod: string;

  @IsString()
  role: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class SaveVmDraftDto {
  @IsString()
  systemName: string;

  @IsEnum(VmEnvironment)
  environment: VmEnvironment;

  @IsOptional()
  @IsString()
  owner?: string;

  @IsOptional()
  @IsString()
  businessUnit?: string;

  @IsOptional()
  @IsString()
  slaTier?: string;

  @IsString()
  serviceRole: string;

  @IsOptional()
  @IsEnum(VmCriticality)
  criticality?: VmCriticality;

  @IsString()
  description: string;

  @IsString()
  notes: string;

  @IsOptional()
  @IsEnum(VmLifecycleState)
  lifecycleState?: VmLifecycleState;

  @IsOptional()
  @IsString()
  tags?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VmGuestAccountDto)
  guestAccounts?: VmGuestAccountDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VmDiskDto)
  disks?: VmDiskDto[];
}
