import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { VmCriticality, VmEnvironment, VmLifecycleState } from '@prisma/client';

class VmGuestAccountDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  username: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsString()
  accessMethod: string;

  @IsString()
  role: string;

  @IsOptional()
  @IsString()
  note?: string;
}

class VmComponentLinkDto {
  @IsString()
  componentId: string;

  @IsIn(['PRIMARY', 'SHARED'])
  relationType: 'PRIMARY' | 'SHARED';

  @IsOptional()
  @IsString()
  responsibleParty?: string;
}

export class SaveVmDraftDto {
  @IsOptional()
  @IsString()
  systemName?: string;

  @IsOptional()
  @IsEnum(VmEnvironment)
  environment?: VmEnvironment;

  @IsOptional()
  @IsString()
  owner?: string;

  @IsOptional()
  @IsString()
  businessUnit?: string;

  @IsOptional()
  @IsString()
  slaTier?: string;

  @IsOptional()
  @IsString()
  serviceRole?: string;

  @IsOptional()
  @IsEnum(VmCriticality)
  criticality?: VmCriticality;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  notes?: string;

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
  @Type(() => VmComponentLinkDto)
  componentLinks?: VmComponentLinkDto[];

  /** @deprecated compatibility for pre-V1 clients */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  componentIds?: string[];
}
