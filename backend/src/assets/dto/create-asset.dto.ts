import { AssetStatus, AssetType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAssetDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsEnum(AssetType)
    type: AssetType;

    @IsOptional()
    @IsString()
    ipAddress?: string;

    @IsOptional()
    @IsString()
    environment?: string;

    @IsOptional()
    @IsString()
    location?: string;

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

    // Date validations bypassed for MVP simplicity (passed as ISO strings)
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
