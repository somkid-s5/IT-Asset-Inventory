import { PartialType } from '@nestjs/mapped-types';
import { CreateAssetDto } from './create-asset.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateAssetDto extends PartialType(CreateAssetDto) {
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
}
