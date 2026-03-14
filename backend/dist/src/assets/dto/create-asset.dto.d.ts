import { AssetStatus, AssetType } from '@prisma/client';
declare class IpAllocationDto {
    address: string;
    type?: string;
}
declare class AssetCredentialDto {
    username: string;
    password?: string;
    type?: string;
}
export declare class CreateAssetDto {
    name: string;
    assetId?: string;
    type: AssetType;
    ips?: IpAllocationDto[];
    credentials?: AssetCredentialDto[];
    location?: string;
    rack?: string;
    manageType?: string;
    brandModel?: string;
    sn?: string;
    customMetadata?: any;
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
export {};
