import { VmLifecycleState } from '@prisma/client';
import { SaveVmDraftDto } from './dto/save-vm-draft.dto';
import { SaveVmSourceDto } from './dto/save-vm-source.dto';
import { TestVmSourceConnectionDto } from './dto/test-vm-source-connection.dto';
import { VmService } from './vm.service';
export declare class VmController {
    private readonly vmService;
    constructor(vmService: VmService);
    findSources(): Promise<{
        id: string;
        name: string;
        version: string;
        endpoint: string;
        vmCount: number;
        status: string;
        syncInterval: string;
        lastSyncAt: string;
        notes: string | null;
    }[]>;
    createSource(dto: SaveVmSourceDto, req: {
        user: {
            id: string;
        };
    }): Promise<{
        id: string;
        name: string;
        version: string;
        endpoint: string;
        vmCount: number;
        status: string;
        syncInterval: string;
        lastSyncAt: string;
        notes: string | null;
    }>;
    updateSource(id: string, dto: SaveVmSourceDto, req: {
        user: {
            id: string;
        };
    }): Promise<{
        id: string;
        name: string;
        version: string;
        endpoint: string;
        vmCount: number;
        status: string;
        syncInterval: string;
        lastSyncAt: string;
        notes: string | null;
    }>;
    removeSource(id: string, req: {
        user: {
            id: string;
        };
    }): Promise<{
        success: boolean;
    }>;
    syncAllSources(req: {
        user: {
            id: string;
        };
    }): Promise<{
        success: boolean;
        message: string;
        successCount: number;
        failedCount: number;
    }>;
    testSourceConnection(dto: TestVmSourceConnectionDto): Promise<{
        success: true;
        message: string;
        detail: string;
        apiFamily: "rest" | "api";
        version: string;
    } | {
        success: false;
        message: string;
        detail: string;
        apiFamily?: undefined;
        version?: undefined;
    }>;
    syncSource(id: string, req: {
        user: {
            id: string;
        };
    }): Promise<{
        success: boolean;
        message: string;
        discoveredCount: number;
    } | {
        success: boolean;
        message: string;
        detail: string;
    }>;
    findDiscoveries(): Promise<{
        id: string;
        name: string;
        systemName: string | null;
        moid: string;
        sourceName: string;
        sourceVersion: string;
        cluster: string;
        clusterResolution: string;
        host: string;
        hostResolution: string;
        computerName: string | null;
        guestOs: string;
        primaryIp: string;
        cpuCores: number;
        memoryGb: number;
        storageGb: number;
        disks: {
            label: string;
            sizeGb: number;
            datastore?: string;
        }[];
        networkLabel: string;
        powerState: import(".prisma/client").$Enums.VmPowerState;
        state: import(".prisma/client").$Enums.VmDiscoveryState;
        completeness: number;
        missingFields: string[];
        lastSeen: string;
        tags: string[];
        guestAccountsCount: number;
        owner: string | null;
        environment: import(".prisma/client").$Enums.VmEnvironment | null;
        businessUnit: string | null;
        slaTier: string | null;
        serviceRole: string | null;
        criticality: import(".prisma/client").$Enums.VmCriticality | null;
        description: string | null;
        notes: string;
        suggestedOwner: string | null;
        suggestedEnvironment: import(".prisma/client").$Enums.VmEnvironment | null;
        suggestedServiceRole: string | null;
        suggestedCriticality: import(".prisma/client").$Enums.VmCriticality | null;
        note: string | null;
        guestAccounts: {
            username: string;
            password: string;
            accessMethod: string;
            role: string;
            note: string | null;
        }[];
    }[]>;
    findDiscovery(id: string): Promise<{
        id: string;
        name: string;
        systemName: string | null;
        moid: string;
        sourceName: string;
        sourceVersion: string;
        cluster: string;
        clusterResolution: string;
        host: string;
        hostResolution: string;
        computerName: string | null;
        guestOs: string;
        primaryIp: string;
        cpuCores: number;
        memoryGb: number;
        storageGb: number;
        disks: {
            label: string;
            sizeGb: number;
            datastore?: string;
        }[];
        networkLabel: string;
        powerState: import(".prisma/client").$Enums.VmPowerState;
        state: import(".prisma/client").$Enums.VmDiscoveryState;
        completeness: number;
        missingFields: string[];
        lastSeen: string;
        tags: string[];
        guestAccountsCount: number;
        owner: string | null;
        environment: import(".prisma/client").$Enums.VmEnvironment | null;
        businessUnit: string | null;
        slaTier: string | null;
        serviceRole: string | null;
        criticality: import(".prisma/client").$Enums.VmCriticality | null;
        description: string | null;
        notes: string;
        suggestedOwner: string | null;
        suggestedEnvironment: import(".prisma/client").$Enums.VmEnvironment | null;
        suggestedServiceRole: string | null;
        suggestedCriticality: import(".prisma/client").$Enums.VmCriticality | null;
        note: string | null;
        guestAccounts: {
            username: string;
            password: string;
            accessMethod: string;
            role: string;
            note: string | null;
        }[];
    }>;
    updateDiscovery(id: string, dto: SaveVmDraftDto, req: {
        user: {
            id: string;
        };
    }): Promise<{
        id: string;
        name: string;
        systemName: string | null;
        moid: string;
        sourceName: string;
        sourceVersion: string;
        cluster: string;
        clusterResolution: string;
        host: string;
        hostResolution: string;
        computerName: string | null;
        guestOs: string;
        primaryIp: string;
        cpuCores: number;
        memoryGb: number;
        storageGb: number;
        disks: {
            label: string;
            sizeGb: number;
            datastore?: string;
        }[];
        networkLabel: string;
        powerState: import(".prisma/client").$Enums.VmPowerState;
        state: import(".prisma/client").$Enums.VmDiscoveryState;
        completeness: number;
        missingFields: string[];
        lastSeen: string;
        tags: string[];
        guestAccountsCount: number;
        owner: string | null;
        environment: import(".prisma/client").$Enums.VmEnvironment | null;
        businessUnit: string | null;
        slaTier: string | null;
        serviceRole: string | null;
        criticality: import(".prisma/client").$Enums.VmCriticality | null;
        description: string | null;
        notes: string;
        suggestedOwner: string | null;
        suggestedEnvironment: import(".prisma/client").$Enums.VmEnvironment | null;
        suggestedServiceRole: string | null;
        suggestedCriticality: import(".prisma/client").$Enums.VmCriticality | null;
        note: string | null;
        guestAccounts: {
            username: string;
            password: string;
            accessMethod: string;
            role: string;
            note: string | null;
        }[];
    }>;
    promoteDiscovery(id: string, dto: SaveVmDraftDto, req: {
        user: {
            id: string;
        };
    }): Promise<{
        id: string;
        name: string;
        systemName: string;
        moid: string;
        vcenterName: string;
        vcenterVersion: string;
        environment: import(".prisma/client").$Enums.VmEnvironment;
        cluster: string;
        clusterResolution: string;
        host: string;
        hostResolution: string;
        computerName: string | null;
        guestOs: string;
        primaryIp: string;
        cpuCores: number;
        memoryGb: number;
        storageGb: number;
        disks: {
            label: string;
            sizeGb: number;
            datastore?: string;
        }[];
        networkLabel: string;
        powerState: import(".prisma/client").$Enums.VmPowerState;
        lifecycleState: import(".prisma/client").$Enums.VmLifecycleState;
        syncState: string;
        owner: string;
        businessUnit: string;
        slaTier: string;
        serviceRole: string;
        criticality: import(".prisma/client").$Enums.VmCriticality;
        description: string;
        tags: string[];
        lastSyncAt: string;
        syncedFields: string[];
        managedFields: string[];
        guestAccountsCount: number;
        notes: string;
        guestAccounts: {
            username: string;
            password: string;
            accessMethod: string;
            role: string;
            note: string | null;
        }[];
        sourceHistory: {
            label: string;
            version: string;
            lastSeen: string;
            status: string;
        }[];
    }>;
    archiveDiscovery(id: string, req: {
        user: {
            id: string;
        };
    }): Promise<{
        success: boolean;
    }>;
    findInventory(): Promise<{
        id: string;
        name: string;
        systemName: string;
        moid: string;
        vcenterName: string;
        vcenterVersion: string;
        environment: import(".prisma/client").$Enums.VmEnvironment;
        cluster: string;
        clusterResolution: string;
        host: string;
        hostResolution: string;
        computerName: string | null;
        guestOs: string;
        primaryIp: string;
        cpuCores: number;
        memoryGb: number;
        storageGb: number;
        disks: {
            label: string;
            sizeGb: number;
            datastore?: string;
        }[];
        networkLabel: string;
        powerState: import(".prisma/client").$Enums.VmPowerState;
        lifecycleState: import(".prisma/client").$Enums.VmLifecycleState;
        syncState: string;
        owner: string;
        businessUnit: string;
        slaTier: string;
        serviceRole: string;
        criticality: import(".prisma/client").$Enums.VmCriticality;
        description: string;
        tags: string[];
        lastSyncAt: string;
        syncedFields: string[];
        managedFields: string[];
        guestAccountsCount: number;
        notes: string;
        guestAccounts: {
            username: string;
            password: string;
            accessMethod: string;
            role: string;
            note: string | null;
        }[];
        sourceHistory: {
            label: string;
            version: string;
            lastSeen: string;
            status: string;
        }[];
    }[]>;
    findInventoryById(id: string): Promise<{
        id: string;
        name: string;
        systemName: string;
        moid: string;
        vcenterName: string;
        vcenterVersion: string;
        environment: import(".prisma/client").$Enums.VmEnvironment;
        cluster: string;
        clusterResolution: string;
        host: string;
        hostResolution: string;
        computerName: string | null;
        guestOs: string;
        primaryIp: string;
        cpuCores: number;
        memoryGb: number;
        storageGb: number;
        disks: {
            label: string;
            sizeGb: number;
            datastore?: string;
        }[];
        networkLabel: string;
        powerState: import(".prisma/client").$Enums.VmPowerState;
        lifecycleState: import(".prisma/client").$Enums.VmLifecycleState;
        syncState: string;
        owner: string;
        businessUnit: string;
        slaTier: string;
        serviceRole: string;
        criticality: import(".prisma/client").$Enums.VmCriticality;
        description: string;
        tags: string[];
        lastSyncAt: string;
        syncedFields: string[];
        managedFields: string[];
        guestAccountsCount: number;
        notes: string;
        guestAccounts: {
            username: string;
            password: string;
            accessMethod: string;
            role: string;
            note: string | null;
        }[];
        sourceHistory: {
            label: string;
            version: string;
            lastSeen: string;
            status: string;
        }[];
    }>;
    updateInventory(id: string, dto: SaveVmDraftDto, req: {
        user: {
            id: string;
        };
    }): Promise<{
        id: string;
        name: string;
        systemName: string;
        moid: string;
        vcenterName: string;
        vcenterVersion: string;
        environment: import(".prisma/client").$Enums.VmEnvironment;
        cluster: string;
        clusterResolution: string;
        host: string;
        hostResolution: string;
        computerName: string | null;
        guestOs: string;
        primaryIp: string;
        cpuCores: number;
        memoryGb: number;
        storageGb: number;
        disks: {
            label: string;
            sizeGb: number;
            datastore?: string;
        }[];
        networkLabel: string;
        powerState: import(".prisma/client").$Enums.VmPowerState;
        lifecycleState: import(".prisma/client").$Enums.VmLifecycleState;
        syncState: string;
        owner: string;
        businessUnit: string;
        slaTier: string;
        serviceRole: string;
        criticality: import(".prisma/client").$Enums.VmCriticality;
        description: string;
        tags: string[];
        lastSyncAt: string;
        syncedFields: string[];
        managedFields: string[];
        guestAccountsCount: number;
        notes: string;
        guestAccounts: {
            username: string;
            password: string;
            accessMethod: string;
            role: string;
            note: string | null;
        }[];
        sourceHistory: {
            label: string;
            version: string;
            lastSeen: string;
            status: string;
        }[];
    }>;
    archiveInventory(id: string, req: {
        user: {
            id: string;
        };
    }, lifecycleState?: VmLifecycleState): Promise<{
        success: boolean;
    }>;
}
