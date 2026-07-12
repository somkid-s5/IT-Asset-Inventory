import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AssetStatus, AssetType } from '@prisma/client';

export class ImportAssetRowDto {
  @IsString() @IsNotEmpty() @MaxLength(200) name: string;
  @IsEnum(AssetType) type: AssetType;
  @IsOptional() @IsString() @MaxLength(100) assetId?: string;
  @IsOptional() @IsEnum(AssetStatus) status?: AssetStatus;
  @IsOptional() @IsString() @MaxLength(100) environment?: string;
  @IsOptional() @IsString() @MaxLength(200) owner?: string;
  @IsOptional() @IsString() @MaxLength(200) department?: string;
  @IsOptional() @IsString() @MaxLength(200) location?: string;
  @IsOptional() @IsString() @MaxLength(200) rack?: string;
  @IsOptional() @IsString() @MaxLength(200) brandModel?: string;
  @IsOptional() @IsString() @MaxLength(200) sn?: string;
}

export class BulkImportAssetsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ImportAssetRowDto)
  rows: ImportAssetRowDto[];
}
