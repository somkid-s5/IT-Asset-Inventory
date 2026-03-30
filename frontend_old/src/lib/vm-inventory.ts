export type VmPowerState = 'RUNNING' | 'STOPPED' | 'SUSPENDED';
export type VmInventoryEnvironment = 'PROD' | 'TEST' | 'UAT';
export type VmDiscoveryState = 'NEEDS_CONTEXT' | 'READY_TO_PROMOTE' | 'DRIFTED';
export type VmLifecycleState = 'DRAFT' | 'ACTIVE' | 'DELETED_IN_VCENTER';
export type VmCriticality = 'MISSION_CRITICAL' | 'BUSINESS_CRITICAL' | 'STANDARD';
export type VmSyncState = 'Synced' | 'Missing from source' | 'Ready to sync' | 'Connection failed';
export type VmPlacementResolution = 'DIRECT_VM' | 'SOURCE_SINGLE_HOST' | 'SOURCE_SINGLE_CLUSTER' | 'UNKNOWN';

export interface VmGuestAccount {
  username: string;
  password: string;
  accessMethod: string;
  role: string;
  note?: string | null;
}

export interface VmDisk {
  label: string;
  sizeGb: number;
  datastore?: string;
}

export interface VmSourceHistoryItem {
  label: string;
  version: string;
  lastSeen: string;
  status: string;
}

export interface VmVCenterSource {
  id: string;
  name: string;
  version: string;
  endpoint: string;
  vmCount: number;
  status: string;
  syncInterval: string;
  lastSyncAt: string;
  notes?: string | null;
}

export interface VmDiscoveryItem {
  id: string;
  name: string;
  systemName?: string | null;
  moid: string;
  sourceName: string;
  sourceVersion: string;
  cluster: string;
  clusterResolution?: VmPlacementResolution;
  host: string;
  hostResolution?: VmPlacementResolution;
  computerName?: string | null;
  guestOs: string;
  primaryIp: string;
  cpuCores: number;
  memoryGb: number;
  storageGb: number;
  disks?: VmDisk[];
  networkLabel: string;
  powerState: VmPowerState;
  state: VmDiscoveryState;
  completeness: number;
  missingFields: string[];
  lastSeen: string;
  tags: string[];
  guestAccountsCount: number;
  owner?: string | null;
  environment?: VmInventoryEnvironment | null;
  businessUnit?: string | null;
  slaTier?: string | null;
  serviceRole?: string | null;
  criticality?: VmCriticality | null;
  description?: string | null;
  notes?: string;
  suggestedOwner?: string | null;
  suggestedEnvironment?: VmInventoryEnvironment | null;
  suggestedServiceRole?: string | null;
  suggestedCriticality?: VmCriticality | null;
  note?: string | null;
  guestAccounts?: VmGuestAccount[];
}

export interface VmInventoryItem {
  id: string;
  name: string;
  systemName: string;
  moid: string;
  vcenterName: string;
  vcenterVersion: string;
  environment: VmInventoryEnvironment;
  cluster: string;
  clusterResolution?: VmPlacementResolution;
  host: string;
  hostResolution?: VmPlacementResolution;
  computerName?: string | null;
  guestOs: string;
  primaryIp: string;
  cpuCores: number;
  memoryGb: number;
  storageGb: number;
  disks?: VmDisk[];
  networkLabel: string;
  powerState: VmPowerState;
  lifecycleState: VmLifecycleState;
  syncState: VmSyncState;
  owner: string;
  businessUnit: string;
  slaTier: string;
  serviceRole: string;
  criticality: VmCriticality;
  description: string;
  tags: string[];
  lastSyncAt: string;
  syncedFields: string[];
  managedFields: string[];
  guestAccountsCount: number;
}

export interface VmInventoryDetail extends VmInventoryItem {
  notes: string;
  sourceHistory: VmSourceHistoryItem[];
  guestAccounts: VmGuestAccount[];
}

export const VM_ENVIRONMENT_FILTERS: Array<{ label: string; value: 'ALL' | VmInventoryEnvironment }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Production', value: 'PROD' },
  { label: 'Test', value: 'TEST' },
  { label: 'UAT', value: 'UAT' },
];

export const VM_SERVICE_ROLE_OPTIONS = [
  'Web Server',
  'Application Server',
  'API Runtime',
  'Database Server',
  'File Server',
  'Jump Host',
  'Batch Server',
  'Monitoring Node',
  'Backup Server',
  'Domain Controller',
] as const;

export const VM_LIFECYCLE_FILTERS: Array<{ label: string; value: 'ALL' | VmLifecycleState }> = [
  { label: 'All states', value: 'ALL' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Deleted', value: 'DELETED_IN_VCENTER' },
];

export const VM_CRITICALITY_OPTIONS: Array<{ label: string; value: VmCriticality }> = [
  { label: 'Mission Critical', value: 'MISSION_CRITICAL' },
  { label: 'Business Critical', value: 'BUSINESS_CRITICAL' },
  { label: 'Standard', value: 'STANDARD' },
];

export const VM_SOURCE_FILTERS = [
  { label: 'All sources', value: 'ALL' },
  { label: 'vc-prod-01', value: 'vc-prod-01' },
  { label: 'vc-test-01', value: 'vc-test-01' },
  { label: 'vc-lab-01', value: 'vc-lab-01' },
];
