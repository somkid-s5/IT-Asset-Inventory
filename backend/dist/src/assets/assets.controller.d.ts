import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
export declare class AssetsController {
    private readonly assetsService;
    constructor(assetsService: AssetsService);
    create(createAssetDto: CreateAssetDto, req: any): Promise<{
        ipAllocations: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            type: string | null;
            address: string;
            assetId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        type: import(".prisma/client").$Enums.AssetType;
        osVersion: string | null;
        status: import(".prisma/client").$Enums.AssetStatus;
        owner: string | null;
        department: string | null;
        purchaseDate: Date | null;
        warrantyExpiration: Date | null;
        vendor: string | null;
        dependencies: string | null;
        parentId: string | null;
        createdByUserId: string;
    }>;
    findAll(): Promise<({
        parent: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            type: import(".prisma/client").$Enums.AssetType;
            osVersion: string | null;
            status: import(".prisma/client").$Enums.AssetStatus;
            owner: string | null;
            department: string | null;
            purchaseDate: Date | null;
            warrantyExpiration: Date | null;
            vendor: string | null;
            dependencies: string | null;
            parentId: string | null;
            createdByUserId: string;
        } | null;
        children: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            type: import(".prisma/client").$Enums.AssetType;
            osVersion: string | null;
            status: import(".prisma/client").$Enums.AssetStatus;
            owner: string | null;
            department: string | null;
            purchaseDate: Date | null;
            warrantyExpiration: Date | null;
            vendor: string | null;
            dependencies: string | null;
            parentId: string | null;
            createdByUserId: string;
        }[];
        ipAllocations: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            type: string | null;
            address: string;
            assetId: string;
        }[];
        patchInfo: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            assetId: string;
            currentVersion: string | null;
            latestVersion: string | null;
            eolDate: Date | null;
            lastPatchedDate: Date | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        type: import(".prisma/client").$Enums.AssetType;
        osVersion: string | null;
        status: import(".prisma/client").$Enums.AssetStatus;
        owner: string | null;
        department: string | null;
        purchaseDate: Date | null;
        warrantyExpiration: Date | null;
        vendor: string | null;
        dependencies: string | null;
        parentId: string | null;
        createdByUserId: string;
    })[]>;
    findOne(id: string): Promise<{
        parent: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            type: import(".prisma/client").$Enums.AssetType;
            osVersion: string | null;
            status: import(".prisma/client").$Enums.AssetStatus;
            owner: string | null;
            department: string | null;
            purchaseDate: Date | null;
            warrantyExpiration: Date | null;
            vendor: string | null;
            dependencies: string | null;
            parentId: string | null;
            createdByUserId: string;
        } | null;
        children: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            type: import(".prisma/client").$Enums.AssetType;
            osVersion: string | null;
            status: import(".prisma/client").$Enums.AssetStatus;
            owner: string | null;
            department: string | null;
            purchaseDate: Date | null;
            warrantyExpiration: Date | null;
            vendor: string | null;
            dependencies: string | null;
            parentId: string | null;
            createdByUserId: string;
        }[];
        ipAllocations: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            type: string | null;
            address: string;
            assetId: string;
        }[];
        patchInfo: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            assetId: string;
            currentVersion: string | null;
            latestVersion: string | null;
            eolDate: Date | null;
            lastPatchedDate: Date | null;
        } | null;
        credentials: {
            id: string;
            username: string;
            lastChangedDate: Date | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        type: import(".prisma/client").$Enums.AssetType;
        osVersion: string | null;
        status: import(".prisma/client").$Enums.AssetStatus;
        owner: string | null;
        department: string | null;
        purchaseDate: Date | null;
        warrantyExpiration: Date | null;
        vendor: string | null;
        dependencies: string | null;
        parentId: string | null;
        createdByUserId: string;
    }>;
    update(id: string, updateAssetDto: UpdateAssetDto): Promise<{
        ipAllocations: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            type: string | null;
            address: string;
            assetId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        type: import(".prisma/client").$Enums.AssetType;
        osVersion: string | null;
        status: import(".prisma/client").$Enums.AssetStatus;
        owner: string | null;
        department: string | null;
        purchaseDate: Date | null;
        warrantyExpiration: Date | null;
        vendor: string | null;
        dependencies: string | null;
        parentId: string | null;
        createdByUserId: string;
    }>;
    remove(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        type: import(".prisma/client").$Enums.AssetType;
        osVersion: string | null;
        status: import(".prisma/client").$Enums.AssetStatus;
        owner: string | null;
        department: string | null;
        purchaseDate: Date | null;
        warrantyExpiration: Date | null;
        vendor: string | null;
        dependencies: string | null;
        parentId: string | null;
        createdByUserId: string;
    }>;
}
