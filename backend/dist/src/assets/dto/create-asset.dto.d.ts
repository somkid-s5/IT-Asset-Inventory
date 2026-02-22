import { AssetStatus, AssetType } from '@prisma/client';
export declare class CreateAssetDto {
    name: string;
    type: AssetType;
    ipAddress?: string;
    parentId?: string;
    osVersion?: string;
    status?: AssetStatus;
    owner?: string;
    department?: string;
    purchaseDate?: Date;
    warrantyExpiration?: Date;
    vendor?: string;
    dependencies?: string;
}
