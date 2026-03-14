import { AssetStatus, AssetType } from '@prisma/client';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class IpAllocationDto {
    @IsString()
    address: string;

    @IsOptional()
    @IsString()
    type?: string;
}

class AssetCredentialDto {
    @IsString()
    username: string;

    @IsOptional()
    @IsString()
    password?: string;

    @IsOptional()
    @IsString()
    type?: string;
}

export class CreateAssetDto {
    @IsNotEmpty()
    @IsString()
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
    owner?: string;

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
}
