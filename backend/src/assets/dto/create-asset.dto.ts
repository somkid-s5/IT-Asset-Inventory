import { AssetStatus, AssetType } from '@prisma/client';
import {
  IsArray,
  IsIP,
  MaxLength,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class IpAllocationDto {
  @IsString()
  @IsIP(undefined, { message: 'address must be a valid IPv4 or IPv6 address.' })
  @IsNotEmpty()
  address: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  nodeLabel?: string;

  @IsOptional()
  @IsString()
  manageType?: string;

  @IsOptional()
  @IsString()
  version?: string;

  /** @deprecated Legacy single-credential link. New clients should use credentialIds. */
  @IsOptional()
  @IsString()
  credentialId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  credentialIds?: string[];
}

class AssetCredentialDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  username: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  nodeLabel?: string;

  @IsOptional()
  @IsString()
  manageType?: string;

  @IsOptional()
  @IsString()
  version?: string;
}

class AssetComponentLinkDto {
  @IsString()
  @IsNotEmpty()
  componentId: string;

  @IsString()
  @IsNotEmpty()
  relationType: string;

  @IsOptional()
  @IsString()
  responsibleParty?: string;
}

export class CreateAssetDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  assetId?: string;

  @IsEnum(AssetType)
  type: AssetType;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IpAllocationDto)
  ips?: IpAllocationDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssetCredentialDto)
  credentials?: AssetCredentialDto[];

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  rack?: string;

  @IsOptional()
  @IsString()
  manageType?: string;

  @IsOptional()
  @IsString()
  brandModel?: string;

  @IsOptional()
  @IsString()
  sn?: string;

  @IsOptional()
  @IsObject()
  customMetadata?: any;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  osVersion?: string;

  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @IsOptional()
  @IsString()
  environment?: string;

  @IsOptional()
  @IsString()
  owner?: string;

  @IsOptional()
  @IsString()
  responsibleParty?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  purchaseDate?: Date;

  @IsOptional()
  warrantyExpiration?: Date;

  @IsOptional()
  @IsString()
  vendor?: string;

  @IsOptional()
  @IsString()
  dependencies?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssetComponentLinkDto)
  componentLinks?: AssetComponentLinkDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  componentIds?: string[];
}
