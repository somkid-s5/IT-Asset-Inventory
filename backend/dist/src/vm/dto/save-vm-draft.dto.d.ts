import { VmCriticality, VmEnvironment, VmLifecycleState } from '@prisma/client';
declare class VmDiskDto {
    label: string;
    sizeGb: number;
    datastore?: string;
}
declare class VmGuestAccountDto {
    username: string;
    password: string;
    accessMethod: string;
    role: string;
    note?: string;
}
export declare class SaveVmDraftDto {
    systemName: string;
    environment: VmEnvironment;
    owner?: string;
    businessUnit?: string;
    slaTier?: string;
    serviceRole: string;
    criticality?: VmCriticality;
    description: string;
    notes: string;
    lifecycleState?: VmLifecycleState;
    tags?: string;
    guestAccounts?: VmGuestAccountDto[];
    disks?: VmDiskDto[];
}
export {};
